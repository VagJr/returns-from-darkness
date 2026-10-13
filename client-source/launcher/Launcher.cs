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

[assembly: AssemblyTitle("Returns from Darkness HD")]
[assembly: AssemblyProduct("Returns from Darkness HD")]
[assembly: AssemblyDescription("Cliente e atualizações de Returns from Darkness")]
[assembly: AssemblyVersion("0.3.4.0")]
[assembly: AssemblyFileVersion("0.3.4.0")]
namespace ReturnsFromDarkness {
 static class Program {
  public static Mutex Instance;
  public static string PipeName="RfdControl-"+WindowsIdentity.GetCurrent().User.Value;
  public static string InstanceAccount="";
  public static string InviteAccount(string request){try{if(request==null||!request.StartsWith("rfd://play/"))return "";string text=request.Substring(11);if(text.Length>4096||!Regex.IsMatch(text,@"^[A-Za-z0-9_-]+$"))return "";text=text.Replace('-','+').Replace('_','/');text=text.PadRight((text.Length+3)/4*4,'=');var invite=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(text)));object user;if(!invite.TryGetValue("username",out user)||!(user is string))return "";string name=((string)user).ToLowerInvariant();return Regex.IsMatch(name,@"^[a-z][a-z0-9_-]{2,15}$")?name:"";}catch{return "";}}
  public static string RequestAccount(string request){string value=InviteAccount(request);if(value!="")return value;var match=Regex.Match(request??"",@"^rfd://(?:resume/([a-z][a-z0-9_-]{2,15})/[a-f0-9-]{36}(?:\?auth=[A-Za-z0-9_-]{43})?|auth/([a-z][a-z0-9_-]{2,15})/[A-Za-z0-9_-]{43})$");return match.Success?(match.Groups[1].Success?match.Groups[1].Value:match.Groups[2].Value):"";}
  public static bool RouteAccount(string request){string account=RequestAccount(request);if(account==""||account==InstanceAccount||GameRunning&&(GameAccount=="offline"||GameAccount==account))return false;
   string channel="RfdControl-"+WindowsIdentity.GetCurrent().User.Value+"-"+account;
   try{using(var pipe=new NamedPipeClientStream(".",channel,PipeDirection.Out)){pipe.Connect(150);using(var writer=new StreamWriter(pipe,new UTF8Encoding(false))){writer.WriteLine(request);writer.Flush();}}return true;}catch(IOException){}catch(TimeoutException){}
   if(!GameRunning)return false;Process.Start(new ProcessStartInfo(Assembly.GetExecutingAssembly().Location,"--account "+account+" \""+request+"\""){UseShellExecute=false,CreateNoWindow=true});return true;
  }
  public static Portal Controller;
  public static Process Game,Peer;
  public static string GameRoom="",GameAccount="",ControlToken="";
  public static string LastRoomControl="";
  [StructLayout(LayoutKind.Sequential)] public struct CopyData {public IntPtr tag;public int size;public IntPtr data;}
  [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SendMessageTimeout(IntPtr window,uint msg,IntPtr source,ref CopyData data,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window,int command);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll",CharSet=CharSet.Ansi)] static extern IntPtr GetProp(IntPtr window,string name);
  public static string RandomToken(){using(var rng=RandomNumberGenerator.Create()){byte[] b=new byte[32];rng.GetBytes(b);return Convert.ToBase64String(b).TrimEnd('=').Replace('+','-').Replace('/','_');}}
  public static bool GameRunning{get{return Game!=null&&!Game.HasExited;}}
  public static void FocusGame(){if(GameRunning){Game.Refresh();ShowWindow(Game.MainWindowHandle,9);SetForegroundWindow(Game.MainWindowHandle);}}
  public static bool SendRoom(string text){if(!GameRunning)return false;Game.Refresh();if(Game.MainWindowHandle==IntPtr.Zero)return false;byte[] bytes=Encoding.UTF8.GetBytes(ControlToken+"\n"+text);IntPtr memory=Marshal.AllocHGlobal(bytes.Length);try{Marshal.Copy(bytes,0,memory,bytes.Length);var data=new CopyData{tag=(IntPtr)0x52464432,size=bytes.Length,data=memory};IntPtr ack;return SendMessageTimeout(Game.MainWindowHandle,0x4a,(IntPtr)Process.GetCurrentProcess().Id,ref data,2,5000,out ack)!=IntPtr.Zero&&ack==(IntPtr)1;}finally{Marshal.FreeHGlobal(memory);}}
  public static bool Resume(string request){var match=Regex.Match(request??"",@"^rfd://resume/([a-z][a-z0-9_-]{2,15})/([a-f0-9-]{36})(?:\?auth=[A-Za-z0-9_-]{43})?$");if(!match.Success)return false;string account=match.Groups[1].Value,room=match.Groups[2].Value;if(GameRunning&&GameAccount!=account){Process.Start(new ProcessStartInfo(Assembly.GetExecutingAssembly().Location,"--account "+account+" \""+request+"\""){UseShellExecute=false,CreateNoWindow=true});return true;}if(!GameRunning||GameAccount!=account||GameRoom!=room||Peer==null||Peer.HasExited)throw new Exception("A conexão anterior foi encerrada. Atualize as salas e abra a partida novamente.");Game.Refresh();if(GetProp(Game.MainWindowHandle,"RFD_GAME_IN_ROOM")==IntPtr.Zero&&!SendRoom(LastRoomControl))throw new Exception("A partida está finalizando uma transição. Tente novamente.");FocusGame();return true;}
  public static string AuthAccount="";
  static Dictionary<string,DateTime> UsedAuthCodes=new Dictionary<string,DateTime>();
  public const string Realm="https://returns-darkness-realm.oblique-tactical.workers.dev/api/";
  public static string PreferredAccount(){if(AuthAccount!="")return AuthAccount;if(InstanceAccount!="")return InstanceAccount;string path=Path.Combine(Root,"last-account.txt");if(File.Exists(path)){string name=File.ReadAllText(path).Trim();if(Regex.IsMatch(name,@"^[a-z][a-z0-9_-]{2,15}$"))return name;}return "offline";}
  public static async Task<Dictionary<string,object>> AccountApi(string route,Dictionary<string,object> input,string token){
   using(var web=new WebClient()){web.Encoding=Encoding.UTF8;web.Headers[HttpRequestHeader.ContentType]="application/json";if(token!=null)web.Headers[HttpRequestHeader.Authorization]="Bearer "+token;string response=await web.UploadStringTaskAsync(Realm+route,Json.Serialize(input));return Json.Deserialize<Dictionary<string,object>>(response);}
  }
  public static void StoreNativeSession(string account,Dictionary<string,object> session){
   object user,value;if(!session.TryGetValue("username",out user)||!(user is string)||!session.TryGetValue("sessionToken",out value)||!(value is string)||((string)user).ToLowerInvariant()!=account||!Regex.IsMatch((string)value,@"^[A-Za-z0-9_-]{43}$"))throw new Exception("A autorização da conta não corresponde ao convite.");
   string profile=Path.Combine(Root,"profiles",account);Directory.CreateDirectory(profile);byte[] plain=Encoding.UTF8.GetBytes(Json.Serialize(new Dictionary<string,object>{{"user",user},{"token",value}}));byte[] protectedBytes;
   try{protectedBytes=ProtectedData.Protect(plain,null,DataProtectionScope.CurrentUser);}finally{Array.Clear(plain,0,plain.Length);}
   string path=Path.Combine(profile,"native-session.bin"),temp=path+"."+Guid.NewGuid().ToString("N");File.WriteAllBytes(temp,protectedBytes);if(File.Exists(path))File.Replace(temp,path,null);else File.Move(temp,path);AuthAccount=account;File.WriteAllText(Path.Combine(Root,"last-account.txt"),account);
   if(GameRunning&&!SendRoom("auth\n"+profile))throw new Exception("A conta foi conectada. Aguarde a transição do jogo e abra a central novamente.");
  }
  public static async Task<bool> ApplyNativeSession(string request){
   string account=RequestAccount(request),code="";if(account=="")return false;
   var auth=Regex.Match(request??"",@"^rfd://auth/[a-z][a-z0-9_-]{2,15}/([A-Za-z0-9_-]{43})$");
   if(auth.Success)code=auth.Groups[1].Value;else if(request.StartsWith("rfd://play/")){string text=request.Substring(11).Replace('-','+').Replace('_','/');text=text.PadRight((text.Length+3)/4*4,'=');var invite=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(text)));object value;if(invite.TryGetValue("authCode",out value)&&value is string)code=(string)value;}
   else{var resume=Regex.Match(request,@"\?auth=([A-Za-z0-9_-]{43})$");if(resume.Success)code=resume.Groups[1].Value;}
   if(code!=""){if(!Regex.IsMatch(code,@"^[A-Za-z0-9_-]{43}$"))throw new Exception("Autorização inválida.");DateTime used;if(UsedAuthCodes.TryGetValue(account+":"+code,out used)&&used>DateTime.UtcNow.AddMinutes(-2))return auth.Success;var result=await AccountApi("auth/redeem",new Dictionary<string,object>{{"code",code},{"target","client"},{"username",account}},null);StoreNativeSession(account,result);foreach(var key in new List<string>(UsedAuthCodes.Keys))if(UsedAuthCodes[key]<DateTime.UtcNow.AddMinutes(-2))UsedAuthCodes.Remove(key);UsedAuthCodes[account+":"+code]=DateTime.UtcNow;}
   return auth.Success;
  }
  public static async Task OpenCentral(){
   string url=Site+"/central/",account=GameRunning&&GameAccount!="offline"?GameAccount:PreferredAccount(),path=Path.Combine(Root,"profiles",account,"native-session.bin");
   try{if(File.Exists(path)){byte[] plain=ProtectedData.Unprotect(File.ReadAllBytes(path),null,DataProtectionScope.CurrentUser);Dictionary<string,object> session;try{session=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(plain));}finally{Array.Clear(plain,0,plain.Length);}object token,user;
    if(session.TryGetValue("token",out token)&&token is string&&Regex.IsMatch((string)token,@"^[A-Za-z0-9_-]{43}$")&&session.TryGetValue("user",out user)&&user is string&&((string)user).ToLowerInvariant()==account){var link=await AccountApi("auth/handoff",new Dictionary<string,object>{{"target","web"}},(string)token);object code;if(link.TryGetValue("code",out code)&&code is string&&Regex.IsMatch((string)code,@"^[A-Za-z0-9_-]{43}$"))url+="#auth="+(string)code;}}}
   catch(WebException){}catch(CryptographicException){}catch(ArgumentException){}catch(IOException){}
   Process.Start(url);
  }
  public static async Task<bool> Forward(string request){for(int i=0;i<20;i++){try{using(var pipe=new NamedPipeClientStream(".",PipeName,PipeDirection.Out)){pipe.Connect(250);using(var writer=new StreamWriter(pipe,new UTF8Encoding(false))){await writer.WriteLineAsync(request??"rfd://focus");await writer.FlushAsync();}}return true;}catch(IOException){}catch(TimeoutException){}await Task.Delay(100);}return false;}
  public static async Task Listen(){var security=new PipeSecurity();security.SetAccessRuleProtection(true,false);security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User,PipeAccessRights.FullControl,AccessControlType.Allow));while(Controller!=null&&!Controller.IsDisposed){try{using(var pipe=new NamedPipeServerStream(PipeName,PipeDirection.In,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,8192,8192,security)){await pipe.WaitForConnectionAsync();using(var reader=new StreamReader(pipe,Encoding.UTF8)){var line=await reader.ReadLineAsync();if(line!=null&&line.Length<=8192)Controller.BeginInvoke(new Action(()=>Controller.Accept(line)));}}}catch(ObjectDisposedException){return;}catch(IOException){}await Task.Delay(100);}}

  public const string Site="https://returns-from-darkness.vercel.app";
  public static string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ReturnsFromDarkness");
  public static JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=1048576};
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateHardLink(string link,string existing,IntPtr reserved);
  [STAThread] public static int Main(string[] args){
   ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
   try {
    if(args.Length==3&&args[0]=="--account"&&Regex.IsMatch(args[1],@"^[a-z][a-z0-9_-]{2,15}$")){InstanceAccount=args[1];PipeName+="-"+InstanceAccount;args=new[]{args[2]};}
    if(args.Length==2&&args[0]=="--verify-release"){Verify(File.ReadAllText(args[1]));return 0;}
    if(args.Length==3&&args[0]=="--verify-package"){var m=Verify(File.ReadAllText(args[1]));CheckFiles(args[2],m);return 0;}
    if(args.Length==1&&args[0]=="--install-only"){WindowsFormsSynchronizationContext.AutoInstall=false;Directory.CreateDirectory(Root);InstallInitial();using(var status=new Label()){Update(status).GetAwaiter().GetResult();}Register();return 0;}
    Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
    if(args.Length==1&&args[0]=="--preview"){Application.Run(new Portal("--preview"));return 0;}
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
    string versionDir=Path.Combine(Root,"versions","0.3.4");Extract(archive,versionDir);
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
   Directory.CreateDirectory(Root);FileStream gate=null;DateTime until=DateTime.UtcNow.AddMinutes(3);
   while(gate==null&&DateTime.UtcNow<until){try{gate=new FileStream(Path.Combine(Root,"update.lock"),FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);}catch(IOException){}if(gate==null){status.Text="Outra conta está preparando a atualização…";await Task.Delay(100);}}
   if(gate==null)throw new Exception("A atualização anterior ainda está em andamento. Tente novamente.");
   using(gate)return await UpdateCore(status);
  }
  static async Task<Dictionary<string,object>> UpdateCore(Label status){
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
   if(GameRunning)return false;if(Instance!=null)Instance.ReleaseMutex();string arguments=(InstanceAccount==""?"":"--account "+InstanceAccount+" ")+(request==null?"rfd://open":"\""+request+"\"");Process.Start(new ProcessStartInfo(next,arguments){UseShellExecute=false});return true;
  }
  public static async Task Launch(Dictionary<string,object> manifest,string request,Label status){
   if(GameRunning&&(request==null||request=="rfd://focus")){FocusGame();return;}
   string directory=Path.Combine(Root,"versions",(string)manifest["version"]);CheckFiles(directory,manifest);
   foreach(string filename in new[]{"DIABDAT.MPQ","TH3data.mor"}){ImportData(filename);string source=Path.Combine(Root,"data",filename),target=Path.Combine(directory,filename);if(!File.Exists(target)&&!CreateHardLink(target,source,IntPtr.Zero))File.Copy(source,target);}
   if(Hash(Path.Combine(directory,"TH3data.mor"))!=(string)manifest["dataSha256"])throw new Exception("O pacote de recursos não corresponde a esta versão do cliente.");
   var info=new ProcessStartInfo(Path.Combine(directory,(string)manifest["executable"])){WorkingDirectory=directory,UseShellExecute=false};info.EnvironmentVariables["RFD_PORTAL_URL"]=Site+"/central/";info.EnvironmentVariables["RFD_CONTENT_HASH"]=(string)manifest["contentHash"];
   string account=PreferredAccount();Dictionary<string,object> invite=null;Process peer=null;
   if(request!=null&&request.StartsWith("rfd://play/")){
    string encoded=request.Substring(11);if(encoded.Length>4096||!Regex.IsMatch(encoded,@"^[A-Za-z0-9_-]+$"))throw new Exception("Convite inválido.");encoded=encoded.Replace('-','+').Replace('_','/');encoded=encoded.PadRight((encoded.Length+3)/4*4,'=');invite=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(encoded)));
    foreach(string required in new[]{"contentHash","expires","transport","signalUrl","roomId","username","ticket","room"})if(!invite.ContainsKey(required))throw new Exception("Este convite usa uma conexão antiga. Abra a sala novamente na central.");
    if((string)invite["contentHash"]!=(string)manifest["contentHash"]||Convert.ToInt64(invite["expires"])<DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()||Convert.ToInt64(invite["expires"])>DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()+180000)throw new Exception("Convite expirado ou cliente desatualizado. Abra a sala novamente.");
    if(!invite.ContainsKey("transport")||(string)invite["transport"]!="webrtc"||(string)invite["signalUrl"]!=(string)manifest["signalUrl"]||!Regex.IsMatch((string)invite["roomId"],@"^[a-f0-9-]{36}$"))throw new Exception("Conexão do convite não autorizada.");
    account=((string)invite["username"]).ToLowerInvariant();if(!Regex.IsMatch(account,@"^[a-z][a-z0-9_-]{2,15}$")||!Regex.IsMatch((string)invite["ticket"],@"^[A-Za-z0-9_-]{43}$"))throw new Exception("Convite inválido.");
    info.EnvironmentVariables["RFD_CONTENT_HASH"]=(string)invite["contentHash"];info.EnvironmentVariables["RFD_ROOM_NAME"]=(string)invite["room"];
   }
   string profile=Path.Combine(Root,"profiles",account);Directory.CreateDirectory(profile);if(!File.Exists(Path.Combine(profile,"config.ini")))File.Copy(Path.Combine(directory,"config.ini"),Path.Combine(profile,"config.ini"));info.EnvironmentVariables["RFD_PROFILE"]=profile;info.EnvironmentVariables["RFD_AUTH_PROFILE"]=profile;
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
    string roomText=invite==null?"":String.Join("\n",new[]{"room",profile,"127.0.0.1",info.EnvironmentVariables["RFD_ROOM_PORT"],info.EnvironmentVariables["RFD_ROOM_TICKET"],(string)manifest["contentHash"],((string)invite["room"]).Replace("\r","").Replace("\n"," "),info.EnvironmentVariables["RFD_ROOM_MODE"],(string)invite["roomId"]});
    if(GameRunning){
      if(!SendRoom(roomText))throw new Exception("O jogo está finalizando uma transição. Tente novamente em instantes.");
    }else{
      ControlToken=RandomToken();info.EnvironmentVariables["RFD_CONTROL_TOKEN"]=ControlToken;info.EnvironmentVariables["RFD_CONTROL_PID"]=Process.GetCurrentProcess().Id.ToString();
      Game=Process.Start(info);Game.EnableRaisingEvents=true;Game.Exited+=(s,e)=>{if(Controller!=null&&!Controller.IsDisposed)Controller.BeginInvoke(new Action(()=>{if(Peer!=null&&!Peer.HasExited)Peer.Kill();GameRoom="";GameAccount="";LastRoomControl="";Controller.Show();}));};
    }
    Peer=peer;LastRoomControl=roomText;GameRoom=invite==null?"":(string)invite["roomId"];GameAccount=account;FocusGame();status.Text="Cliente aberto. Escolha seu personagem para entrar na partida.";
   }catch{if(peer!=null&&!peer.HasExited)peer.Kill();throw;}
  }
 }
 class RealmButton:Button {
  public bool Secondary=false;bool hover;
  public RealmButton(){FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;Cursor=Cursors.Hand;SetStyle(ControlStyles.UserPaint|ControlStyles.AllPaintingInWmPaint|ControlStyles.OptimizedDoubleBuffer,true);}
  protected override void OnMouseEnter(EventArgs e){hover=true;Invalidate();base.OnMouseEnter(e);}protected override void OnMouseLeave(EventArgs e){hover=false;Invalidate();base.OnMouseLeave(e);}
  protected override void OnPaint(PaintEventArgs e){var rect=new Rectangle(0,0,Width-1,Height-1);Color top=Secondary?Color.FromArgb(37,33,29):Color.FromArgb(hover?139:112,35,25),bottom=Secondary?Color.FromArgb(15,18,21):Color.FromArgb(52,13,13);using(var b=new System.Drawing.Drawing2D.LinearGradientBrush(rect,top,bottom,90f))e.Graphics.FillRectangle(b,rect);using(var p=new Pen(Color.FromArgb(hover?225:135,163,116),1))e.Graphics.DrawRectangle(p,rect);using(var ink=new SolidBrush(Enabled?Color.FromArgb(242,218,177):Color.Gray))using(var align=new StringFormat{Alignment=StringAlignment.Center,LineAlignment=StringAlignment.Center})e.Graphics.DrawString(Text,Font,ink,rect,align);if(Focused)ControlPaint.DrawFocusRectangle(e.Graphics,Rectangle.Inflate(rect,-5,-5));}
 }
 class Portal:Form {
  Label status,version;Button play,central;Image artwork;Stream artStream,logoStream;System.Drawing.Text.PrivateFontCollection fonts=new System.Drawing.Text.PrivateFontCollection();List<IntPtr> fontMemory=new List<IntPtr>();ProgressBar progress;string request;Dictionary<string,object> manifest;bool loaded=false;readonly Queue<string> requests=new Queue<string>();bool processing=false;NotifyIcon tray;
  Font BrandFont(string resource,float size){using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream(resource)){byte[] bytes=new byte[stream.Length];stream.Read(bytes,0,bytes.Length);IntPtr memory=Marshal.AllocCoTaskMem(bytes.Length);Marshal.Copy(bytes,0,memory,bytes.Length);fonts.AddMemoryFont(memory,bytes.Length);fontMemory.Add(memory);string family=resource=="title.ttf"?"Cinzel Decorative":"EB Garamond";return new Font(Array.Find(fonts.Families,f=>f.Name==family)??fonts.Families[fonts.Families.Length-1],size,FontStyle.Regular);}}
  Label Copy(string text,int x,int y,int width,int height,Font font,Color color){var label=new Label{Text=text,Location=new Point(x,y),Size=new Size(width,height),Font=font,ForeColor=color,BackColor=Color.Transparent,UseCompatibleTextRendering=true};Controls.Add(label);return label;}
  protected override void OnPaint(PaintEventArgs e){base.OnPaint(e);if(artwork!=null)e.Graphics.DrawImage(artwork,ClientRectangle);using(var shade=new System.Drawing.Drawing2D.LinearGradientBrush(ClientRectangle,Color.FromArgb(245,7,9,12),Color.FromArgb(35,5,8,11),0f))e.Graphics.FillRectangle(shade,ClientRectangle);using(var shade=new System.Drawing.Drawing2D.LinearGradientBrush(ClientRectangle,Color.Transparent,Color.FromArgb(255,7,9,12),90f))e.Graphics.FillRectangle(shade,ClientRectangle);using(var pen=new Pen(Color.FromArgb(100,170,127,67),1)){e.Graphics.DrawRectangle(pen,18,18,ClientSize.Width-37,ClientSize.Height-37);e.Graphics.DrawLine(pen,52,ClientSize.Height-77,ClientSize.Width-53,ClientSize.Height-77);for(int i=0;i<4;i++){int x=i%2==0?18:ClientSize.Width-19,y=i<2?18:ClientSize.Height-19,dx=i%2==0?1:-1,dy=i<2?1:-1;e.Graphics.DrawLine(pen,x,y,x+dx*36,y);e.Graphics.DrawLine(pen,x,y,x,y+dy*36);}}}
  public Portal(string value){request=value;Text="Returns from Darkness HD";ClientSize=new Size(1100,690);FormBorderStyle=FormBorderStyle.FixedSingle;MaximizeBox=false;BackColor=Color.FromArgb(7,9,12);ForeColor=Color.FromArgb(233,222,202);Font=new Font("Segoe UI",11);StartPosition=FormStartPosition.CenterScreen;DoubleBuffered=true;AutoScaleMode=AutoScaleMode.Dpi;
   artStream=Assembly.GetExecutingAssembly().GetManifestResourceStream("sanctuary.jpg");artwork=Image.FromStream(artStream);logoStream=Assembly.GetExecutingAssembly().GetManifestResourceStream("logo.gif");var logo=new PictureBox{Image=Image.FromStream(logoStream),SizeMode=PictureBoxSizeMode.Zoom,Location=new Point(49,40),Size=new Size(445,163),BackColor=Color.Transparent};Controls.Add(logo);
   var display=BrandFont("title.ttf",24);var body=BrandFont("body.ttf",18);var actionFont=new Font("Segoe UI",11,FontStyle.Bold);var smallActionFont=new Font("Segoe UI",9,FontStyle.Bold);var smallBodyFont=new Font(body.FontFamily,14);Font=smallBodyFont;Color gold=Color.FromArgb(211,170,104),muted=Color.FromArgb(160,155,147);
   Copy("READY TO PLAY",59,214,420,28,smallActionFont,gold);
   Copy("A escuridão\nnos reúne.",54,253,555,107,display,ForeColor);
   Copy("Retorne a Tristram. Encontre seu grupo.\nContinue a sua jornada.",58,375,540,64,body,Color.FromArgb(202,196,183));
   play=new RealmButton{Text="ENTRAR NO JOGO  →",Location=new Point(58,469),Size=new Size(300,54),Enabled=false,Font=actionFont};central=new RealmButton{Text="CENTRAL DA COMUNIDADE  ↗",Location=new Point(376,469),Size=new Size(336,54),Font=smallActionFont,Secondary=true};Controls.Add(play);Controls.Add(central);
   status=Copy("Preparando a sua jornada…",59,539,880,46,smallBodyFont,muted);progress=new ProgressBar{Style=ProgressBarStyle.Marquee,MarqueeAnimationSpeed=22,Location=new Point(60,590),Size=new Size(980,3)};Controls.Add(progress);
   version=Copy("RETURNS FROM DARKNESS HD",58,630,520,28,smallActionFont,gold);Copy("COOPERATIVO  ·  ATÉ 4 JOGADORES",708,630,340,28,smallActionFont,muted);
   tray=new NotifyIcon{Icon=SystemIcons.Application,Text="Returns from Darkness HD",Visible=true};tray.DoubleClick+=(s1,e1)=>Accept("rfd://focus");var menu=new ContextMenuStrip();menu.Items.Add("Abrir cliente",null,(s1,e1)=>Accept("rfd://focus"));menu.Items.Add("Central da comunidade",null,(s1,e1)=>Accept("rfd://central"));menu.Items.Add("Verificar atualização",null,(s1,e1)=>Accept("rfd://prepare"));menu.Items.Add("Fechar central",null,(s1,e1)=>{if(Program.GameRunning){Hide();return;}tray.Visible=false;Close();});tray.ContextMenuStrip=menu;
   central.Click+=(s1,e1)=>Accept("rfd://central");play.Click+=(s1,e1)=>Accept(request??"rfd://open");
   FormClosing+=(s1,e1)=>{if(Program.GameRunning){e1.Cancel=true;Hide();}else tray.Dispose();};
   Shown+=async(s1,e1)=>{if(loaded)return;loaded=true;var listener=Program.Listen();if(request=="--preview"){status.Text="Seu portal para Tristram.";version.Text="PRÉVIA DO LAUNCHER · v0.3.4";progress.Visible=false;play.Enabled=true;request=null;}else Accept(request??"rfd://prepare");await Task.CompletedTask;};
  }
  public async void Accept(string value){requests.Enqueue(value);if(processing)return;processing=true;play.Enabled=false;progress.Visible=true;
   try{while(requests.Count>0){string next=requests.Dequeue();try{
    if(Program.RouteAccount(next))continue;
    if(next=="rfd://central"||next=="rfd://central/"){await Program.OpenCentral();continue;}
    manifest=await Program.Update(status);if(Program.RefreshLauncher(manifest,next)){tray.Dispose();Close();return;}
    bool authenticated=await Program.ApplyNativeSession(next);
    if(Program.Resume(next)){Hide();continue;}
    if(Program.GameRunning&&(authenticated||next=="rfd://focus"||next=="rfd://open")){Program.FocusGame();Hide();continue;}
    if(authenticated)next="rfd://open";
    version.Text="RETURNS FROM DARKNESS HD · v"+manifest["version"];if(next=="rfd://prepare"){status.Text="Cliente atualizado. Sua jornada está pronta.";Show();continue;}if(next=="rfd://focus")next=null;
    await Program.Launch(manifest,next=="rfd://open"?null:next,status);request=null;Hide();
   }catch(Exception error){status.Text=error.Message;Show();Activate();}}}finally{processing=false;play.Enabled=true;progress.Visible=false;}
  }
 }
}
