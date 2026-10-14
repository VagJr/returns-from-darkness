"""Repair reversible mojibake in content strings, preserving current copy."""
from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'site'))
from text_encoding import validate_text

mapping={}
for point in range(128,0x3000):
    char=chr(point)
    for encoding in ['cp1252','latin1']:
        try:broken=char.encode('utf-8').decode(encoding)
        except UnicodeError:continue
        if broken.startswith(('Ã','Â','â','ï')) and len(broken)>1:mapping[broken]=char
pattern=re.compile('|'.join(re.escape(s) for s in sorted(mapping,key=len,reverse=True)))
changes={}
def repair(value,path):
    if isinstance(value,str):
        fixed=pattern.sub(lambda m:mapping[m[0]],value)
        if fixed!=value:changes[path]={'before':value,'after':fixed}
        return fixed
    if isinstance(value,list):return [repair(v,f'{path}[{i}]') for i,v in enumerate(value)]
    if isinstance(value,dict):return {k:repair(v,f'{path}.{k}') for k,v in value.items()}
    return value
for name in ['current-content.json','current-content-extra.json','locales.json','locales-extra.json','real-gallery.json','development-copy.json','central/locales.json']:
    file=root/'site'/name
    data=json.loads(file.read_text(encoding='utf-8'));fixed=repair(data,name);validate_text(fixed,name)
    if fixed!=data:file.write_text(json.dumps(fixed,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
report={'repairedStrings':len(changes),'changes':changes,'encoding':'utf-8','contentVersionPreserved':'0.4.12'}
target=Path('C:/vagner/diablo-online/analysis/site-encoding-repair.json')
target.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'repairedStrings':len(changes),'changedPacks':sorted(set(k.split('.')[0] for k in changes)),'utf8Validated':True}))
