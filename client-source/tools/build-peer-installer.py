from pathlib import Path
import zipfile,subprocess,sys,json,hashlib
r=Path(__file__).resolve().parents[1];version=sys.argv[1] if len(sys.argv)>1 else '0.3.5';out=r/'build/releases'/version
launcher=out/'launcher' if (out/'launcher/Launcher.cs').exists() else r/'launcher'
manifest=json.loads((out/'payload.json').read_text())
mod_source=Path('C:/diabloHD/references/thehell3-1.267/TH3data.mor')
with mod_source.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==manifest['dataSha256']
with zipfile.ZipFile(out/'initial.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in (out/'client').rglob('*'):
  if p.is_file():z.write(p,p.relative_to(out/'client').as_posix())
 z.write(out/'latest.json','release.json')
 z.write(mod_source,'TH3data.mor')
args=[r'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe','/nologo','/target:winexe','/out:'+str(out/'ReturnsFromDarkness-Setup.exe')]
args+=['/win32icon:'+str(r/'launcher/assets/project.ico'),'/resource:'+str(r/'launcher/assets/project.ico')+',project.ico']
args+=['/reference:'+name for name in ['System.Windows.Forms.dll','System.Drawing.dll','System.Security.dll','System.Web.Extensions.dll','System.IO.Compression.dll','System.IO.Compression.FileSystem.dll']]
args+=['/resource:'+str(r/'launcher/assets'/f)+','+f for f in ['sanctuary.jpg','logo.gif','title.ttf','body.ttf','launcher-locales.json']]
args+=['/resource:'+str(r/'launcher/update-public.xml')+',update-public.xml','/resource:'+str(out/'initial.zip')+',initial.zip',str(launcher/'Launcher.cs'),str(launcher/'Lang.cs')]
subprocess.run(args,check=True)
subprocess.run([str(out/'ReturnsFromDarkness-Setup.exe'),'--verify-package',str(out/'latest.json'),str(out/'client')],check=True)
print('Installer, release signature and every packaged file verified')
