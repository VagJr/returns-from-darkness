"""Acceptance checks for multilingual static output and all local references."""
import json
from html.parser import HTMLParser
from pathlib import Path
from text_encoding import validate_text
from urllib.parse import urlsplit,unquote
import xml.etree.ElementTree as ET

ROOT=Path(__file__).parent
DIST=ROOT/'dist'
config=json.loads((ROOT/'site-config.json').read_text(encoding='utf-8'))
errors=[]
for text_file in DIST.rglob('*'):
    if text_file.is_file() and text_file.suffix in ['.html','.json','.js','.svg','.css']:
        validate_text(text_file.read_text(encoding='utf-8'),str(text_file.relative_to(DIST)))
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.refs=[];self.ids=set();self.html={};self.h1=0;self.meta={};self.canonical=[];self.alt=[];self.schemas=[];self.schema=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.html=a
        if tag=='h1':self.h1+=1
        if 'id' in a:self.ids.add(a['id'])
        if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
        if tag=='link' and a.get('rel')=='alternate':self.alt.append(a)
        if tag=='script' and a.get('type')=='application/ld+json':self.schema=True
        for key in ('src','href'):
            if key in a:self.refs.append(a[key])
    def handle_data(self,data):
        if self.schema:self.schemas.append(json.loads(data))
    def handle_endtag(self,tag):
        if tag=='script':self.schema=False

pages=[(DIST/'index.html','pt-BR')]+[(DIST/lang/'index.html',lang) for lang in config['languages']]
for path,lang in pages:
    page=Page();page.feed(path.read_text(encoding='utf-8'))
    if page.html.get('lang')!=lang:errors.append(f'{lang}: html lang')
    if page.h1!=1:errors.append(f'{lang}: h1 count')
    if lang=='ar' and page.html.get('dir')!='rtl':errors.append('Arabic direction')
    if not page.meta.get('description'):errors.append(f'{lang}: description')
    if not config['releaseReady'] and page.meta.get('robots')!='noindex,nofollow':errors.append(f'{lang}: preview noindex')
    if not page.schemas or page.schemas[0].get('inLanguage')!=lang:errors.append(f'{lang}: schema')
    if config['publicOrigin'] and (len(page.canonical)!=1 or len(page.alt)!=len(config['languages'])+1):errors.append(f'{lang}: canonical/hreflang')
    for ref in page.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc:continue
        if url.fragment and not url.path:
            if url.fragment not in page.ids:errors.append(f'{lang}: missing fragment {ref}')
            continue
        target=DIST/unquote(url.path.lstrip('/')) if url.path.startswith('/') else path.parent/unquote(url.path)
        if target.is_dir():target=target/'index.html'
        if not target.exists():errors.append(f'{lang}: missing asset {ref}')
ET.parse(DIST/'sitemap.xml')
if not config['releaseReady'] and 'Disallow: /' not in (DIST/'robots.txt').read_text():errors.append('Preview robots')
for lang in config['languages']:
    for path in [ROOT.parent/'outreach/posts'/f'{lang}.md',ROOT.parent/'github-public/docs'/f'README.{lang}.md']:
        if not path.exists():errors.append(f'Missing translated document {path}')
if errors:raise SystemExit('\n'.join(errors))
result={'status':'passed','localizedPages':len(config['languages']),'rootPage':True,'localLinksAndAssets':'passed','translatedPosts':len(config['languages']),'githubDocuments':len(config['languages']),'releaseReady':config['releaseReady'],'publicIndexingSubmitted':False}
(ROOT.parent/'docs/site-validation.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
