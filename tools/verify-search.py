import json,re
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree as ET

root=Path(__file__).resolve().parents[1]
dist=root/'site/dist';origin='https://returns-from-darkness.vercel.app'
tree=ET.parse(dist/'sitemap.xml')
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls=[e.text for e in tree.findall('.//s:loc',ns)]
assert len(urls)==20 and len(set(urls))==20
class Page(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.canonical=[];self.h1=0;self.description=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='a':self.links.append(attrs.get('href',''))
        if tag=='h1':self.h1+=1
        if tag=='link' and attrs.get('rel')=='canonical':self.canonical.append(attrs['href'])
        if tag=='meta' and attrs.get('name')=='description':self.description.append(attrs['content'])
for url in urls:
    relative=url.removeprefix(origin).strip('/')
    p=dist/relative/'index.html';text=p.read_text(encoding='utf-8');page=Page();page.feed(text)
    assert page.h1==1 and len(page.canonical)==1 and page.canonical[0]==url,(url,page.canonical)
    assert len(page.description)==1 and page.description[0]
    for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S):json.loads(raw)
    for href in page.links:
        if href.startswith('/') and not href.startswith('//'):
            target=href.split('#')[0].split('?')[0]
            if not target:continue
            assert (dist/target.lstrip('/')/'index.html').exists() or (dist/target.lstrip('/')).is_file(),(url,href)
assert (dist/'google0601429c5fde4ab9.html').read_text().strip()=='google-site-verification: google0601429c5fde4ab9.html'
print('Verified 20 canonical sitemap pages, structured data, descriptions, headings, internal links and Google verification file.')
