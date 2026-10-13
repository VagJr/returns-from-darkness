"""Build localized static pages and matching outreach drafts. No network or publication."""
import html
import json
import shutil
from pathlib import Path
from urllib.parse import urlsplit
from xml.sax.saxutils import escape as xml_escape
from real_gallery import render_gallery, prepare_sanctuary

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'
CONFIG = json.loads((ROOT / 'site-config.json').read_text(encoding='utf-8'))
LOCALES = json.loads((ROOT / 'locales.json').read_text(encoding='utf-8'))
LOCALES.update(json.loads((ROOT / 'locales-extra.json').read_text(encoding='utf-8')))
for language, content in json.loads((ROOT / 'current-content.json').read_text(encoding='utf-8')).items():
    LOCALES[language].update(content)
for language, content in json.loads((ROOT / 'current-content-extra.json').read_text(encoding='utf-8')).items():
    LOCALES[language].update(content)
NAMES = {'pt-BR':'Português (Brasil)', 'en':'English', 'es':'Español', 'fr':'Français', 'de':'Deutsch', 'it':'Italiano', 'pl':'Polski', 'ru':'Русский', 'uk':'Українська', 'tr':'Türkçe', 'ja':'日本語', 'ko':'한국어', 'zh-CN':'简体中文', 'ar':'العربية'}
ART_TITLES = {'pt-BR':['Primeira Luz','Arena das Cinzas'], 'en':['First Light','Ashen Arena'], 'es':['Primera Luz','Arena de las Cenizas'], 'fr':['Première Lumière','Arène des Cendres'], 'de':['Erstes Licht','Aschenarena'], 'it':['Prima Luce','Arena delle Ceneri'], 'pl':['Pierwsze Światło','Arena Popiołów'], 'ru':['Первый Свет','Арена Пепла'], 'uk':['Перше Світло','Арена Попелу'], 'tr':['İlk Işık','Kül Arenası'], 'ja':['最初の光','灰のアリーナ'], 'ko':['첫 번째 빛','잿빛 아레나'], 'zh-CN':['初光','灰烬竞技场'], 'ar':['النور الأول','ساحة الرماد']}
CENTRAL_LABELS = {'pt-BR': 'Entrar no Santuário', 'en': 'Enter the Sanctuary', 'es': 'Entrar al Santuario', 'fr': 'Entrer dans le Sanctuaire', 'de': 'Das Sanktuario betreten', 'it': 'Entra nel Santuario', 'pl': 'Wejdź do Sanktuarium', 'ru': 'Войти в Санктуарий', 'uk': 'Увійти до Санктуарію', 'tr': 'Sığınağa gir', 'ja': 'サンクチュアリへ', 'ko': '성역 입장', 'zh-CN': '进入庇护之地', 'ar': 'ادخل الملاذ'}
DISCORD_LABELS = {'pt-BR': 'Comunidade no Discord', 'en': 'Join our Discord', 'es': 'Comunidad en Discord', 'fr': 'Communauté Discord', 'de': 'Discord-Community', 'it': 'Comunità Discord', 'pl': 'Społeczność na Discordzie', 'ru': 'Сообщество Discord', 'uk': 'Спільнота Discord', 'tr': 'Discord topluluğu', 'ja': 'Discordコミュニティ', 'ko': 'Discord 커뮤니티', 'zh-CN': '加入Discord社区', 'ar': 'مجتمع Discord'}
KEYS = {'nav','eyebrow','headline','summary','actions','facts','art','vision','pillars','online','flow','now','next','limits','journal','milestones','faq','join','pending','footer','language','menu','skip','post','sections','alt'}

def e(value):
    return html.escape(str(value), quote=True)

def origin():
    value = CONFIG.get('publicOrigin')
    if value is None:
        if CONFIG['releaseReady']:
            raise ValueError('Set the confirmed publicOrigin before a release build')
        return None
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.path not in ('', '/') or parsed.query or parsed.fragment or parsed.username:
        raise ValueError('publicOrigin must be a confirmed HTTPS origin without a path')
    return value.rstrip('/')

PUBLIC = origin()
for key, prefix in [('discordInvite','https://discord.gg/'), ('githubRepository','https://github.com/')]:
    value = CONFIG.get(key)
    if value and (not value.startswith(prefix) or urlsplit(value).username):
        raise ValueError(f'Invalid {key}')

def page(lang, root=False):
    t = LOCALES[lang]
    if set(t) != KEYS:
        raise ValueError(f'{lang}: missing or unexpected keys: {set(t) ^ KEYS}')
    url = '/' if root else f'/{lang}/'
    nav = ''.join(f'<a href="#{anchor}">{e(label)}</a>' for anchor,label in zip(['project','online','journal','faq'],t['nav']))
    nav += f'<a href="/central/?lang={lang}" class="central-link">{e(CENTRAL_LABELS[lang])}</a>'
    options = ''.join(f'<option value="/{code}/" {"selected" if code==lang else ""}>{e(name)}</option>' for code,name in NAMES.items())
    alternatives = ''.join(f'<a href="/{code}/" hreflang="{code}" lang="{code}">{e(name)}</a>' for code,name in NAMES.items())
    seo = ''
    if PUBLIC:
        canonical = PUBLIC + ('/' if lang == 'pt-BR' else f'/{lang}/')
        seo = f'<link rel="canonical" href="{e(canonical)}"><meta property="og:url" content="{e(canonical)}"><meta property="og:image" content="{e(PUBLIC)}/assets/cathedral.webp">'
        seo += ''.join(f'<link rel="alternate" hreflang="{code}" href="{e(PUBLIC)}{("/" if code == "pt-BR" else "/"+code+"/")}">' for code in NAMES)
        seo += f'<link rel="alternate" hreflang="x-default" href="{e(PUBLIC)}/">'
    schema = {'@context':'https://schema.org','@type':'WebSite','name':CONFIG['name'],'description':t['summary'],'inLanguage':lang}
    if PUBLIC:
        schema['url'] = PUBLIC + url
    pillars = ''.join(f'<article><img class="gothic-icon" src="/assets/icon-{['gate','sword','sigil'][i]}.svg" width="80" height="80" alt="" loading="lazy"><span class="ordinal">0{i+1}</span><h3>{e(title)}</h3><p>{e(body)}</p></article>' for i,(title,body) in enumerate(t['pillars']))
    flow = ''.join(f'<li><span>0{i+1}</span><strong>{e(label)}</strong></li>' for i,label in enumerate(t['flow']))
    milestones = ''.join(f'<article class="entry"><div class="entry-index">0{i+1}</div><div><span class="entry-status {"ready" if i==0 else ""}">{e(status)}</span><h3>{e(title)}</h3><p>{e(body)}</p></div><span class="entry-mark" aria-hidden="true">{chr(10003) if i==0 else "↗"}</span></article>' for i,(title,body,status) in enumerate(t['milestones']))
    questions = ''.join(f'<details {"open" if i==0 else ""}><summary>{e(q)}<span aria-hidden="true">+</span></summary><p>{e(a)}</p></details>' for i,(q,a) in enumerate(t['faq']))
    links = ''
    for index,(key,label) in enumerate([('discordInvite','Discord'),('githubRepository','GitHub')]):
        target = CONFIG.get(key)
        links += f'<a class="button {"primary" if index==0 else "secondary"}" href="{e(target)}" rel="noopener noreferrer">{label} ↗</a>' if target else f'<span class="pending"><b>{label}</b><small>{e(t["pending"][index])}</small></span>'
    return f'''<!doctype html>
<html lang="{lang}" dir="{'rtl' if lang=='ar' else 'ltr'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diablo 1 HD — Returns from Darkness | {e(t['sections'][0])}</title>
<meta name="description" content="{e(t['summary'])}"><meta name="robots" content="{'index,follow' if CONFIG['releaseReady'] else 'noindex,nofollow'}">
<meta name="theme-color" content="#0c0e10"><meta property="og:type" content="website"><meta property="og:site_name" content="Returns from Darkness"><meta property="og:title" content="{e(CONFIG['name'])}"><meta property="og:description" content="{e(t['summary'])}"><meta property="og:locale" content="{lang.replace('-', '_')}"><meta name="twitter:card" content="summary_large_image">{seo}
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/real-gallery.css"><link rel="preload" as="image" href="/assets/cathedral.webp"><link rel="preload" as="font" href="/assets/fonts/CinzelDecorative-Regular.ttf" type="font/ttf" crossorigin>
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')}</script>
</head><body><a class="skip" href="#main">{e(t['skip'])}</a>
<header class="header"><a class="wordmark" href="#home" aria-label="Returns from Darkness"><span class="sigil" aria-hidden="true">Ⅰ</span><span>RETURNS FROM DARKNESS<small>DIABLO 1 HD</small></span></a><a class="header-discord discord-button" href="{e(CONFIG['discordInvite'])}" target="_blank" rel="noopener noreferrer">Discord ↗</a><button class="menu-toggle" aria-label="{e(t['menu'])}" aria-expanded="false" aria-controls="navigation">☰</button><nav id="navigation">{nav}</nav><label class="language"><span aria-hidden="true">◎</span><span class="sr-only">{e(t['language'])}</span><select id="language">{options}</select></label></header>
<main id="main"><section id="home" class="hero"><div class="hero-art" role="img" aria-label="{e(t['alt'])}"></div><div class="hero-content"><p class="eyebrow"><span></span>READY TO PLAY</p><p class="eyebrow">{e(t['eyebrow'])}</p><img class="classic-logo" data-classic-logo src="/assets/returns-from-darkness-classic-animated.webp" alt="Diablo 1 HD — Returns from Darkness" width="768" height="280"><h1>{e(t['headline'][0])}<br><em>{e(t['headline'][1])}</em></h1><p class="hero-description">{e(t['summary'])}</p><div class="actions"><a class="button primary" href="/central/?lang={lang}">{e(CENTRAL_LABELS[lang])}<span aria-hidden="true">↗</span></a><a class="button" href="/central/?lang={lang}#client">↓ Windows · v{CONFIG['baseVersion']}</a><a class="button discord-button" href="{e(CONFIG['discordInvite'])}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.4"/><path d="M8 9v5m-2-2.5h4" stroke="currentColor" stroke-width="1.4"/><circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></svg>{e(DISCORD_LABELS[lang])}<span aria-hidden="true">↗</span></a><a class="discover" href="#project">{e(t['actions'][1])}<span aria-hidden="true">↓</span></a></div><div class="hero-state"><i aria-hidden="true"></i>{e(t['facts'][0])}<span>v{e(CONFIG['baseVersion'])}</span></div></div><div class="art-caption">{e(t['art'])}</div><div class="vertical-mark" aria-hidden="true">TRISTRAM · EST. 1996</div></section>
<div class="facts"><div><span>Ⅳ</span>{e(t['facts'][1])}</div><div><span>∞</span>{e(t['facts'][2])}</div><div class="version"><span>{CONFIG['baseVersion']}</span>{e(t['facts'][0])}</div></div>
<section class="section project" id="project"><div class="section-kicker">01 / {e(t['sections'][0])}</div><div class="intro-grid"><h2>{e(t['vision'][0])}</h2><div><p class="lead">{e(t['vision'][1])}</p><p>{e(t['vision'][2])}</p></div></div><div class="pillars">{pillars}</div><div class="concept-gallery"><figure><img src="/assets/first-light.webp" width="1536" height="1024" loading="lazy" alt="{e(t['pillars'][2][0])}"><figcaption><span>{e(ART_TITLES[lang][0])}</span><small>{e(t['art'])}</small></figcaption></figure><figure><img src="/assets/ashen-arena.webp" width="1536" height="1024" loading="lazy" alt="{e(t['milestones'][2][0])}"><figcaption><span>{e(ART_TITLES[lang][1])} · 1v1 / 2v2</span><small>{e(t['art'])}</small></figcaption></figure></div></section>
{render_gallery(lang, CONFIG['baseVersion'])}
<section class="section online" id="online"><div class="section-kicker">02 / {e(t['sections'][1])}</div><div class="online-heading illustrated"><div><img class="gothic-icon" src="/assets/icon-gate.svg" width="80" height="80" alt="" loading="lazy"><h2>{e(t['online'][0])}</h2><p>{e(t['online'][1])}</p></div><figure class="party-art"><img src="/assets/cooperative.webp" width="1536" height="1024" loading="lazy" alt="{e(t['flow'][1])}"><figcaption>{e(t['art'])}</figcaption></figure></div><ol class="flow">{flow}</ol><div class="online-evidence"><article><span class="status-tag">v{CONFIG['baseVersion']}</span><h3>{e(t['now'][0])}</h3><p>{e(t['now'][1])}</p></article><article><span class="status-tag muted">→</span><h3>{e(t['next'][0])}</h3><p>{e(t['next'][1])}</p></article></div><p class="fineprint">{e(t['limits'])}</p></section>
<section class="section journal" id="journal"><div class="section-kicker">03 / {e(t['sections'][2])}</div><div class="journal-heading"><h2>{e(t['journal'][0])}</h2><p>{e(t['journal'][1])}</p></div><div class="journal-list">{milestones}</div><div class="journal-date"><time datetime="{CONFIG['updated']}">{CONFIG['updated']}</time><span>Returns from Darkness HD · v{CONFIG['baseVersion']}</span></div></section>
<section class="section faq" id="faq"><div><div class="section-kicker">04 / {e(t['sections'][3])}</div><h2>{e(t['sections'][3])}</h2><div class="faq-decoration" aria-hidden="true">Ⅰ</div></div><div class="questions">{questions}</div></section>
<section class="community" id="community"><img class="community-sigil" src="/assets/icon-sigil.svg" width="80" height="80" alt="" loading="lazy"><div class="section-kicker">05 / {e(t['sections'][4])}</div><h2>{e(t['join'][0])}</h2><p>{e(t['join'][1])}</p><div class="community-links">{links}</div></section></main>
<footer><a class="footer-brand" href="#home">RETURNS FROM DARKNESS<small>DIABLO 1 HD</small></a><p>{e(t['footer'])}</p><details class="language-links"><summary>{e(t['language'])} ↗</summary><div>{alternatives}</div></details></footer><script src="/app.js" defer></script><script src="/classic-logo.js" defer></script></body></html>'''

DIST.mkdir(exist_ok=True)
prepare_sanctuary(CONFIG['baseVersion'])
shutil.copy2(ROOT/'real-gallery.css',DIST/'real-gallery.css')
shutil.copytree(ROOT/'central',DIST/'central',dirs_exist_ok=True)
for lang in CONFIG['languages']:
    if lang not in LOCALES:
        raise ValueError(f'Missing translation {lang}')
    folder = DIST / lang
    folder.mkdir(exist_ok=True)
    (folder / 'index.html').write_text(page(lang), encoding='utf-8')
(DIST / 'index.html').write_text(page('pt-BR',root=True),encoding='utf-8')
(DIST / 'robots.txt').write_text('User-agent: *\n' + ('Allow: /\nSitemap: '+PUBLIC+'/sitemap.xml\n' if CONFIG['releaseReady'] else 'Disallow: /\n'), encoding='utf-8')
urls = [PUBLIC+'/']+[PUBLIC+f'/{lang}/' for lang in CONFIG['languages'] if lang != 'pt-BR'] if PUBLIC else []
alternates = ''.join(f'<xhtml:link rel="alternate" hreflang="{lang}" href="{xml_escape(PUBLIC)}{("/" if lang=="pt-BR" else "/"+lang+"/")}"/>' for lang in CONFIG['languages']) + f'<xhtml:link rel="alternate" hreflang="x-default" href="{xml_escape(PUBLIC)}/"/>' if PUBLIC else ''
(DIST / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'+''.join(f'<url><loc>{xml_escape(url)}</loc>{alternates}</url>' for url in urls)+'</urlset>', encoding='utf-8')

drafts = ROOT.parent / 'outreach' / 'posts'
github = ROOT.parent / 'github-public'
drafts.mkdir(parents=True,exist_ok=True)
(github/'docs').mkdir(parents=True,exist_ok=True)
for lang in CONFIG['languages']:
    t = LOCALES[lang]
    common = f"# {CONFIG['name']}\n\n{t['summary']}\n\n## {t['vision'][0]}\n\n{t['vision'][1]}\n\n{t['vision'][2]}\n\n## {t['online'][0]}\n\n{t['online'][1]}\n\n**{t['now'][0]} — v{CONFIG['baseVersion']}**\n\n{t['now'][1]}\n\n**{t['next'][0]}**\n\n{t['next'][1]}\n\n{t['limits']}\n\n## {t['journal'][0]}\n\n" + '\n\n'.join(f'### {title} · {status}\n\n{body}' for title,body,status in t['milestones']) + f"\n\n## {t['sections'][3]}\n\n" + '\n\n'.join(f'### {q}\n\n{a}' for q,a in t['faq']) + f"\n\n## {t['join'][0]}\n\n{t['join'][1]}\n\nDiscord: {CONFIG['discordInvite'] or t['pending'][0]}\n\nGitHub: {CONFIG['githubRepository'] or t['pending'][1]}\n\n{t['footer']}\n"
    (github/'docs'/f'README.{lang}.md').write_text(common,encoding='utf-8')
    post = f"# {t['post'][0]}\n\n{t['post'][1]}\n\n{t['summary']}\n\n**{t['now'][0]} — v{CONFIG['baseVersion']}**\n\n{t['now'][1]}\n\n**{t['next'][0]}**\n\n{t['next'][1]}\n\n{t['limits']}\n\n{t['faq'][0][1]}\n\n{t['post'][2]}\n\nDiscord: {CONFIG['discordInvite'] or t['pending'][0]}\n\nWebsite: {PUBLIC or '[URL PENDENTE / URL PENDING]'}\n\n---\nDRAFT — NOT PUBLISHED. Verify community rules and replace pending links before use.\n"
    (drafts/f'{lang}.md').write_text(post,encoding='utf-8')
(github/'README.md').write_text(common if lang=='en' else (github/'docs/README.en.md').read_text(encoding='utf-8') + '\n\n' + ' · '.join(f'[{name}](docs/README.{code}.md)' for code,name in NAMES.items())+'\n',encoding='utf-8')
from search_content import apply_search_content
apply_search_content(ROOT, CONFIG, LOCALES)
print(f'Built {len(CONFIG["languages"])} localized pages, root page, six search guides, matching post drafts and GitHub documents. Release: {CONFIG["releaseReady"]}.')
