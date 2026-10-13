// Project transport adapter. Uses the existing central room framing, with TH3-specific version gating.
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <bcrypt.h>
#include "room_transport.h"
#include <array>
#include <deque>
#include <mutex>
#include <string>
#include <vector>
#include <algorithm>
#include <cstring>
#include <stdexcept>

namespace {
using Bytes=std::vector<unsigned char>;
uint32_t read32(const unsigned char *p){return uint32_t(p[0])|uint32_t(p[1])<<8|uint32_t(p[2])<<16|uint32_t(p[3])<<24;}
void append32(Bytes &b,uint32_t n){for(int i=0;i<4;i++)b.push_back(static_cast<unsigned char>(n>>(i*8)));}
struct Turn{unsigned char sequence;uint32_t value;};
struct Message{unsigned int sender;Bytes payload;};
class Room {
public:
 std::recursive_mutex mutex;
 SOCKET socket=INVALID_SOCKET;bool wsa=false,starts=false,awaiting=true;
 int slot=-1;uint32_t seed=0;unsigned int difficulty=0;unsigned char current=0,next=0;
 std::string error;Bytes input;
 std::array<bool,4> connected{};std::array<std::deque<Turn>,4> turns;
 std::deque<Message> messages;Message last;std::deque<std::pair<int,uint32_t>> events;
 ~Room(){close();}
 void close(){if(socket!=INVALID_SOCKET){closesocket(socket);socket=INVALID_SOCKET;}if(wsa){WSACleanup();wsa=false;}slot=-1;connected.fill(false);for(auto &q:turns)q.clear();messages.clear();events.clear();input.clear();last.payload.clear();current=next=0;awaiting=true;starts=false;}
 [[noreturn]] void fail(const char *text){error=text;if(socket!=INVALID_SOCKET){closesocket(socket);socket=INVALID_SOCKET;}throw std::runtime_error(text);}
 void write(const unsigned char *data,size_t size){
  const auto deadline=GetTickCount64()+5000;
  while(size){int written=send(socket,reinterpret_cast<const char *>(data),static_cast<int>(size),0);
   if(written>0){data+=written;size-=written;continue;}
   if(written==SOCKET_ERROR&&WSAGetLastError()==WSAEWOULDBLOCK){if(GetTickCount64()>deadline)fail("Tempo de envio esgotado.");WSAPOLLFD fd{socket,POLLWRNORM,0};WSAPoll(&fd,1,50);continue;}
   fail("Conexao da sala encerrada durante o envio.");
  }
 }
 void packet(const Bytes &body){if(socket==INVALID_SOCKET)fail("Sala desconectada.");Bytes frame;append32(frame,static_cast<uint32_t>(body.size()));frame.insert(frame.end(),body.begin(),body.end());write(frame.data(),frame.size());}
 void sendTurn(Turn turn,int destination=255){Bytes body{2,static_cast<unsigned char>(slot),static_cast<unsigned char>(destination),turn.sequence};append32(body,turn.value);packet(body);}
 void connectPlayer(unsigned char player){
  if(player>3)fail("Identificador de jogador invalido.");bool existed=connected[player];connected[player]=true;
  if(!existed&&!awaiting&&slot>=0&&player!=slot)for(auto turn:turns[slot])sendTurn(turn,player);
 }
 void handle(const Bytes &p){
  if(p.size()<3)fail("Pacote incompleto.");
  switch(p[0]){
   case 0x40:if(p.size()!=4||p[1]!=254||p[2]!=255)fail("Papel central invalido.");starts=p[3]==1;awaiting=!starts;break;
   case 0x12:if(p.size()!=32||p[7]>3)fail("Aceite de sala invalido.");slot=p[7];seed=read32(p.data()+12);difficulty=p[23];connectPlayer(static_cast<unsigned char>(slot));break;
   case 0x13:if(p.size()!=4||p[1]!=254)fail("Entrada de jogador invalida.");connectPlayer(p[3]);break;
   case 0x14:if(p.size()!=8||p[3]>3)fail("Saida de jogador invalida.");connected[p[3]]=false;turns[p[3]].clear();events.emplace_back(p[3],read32(p.data()+4));break;
   case 1:if(p[1]>3||messages.size()>=512)fail("Fila de mensagens invalida.");connectPlayer(p[1]);messages.push_back({p[1],Bytes(p.begin()+3,p.end())});break;
   case 2:{if(p.size()!=8||p[1]>3||turns[p[1]].size()>=256)fail("Fila de turnos invalida.");connectPlayer(p[1]);turns[p[1]].push_back({p[3],read32(p.data()+4)});
    if(awaiting){current=next=p[3];awaiting=false;if(slot>=0)for(auto &turn:turns[slot]){turn.sequence=next++;sendTurn(turn);}}break;}
   case 0x31:{if(p.size()!=7||p[1]>3)fail("Ping invalido.");Bytes reply=p;reply[0]=0x32;reply[2]=p[1];reply[1]=static_cast<unsigned char>(slot);packet(reply);break;}
   case 0x32:if(p.size()!=7)fail("Resposta de ping invalida.");break;
   default:fail("Tipo de pacote desconhecido.");
  }
 }
 void poll(){
  if(socket==INVALID_SOCKET)return;unsigned char chunk[16384];
  while(true){int size=recv(socket,reinterpret_cast<char *>(chunk),sizeof(chunk),0);
   if(size>0){input.insert(input.end(),chunk,chunk+size);if(input.size()>131074)fail("Limite de recepcao excedido.");}
   else if(size==SOCKET_ERROR&&WSAGetLastError()==WSAEWOULDBLOCK)break;
   else fail("O servidor encerrou a conexao da sala.");
   size_t used=0;
   while(input.size()-used>=4){uint32_t length=read32(input.data()+used);if(length<3||length>65535)fail("Tamanho de pacote invalido.");if(input.size()-used<length+4)break;handle(Bytes(input.begin()+used+4,input.begin()+used+4+length));used+=length+4;}
   if(used)input.erase(input.begin(),input.begin()+used);
  }
 }
 int open(const char *host,unsigned short port,const char *ticket,const char *hash){
  close();error.clear();if(!host||!ticket||!hash||strlen(ticket)!=43||strlen(hash)!=64||!port)fail("Configuracao da sala incompleta.");
  for(const char *p=ticket;*p;p++)if(!isalnum(static_cast<unsigned char>(*p))&&*p!='-'&&*p!='_')fail("Ticket invalido.");
  uint32_t program=0;for(int i=0;i<64;i++){char c=hash[i];if(!((c>='0'&&c<='9')||(c>='a'&&c<='f')))fail("Pacote de conteudo invalido.");if(i<8)program=(program<<4)|(c<='9'?c-'0':c-'a'+10);}
  WSADATA data;if(WSAStartup(MAKEWORD(2,2),&data))fail("Nao foi possivel iniciar a rede.");wsa=true;
  addrinfo hints{};hints.ai_family=AF_INET;hints.ai_socktype=SOCK_STREAM;addrinfo *addresses=nullptr;
  std::string portText=std::to_string(port);if(getaddrinfo(host,portText.c_str(),&hints,&addresses))fail("Nao foi possivel resolver o servidor.");
  for(auto address=addresses;address;address=address->ai_next){socket=::socket(address->ai_family,address->ai_socktype,address->ai_protocol);if(socket==INVALID_SOCKET)continue;u_long nonblock=1;ioctlsocket(socket,FIONBIO,&nonblock);
   int result=::connect(socket,address->ai_addr,static_cast<int>(address->ai_addrlen));
   if(result==0)break;
   if(WSAGetLastError()==WSAEWOULDBLOCK){WSAPOLLFD fd{socket,POLLWRNORM,0};if(WSAPoll(&fd,1,5000)>0){int connectionError=0;int length=sizeof(connectionError);getsockopt(socket,SOL_SOCKET,SO_ERROR,reinterpret_cast<char *>(&connectionError),&length);if(!connectionError)break;}}
   closesocket(socket);socket=INVALID_SOCKET;
  }
  freeaddrinfo(addresses);if(socket==INVALID_SOCKET)fail("Nao foi possivel conectar ao servidor.");BOOL nodelay=TRUE;setsockopt(socket,IPPROTO_TCP,TCP_NODELAY,reinterpret_cast<const char *>(&nodelay),sizeof(nodelay));
  std::string preface=std::string("RFDROOM1 ")+ticket+"\n";write(reinterpret_cast<const unsigned char *>(preface.data()),preface.size());
  uint32_t cookie=0;if(BCryptGenRandom(nullptr,reinterpret_cast<PUCHAR>(&cookie),4,BCRYPT_USE_SYSTEM_PREFERRED_RNG)!=0)fail("Nao foi possivel gerar o identificador de conexao.");
  Bytes join{0x11,255,254};append32(join,cookie);append32(join,24);append32(join,0);append32(join,program);join.insert(join.end(),{3,1,0,0});join.resize(31,0);packet(join);
  auto deadline=GetTickCount64()+30000;while(slot<0&&GetTickCount64()<deadline){poll();if(slot<0){WSAPOLLFD fd{socket,POLLRDNORM,0};WSAPoll(&fd,1,20);}}
  if(slot<0)fail("O servidor nao confirmou a entrada na sala.");return 1;
 }
 int receiveTurns(uint32_t *values,uint32_t *sizes,uint32_t *status){
  poll();bool all=slot>=0;
  for(int i=0;i<4;i++){sizes[i]=status[i]=0;values[i]=0;if(!connected[i])continue;status[i]=0x10000;
   while(!turns[i].empty()&&static_cast<unsigned char>(turns[i].front().sequence-current)>127)turns[i].pop_front();
   if(turns[i].empty()||turns[i].front().sequence!=current)all=false;else status[i]|=0x40000;
  }
  if(!all)return 0;
  for(int i=0;i<4;i++){if(!connected[i]||turns[i].empty()||turns[i].front().sequence!=current)continue;values[i]=turns[i].front().value;sizes[i]=4;status[i]|=0x20000;turns[i].pop_front();}
  current++;return 1;
 }
} room;
template<class Action> int invoke(Action action){std::lock_guard<std::recursive_mutex> lock(room.mutex);try{return action();}catch(const std::exception &e){room.error=e.what();return 0;}catch(...){room.error="Falha interna na rede.";return 0;}}
}
extern "C" {
int rfd_room_open(const char *h,unsigned short p,const char *t,const char *hash){return invoke([&]{return room.open(h,p,t,hash);});}
void rfd_room_close(){std::lock_guard<std::recursive_mutex> lock(room.mutex);room.close();}
int rfd_room_alive(){return invoke([&]{room.poll();return room.socket!=INVALID_SOCKET?1:0;});}
int rfd_room_slot(){return invoke([&]{return room.slot;});}
int rfd_room_starts_world(){return invoke([&]{return room.starts?1:0;});}
uint32_t rfd_room_seed(){std::lock_guard<std::recursive_mutex> lock(room.mutex);return room.seed;}
unsigned int rfd_room_difficulty(){std::lock_guard<std::recursive_mutex> lock(room.mutex);return room.difficulty;}
int rfd_room_send_message(int destination,const void *data,unsigned int size){return invoke([&]{if(room.slot<0||size>65532||(!data&&size)||destination < -2||destination>3)return 0;Bytes payload(static_cast<const unsigned char *>(data),static_cast<const unsigned char *>(data)+size);if(destination==-1||destination==room.slot)room.messages.push_back({static_cast<unsigned int>(room.slot),payload});if(destination!=room.slot){Bytes p{1,static_cast<unsigned char>(room.slot),static_cast<unsigned char>(destination<0?255:destination)};p.insert(p.end(),payload.begin(),payload.end());room.packet(p);}return 1;});}
int rfd_room_receive_message(unsigned int *sender,void **data,unsigned int *size){return invoke([&]{room.poll();if(room.messages.empty())return 0;room.last=std::move(room.messages.front());room.messages.pop_front();*sender=room.last.sender;*size=static_cast<unsigned int>(room.last.payload.size());*data=room.last.payload.data();return 1;});}
int rfd_room_send_turn(uint32_t value){return invoke([&]{room.poll();if(room.slot<0||room.turns[room.slot].size()>=256)return 0;Turn turn{room.next++,value};room.turns[room.slot].push_back(turn);if(!room.awaiting)room.sendTurn(turn);return 1;});}
int rfd_room_receive_turns(uint32_t *v,uint32_t *sizes,uint32_t *status){return invoke([&]{return room.receiveTurns(v,sizes,status);});}
unsigned int rfd_room_turns_waiting(int owner){std::lock_guard<std::recursive_mutex> lock(room.mutex);try{room.poll();int player=room.slot;if(owner)for(int i=0;i<4;i++)if(room.connected[i]){player=i;break;}return player>=0?static_cast<unsigned int>(room.turns[player].size()):0;}catch(...){return 0;}}
int rfd_room_event(int *player,uint32_t *reason){return invoke([&]{room.poll();if(room.events.empty())return 0;*player=room.events.front().first;*reason=room.events.front().second;room.events.pop_front();return 1;});}
const char *rfd_room_error(){return room.error.c_str();}
}
