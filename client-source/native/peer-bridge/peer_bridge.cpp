// Returns from Darkness native WebRTC companion with a bounded cloud relay fallback.
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <winhttp.h>
#include <rtc/rtc.hpp>
#include <nlohmann/json.hpp>
#include <array>
#include <atomic>
#include <chrono>
#include <deque>
#include <fstream>
#include <iostream>
#include <mutex>
#include <numeric>
#include <string>
#include <thread>
#include <vector>
#include <filesystem>
using Json=nlohmann::json;
using Bytes=std::vector<unsigned char>;
static const char *base64Chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
static std::string encode64(const Bytes &data){std::string s;unsigned int value=0;int bits=-6;for(auto c:data){value=(value<<8)|c;bits+=8;while(bits>=0){s+=base64Chars[(value>>bits)&63];bits-=6;}}if(bits>-6)s+=base64Chars[((value<<8)>>(bits+8))&63];while(s.size()%4)s+='=';return s;}
static Bytes decode64(const std::string &data){Bytes result;unsigned int value=0;int bits=-8;for(char c:data){if(c=='=')break;const char *found=strchr(base64Chars,c);if(!found||!c)throw std::runtime_error("Relay invalido.");value=(value<<6)|unsigned(found-base64Chars);bits+=6;if(bits>=0){result.push_back(static_cast<unsigned char>(value>>bits));bits-=8;}}return result;}
static uint64_t now(){return GetTickCount64();}
static std::string env(const char *key){std::wstring name(key,key+strlen(key));wchar_t value[8192];DWORD n=GetEnvironmentVariableW(name.c_str(),value,8192);if(!n||n>=8192)return "";int length=WideCharToMultiByte(CP_UTF8,0,value,n,nullptr,0,nullptr,nullptr);std::string result(length,'\0');WideCharToMultiByte(CP_UTF8,0,value,n,result.data(),length,nullptr,nullptr);return result;}
static void require(bool value,const char *error){if(!value)throw std::runtime_error(error);}
static std::wstring wide(const std::string &s){int n=MultiByteToWideChar(CP_UTF8,0,s.data(),int(s.size()),nullptr,0);std::wstring result(n,L' ');MultiByteToWideChar(CP_UTF8,0,s.data(),int(s.size()),result.data(),n);return result;}
struct HttpHandle{HINTERNET value=nullptr;HttpHandle(HINTERNET v=nullptr):value(v){}~HttpHandle(){if(value)WinHttpCloseHandle(value);}operator HINTERNET()const{return value;}HttpHandle(const HttpHandle&)=delete;};
struct Signal {
  std::string host,path,token;int slot;std::atomic<bool> running{true},online{false},authenticated{false};
  std::atomic<HINTERNET> socket{nullptr};std::thread receiver;std::mutex sending;
  std::function<void(Json)> receive;
  Signal(std::string h,std::string p,std::string t,int s):host(h),path(p),token(t),slot(s){}
  void stop(){running=false;authenticated=false;online=false;auto ws=socket.exchange(nullptr);if(ws)WinHttpCloseHandle(ws);if(receiver.joinable())receiver.join();}
  ~Signal(){stop();}
  bool send(const Json &value){std::lock_guard<std::mutex> lock(sending);auto ws=socket.load();if(!online||!ws)return false;const std::string text=value.dump();return WinHttpWebSocketSend(ws,WINHTTP_WEB_SOCKET_UTF8_MESSAGE_BUFFER_TYPE,(void*)text.data(),DWORD(text.size()))==NO_ERROR;}
  void start(){receiver=std::thread([this]{int backoff=1;while(running){
    HttpHandle session(WinHttpOpen(L"RFD/0.3.0",WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0));
    if(!session){Sleep(1000);continue;}WinHttpSetTimeouts(session,5000,5000,5000,60000);
    HttpHandle connection(WinHttpConnect(session,wide(host).c_str(),443,0));
    HttpHandle request(connection?WinHttpOpenRequest(connection,L"GET",wide(path).c_str(),nullptr,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE):nullptr);
    DWORD redirects=WINHTTP_OPTION_REDIRECT_POLICY_NEVER;if(request)WinHttpSetOption(request,WINHTTP_OPTION_REDIRECT_POLICY,&redirects,sizeof(redirects));
    if(!request||!WinHttpSetOption(request,WINHTTP_OPTION_UPGRADE_TO_WEB_SOCKET,nullptr,0)||!WinHttpSendRequest(request,WINHTTP_NO_ADDITIONAL_HEADERS,0,nullptr,0,0,0)||!WinHttpReceiveResponse(request,nullptr)){for(int i=0;i<backoff*10&&running;i++)Sleep(100);backoff=std::min(backoff*2,15);continue;}
    HINTERNET ws=WinHttpWebSocketCompleteUpgrade(request,0);if(!ws)continue;authenticated=false;socket=ws;online=true;backoff=1;
    send({{"op","auth"},{"slot",slot},{"token",token}});std::string incoming;unsigned char buffer[8192];
    while(running&&socket==ws){DWORD size=0;WINHTTP_WEB_SOCKET_BUFFER_TYPE type;DWORD error=WinHttpWebSocketReceive(ws,buffer,sizeof(buffer),&size,&type);if(error!=NO_ERROR||type==WINHTTP_WEB_SOCKET_CLOSE_BUFFER_TYPE)break;
      if(type!=WINHTTP_WEB_SOCKET_UTF8_FRAGMENT_BUFFER_TYPE&&type!=WINHTTP_WEB_SOCKET_UTF8_MESSAGE_BUFFER_TYPE)break;
      incoming.append((char*)buffer,size);if(incoming.size()>90000)break;
      if(type==WINHTTP_WEB_SOCKET_UTF8_MESSAGE_BUFFER_TYPE){try{auto message=Json::parse(incoming);if(message.value("op","")=="ready")authenticated=true;receive(std::move(message));}catch(...){}incoming.clear();}
    }
    authenticated=false;online=false;if(socket.exchange(nullptr)==ws)WinHttpCloseHandle(ws);for(int i=0;i<backoff*10&&running;i++)Sleep(100);backoff=std::min(backoff*2,15);
  }});}
};
static Json post(const std::string &host,const std::string &path,const Json &input){
  HttpHandle session(WinHttpOpen(L"RFD/0.3.0",WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0));require(session,"Nao foi possivel iniciar HTTPS.");WinHttpSetTimeouts(session,5000,5000,5000,12000);
  HttpHandle connection(WinHttpConnect(session,wide(host).c_str(),443,0));require(connection,"Nao foi possivel conectar a central.");
  HttpHandle request(WinHttpOpenRequest(connection,L"POST",wide(path).c_str(),nullptr,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE));require(request,"Requisicao invalida.");
  DWORD redirects=WINHTTP_OPTION_REDIRECT_POLICY_NEVER;WinHttpSetOption(request,WINHTTP_OPTION_REDIRECT_POLICY,&redirects,sizeof(redirects));
  const std::string data=input.dump();require(WinHttpSendRequest(request,L"Content-Type: application/json\r\n",-1,(void*)data.data(),DWORD(data.size()),DWORD(data.size()),0)&&WinHttpReceiveResponse(request,nullptr),"A central nao respondeu.");
  DWORD status=0,len=sizeof(status);WinHttpQueryHeaders(request,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,WINHTTP_HEADER_NAME_BY_INDEX,&status,&len,WINHTTP_NO_HEADER_INDEX);
  std::string result;char buffer[4096];DWORD read=0;while(WinHttpReadData(request,buffer,sizeof(buffer),&read)&&read){result.append(buffer,read);require(result.size()<65536,"Resposta acima do limite.");}
  auto value=Json::parse(result);if(status!=200)throw std::runtime_error(value.value("error","Entrada recusada."));return value;
}
struct Event{int slot=-1;uint32_t epoch=0;Bytes packet;Json signal;bool closed=false;std::shared_ptr<rtc::DataChannel> channel;uint64_t deliverAt=0;};
class Bridge {
 public:
  std::string signalHost,roomId,ticket,localTicket,hash,readyFile,statsFile,roomMode,username;
  int self=-1;uint32_t seed=0;unsigned char difficulty=0;bool hosting=false,gameJoined=false,stopping=false;
  SOCKET listener=INVALID_SOCKET,game=INVALID_SOCKET;Bytes input,output;size_t outputOffset=0;
  std::unique_ptr<Signal> signal;std::array<std::shared_ptr<rtc::PeerConnection>,4> peers;std::array<std::shared_ptr<rtc::DataChannel>,4> channels;
  std::array<bool,4> joined{},worldLoaded{};std::array<std::deque<Bytes>,4> early;Bytes init;
  std::array<bool,4> relayed{};bool relayRequested=false,transportReady=false,hostWorldReady=false,signalAuthenticated=false;
  std::array<bool,4> blocked{};std::array<std::string,4> rejectionReason;
  std::array<uint32_t,4> peerEpoch{};
  std::mutex eventsMutex;std::deque<Event> events;size_t eventBytes=0;HANDLE wake=CreateEvent(nullptr,FALSE,FALSE,nullptr);WSAEVENT socketEvent=WSACreateEvent();
  uint64_t created=now(),lastGame=now(),lastHeartbeat=0,lastStats=0,lastRelayRequest=0;int localPort=0;std::string publishedPhase;bool preface=false,ready=false;std::atomic<bool> overflow{false};
  uint64_t packetsSent=0,packetsReceived=0;
  std::array<uint64_t,4> deliverTimes{};unsigned int qaPackets=0;
  std::array<std::deque<Event>,4> deferred;size_t deferredBytes=0;
  ~Bridge(){if(signal){signal->send({{"op","leave"}});signal.reset();}for(auto &dc:channels)if(dc){dc->resetCallbacks();dc->close();}for(auto &pc:peers)if(pc){pc->resetCallbacks();pc->close();}if(game!=INVALID_SOCKET)closesocket(game);if(listener!=INVALID_SOCKET)closesocket(listener);CloseHandle(wake);WSACloseEvent(socketEvent);WSACleanup();}
  void enqueue(Event event){std::lock_guard<std::mutex> lock(eventsMutex);if(!event.packet.empty()&&event.slot>=0){auto delay=std::min(500,std::max(0,std::atoi(env("RFD_PEER_QA_DELAY_MS").c_str())));event.deliverAt=deliverTimes[event.slot]=std::max(deliverTimes[event.slot],now()+delay+(delay?++qaPackets%5*10:0));}eventBytes+=event.packet.size();if(events.size()>=2048||eventBytes>524288){overflow=true;SetEvent(wake);return;}events.push_back(std::move(event));SetEvent(wake);}
  bool writeJson(const std::string &path,const Json &value,bool critical=true){
    if(path.empty())return true;static std::atomic<unsigned long> sequence{0};
    const auto destination=std::filesystem::u8path(path),temporary=std::filesystem::u8path(path+".new-"+std::to_string(GetCurrentProcessId())+"-"+std::to_string(sequence++));
    bool written=false;{std::ofstream file(temporary,std::ios::binary|std::ios::trunc);if(file){file<<value.dump();file.flush();written=bool(file);}}
    bool published=false;if(written)for(int attempt=0;attempt<(critical?20:1);attempt++){
      if(MoveFileExW(temporary.c_str(),destination.c_str(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH)){published=true;break;}
      DWORD error=GetLastError();if(!critical||(error!=ERROR_SHARING_VIOLATION&&error!=ERROR_ACCESS_DENIED))break;Sleep(10);
    }
    if(!published){DeleteFileW(temporary.c_str());if(critical)throw std::runtime_error("Nao foi possivel publicar o estado da conexao.");}
    return published;
  }
  void readyStatus(int port){writeJson(readyFile,{{"state","ready"},{"port",port},{"slot",self},{"transport",relayed[0]?"cloud-relay":"webrtc"},{"mode",roomMode},{"difficulty",int(difficulty)},{"username",username}});ready=true;}
  void admissionStatus(){
    if(ready)return;
    if(signal&&signal->authenticated&&signalAuthenticated&&(hosting||(transportReady&&hostWorldReady))){readyStatus(localPort);return;}
    std::string phase=transportReady&&!hostWorldReady?"waiting-host":relayRequested?"relay":"connecting";
    if(phase!=publishedPhase){writeJson(readyFile,{{"state","pending"},{"phase",phase}});publishedPhase=phase;}
  }
  void queueLocal(const Bytes &body){require(output.size()-outputOffset+body.size()+4<=262144,"Cliente local congestionado.");if(outputOffset){output.erase(output.begin(),output.begin()+outputOffset);outputOffset=0;}uint32_t n=uint32_t(body.size());for(int i=0;i<4;i++)output.push_back(static_cast<unsigned char>(n>>(8*i)));output.insert(output.end(),body.begin(),body.end());}
  bool direct(int destination,const Bytes &p){if(relayed[destination]){require(signal->online,"O relay foi desconectado.");require(signal->send({{"op","relay"},{"to",destination},{"data",encode64(p)}}),"O relay foi desconectado.");packetsSent++;return true;}auto dc=channels[destination];if(!dc||!dc->isOpen())return false;require(dc->bufferedAmount()<=262144,"Conexao congestionada. A partida foi interrompida para preservar a sincronizacao.");dc->sendBuffer(p);packetsSent++;return true;}
  void to(int slot,const Bytes &p){if(slot==self)queueLocal(p);else if(hosting)direct(slot,p);else direct(0,p);}
  void broadcast(const Bytes &p,int except=-1){for(int i=0;i<4;i++)if(joined[i]&&i!=except)to(i,p);}
  void remove(int slot){worldLoaded[slot]=false;if(!joined[slot])return;joined[slot]=false;Bytes packet{0x14,254,255,static_cast<unsigned char>(slot),6,0,0,0x40};broadcast(packet,slot);lastHeartbeat=0;}
  void packet(int source,Bytes p){
    require(p.size()>=3&&p.size()<=65535,"Pacote invalido.");packetsReceived++;
    if(!hosting){require(source==0,"Origem invalida.");if(p[0]==0x12)gameJoined=true;queueLocal(p);return;}
    if(!joined[source]){
      require(p[0]==0x11&&p[1]==255&&p[2]==254&&p.size()==31,"Ingresso invalido.");
      uint32_t program=0;memcpy(&program,p.data()+15,4);require(program==std::stoul(hash.substr(0,8),nullptr,16)&&p[7]==24&&p[8]==0&&p[9]==0&&p[10]==0&&p[19]==3&&p[20]==1&&p[21]==0,"Versao do cliente incompativel.");
      if(source!=0&&!joined[0]){require(early[source].empty(),"Ingresso duplicado.");early[source].push_back(std::move(p));return;}
      if(init.empty()){require(source==0,"Anfitriao indisponivel.");init=Bytes(p.begin()+7,p.end());memcpy(init.data()+4,&seed,4);init[15]=difficulty;}
      to(source,{0x40,254,255,static_cast<unsigned char>(source==0?1:0)});
      for(int i=0;i<4;i++)if(joined[i]){to(i,{0x13,254,255,static_cast<unsigned char>(source)});to(source,{0x13,254,255,static_cast<unsigned char>(i)});}
      joined[source]=true;Bytes accepted{0x12,254,255};accepted.insert(accepted.end(),p.begin()+3,p.begin()+7);accepted.push_back(static_cast<unsigned char>(source));accepted.insert(accepted.end(),init.begin(),init.end());to(source,accepted);
      if(source==0)for(int i=1;i<4;i++)if(!early[i].empty()){auto pending=std::move(early[i].front());early[i].clear();packet(i,std::move(pending));}
      lastHeartbeat=0;return;
    }
    if(p[0]==0x41){require(p.size()==3&&p[1]==source&&p[2]==254,"Estado do mundo invalido.");worldLoaded[source]=true;lastHeartbeat=0;return;}
    require(p[1]==source&&(p[0]==1||p[0]==2||p[0]==0x31||p[0]==0x32||p[0]==0x14),"Identidade de pacote invalida.");
    if(p[0]==0x14){require(p.size()==8&&p[3]==source,"Saida invalida.");remove(source);return;}
    require((p[0]!=2||p.size()==8)&&((p[0]!=0x31&&p[0]!=0x32)||p.size()==7),"Tamanho de pacote invalido.");
    if(p[2]==255)broadcast(p,source);else{require(p[2]<=3,"Destino invalido.");if(joined[p[2]]&&p[2]!=source)to(p[2],p);}
  }
  void receivePacket(int source,Bytes p){
    if(!hosting||source==0){packet(source,std::move(p));return;}
    require(source>0&&source<4,"Origem invalida.");if(blocked[source])return;
    try{packet(source,std::move(p));}catch(const std::exception &error){
      // Only fixed diagnostic codes are published, never payloads or credentials.
      const std::string reason=error.what();rejectionReason[source]=reason=="Ingresso invalido."?"invalid-join":reason=="Versao do cliente incompativel."?"content-version":reason=="Identidade de pacote invalida."?"packet-identity":reason=="Tamanho de pacote invalido."?"packet-size":reason=="Estado do mundo invalido."?"world-ready-format":reason=="Cliente local congestionado."?"local-backpressure":"protocol-or-transport";
      blocked[source]=true;remove(source);if(channels[source]){channels[source]->resetCallbacks();channels[source]->close();}if(peers[source]){peers[source]->resetCallbacks();peers[source]->close();}
    }
  }
  void attach(int slot,std::shared_ptr<rtc::DataChannel> dc){
    require(dc->label()=="rfd-lockstep-v1"&&!dc->reliability().unordered&&!dc->reliability().maxPacketLifeTime&&!dc->reliability().maxRetransmits,"Canal incompatível.");channels[slot]=dc;
    const auto epoch=peerEpoch[slot];
    dc->onMessage([this,slot,epoch](rtc::binary value){Event event;event.slot=slot;event.epoch=epoch;event.packet.resize(value.size());memcpy(event.packet.data(),value.data(),value.size());enqueue(std::move(event));},[this](std::string){overflow=true;SetEvent(wake);});
    dc->onClosed([this,slot,epoch]{Event e;e.slot=slot;e.epoch=epoch;e.closed=true;enqueue(e);});
    dc->onError([this,slot,epoch](std::string){Event e;e.slot=slot;e.epoch=epoch;e.closed=true;enqueue(e);});
    dc->onOpen([this,slot,epoch]{Event e;e.slot=slot;e.epoch=epoch;e.signal={{"op","data-open"},{"slot",slot}};enqueue(e);});
  }
  std::shared_ptr<rtc::PeerConnection> createPeer(int slot){
    rtc::Configuration config;config.iceServers.emplace_back("stun:stun.l.google.com:19302");config.iceServers.emplace_back("stun:stun.cloudflare.com:3478");config.maxMessageSize=65535;config.mtu=1200;
    if(env("RFD_PEER_QA_NO_DIRECT_CANDIDATES")=="1")config.iceTransportPolicy=rtc::TransportPolicy::Relay;
    auto pc=std::make_shared<rtc::PeerConnection>(config);peers[slot]=pc;const auto epoch=++peerEpoch[slot];
    pc->onLocalDescription([this,slot,epoch](rtc::Description d){Event e;e.slot=slot;e.epoch=epoch;e.signal={{"op","description"},{"to",slot},{"type",d.typeString()},{"sdp",std::string(d)}};enqueue(e);});
    pc->onLocalCandidate([this,slot,epoch](rtc::Candidate c){Event e;e.slot=slot;e.epoch=epoch;e.signal={{"op","candidate"},{"to",slot},{"candidate",std::string(c)},{"mid",c.mid()}};enqueue(e);});
    pc->onDataChannel([this,slot,epoch](std::shared_ptr<rtc::DataChannel> dc){Event e;e.slot=slot;e.epoch=epoch;e.channel=std::move(dc);enqueue(std::move(e));});
    pc->onStateChange([this,slot,epoch](rtc::PeerConnection::State s){if(s==rtc::PeerConnection::State::Failed||s==rtc::PeerConnection::State::Closed){Event e;e.slot=slot;e.epoch=epoch;e.closed=true;enqueue(e);}});return pc;
  }
  void signalEvent(const Json &m){
    const auto op=m.value("op","");
    if(op=="relay-request"&&hosting){int slot=m.at("from");require(slot>0&&slot<4,"Relay fora de fase.");if(joined[slot]&&!relayed[slot])return;relayed[slot]=true;signal->send({{"op","relay-accept"},{"to",slot}});return;}
    if(op=="relay-accept"&&!hosting&&relayRequested){require(m.at("from")==0,"Relay invalido.");relayed[0]=true;transportReady=true;admissionStatus();return;}
    if(op=="relay"){int slot=m.at("from");require(slot>=0&&slot<4&&relayed[slot],"Relay nao autorizado.");receivePacket(slot,decode64(m.at("data").get<std::string>()));return;}
    if(op=="ready"){signalAuthenticated=true;hostWorldReady=m.value("hostReady",false);admissionStatus();return;}
    if(op=="host-game-ready"&&!hosting){hostWorldReady=true;admissionStatus();return;}
    if(op=="guest-ready"&&hosting){int slot=m.at("slot");require(slot>0&&slot<4,"Participante invalido.");if(peers[slot]&&peers[slot]->state()==rtc::PeerConnection::State::Connected)return;if(peers[slot]){peers[slot]->resetCallbacks();peers[slot]->close();}auto pc=createPeer(slot);attach(slot,pc->createDataChannel("rfd-lockstep-v1"));return;}
    if(op=="description"&&m.contains("from")){int slot=m.at("from");require(slot>=0&&slot<4&&(hosting?slot>0:slot==0),"Sinal invalido.");if(!hosting&&env("RFD_PEER_QA_FORCE_RELAY")=="1")return;auto pc=peers[slot]?peers[slot]:createPeer(slot);pc->setRemoteDescription(rtc::Description(m.at("sdp").get<std::string>(),m.at("type").get<std::string>()));return;}
    if(op=="candidate"&&m.contains("from")){int slot=m.at("from");if(!hosting&&env("RFD_PEER_QA_FORCE_RELAY")=="1")return;require(slot>=0&&slot<4&&peers[slot],"Sinal fora de ordem.");peers[slot]->addRemoteCandidate(rtc::Candidate(m.at("candidate").get<std::string>(),m.at("mid").get<std::string>()));return;}
    if((op=="description"||op=="candidate")&&m.contains("to")){require(signal->send(m),"A sinalizacao caiu durante a conexao. Abra a sala novamente.");return;}
    if(op=="data-open"&&!hosting&&!ready&&!relayRequested){transportReady=true;admissionStatus();return;}
    // Loss of signaling alone does not close established gameplay connections.
    if(op=="room-closed")stopping=true;
    if(op=="peer-left"&&hosting){int slot=m.at("slot");if(slot>0&&slot<4){remove(slot);++peerEpoch[slot];early[slot].clear();blocked[slot]=false;rejectionReason[slot].clear();relayed[slot]=false;deferredBytes-=std::accumulate(deferred[slot].begin(),deferred[slot].end(),size_t(0),[](size_t n,const Event &e){return n+e.packet.size();});deferred[slot].clear();if(channels[slot]){channels[slot]->resetCallbacks();channels[slot]->close();channels[slot].reset();}if(peers[slot]){peers[slot]->resetCallbacks();peers[slot]->close();peers[slot].reset();}}return;}
  }
  void configure(){
    signalHost=env("RFD_PEER_SIGNAL_HOST");roomId=env("RFD_PEER_ROOM_ID");ticket=env("RFD_PEER_TICKET");localTicket=env("RFD_PEER_LOCAL_TICKET");hash=env("RFD_PEER_HASH");readyFile=env("RFD_PEER_READY");statsFile=env("RFD_PEER_STATS");
    require(signalHost=="returns-darkness-realm.oblique-tactical.workers.dev"&&roomId.size()==36&&ticket.size()==43&&localTicket.size()==43&&hash.size()==64,"Configuracao de rede invalida.");
    const auto boot=post(signalHost,"/signal/"+roomId+"/bootstrap",{{"ticket",ticket}});require(boot.at("contentHash")==hash,"Conteudo incompativel.");self=boot.at("slot");require(self>=0&&self<4,"Participante invalido.");hosting=self==0;seed=boot.at("seed");difficulty=boot.at("difficulty");roomMode=boot.at("mode");for(const auto &member:boot.at("members"))if(member.at("slot")==self)username=member.at("user").get<std::string>();require(!username.empty(),"Conta da sala invalida.");
    WSADATA ws;require(!WSAStartup(MAKEWORD(2,2),&ws),"Falha ao iniciar a rede.");listener=socket(AF_INET,SOCK_STREAM,IPPROTO_TCP);require(listener!=INVALID_SOCKET,"Falha ao iniciar a ponte.");BOOL exclusive=TRUE;setsockopt(listener,SOL_SOCKET,SO_EXCLUSIVEADDRUSE,(char*)&exclusive,sizeof(exclusive));
    sockaddr_in address{};address.sin_family=AF_INET;address.sin_addr.s_addr=htonl(INADDR_LOOPBACK);require(bind(listener,(sockaddr*)&address,sizeof(address))==0&&listen(listener,1)==0,"Falha na porta local.");int size=sizeof(address);getsockname(listener,(sockaddr*)&address,&size);u_long nonblock=1;ioctlsocket(listener,FIONBIO,&nonblock);
    localPort=ntohs(address.sin_port);hostWorldReady=boot.value("hostReady",false);
    signal=std::make_unique<Signal>(signalHost,"/signal/"+roomId,boot.at("token"),self);signal->receive=[this](Json m){Event e;e.signal=std::move(m);enqueue(std::move(e));};signal->start();admissionStatus();
  }
  void consumeGameInput(){
    if(!preface){auto end=std::find(input.begin(),input.end(),'\n');if(end==input.end()){require(input.size()<128,"Credencial local invalida.");return;}std::string line(input.begin(),end);require(line=="RFDROOM1 "+localTicket,"Credencial local invalida.");input.erase(input.begin(),end+1);preface=true;}
    size_t used=0;while(input.size()-used>=4){uint32_t n=0;memcpy(&n,input.data()+used,4);require(n>=3&&n<=65535,"Pacote local invalido.");if(input.size()-used<n+4)break;Bytes p(input.begin()+used+4,input.begin()+used+4+n);if(hosting)packet(self,std::move(p));else{if(p[0]==0x41)require(gameJoined&&p.size()==3&&p[1]==self&&p[2]==254,"Estado do mundo invalido.");require(direct(0,p),"Anfitriao desconectado.");if(p[0]==0x41)worldLoaded[self]=true;}used+=n+4;}if(used)input.erase(input.begin(),input.begin()+used);
  }
  void drainDeferred(){
    for(int slot=0;slot<4;slot++){auto &queue=deferred[slot];while(!queue.empty()&&queue.front().deliverAt<=now()){auto event=std::move(queue.front());queue.pop_front();deferredBytes-=event.packet.size();if(event.epoch!=peerEpoch[slot]||relayed[slot])continue;if(event.closed){if(hosting)remove(slot);else if(ready)stopping=true;}else receivePacket(slot,std::move(event.packet));}}
  }
  void pollGame(){
    if(game==INVALID_SOCKET){game=accept(listener,nullptr,nullptr);if(game==INVALID_SOCKET)return;WSAEventSelect(game,socketEvent,FD_READ|FD_CLOSE|FD_WRITE);BOOL nodelay=TRUE;setsockopt(game,IPPROTO_TCP,TCP_NODELAY,(char*)&nodelay,sizeof(nodelay));closesocket(listener);listener=INVALID_SOCKET;lastGame=now();}
    WSANETWORKEVENTS network{};WSAEnumNetworkEvents(game,socketEvent,&network);
    // Bound incomplete input, rather than the aggregate size of valid queued frames.
    // A peer can legitimately send an entire delta in one TCP burst.
    unsigned char chunk[16384];while(true){int n=recv(game,(char*)chunk,sizeof(chunk),0);if(n>0){input.insert(input.end(),chunk,chunk+n);lastGame=now();require(input.size()<=131074,"Entrada acima do limite.");consumeGameInput();}else if(n<0&&WSAGetLastError()==WSAEWOULDBLOCK)break;else{stopping=true;return;}}
    while(outputOffset<output.size()){int n=send(game,(char*)output.data()+outputOffset,int(output.size()-outputOffset),0);if(n>0)outputOffset+=n;else if(n<0&&WSAGetLastError()==WSAEWOULDBLOCK)break;else{stopping=true;return;}}if(outputOffset==output.size()){output.clear();outputOffset=0;}
  }
  void run(){configure();while(!stopping){
    require(!overflow,"Fila de rede excedida.");std::deque<Event> pending;{std::lock_guard<std::mutex> lock(eventsMutex);pending.swap(events);eventBytes=0;}
    for(auto &e:pending){if(e.slot>=0){require(e.slot<4,"Origem invalida.");if(e.epoch!=peerEpoch[e.slot])continue;}if(e.channel){attach(e.slot,e.channel);if(e.channel->isOpen()){Event opened;opened.slot=e.slot;opened.epoch=e.epoch;opened.signal={{"op","data-open"},{"slot",e.slot}};enqueue(opened);}}else if(e.closed||!e.packet.empty()){require(e.slot>=0&&e.slot<4,"Origem invalida.");deferredBytes+=e.packet.size();require(deferredBytes<=524288&&deferred[e.slot].size()<2048,"Fila de rede excedida.");deferred[e.slot].push_back(std::move(e));}else if(!e.signal.is_null())signalEvent(e.signal);}
    drainDeferred();
    pollGame();auto current=now();if(!ready&&current-created>(transportReady?180000:60000))throw std::runtime_error(transportReady?"O criador ainda nao entrou na partida. Tente novamente quando o grupo estiver pronto.":"Nao foi possivel conectar ao grupo pela conexao direta ou retransmissao. Verifique a conexao e tente novamente.");if(game==INVALID_SOCKET&&ready&&current-created>240000)throw std::runtime_error("Entrada no jogo expirou.");if(game!=INVALID_SOCKET&&current-lastGame>60000)throw std::runtime_error("Cliente local sem resposta.");
    if(signal->online&&signal->authenticated&&signalAuthenticated&&current-lastHeartbeat>=45000){Json connected=Json::array();for(int i=0;i<4;i++)if(worldLoaded[i])connected.push_back(i);signal->send({{"op","heartbeat"},{"connected",connected}});lastHeartbeat=current;}
    if(!hosting&&!ready&&!transportReady&&signal->online&&signal->authenticated&&signalAuthenticated&&current-created>8000&&current-lastRelayRequest>=2000){relayRequested=true;lastRelayRequest=current;signal->send({{"op","relay-request"},{"to",0}});admissionStatus();}
    if(current-lastStats>=5000){const auto stopFile=env("RFD_PEER_QA_SIGNAL_STOP_FILE");if(!stopFile.empty()&&signal->running&&std::filesystem::exists(std::filesystem::u8path(stopFile)))signal->stop();Json links=Json::array();for(int i=0;i<4;i++)if(peers[i]||relayed[i]){auto rtt=peers[i]?peers[i]->rtt():rtc::optional<std::chrono::milliseconds>{};bool directConnected=peers[i]&&peers[i]->state()==rtc::PeerConnection::State::Connected;links.push_back({{"slot",i},{"connected",relayed[i]||directConnected},{"directConnected",directConnected},{"transport",relayed[i]?"cloud-relay":"webrtc"},{"rttMs",rtt?rtt->count():-1},{"queuedBytes",channels[i]?channels[i]->bufferedAmount():0},{"gameJoined",hosting?joined[i]:gameJoined},{"worldLoaded",worldLoaded[i]},{"blocked",blocked[i]},{"rejectionReason",rejectionReason[i]}});}bool usesRelay=std::any_of(relayed.begin(),relayed.end(),[](bool value){return value;});writeJson(statsFile,{{"transport",usesRelay?"cloud-relay":"webrtc"},{"phase",ready?"ready":publishedPhase},{"signalOnline",signal->online.load()},{"signalAuthenticated",signalAuthenticated},{"hostWorldReady",hosting?worldLoaded[0]:hostWorldReady},{"worldHandshakeComplete",hosting?joined[self]:gameJoined},{"localWorldLoaded",worldLoaded[self]},{"hosting",hosting},{"packetsSent",packetsSent},{"packetsReceived",packetsReceived},{"links",links}},false);lastStats=current;}
    HANDLE handles[2]={wake,socketEvent};WaitForMultipleObjects(2,handles,FALSE,10);
  }}
};
int main(){std::string ready=env("RFD_PEER_READY");try{rtc::InitLogger(rtc::LogLevel::Error);rtc::SetThreadPoolSize(4);rtc::SctpSettings s;s.delayedSackTime=std::chrono::milliseconds(10);s.minRetransmitTimeout=std::chrono::milliseconds(120);s.initialRetransmitTimeout=std::chrono::milliseconds(500);s.maxRetransmitTimeout=std::chrono::milliseconds(3000);s.heartbeatInterval=std::chrono::milliseconds(5000);s.sendBufferSize=524288;s.recvBufferSize=524288;rtc::SetSctpSettings(s);Bridge bridge;bridge.run();return 0;}catch(const std::exception &error){if(!ready.empty()){std::ofstream file(std::filesystem::u8path(ready),std::ios::binary|std::ios::trunc);file<<Json({{"state","error"},{"error",error.what()}}).dump();}std::cerr<<error.what()<<std::endl;return 1;}}
