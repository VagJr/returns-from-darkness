"""Pack the original RGBA crops for GPU display; keep masters unchanged."""
from pathlib import Path
from PIL import Image
import json, hashlib

ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'content/original/collections/ashes-of-the-return'
balance=json.loads((folder/'balance-draft.json').read_text())['items']
collection=json.loads((folder/'collection.json').read_text(encoding='utf-8'))['items']
old=[('last-vigil.png',28,28),('return-lantern.png',28,28),('ashen-covenant.png',28,28)]
inputs=old+[(f"rfd-{item['key']}.png",*row['inventorySize']) for item,row in zip(collection,balance)]
atlas=Image.new('RGBA',(2048,2048))
entries=[]
for index,(name,w,h) in enumerate(inputs):
    source=Image.open(ROOT/'content/original/items'/name).convert('RGBA')
    # Six columns and seven rows, with transparent gutters. Preserve the
    # aspect ratio of each drawing inside its existing logical inventory size.
    factor=272/max(w,h);cw,ch=round(w*factor),round(h*factor)
    scale=min(cw/source.width,ch/source.height)
    sw,sh=max(1,round(source.width*scale)),max(1,round(source.height*scale))
    canvas=Image.new('RGBA',(cw,ch));canvas.alpha_composite(source.resize((sw,sh),Image.Resampling.LANCZOS),((cw-sw)//2,(ch-sh)//2))
    x,y=index%6*292+10,index//6*292+10
    atlas.alpha_composite(canvas,(x,y))
    entries.append({'uniqueId':4618+index,'file':name,'source':[x,y,cw,ch],'logicalSize':[w,h],'drawingSize':[sw,sh]})
dest=ROOT/'content/original/items/collection-atlas.png';atlas.save(dest,optimize=True)
header=['#pragma once','struct RfdItemArtSource { int x,y,w,h,width,height; };','static const RfdItemArtSource RfdItemArtSources[] = {']
header += ['{%s},'%','.join(map(str,e['source']+e['logicalSize'])) for e in entries]
header.append('};')
(ROOT/'candidates/thehell3/src/CommunityItemAtlas.h').write_text('\n'.join(header)+'\n')
report={'atlasSize':[2048,2048],'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'items':entries,'preservesAspectRatio':True,'mastersUnchanged':True,'nativePaletteFallbackRetained':True}
(folder/'gpu-atlas.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'items':len(entries),'atlasBytes':dest.stat().st_size,'logicalInventoryDimensionsUnchanged':True}))
