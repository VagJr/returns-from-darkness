"""Documented work in progress, separate from downloadable gameplay features."""
from pathlib import Path
import html,json,re,shutil
ROOT=Path(__file__).resolve().parent
COPY=json.loads((ROOT/'development-copy.json').read_text(encoding='utf-8'))
ASSETS='/assets/development/ashes/'
def e(value):return html.escape(str(value),quote=True)
def render_development(lang,central=False):
    t=COPY[lang];prefix='sanctuary-development' if central else 'development';asset=lambda name:ASSETS+name
    tabs=''.join(f'<button type="button" role="tab" id="{prefix}-tab-{i}" aria-controls="{prefix}-panel-{i}" aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}" data-dev-tab="{i}">{e(label)}</button>' for i,label in enumerate(t['tabs']))
    stats=''.join(f'<div><strong>{n}</strong><span>{e(label)}</span></div>' for n,label in zip([36,6,22],t['stats']))
    sheets=''.join(f'<figure class="dev-sheet"><a href="{asset(f"sheet-{i+1:02}.webp")}" target="_blank" rel="noopener" aria-label="{e(title)} — {e(t["open"])}"><img src="{asset(f"sheet-{i+1:02}.webp")}" width="1536" height="1024" loading="lazy" decoding="async" alt="{e(title)}"><span aria-hidden="true">↗</span></a><figcaption><small data-no-translate>0{i+1} / 06</small><h4>{e(title)}</h4></figcaption></figure>' for i,title in enumerate(t['sheets']))
    shots=''.join(f'<button type="button" data-dev-shot="{i+1:02}" data-shot-title="{e(title)}" aria-pressed="{str(i==0).lower()}"><span>{e(title)}</span><small data-no-translate>0{i+1}</small></button>' for i,title in enumerate(t['sheets']))
    steps=''.join(f'<li><span class="dev-step-icon" aria-hidden="true">{mark}</span><div><h4>{e(title)}</h4><p>{e(body)}</p></div></li>' for mark,(title,body) in zip(['✓','◇','→'],t['steps']))
    more=f'<button type="button" data-go="client" class="dev-link">{e(t["moreUI"])} ↗</button>' if central else f'<a class="dev-link" href="#game-gallery">{e(t["moreUI"])} ↑</a>'
    return f'''<section class="development-showcase {'dev-central' if central else 'section'}" id="{prefix}" data-development aria-labelledby="{prefix}-title">
<div class="dev-section-heading"><p class="eyebrow">{e(t['eyebrow'])}</p><span class="dev-status"><i aria-hidden="true"></i>{e(t['status'])}</span></div>
<h2 id="{prefix}-title">{e(t['name'])}</h2><p class="dev-lead">{e(t['lead'])}</p>
<div class="dev-tabs" role="tablist" aria-label="{e(t['name'])}">{tabs}</div>
<div id="{prefix}-panel-0" role="tabpanel" aria-labelledby="{prefix}-tab-0" data-dev-panel="0" tabindex="0">
<div class="dev-overview"><div class="dev-forge" aria-hidden="true"><span class="dev-forge-ring"></span><img class="forge-sword" src="{asset('oath-of-return.webp')}" width="567" height="501" loading="lazy" alt=""><img class="forge-shield" src="{asset('gate-of-ashes.webp')}" width="520" height="520" loading="lazy" alt=""><img class="forge-helm" src="{asset('crown-of-cinders.webp')}" width="520" height="520" loading="lazy" alt=""><span class="dev-forge-caption" data-no-translate>RETURNS FROM DARKNESS · ORIGINAL COLLECTION</span></div>
<div class="dev-overview-copy"><span class="dev-chapter" aria-hidden="true">II</span><h3>{e(t['artTitle'])}</h3><p>{e(t['artBody'])}</p><div class="dev-stats">{stats}</div><div class="dev-signature"><img src="{asset('nightfall-signet.webp')}" width="80" height="80" loading="lazy" alt=""><span data-no-translate>Ashes of the Return</span></div></div></div></div>
<div id="{prefix}-panel-1" role="tabpanel" aria-labelledby="{prefix}-tab-1" data-dev-panel="1" tabindex="0" hidden><div class="dev-sheet-grid">{sheets}</div></div>
<div id="{prefix}-panel-2" role="tabpanel" aria-labelledby="{prefix}-tab-2" data-dev-panel="2" tabindex="0" hidden><div class="dev-capture-intro"><h3>{e(t['screenTitle'])}</h3><p>{e(t['screenBody'])}</p></div><div class="dev-shot-picker" role="group" aria-label="{e(t['screenTitle'])}">{shots}</div><div class="dev-game-comparison"><figure class="dev-inventory-detail"><a data-dev-detail-link href="{asset('inventory-detail-01.webp')}" target="_blank" rel="noopener"><img data-dev-detail src="{asset('inventory-detail-01.webp')}" width="480" height="612" loading="lazy" decoding="async" alt="{e(t['detail'])}"></a><figcaption>{e(t['detail'])}</figcaption></figure><div class="dev-game-context"><h4 data-dev-shot-title>{e(t['sheets'][0])}</h4><figure><a data-dev-full-link href="{asset('inventory-01.webp')}" target="_blank" rel="noopener" aria-label="{e(t['open'])}"><img data-dev-full src="{asset('inventory-01.webp')}" width="1920" height="1080" loading="lazy" decoding="async" alt="{e(t['full'])}"><span aria-hidden="true">↗</span></a><figcaption>{e(t['full'])}</figcaption></figure><p>{e(t['publicNote'])}</p></div></div></div>
<div id="{prefix}-panel-3" role="tabpanel" aria-labelledby="{prefix}-tab-3" data-dev-panel="3" tabindex="0" hidden><div class="dev-roadmap"><img src="{asset('chronicle-of-return.webp')}" width="400" height="400" loading="lazy" alt=""><div><h3>{e(t['roadmapTitle'])}</h3><ol>{steps}</ol></div></div></div>
<div class="dev-footer"><p>{e(t['publicNote'])}</p>{more}</div></section>'''

def render_teaser(lang,central=False):
    t=COPY[lang];action=f'<button type="button" data-go="development">{e(t["teaserCTA"])}</button>' if central else f'<a href="#development">{e(t["teaserCTA"])}</a>'
    return f'<aside class="dev-teaser"><div><span class="dev-status">{e(t["status"])}</span><h3>{e(t["teaserTitle"])}</h3><p>{e(t["teaserBody"])}</p>{action}</div><img src="{ASSETS}oath-of-return.webp" width="567" height="501" alt="" loading="lazy"></aside>'

def prepare_development():
    p=ROOT/'central/index.html';text=p.read_text(encoding='utf-8')
    def slot(start,end,value,anchor):
        nonlocal text
        content=start+value+end
        if start in text:text,count=re.subn(re.escape(start)+'.*?'+re.escape(end),lambda _:content,text,flags=re.S);assert count==1
        else:assert anchor in text;text=text.replace(anchor,content+anchor,1)
    slot('<!--development-page:start-->','<!--development-page:end-->','<section data-panel="development" hidden>'+render_development('pt-BR',True)+'</section>','</main>')
    slot('<!--development-nav:start-->','<!--development-nav:end-->','<button data-view="development" class="nav-item"><img src="assets/icon-chronicle.svg" width="34" height="34" alt="">'+e(COPY['pt-BR']['nav'])+'</button>','<a class="nav-item website"')
    slot('<!--development-home:start-->','<!--development-home:end-->',render_teaser('pt-BR',True),'<div class="chapter-heading">')
    slot('<!--development-client:start-->','<!--development-client:end-->',render_teaser('pt-BR',True),'<div class="client-grid">')
    if '/development.css' not in text:text=text.replace('</head>','<link rel="stylesheet" href="/development.css?v=ashes-1"><script src="/development.js?v=ashes-1" defer></script></head>',1)
    p.write_text(text,encoding='utf-8')
    locales=ROOT/'central/locales.json';packs=json.loads(locales.read_text(encoding='utf-8'))
    def flatten(v):
        if isinstance(v,str):return [v]
        if isinstance(v,list):return [s for row in v for s in flatten(row)]
        return [s for row in v.values() for s in flatten(row)]
    source=flatten(COPY['pt-BR'])
    for lang,copy in COPY.items():
        translated=flatten(copy);assert len(source)==len(translated)
        packs[lang].update(zip(source,translated))
        for pt,title in zip(COPY['pt-BR']['sheets'],copy['sheets']):packs[lang][pt+' — '+COPY['pt-BR']['open']]=title+' — '+copy['open']
    locales.write_text(json.dumps(packs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for name in ['development.css','development.js']:shutil.copy2(ROOT/name,ROOT/'dist'/name)
