"""Separate generated six-item sheets without painting or resampling masters."""
from pathlib import Path
import hashlib,json
import cv2
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'content/original/collections/ashes-of-the-return'
catalog=json.loads((folder/'collection.json').read_text(encoding='utf-8'))
generation=json.loads((folder/'generation.json').read_text(encoding='utf-8'))
records=[];contact=Image.new('RGB',(6*200,6*210),(31,34,37));draw=ImageDraw.Draw(contact)
for sheet in range(6):
    path=folder/'masters'/f'sheet-{sheet+1:02}.png';im=Image.open(path).convert('RGBA');rgba=np.array(im);alpha=rgba[:,:,3]
    assert im.size==(1536,1024) and alpha.min()==0 and alpha.max()>240
    # Assign whole connected silhouettes before deciding rectangular crops.
    # A blade/ornament may cross an ideal grid line; uniform cells would cut it.
    count,labels,stats,centers=cv2.connectedComponentsWithStats((alpha>=8).astype('uint8'),8)
    owners=np.full(count,-1,np.int32)
    anchors=np.array([[(col+.5)*im.width/3,(row+.5)*im.height/2] for row in range(2) for col in range(3)])
    for label in range(1,count):
        if stats[label,4]<10:continue
        owners[label]=int(np.argmin(((anchors-centers[label])**2).sum(axis=1)))
    assigned=owners[labels]
    for cell,item in enumerate(catalog['items'][sheet*6:sheet*6+6]):
        selected=assigned==cell;ys,xs=np.nonzero(selected&(alpha>=64));assert len(xs)>2000,item['key']
        box=(max(0,int(xs.min())-8),max(0,int(ys.min())-8),min(im.width,int(xs.max())+9),min(im.height,int(ys.max())+9))
        source=rgba.copy();source[~selected,3]=0;crop=Image.fromarray(source).crop(box)
        assert max(crop.size)>=256 and crop.getchannel('A').getbbox()
        target=folder/'art'/(item['key']+'.png');target.parent.mkdir(exist_ok=True);crop.save(target)
        # All retained pixels are exact RGBA samples from the generated master.
        sampled=np.array(crop);original=rgba[box[1]:box[3],box[0]:box[2]];solid=sampled[:,:,3]>0
        assert np.array_equal(sampled[solid],original[solid])
        preview=Image.new('RGBA',(180,180),(31,34,37,255));thumb=crop.copy();thumb.thumbnail((168,168),Image.Resampling.LANCZOS);preview.alpha_composite(thumb,((180-thumb.width)//2,(180-thumb.height)//2))
        x=cell*200;y=sheet*210;contact.paste(preview.convert('RGB'),(x+10,y));draw.text((x+8,y+183),str(item['id'])+' '+item['key'][:23],fill=(205,198,184))
        records.append({'id':item['id'],'key':item['key'],'sheet':path.name,'cropBox':list(box),'size':list(crop.size),'alphaPixels':len(xs),'rgbaSourcePixelsPreserved':True,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    generation['sheets'][sheet]['source']='masters/'+path.name
    generation['sheets'][sheet]['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
(folder/'generation.json').write_text(json.dumps(generation,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
result={'items':36,'sheets':6,'sourceArtworkRepainted':False,'masterSize':[1536,1024],'minimumUsefulLongEdge':min(max(r['size'])-16 for r in records),'itemsPerGeneration':6,'crops':records,'inGameIntegrationComplete':False}
(folder/'sprite-extraction.json').write_text(json.dumps(result,indent=2)+'\n')
contact.save(ROOT/'analysis/ashes-collection-contact-sheet.jpg',quality=95)
print(json.dumps({k:v for k,v in result.items() if k!='crops'}))
