using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Threading;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

namespace ReturnsFromDarkness {
 static class Program {
  public static Mutex Instance;
  public static readonly string PipeName="RfdControl-"+WindowsIdentity.GetCurrent().User.Value;
  public static Portal Controller;
  public static Process Game,Peer;
  public static string GameRoom="",GameAccount="",ControlToken="";
  [StructLayout(LayoutKind.Sequential)] public struct CopyData {public IntPtr tag;public int size;public IntPtr data;}
  [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SendMessageTimeout(IntPtr window,uint msg,IntPtr source,ref CopyData data,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window,int command);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll",CharSet=CharSet.Ansi)] static extern IntPtr GetProp(IntPtr window,string name);
  public static string RandomToken(){using(var rng=RandomNumberGenerator.Create()){byte[] b=new byte[32];rng.GetBytes(b);return Convert.ToBase64String(b).TrimEnd('=').Replace('+','-').Replace('/','_');}}
  public static bool GameRunning{get{return Game!=null&&!Game.HasExited;}}
  public static void FocusGame(){if(GameRunning){Game.Refresh();ShowWindow(Game.MainWindowHandle,9);SetForegroundWindow(Game.MainWindowHandle);}}
  public static bool SendRoom(string text){if(!GameRunning)return false;Game.Refresh();if(Game.MainWindowHandle==IntPtr.Zero)return false;byte[] bytes=Encoding.UTF8.GetBytes(ControlToken+"\n"+text);IntPtr memory=Marshal.AllocHGlobal(bytes.Length);try{Marshal.Copy(bytes,0,memory,bytes.Length);var data=new CopyData{tag=(IntPtr)0x52464432,size=bytes.Length,data=memory};IntPtr ack;return SendMessageTimeout(Game.MainWindowHandle,0x4a,(IntPtr)Process.GetCurrentProcess().Id,ref data,2,5000,out ack)!=IntPtr.Zero&&ack==(IntPtr)1;}finally{Marshal.FreeHGlobal(memory);}}
  public static async Task<bool> Forward(string request){for(int i=0;i<20;i++){try{using(var pipe=new NamedPipeClientStream(".",PipeName,PipeDirection.Out)){pipe.Connect(250);using(var writer=new StreamWriter(pipe,new UTF8Encoding(false))){await writer.WriteLineAsync(request??"rfd://focus");await writer.FlushAsync();}}return true;}catch(IOException){}catch(TimeoutException){}await Task.Delay(100);}return false;}
  public static async Task Listen(){var security=new PipeSecurity();security.SetAccessRuleProtection(true,false);security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User,PipeAccessRights.FullControl,AccessControlType.Allow));while(Controller!=null&&!Controller.IsDisposed){try{using(var pipe=new NamedPipeServerStream(PipeName,PipeDirection.In,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,8192,8192,security)){await pipe.WaitForConnectionAsync();using(var reader=new StreamReader(pipe,Encoding.UTF8)){var line=await reader.ReadLineAsync();if(line!=null&&line.Length<=8192)Controller.BeginInvoke(new Action(()=>Controller.Accept(line)));}}}catch(ObjectDisposedException){return;}catch(IOException){}await Task.Delay(100);}}

  public const string Site="https://returns-from-darkness.vercel.app";
  public static string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ReturnsFromDarkness");
  public static JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=1048576};
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateHardLink(string link,string existing,IntPtr reserved);
  [STAThread] public static int Main(string[] args){
   ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
   try {
    if(args.Length==2&&args[0]=="--verify-release"){Verify(File.ReadAllText(args[1]));return 0;}
    if(args.Length==3&&args[0]=="--verify-package"){var m=Verify(File.ReadAllText(args[1]));CheckFiles(args[2],m);return 0;}
    if(args.Length==1&&args[0]=="--install-only"){WindowsFormsSynchronizationContext.AutoInstall=false;Directory.CreateDirectory(Root);InstallInitial();using(var status=new Label()){Update(status).GetAwaiter().GetResult();}Register();return 0;}
    Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
    Directory.CreateDirectory(Root);InstallInitial();Register();
    bool owner;Instance=new Mutex(true,"Local\\"+PipeName,out owner);
    if(!owner){if(!Forward(args.Length>0?args[0]:null).GetAwaiter().GetResult())throw new Exception("O cliente aberto ainda está preparando a conexão. Tente novamente.");Instance.Dispose();return 0;}
    try{Controller=new Portal(args.Length>0?args[0]:null);Application.Run(Controller);}finally{try{Instance.ReleaseMutex();}catch(ApplicationException){}Instance.Dispose();}return 0;
   }catch(Exception error){if(args.Length>0&&args[0].StartsWith("--verify"))return 2;MessageBox.Show(error.Message,"Returns from Darkness",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
  }
  public static Dictionary<string,object> Verify(string envelope){
   var value=Json.Deserialize<Dictionary<string,object>>(envelope);
   byte[] payload=Convert.FromBase64String((string)value["payload"]),signature=Convert.FromBase64String((string)value["signature"]);
   string key;using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("update-public.xml"))using(var reader=new StreamReader(stream)){key=reader.ReadToEnd();}
   using(var rsa=new RSACryptoServiceProvider()){rsa.PersistKeyInCsp=false;rsa.FromXmlString(key);if(!rsa.VerifyData(payload,CryptoConfig.MapNameToOID("SHA256"),signature))throw new Exception("A atualização não tem uma assinatura válida.");}
   var manifest=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(payload));
   if(!Regex.IsMatch((string)manifest["version"],@"^\d+\.\d+\.\d+$")||!Regex.IsMatch((string)manifest["contentHash"],@"^[a-f0-9]{64}$"))throw new Exception("Manifesto inválido.");
   return manifest;
  }
  public static string Hash(string file){using(var sha=SHA256.Create())using(var stream=File.OpenRead(file)){return BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","").ToLowerInvariant();}}
  public static string SafePath(string root,string relative){
   if(String.IsNullOrWhiteSpace(relative)||relative.Contains(":")||relative.Contains("\\")||relative.StartsWith("/")||relative.Split('/').Length>10)throw new Exception("Caminho de atualização inválido.");
   string path=Path.GetFullPath(Path.Combine(root,relative.Replace('/',Path.DirectorySeparatorChar)));
   if(!path.StartsWith(Path.GetFullPath(root)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Caminho fora da instalação.");return path;
  }
  public static void Extract(string archive,string directory){
   Directory.CreateDirectory(directory);using(var zip=ZipFile.OpenRead(archive)){
    if(zip.Entries.Count>2048)throw new Exception("Pacote acima do limite.");
    long total=0;foreach(var entry in zip.Entries){total+=entry.Length;if(total>2000000000L)throw new Exception("Pacote acima do limite.");if(entry.FullName.EndsWith("/"))continue;string path=SafePath(directory,entry.FullName);Directory.CreateDirectory(Path.GetDirectoryName(path));entry.ExtractToFile(path,true);}
   }
  }
  public static void CheckFiles(string directory,Dictionary<string,object> manifest){
   foreach(var item in (System.Collections.IEnumerable)manifest["files"]){var file=(Dictionary<string,object>)item;string path=SafePath(directory,(string)file["path"]);if(!File.Exists(path)||new FileInfo(path).Length!=Convert.ToInt64(file["size"])||Hash(path)!=(string)file["sha256"])throw new Exception("Arquivo do cliente não confere: "+file["path"]);}
  }
  public static void InstallInitial(){
   string installed=Path.Combine(Root,"ReturnsFromDarkness.exe");
   if(!File.Exists(installed)){File.Copy(Assembly.GetExecutingAssembly().Location,installed,false);}
   string marker=Path.Combine(Root,"current.json");if(File.Exists(marker))return;
   using(var resource=Assembly.GetExecutingAssembly().GetManifestResourceStream("initial.zip")){
    if(resource==null)return;string archive=Path.Combine(Root,"initial.zip");using(var output=File.Create(archive))resource.CopyTo(output);
    string versionDir=Path.Combine(Root,"versions","0.3.2");Extract(archive,versionDir);
    string envelope=File.ReadAllText(Path.Combine(versionDir,"release.json"));var manifest=Verify(envelope);CheckFiles(versionDir,manifest);Activate(envelope);File.Delete(archive);
   }
  }
  public static void Activate(string envelope){string pointer=Path.Combine(Root,"current.json"),temp=pointer+".new";File.WriteAllText(temp,envelope,Encoding.UTF8);if(File.Exists(pointer))File.Replace(temp,pointer,pointer+".previous");else File.Move(temp,pointer);}
  public static void Register(){
   string exe=Path.Combine(Root,"ReturnsFromDarkness.exe"),pointer=Path.Combine(Root,"current.json");
   if(File.Exists(pointer)){var current=Verify(File.ReadAllText(pointer));string directory=Path.Combine(Root,"versions",(string)current["version"]);CheckFiles(directory,current);if(current.ContainsKey("launcher")){exe=SafePath(directory,(string)current["launcher"]);string stable=Path.Combine(Root,"ReturnsFromDarkness.exe");if(!File.Exists(stable)||Hash(stable)!=Hash(exe)){try{File.Copy(exe,stable,true);}catch(IOException){}}}}
   using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Classes\rfd")){key.SetValue("","Returns from Darkness");key.SetValue("URL Protocol","");using(var command=key.CreateSubKey(@"shell\open\command"))command.SetValue("","\""+exe+"\" \"%1\"");}
  }
  public static async Task<Dictionary<string,object>> Update(Label status){
   string envelope;using(var web=new WebClient()){web.Encoding=Encoding.UTF8;status.Text="Verificando atualizações…";web.Headers[HttpRequestHeader.CacheControl]="no-cache";envelope=await web.DownloadStringTaskAsync(Site+"/downloads/latest.json?check="+DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());}
   var manifest=Verify(envelope);string pointer=Path.Combine(Root,"current.json");if(File.Exists(pointer)){var installed=Verify(File.ReadAllText(pointer));if(new Version((string)manifest["version"])<new Version((string)installed["version"]))throw new Exception("A central apresentou uma versão anterior. Tente novamente em instantes.");}string directory=Path.Combine(Root,"versions",(string)manifest["version"]);
   if(File.Exists(Path.Combine(directory,(string)manifest["executable"]))){CheckFiles(directory,manifest);Activate(envelope);return manifest;}
   
   var uri=new Uri((string)manifest["archiveUrl"]);if(uri.Scheme!="https"||uri.Host!="github.com"||!uri.AbsolutePath.StartsWith("/VagJr/returns-from-darkness/releases/download/"))throw new Exception("Destino de atualização inválido.");
   string archive=Path.Combine(Root,"update-"+manifest["version"]+".zip");using(var web=new WebClient()){web.DownloadProgressChanged+=(s,e)=>status.Text="Atualizando cliente… "+e.ProgressPercentage+"%";await web.DownloadFileTaskAsync(uri,archive);}
   if(Hash(archive)!=(string)manifest["archiveSha256"])throw new Exception("Download incompleto. A versão instalada foi preservada.");
   string stage=directory+"-staging-"+Guid.NewGuid().ToString("N");Extract(archive,stage);CheckFiles(stage,manifest);Directory.Move(stage,directory);Activate(envelope);File.Delete(archive);return manifest;
  }
  public static void ImportData(string filename){
   string data=Path.Combine(Root,"data");Directory.CreateDirectory(data);string target=Path.Combine(data,filename);if(File.Exists(target))return;
   string[] paths={@"C:\diabloHD\runtime\thehell3\bin",@"C:\Program Files\GOG Galaxy\Games\Diablo",@"C:\GOG Games\Diablo"};
   foreach(string folder in paths){string candidate=Path.Combine(folder,filename);if(File.Exists(candidate)){File.Copy(candidate,target);return;}}
   using(var dialog=new OpenFileDialog{Title="Selecione "+filename,Filter=filename+"|"+filename,CheckFileExists=true}){if(dialog.ShowDialog()!=DialogResult.OK)throw new Exception("Importação dos arquivos do jogo pendente.");File.Copy(dialog.FileName,target);}
  }
  public static bool RefreshLauncher(Dictionary<string,object> manifest,string request){
   Register();if(!manifest.ContainsKey("launcher"))return false;string next=SafePath(Path.Combine(Root,"versions",(string)manifest["version"]),(string)manifest["launcher"]);
   if(Hash(next)==Hash(Assembly.GetExecutingAssembly().Location))return false;
   if(GameRunning)return false;if(Instance!=null)Instance.ReleaseMutex();Process.Start(new ProcessStartInfo(next,request==null?"":"\""+request+"\""){UseShellExecute=false});return true;
  }
  public static async Task Launch(Dictionary<string,object> manifest,string request,Label status){
   if(GameRunning&&(request==null||request=="rfd://focus")){FocusGame();return;}
   string directory=Path.Combine(Root,"versions",(string)manifest["version"]);CheckFiles(directory,manifest);
   foreach(string filename in new[]{"DIABDAT.MPQ","TH3data.mor"}){ImportData(filename);string source=Path.Combine(Root,"data",filename),target=Path.Combine(directory,filename);if(!File.Exists(target)&&!CreateHardLink(target,source,IntPtr.Zero))File.Copy(source,target);}
   if(Hash(Path.Combine(directory,"TH3data.mor"))!=(string)manifest["dataSha256"])throw new Exception("O pacote de recursos não corresponde a esta versão do cliente.");
   var info=new ProcessStartInfo(Path.Combine(directory,(string)manifest["executable"])){WorkingDirectory=directory,UseShellExecute=false};info.EnvironmentVariables["RFD_PORTAL_URL"]=Site+"/central/";info.EnvironmentVariables["RFD_CONTENT_HASH"]=(string)manifest["contentHash"];
   string account="offline";Dictionary<string,object> invite=null;Process peer=null;
   if(request!=null&&request.StartsWith("rfd://play/")){
    string encoded=request.Substring(11);if(encoded.Length>4096||!Regex.IsMatch(encoded,@"^[A-Za-z0-9_-]+$"))throw new Exception("Convite inválido.");encoded=encoded.Replace('-','+').Replace('_','/');encoded=encoded.PadRight((encoded.Length+3)/4*4,'=');invite=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(encoded)));
    foreach(string required in new[]{"contentHash","expires","transport","signalUrl","roomId","username","ticket","room"})if(!invite.ContainsKey(required))throw new Exception("Este convite usa uma conexão antiga. Abra a sala novamente na central.");
    if((string)invite["contentHash"]!=(string)manifest["contentHash"]||Convert.ToInt64(invite["expires"])<DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()||Convert.ToInt64(invite["expires"])>DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()+180000)throw new Exception("Convite expirado ou cliente desatualizado. Abra a sala novamente.");
    if(!invite.ContainsKey("transport")||(string)invite["transport"]!="webrtc"||(string)invite["signalUrl"]!=(string)manifest["signalUrl"]||!Regex.IsMatch((string)invite["roomId"],@"^[a-f0-9-]{36}$"))throw new Exception("Conexão do convite não autorizada.");
    account=((string)invite["username"]).ToLowerInvariant();if(!Regex.IsMatch(account,@"^[a-z][a-z0-9_-]{2,15}$")||!Regex.IsMatch((string)invite["ticket"],@"^[A-Za-z0-9_-]{43}$"))throw new Exception("Convite inválido.");
    info.EnvironmentVariables["RFD_CONTENT_HASH"]=(string)invite["contentHash"];info.EnvironmentVariables["RFD_ROOM_NAME"]=(string)invite["room"];
   }
   string profile=Path.Combine(Root,"profiles",account);Directory.CreateDirectory(profile);if(!File.Exists(Path.Combine(profile,"config.ini")))File.Copy(Path.Combine(directory,"config.ini"),Path.Combine(profile,"config.ini"));info.EnvironmentVariables["RFD_PROFILE"]=profile;
   if(invite!=null&&GameRunning&&GameRoom==(string)invite["roomId"]&&GameAccount==account&&GetProp(Game.MainWindowHandle,"RFD_GAME_IN_ROOM")!=IntPtr.Zero){FocusGame();return;}
   if(GameRunning&&Path.GetFileName(Game.MainModule.FileName)!=(string)manifest["executable"])throw new Exception("A atualização está pronta. Saia da partida e feche o jogo para aplicar a nova versão.");
   if(invite!=null){
    string localTicket;using(var rng=RandomNumberGenerator.Create()){byte[] bytes=new byte[32];rng.GetBytes(bytes);localTicket=Convert.ToBase64String(bytes).TrimEnd('=').Replace('+','-').Replace('/','_');}
    string ready=Path.Combine(profile,"peer-"+Guid.NewGuid().ToString("N")+".json");
    var companion=new ProcessStartInfo(SafePath(directory,(string)manifest["peerExecutable"])){WorkingDirectory=directory,UseShellExecute=false,CreateNoWindow=true};
    companion.EnvironmentVariables["RFD_PEER_SIGNAL_HOST"]=new Uri((string)manifest["signalUrl"]).Host;companion.EnvironmentVariables["RFD_PEER_ROOM_ID"]=(string)invite["roomId"];companion.EnvironmentVariables["RFD_PEER_TICKET"]=(string)invite["ticket"];companion.EnvironmentVariables["RFD_PEER_LOCAL_TICKET"]=localTicket;companion.EnvironmentVariables["RFD_PEER_HASH"]=(string)manifest["contentHash"];companion.EnvironmentVariables["RFD_PEER_READY"]=ready;companion.EnvironmentVariables["RFD_PEER_STATS"]=Path.Combine(profile,"network-status.json");
    peer=Process.Start(companion);status.Text="Conectando ao grupo…";var deadline=DateTime.UtcNow.AddSeconds(50);Dictionary<string,object> connected=null;
    try{while(DateTime.UtcNow<deadline){
      if(File.Exists(ready)){try{connected=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(ready));}catch(ArgumentException){}catch(IOException){}if(connected!=null){if((string)connected["state"]=="error")throw new Exception((string)connected["error"]);if((string)connected["state"]=="ready")break;}}
      if(peer.HasExited)throw new Exception("Não foi possível conectar ao grupo. Abra a sala novamente.");await Task.Delay(100);
     }
     if(connected==null||(string)connected["state"]!="ready")throw new Exception("Tempo de conexão esgotado. Abra a sala novamente.");
     int port=Convert.ToInt32(connected["port"]);if(port<1||port>65535)throw new Exception("Porta local inválida.");
     info.EnvironmentVariables["RFD_ROOM_HOST"]="127.0.0.1";info.EnvironmentVariables["RFD_ROOM_PORT"]=port.ToString();info.EnvironmentVariables["RFD_ROOM_TICKET"]=localTicket;info.EnvironmentVariables["RFD_ROOM_MODE"]=connected.ContainsKey("mode")?(string)connected["mode"]:"campaign-coop";
    }catch{if(!peer.HasExited)peer.Kill();throw;}finally{if(File.Exists(ready))File.Delete(ready);}
   }
   try{
    if(GameRunning){
      string roomText=String.Join("\n",new[]{"room",profile,"127.0.0.1",info.EnvironmentVariables["RFD_ROOM_PORT"],info.EnvironmentVariables["RFD_ROOM_TICKET"],(string)manifest["contentHash"],((string)invite["room"]).Replace("\r","").Replace("\n"," "),info.EnvironmentVariables["RFD_ROOM_MODE"],(string)invite["roomId"]});
      if(!SendRoom(roomText))throw new Exception("O jogo está finalizando uma transição. Tente novamente em instantes.");
    }else{
      ControlToken=RandomToken();info.EnvironmentVariables["RFD_CONTROL_TOKEN"]=ControlToken;info.EnvironmentVariables["RFD_CONTROL_PID"]=Process.GetCurrentProcess().Id.ToString();
      Game=Process.Start(info);Game.EnableRaisingEvents=true;Game.Exited+=(s,e)=>{if(Controller!=null&&!Controller.IsDisposed)Controller.BeginInvoke(new Action(()=>{GameRoom="";GameAccount="";Controller.Show();}));};
    }
    Peer=peer;GameRoom=invite==null?"":(string)invite["roomId"];GameAccount=account;FocusGame();status.Text="Cliente aberto. Escolha seu personagem para entrar na partida.";
   }catch{if(peer!=null&&!peer.HasExited)peer.Kill();throw;}
  }
 }
 class Portal:Form {
  Label status;Button play,central;string request;Dictionary<string,object> manifest;bool loaded=false;readonly Queue<string> requests=new Queue<string>();bool processing=false;NotifyIcon tray;
  public Portal(string value){request=value;Text="Returns from Darkness HD";Width=720;Height=440;BackColor=Color.FromArgb(12,15,19);ForeColor=Color.FromArgb(230,213,180);Font=new Font("Georgia",12);StartPosition=FormStartPosition.CenterScreen;
   Controls.Add(new Label{Text="RETURNS FROM DARKNESS",Font=new Font("Georgia",28),AutoSize=true,Location=new Point(38,55)});Controls.Add(new Label{Text="READY TO PLAY",AutoSize=true,ForeColor=Color.FromArgb(192,144,76),Location=new Point(40,112)});
   status=new Label{Text="Preparando a sua jornada…",Width=620,Height=68,Location=new Point(40,165)};Controls.Add(status);
   play=new Button{Text="ABRIR CLIENTE",Width=285,Height=55,Location=new Point(40,265),Enabled=false};central=new Button{Text="CENTRAL DA COMUNIDADE",Width=300,Height=55,Location=new Point(345,265)};Controls.Add(play);Controls.Add(central);
   tray=new NotifyIcon{Icon=SystemIcons.Application,Text="Returns from Darkness HD",Visible=true};tray.DoubleClick+=(s,e)=>Accept("rfd://focus");var menu=new ContextMenuStrip();menu.Items.Add("Abrir cliente",null,(s,e)=>Accept("rfd://focus"));menu.Items.Add("Central da comunidade",null,(s,e)=>Process.Start(Program.Site+"/central/"));menu.Items.Add("Fechar central",null,(s,e)=>{if(Program.GameRunning){Hide();return;}tray.Visible=false;Close();});tray.ContextMenuStrip=menu;
   central.Click+=(s,e)=>Process.Start(Program.Site+"/central/");play.Click+=(s,e)=>Accept(request??"rfd://open");
   FormClosing+=(s,e)=>{if(Program.GameRunning){e.Cancel=true;Hide();}else tray.Dispose();};
   Shown+=async(s,e)=>{if(loaded)return;loaded=true;var listener=Program.Listen();Accept(request??"rfd://open");await Task.CompletedTask;};
  }
  public async void Accept(string value){requests.Enqueue(value);if(processing)return;processing=true;play.Enabled=false;
   try{while(requests.Count>0){string next=requests.Dequeue();try{
    if(next=="rfd://central"||next=="rfd://central/"){Process.Start(Program.Site+"/central/");continue;}
    if(Program.GameRunning&&(next=="rfd://focus"||next=="rfd://open")){Program.FocusGame();Hide();continue;}
    manifest=await Program.Update(status);if(Program.RefreshLauncher(manifest,next)){tray.Dispose();Close();return;}
    if(next=="rfd://focus")next=null;
    await Program.Launch(manifest,next=="rfd://open"?null:next,status);request=null;Hide();
   }catch(Exception error){status.Text=error.Message;Show();Activate();}}}finally{processing=false;play.Enabled=true;}
  }
 }
}
