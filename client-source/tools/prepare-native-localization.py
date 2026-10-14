"""Prepare a reviewed menu layer and a separate inherited translation catalog."""
from pathlib import Path
import gettext,json,hashlib,unicodedata
ROOT=Path(__file__).resolve().parents[1];folder=ROOT/'content/localization';menus=json.loads((folder/'project-menus.json').read_text(encoding='utf-8'))
aliases={'Entrar na conta':'Enter Account','Criar conta':'Create Account','Comunidade':'Community','Voltar':'Back','Senha da sala':'Room Password','Criar sala':'Create Room','Nenhuma sala':'No Rooms','Entrar na partida':'Enter Game','Sair da sala':'Leave Room','Atualizar':'Refresh','Trocar conta':'Switch Account','Meu Santuario':'My Sanctuary','Mais salas / Atualizar':'More Rooms / Refresh','Mais opcoes':'More Options','Mais personagens':'More Characters','Escolher titulo':'Choose Title','Escolher avatar':'Choose Avatar','Meus personagens':'My Characters','Selos e desbloqueios':'Seals and Unlocks','Campanha cooperativa':'Cooperative Campaign','Mais dificuldades':'More Difficulties','Online do projeto':'Play Online'}
aliases['Support']='Language'
def native(value):return unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode()
def quoted(value):return json.dumps(value,ensure_ascii=True)
lines=['#pragma once','// Native bitmap-font menu bridge. Full UTF-8 spelling is kept in the catalog.','struct RfdMenuTranslation {const char *key,*english,*portuguese;};','static const RfdMenuTranslation RfdMenuTranslations[]={']
keys=set()
for key,value in menus.items():
    lines.append('{%s,%s,%s},'%(quoted(native(key)),quoted(aliases.get(key,key)),quoted(native(value))));keys.add(native(key))
for key,value in menus.items():
    if native(value) not in keys:
        lines.append('{%s,%s,%s},'%(quoted(native(value)),quoted(aliases.get(key,key)),quoted(native(value))));keys.add(native(value))
lines.append('};');(ROOT/'candidates/thehell3/src/CommunityMenuTranslations.h').write_text('\n'.join(lines)+'\n')
source=ROOT/'analysis/devilutionx-pt_BR.mo'
if not source.is_file():
    catalog=json.loads((folder/'classic-pt-BR.json').read_text(encoding='utf-8'))
    print(json.dumps({'projectMenuEntries':len(menus),'classicCatalogEntries':len(catalog),'preservedCatalogUsed':True,'nativeAccentsComplete':False,'wholeGameTranslationComplete':False}))
    raise SystemExit(0)
with source.open('rb') as file:translated=gettext.GNUTranslations(file)
catalog={key:value for key,value in translated._catalog.items() if isinstance(key,str) and key and isinstance(value,str)}
(folder/'classic-pt-BR.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(folder/'PROVENANCE.md').write_text('# Translation sources\n\nProject menu additions: Returns from Darkness. Classic Portuguese catalog: DevilutionX 1.5.5, pt_BR.gmo in the locally preserved devilutionx.mpq distribution; original translation metadata is retained in classic-metadata.json. This catalog is an adaptation input, not a claim of complete translation of The Hell 3 or original authorship. Preserve the upstream notices when distributing adapted entries. Native accented glyph rendering, mod-specific dialogue, and all dynamic descriptions still require review.\n',encoding='utf-8')
(folder/'classic-metadata.json').write_text(json.dumps({'upstream':'DevilutionX 1.5.5','resource':'pt_BR.gmo','resourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'metadata':translated.info(),'fullGameTranslated':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'projectMenuEntries':len(menus),'classicCatalogEntries':len(catalog),'nativeAccentsComplete':False,'wholeGameTranslationComplete':False}))
