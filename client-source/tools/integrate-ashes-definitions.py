"""Generate append-only private reward definitions; do not edit legacy pools."""
from pathlib import Path
import json,re,shutil
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'candidates/thehell3/src';folder=ROOT/'content/original/collections/ashes-of-the-return'
collection=json.loads((folder/'collection.json').read_text(encoding='utf-8'))
def fields(line):
    line=re.sub(r'/\*.*?\*/','',line);out=[];part='';quoted=False;depth=0
    for c in line.strip().lstrip('{'):
        if c=='"':quoted=not quoted
        if not quoted:
            if c=='{':depth+=1
            if c=='}':depth-=1
            if c==',' and depth==0:out.append(part.strip());part='';continue
        part+=c
    return out
bases=[]
for line in (src/'BaseItems.cpp').read_text(encoding='utf-8').splitlines():
    if re.match(r'\{\s*\d+,',line):
        f=fields(line)
        assert len(f)>=50,(len(f),f[:2])
        bases.append(f)
assert len(bases)==2504 and all(int(f[0])==i for i,f in enumerate(bases))
types={'sword':'IC_1_SWORD','axe':'IC_2_AXE','bow':'IC_3_BOW','mace':'IC_4_MACE','shield':'IC_5_SHIELD','light-armor':'IC_6_LIGHT_ARMOR','helm':'IC_7_HELM','medium-armor':'IC_8_MID_ARMOR','heavy-armor':'IC_9_HEAVY_ARMOR','staff':'IC_10_STAFF','ring':'IC_12_RING','amulet':'IC_13_AMULET','gloves':'IC_15_GLOVE','boots':'IC_16_BOOTS','belt':'IC_17_BELT','flask':'IC_18_FLASK','trap':'IC_19_TRAP','claw':'IC_20_CLAW','throwing-knife':'IC_21_KNIFE','throwing-mallet':'IC_22_MALLET','pistol':'IC_23_PISTOL','codex':'IC_0_OTHER'}
dimensions={'sword':(56,84),'axe':(56,84),'bow':(56,84),'mace':(56,84),'shield':(56,84),'light-armor':(56,84),'helm':(56,56),'medium-armor':(56,84),'heavy-armor':(56,84),'staff':(56,84),'ring':(28,28),'amulet':(28,28),'gloves':(56,56),'boots':(56,56),'belt':(56,28),'flask':(56,84),'trap':(56,84),'claw':(56,84),'throwing-knife':(56,84),'throwing-mallet':(56,84),'pistol':(56,84),'codex':(56,56)}
defs=['// Generated explicit rewards. Private negative lines never enter seeded loot.'];assets=['#pragma once','struct RfdCollectionAsset { const wchar_t *file; int width,height,baseIndex,requiredLevel; };','static const RfdCollectionAsset RfdCollectionAssets[] = {'];report=[]
for item in collection['items']:
    level=[8,24,45][item['tier']];kind=item['type'];choices=[(i,f) for i,f in enumerate(bases) if f[7]==types[kind] and f[1]!='0' and f[12].isdigit()]
    if kind in ['ring','amulet']:choices=[(i,f) for i,f in enumerate(bases) if f[7]==types[kind] and f[12].isdigit()]
    if kind=='codex':choices=[(i,f) for i,f in enumerate(bases) if f[0]=='9']
    assert choices,kind
    index,base=min(choices,key=lambda v:abs(int(v[1][12])-level))
    name=item['name']['en'];tier=item['tier'];line=-103-(item['id']-4621)
    effects=[('AE_REQUIRED_CLVL',level)]
    if kind in ['sword','axe','bow','mace','claw','throwing-knife','throwing-mallet','pistol']:
        effects += [('AE_PERCENT_DAMAGE',[10,20,30][tier]),('AE_DEX' if kind in ['bow','throwing-knife','pistol'] else 'AE_STR',[2,4,6][tier])]
    elif kind in ['staff','amulet','flask','trap','codex']:
        effects += [('AE_MAG',[2,4,6][tier]),('AE_MANA',[8,18,30][tier])]
    else:effects += [('AE_VIT',[2,4,6][tier]),('AE_HIT_POINTS',[8,18,30][tier])]
    effects.append(('AE_RESIST_FIRE',[5,10,15][tier]))
    defs.append('{ %d, "%s", %s, %d, -1, %d, %d, %d, -1,\n%s\n},'%(item['id'],name,base[0],line,max(1,level//3),len(effects),400+level*120,'\n'.join('    %s, 0, %d, %d, 0, 0, 0, 0,'%(effect,value,value) for effect,value in effects)))
    w,h=dimensions[kind];filename='rfd-'+item['key']+'.png';shutil.copy2(folder/'art'/(item['key']+'.png'),ROOT/'content/original/items'/filename)
    assets.append('{ L"%s", %d, %d, %d, %d },'%(filename,w,h,index,level))
    report.append({'id':item['id'],'baseId':int(base[0]),'baseIndex':index,'baseName':base[10].strip('"'),'itemCode':base[7],'requiredLevel':level,'privateLine':line,'inventorySize':[w,h],'effects':effects,'equippedAppearance':'inherited-type-animation-not-yet-original'})
assets.append('};');(src/'CommunityCollectionAssets.h').write_text('\n'.join(assets)+'\n');(src/'CommunityCollectionDefs.h').write_text('\n'.join(defs)+'\n')
p=src/'UniqueItems.cpp';text=p.read_text(encoding='utf-8');text=text.replace('#include "CommunityCollectionDefs.h"\n','');text=re.sub(r'const int NextNewUniqId = \d+;', 'const int NextNewUniqId = 4657;',text)
at=text.rfind('};\nconst int NextNewUniqId');assert at>=0;text=text[:at]+'#include "CommunityCollectionDefs.h"\n'+text[at:];p.write_text(text,encoding='utf-8')
(folder/'balance-draft.json').write_text(json.dumps({'status':'candidate-not-released','items':report,'globalRatesChanged':False,'legacyRandomPoolChanged':False,'equippedSpritesComplete':False},indent=2)+'\n')
print(json.dumps({'items':len(report),'types':len(types),'privateRewardIds':[4621,4656],'nativeIconsPrepared':True,'balancePlaytestComplete':False}))
