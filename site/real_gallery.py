"""Real client captures, shared by the project page and Sanctuary."""
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COPY = json.loads((ROOT / 'real-gallery.json').read_text(encoding='utf-8'))
FILES = ['gameplay', 'inventory', 'play-online', 'sanctuary-hub', 'sanctuary-room']


def render_gallery(language, version, central=False):
    t = COPY[language]
    escape = lambda value: html.escape(str(value), quote=True)
    gallery_id = 'client-gallery' if central else 'game-gallery'
    cards = ''.join(
        f'<figure class="capture-card capture-{name}"><a class="capture-image" '
        f'href="/assets/screenshots/{name}.webp?v={escape(version)}" target="_blank" rel="noopener" '
        f'aria-label="{escape(title)} — {escape(t["open"])}">'
        f'<img src="/assets/screenshots/{name}.webp?v={escape(version)}" alt="{escape(title)}" '
        f'width="1920" height="1080" loading="lazy" decoding="async">'
        f'<span class="capture-expand" aria-hidden="true">↗</span></a>'
        f'<figcaption><h3>{escape(title)}</h3><p>{escape(caption)}</p></figcaption></figure>'
        for name, (title, caption) in zip(FILES, t['cards'])
    )
    steps = ''.join(
        f'<li><span class="capture-step-number" aria-hidden="true">0{i + 1}</span>'
        f'<div><h4>{escape(title)}</h4><p>{escape(body)}</p></div></li>'
        for i, (title, body) in enumerate(t['steps'])
    )
    return (
        f'<section class="real-gallery {"central-gallery" if central else "section"}" '
        f'id="{gallery_id}" aria-labelledby="{gallery_id}-title">'
        f'<div class="capture-heading"><div><p class="eyebrow">{escape(t["eyebrow"])}</p>'
        f'<h2 id="{gallery_id}-title">{escape(t["title"])}</h2></div>'
        f'<span class="capture-version" data-no-translate>Windows · 1920 × 1080</span></div>'
        f'<p class="capture-intro">{escape(t["intro"])}</p>'
        f'<div class="capture-grid">{cards}</div>'
        f'<div class="capture-online"><h3>{escape(t["flowTitle"])}</h3>'
        f'<ol class="capture-flow">{steps}</ol></div>'
        f'<p class="capture-note">{escape(t["note"])}</p></section>'
    )


def sanctuary_translations():
    """Map the same Portuguese source strings used by the native hub page."""
    def strings(value):
        if isinstance(value, str):
            return [value]
        if isinstance(value, list):
            return [item for row in value for item in strings(row)]
        return [item for key, row in value.items() for item in strings(row)]
    source = strings(COPY['pt-BR'])
    packs = {language: dict(zip(source, strings(copy))) for language, copy in COPY.items()}
    for language, copy in COPY.items():
        for (source_title, _), (title, _) in zip(COPY['pt-BR']['cards'], copy['cards']):
            packs[language][source_title + ' — ' + COPY['pt-BR']['open']] = title + ' — ' + copy['open']
    return packs


def prepare_sanctuary(version):
    """Keep the editable native hub page and its language pack in sync."""
    target = ROOT / 'central' / 'index.html'
    text = target.read_text(encoding='utf-8')
    start = '<!--real-client-gallery:start-->'
    end = '<!--real-client-gallery:end-->'
    rendered = start + render_gallery('pt-BR', version, central=True) + end
    if start in text:
        text, count = re.subn(re.escape(start) + r'.*?' + re.escape(end), lambda _: rendered, text, flags=re.S)
        if count != 1:
            raise ValueError('Expected one Sanctuary gallery slot')
    else:
        anchor = '<div class="client-grid">'
        if text.count(anchor) != 1:
            raise ValueError('Cannot locate Sanctuary client section')
        text = text.replace(anchor, rendered + anchor, 1)
    if 'real-gallery.css' not in text:
        text = text.replace('</head>', '<link rel="stylesheet" href="real-gallery.css"></head>', 1)
    target.write_text(text, encoding='utf-8')
    shutil.copy2(ROOT / 'real-gallery.css', ROOT / 'central' / 'real-gallery.css')
    packs_path = ROOT / 'central' / 'locales.json'
    packs = json.loads(packs_path.read_text(encoding='utf-8'))
    for language, translations in sanctuary_translations().items():
        packs[language].update(translations)
    packs_path.write_text(json.dumps(packs, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
