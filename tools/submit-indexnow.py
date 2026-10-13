"""Notify participating search engines of canonical pages; not a ranking guarantee."""
import json
from pathlib import Path
from urllib.request import Request,urlopen
from xml.etree import ElementTree as ET

root=Path(__file__).resolve().parents[1]
host='returns-from-darkness.vercel.app'
key=(root/'site/verification/indexnow.txt').read_text(encoding='utf-8').strip()
tree=ET.parse(root/'site/dist/sitemap.xml')
urls=[e.text for e in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert all(url.startswith('https://'+host+'/') for url in urls)
location='https://'+host+'/indexnow.txt'
with urlopen(location,timeout=30) as response:assert response.read().decode().strip()==key
payload={'host':host,'key':key,'keyLocation':location,'urlList':urls}
request=Request('https://api.indexnow.org/indexnow',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json; charset=utf-8'},method='POST')
with urlopen(request,timeout=45) as response: status=response.status
print(json.dumps({'status':status,'submitted_urls':len(urls),'endpoint':'api.indexnow.org','note':'Submission receipt; indexing not guaranteed.'}))
