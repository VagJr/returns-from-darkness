"""Build signed client updates and a separate, pinned mod-data payload."""
from pathlib import Path
import hashlib,json,shutil,zipfile,sys,re
root=Path(__file__).resolve().parents[1];canonical=Path(r'C:\diabloHD');version=sys.argv[1] if len(sys.argv)>1 else '0.4.1'
assert re.fullmatch(r'\d+\.\d+\.\d+',version)
old=json.loads((root/'runtime/client-peer-build.json').read_text(encoding='utf-8-sig'))
native_version=[int(v) for v in re.search(r'^#define THE_HELL_VERSION_INT ([\d,]+)',(root/'candidates/thehell3/tools/version.h').read_text(),re.M)[1].split(',')]
assert native_version == [int(v) for v in version.split('.')]+[0], 'Native source version differs from the requested release'
out=root/'build/releases'/version;stage=out/'client';stage.mkdir(parents=True,exist_ok=True)
exe=f'ReturnsFromDarknessHD-v{version}.exe'
for name in [exe,'Strm2.dll','Standard.sn2','SmackW32.DLL']:shutil.copy2(root/f'build/returns-hd-{version}'/name,stage/name)
shutil.copy2(root/'build/peer-bridge/Release/RfdPeer.exe',stage/'RfdPeer.exe')
shutil.copy2(root/'build/RfdLauncher.exe',stage/'RfdLauncher.exe')
shutil.copy2(canonical/'runtime/thehell3/bin/config.ini',stage/'config.ini')
shutil.copytree(canonical/'runtime/thehell3/bin/assets',stage/'assets',dirs_exist_ok=True)
shutil.copytree(root/'content/progression',stage/'content/progression',dirs_exist_ok=True)
shutil.copytree(root/'content/original/items',stage/'assets/original/items',dirs_exist_ok=True)
shutil.copytree(root/'content/original/ui',stage/'assets/original/ui',dirs_exist_ok=True)
for orb in ['health','mana']:
    shutil.copy2(root/f'content/visual/tchernobog/orbs-runtime/{orb}-vessel-atlas.png',stage/f'assets/remaster/{orb}-vessel-atlas.png')
shutil.copy2(canonical/'references/sources/th_team-th3-src_2026-03-26/__README.txt',stage/'ORIGINAL-SOURCE-README.txt')
shutil.copy2(canonical/'references/thehell3-1.267/TH3_Readme.txt',stage/'TH3-ORIGINAL-README.txt')
licenses=stage/'licenses';licenses.mkdir(exist_ok=True)
for name in ['EBGaramond-OFL.txt','CinzelDecorative-OFL.txt']:shutil.copy2(Path(r'C:\vagner\returns-from-darkness\site/dist/assets/fonts')/name,licenses/name)
for folder in ['libdatachannel','mbedtls']:
    source=root/'native/vendor'/folder
    for name in ['LICENSE','LICENSE.txt','COPYING']:
        if (source/name).exists():shutil.copy2(source/name,licenses/(folder+'-'+name));break
for folder,name in [('libdatachannel/deps/libjuice','libjuice'),('libdatachannel/deps/usrsctp','usrsctp'),('libdatachannel/deps/json','nlohmann-json')]:
    for filename in ['LICENSE','LICENSE.txt','COPYING.md']:
        source=root/'native/vendor'/folder/filename
        if source.exists():shutil.copy2(source,licenses/(name+'-'+filename));break
(stage/'README.txt').write_text("Returns from Darkness HD — READY TO PLAY\n\nAbra https://returns-from-darkness.vercel.app/central/ para entrar na comunidade e escolher uma sala.\nA partida é hospedada no cliente do criador; até quatro jogadores compartilham a jornada.\nO launcher verifica atualizações assinadas e mantém personagens separados das versões.\nO instalador completo inclui o TH3data.mor compatível. O pacote de atualização é menor; o launcher recupera os dados do mod automaticamente se estiverem ausentes.\nDIABDAT.MPQ não está incluído: o launcher importa o arquivo compatível da instalação do jogador, ou solicita sua localização.\nO Santuário registra personagens e progressão da conta, títulos e selos; os saves completos permanecem neste computador.\nClasses e opções novas são desbloqueadas por evolução e conclusões de campanha; personagens legados mantêm escolhas sem medalhas artificiais.\nEsta é uma edição de comunidade adaptada de Diablo/Hellfire e The Hell 3, com integração online e progressão próprias.\nHUD e inventário possuem material próprio texturizado, com três relíquias da Primeira Vigília. Artes HD completas do mundo, migração de anfitrião e ranking competitivo continuam em desenvolvimento.\nFontes e avisos: https://github.com/VagJr/returns-from-darkness/tree/main/client-source\n",encoding='utf-8')
def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
# Mod data is shared by every client version. Keep it out of the small update
# archive and embed it only in the complete setup; the signed descriptor also
# permits repairing a missing copy without asking players to find this file.
mod_source=canonical/'references/thehell3-1.267/TH3data.mor'
assert sha(mod_source)==old['dataSha256'], 'Bundled mod data differs from the compatible set'
mod_archive=out/'ReturnsFromDarkness-ModData-1.267.zip'
if mod_archive.exists():
    with zipfile.ZipFile(mod_archive) as z:
        assert z.namelist()==['TH3data.mor']
        with z.open('TH3data.mor') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==old['dataSha256']
else:
    with zipfile.ZipFile(mod_archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:z.write(mod_source,'TH3data.mor')
mod_data=dict(file='TH3data.mor',sourceVersion='1.267',sha256=old['dataSha256'],size=mod_source.stat().st_size,includedInSetup=True,archiveUrl=f'https://github.com/VagJr/returns-from-darkness/releases/download/client-v{version}/{mod_archive.name}',archiveSha256=sha(mod_archive),archiveSize=mod_archive.stat().st_size)
content=hashlib.sha256(f'rfd-peer-{version};{sha(stage/exe)};{old["dataSha256"]};{sha(stage/"RfdPeer.exe")}'.encode()).hexdigest()
files=[dict(path=p.relative_to(stage).as_posix(),sha256=sha(p),size=p.stat().st_size) for p in sorted(stage.rglob('*')) if p.is_file()]
assert all(not any(v in f['path'].lower() for v in ['diabdat','signing','profile','password']) for f in files)
archive=out/f'ReturnsFromDarkness-Client-{version}.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for entry in files:z.write(stage/entry['path'],entry['path'])
base_data_hash=old.get('baseDataSha256','63fb47d9c76484024c7640d90ab6b7ec5e13f567a7e1a917b6c03a6631d3f2b0')
assert sha(Path('C:/Users/vagmi/AppData/Local/ReturnsFromDarkness/data/DIABDAT.MPQ'))==base_data_hash, 'Reference original game data differs from the verified compatible set'
payload=dict(baseDataSha256=base_data_hash,modData=mod_data,format=1,version=version,executable=exe,launcher='RfdLauncher.exe',peerExecutable='RfdPeer.exe',transport='webrtc',signalUrl='https://returns-darkness-realm.oblique-tactical.workers.dev',contentHash=content,dataSha256=old['dataSha256'],archiveUrl=f'https://github.com/VagJr/returns-from-darkness/releases/download/client-v{version}/{archive.name}',archiveSha256=sha(archive),archiveSize=archive.stat().st_size,files=files)
(out/'payload.json').write_text(json.dumps(payload,separators=(',',':'))+'\n',encoding='utf-8')
build={**old,'version':version,'executable':exe,'sha256':sha(stage/exe),'contentHash':content,'publicCentral':{**old['publicCentral'],'dependsOnLocalPc':False},'peerTransport':{'library':'libdatachannel 0.24.6','hostedBy':'room-creator','direct':'WebRTC DTLS/SCTP reliable ordered','fallback':'authenticated Cloudflare WebSocket relay','signaling':'Cloudflare Durable Objects SQLite','playersPerRoom':4,'hostMigration':False,'rankedPvpAuthoritative':False,'externalGraphicalGameVerified':False,'localGraphicalItemSharingVerified':True,'automaticSaveReloadVerified':True}}
# Candidate metadata stays isolated until publication and graphical multiplayer QA.
build['nativeVersion']=native_version
build['graphicalWorldVerified']=False;build['graphicalTwoPlayerVerified']=False
build['sanctuary']={'revision':'sanctuary-1','accountUnlocks':True,'publicProfiles':True,'completionDots':True,'achievementTitles':True,'clientReportedUnranked':True,'localSaveOnly':True}
build.pop('launcherMaintenance',None)
(out/'client-peer-build.json').write_text(json.dumps(build,indent=2)+'\n',encoding='utf-8')
config=root/'services/peer-realm/wrangler.jsonc';settings=json.loads(config.read_text(encoding='utf-8'));settings['vars']['CONTENT_HASH']=content;settings['vars']['CLIENT_VERSION']=version
settings['main']=str((root/'services/peer-realm/worker.mjs').resolve())
(out/'worker-config.json').write_text(json.dumps(settings,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'version':version,'files':len(files),'bytes':archive.stat().st_size,'modArchiveBytes':mod_archive.stat().st_size,'modDataIncludedInSetup':True,'contentHash':content,'originalGameDataIncluded':False}))
