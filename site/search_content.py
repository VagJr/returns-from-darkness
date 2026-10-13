"""Search discovery pages: visible, useful content rather than keyword lists."""
import json
import re
from pathlib import Path
from html import escape
from xml.etree import ElementTree as ET

TITLES={
'pt-BR':'Diablo 1 online e multiplayer HD | Returns from Darkness',
'en':'Diablo 1 Online Multiplayer HD | Returns from Darkness',
'es':'Diablo 1 online y multijugador HD | Returns from Darkness',
'fr':'Diablo 1 en ligne et multijoueur HD | Returns from Darkness',
'de':'Diablo 1 online im HD-Multiplayer | Returns from Darkness',
'it':'Diablo 1 online e multiplayer HD | Returns from Darkness',
'pl':'Diablo 1 online i multiplayer HD | Returns from Darkness',
'ru':'Diablo 1 онлайн: кооператив и HD | Returns from Darkness',
'uk':'Diablo 1 онлайн: кооператив та HD | Returns from Darkness',
'tr':'Diablo 1 çevrimiçi HD çok oyunculu | Returns from Darkness',
'ja':'Diablo 1 オンライン協力プレイ・HD | Returns from Darkness',
'ko':'Diablo 1 온라인 협동 플레이 · HD | Returns from Darkness',
'zh-CN':'Diablo 1 在线联机与 HD 客户端 | Returns from Darkness',
'ar':'Diablo 1 أونلاين وتعاون HD | Returns from Darkness'}

ARTICLES={
'diablo-1-online':{
'en':{
'title':'Diablo 1 Online: community, Windows client and co-op',
'description':'Play Diablo 1 online with the Returns from Darkness HD Windows client. Discover the community hub, four-player rooms, original game requirements and Discord.',
'intro':'Diablo 1 online is as much about finding a party as entering a dungeon. Returns from Darkness brings accounts, chat and room discovery into a community hub, alongside an expanded Windows client with the atmosphere of the original Diablo.',
'sections':[
('What can I do in Returns from Darkness?', 'The current client offers 29 character paths, equipment, spells, talents and challenges. The community hub connects accounts, chat and cooperative rooms for up to four players. The Windows launcher checks for client updates. The game remains in active development, so use the current release notes when deciding which features to test.'),
('How to start playing Diablo 1 online', 'Visit the community hub, download the Windows client and follow its current installation instructions. You will need compatible files from your own Diablo installation. Sign in with a community account, create or choose a room and use the hub to open the installed client. Friends should use compatible client versions and separate community accounts.'),
('Find a Diablo 1 community and a party', 'Join the project Discord to meet other players, ask questions and follow updates. Choose your language to reveal its chat; you can choose more than one language. Shared party, support and international channels keep the community together. When arranging a game, share your language, time zone, client version and availability.'),
('What stays online and what runs on my PC?', 'Accounts, chat and room discovery use cloud services. Gameplay runs on the players’ clients, and the room creator must stay connected. A direct connection is used when possible, with relay support for restrictive networks. This is a community lobby with separate games, rather than an authoritative MMO server or one persistent world shared by everyone.'),
('HD visuals, expanded content and the original game', 'The project uses Full HD presentation and evolving visual improvements while retaining classic sprites. Full replacement of the artwork is not complete. A broader set of classes, equipment and challenges is available in the current client; online PvP Arena, rankings and project events remain work in progress. Concept illustrations on the website are not gameplay screenshots.'),
('Is this the official Battle.net service?', 'No. Returns from Darkness is an independent, noncommercial fan project with its own community infrastructure and client development. It is not affiliated with Blizzard. It builds on community work, with credits and asset notices in the public repository. Commercial Diablo game data is not distributed.')],
'faq':[('Can I play Diablo 1 in a browser here?', 'The current playable client is for Windows. The website is the community hub, not a browser game.'),('Does it support four players?', 'Rooms are designed for up to four players. Two-client tests have verified shared item handling and character saving; broader external-party and stability testing continues.'),('Where can I ask for help?', 'Use the project Discord support channel. Include your client version, the steps you took and the error text, without passwords, tokens or commercial game files.')]},
'pt-BR':{
'title':'Diablo 1 online: comunidade, cliente Windows e cooperativo',
'description':'Jogue Diablo 1 online com o cliente Windows Returns from Darkness HD. Conheça a central, salas de até quatro jogadores, requisitos do jogo original e Discord.',
'intro':'Diablo 1 online também é o encontro antes da aventura: conversar, encontrar um grupo e descer à catedral de Tristram. Returns from Darkness reúne contas, chat e salas numa central de comunidade, junto de um cliente Windows ampliado que preserva a atmosfera do clássico.',
'sections':[
('O que existe no Returns from Darkness?', 'O cliente atual oferece 29 caminhos de personagem, equipamentos, magias, talentos e desafios. A central reúne contas, chat e salas cooperativas para até quatro jogadores. O launcher Windows verifica atualizações do cliente. O projeto segue em desenvolvimento; consulte as notas da versão atual para saber quais recursos testar.'),
('Como começar a jogar Diablo 1 online', 'Entre na central, baixe o cliente Windows e siga as instruções atuais de instalação. São necessários arquivos compatíveis da sua própria instalação de Diablo. Entre com a conta da comunidade, crie ou escolha uma sala e use a central para abrir o cliente instalado. O grupo deve usar versões compatíveis e contas individuais.'),
('Encontre uma comunidade de Diablo 1 e seu grupo', 'No Discord do projeto você encontra outros jogadores, tira dúvidas e acompanha novidades. Escolha os idiomas para revelar seus chats; é possível selecionar mais de um. Os canais compartilhados de grupo, suporte e conversa internacional aproximam a comunidade. Ao combinar uma partida, informe idioma, fuso horário, versão e disponibilidade.'),
('O que fica na nuvem e o que roda no computador?', 'Contas, chat e descoberta de salas usam serviços em nuvem. A partida roda nos clientes e exige que o criador permaneça conectado. A conexão é direta quando possível, com retransmissão para redes restritivas. É uma central comunitária com partidas separadas, sem um mundo MMO persistente compartilhado por todos ou um servidor autoritativo de combate.'),
('Visual HD, conteúdo ampliado e o clássico', 'A apresentação Full HD e as melhorias visuais estão em evolução, preservando sprites clássicos. A substituição de todas as artes ainda não está concluída. Há mais possibilidades de classes, equipamentos e desafios no cliente; Arena PvP online, ranking e eventos próprios seguem em desenvolvimento. Ilustrações conceituais do site não são capturas de gameplay.'),
('É a Battle.net oficial?', 'Não. Returns from Darkness é um projeto de fã independente e não comercial, com central e desenvolvimento próprios. Não há afiliação com a Blizzard. O trabalho aproveita contribuições comunitárias, com créditos e avisos de uso no repositório público. Não distribuímos os dados comerciais de Diablo.')],
'faq':[('Posso jogar Diablo 1 pelo navegador aqui?', 'O cliente jogável atual é para Windows. O site é a central da comunidade, não uma versão do jogo para navegador.'),('Há suporte a quatro jogadores?', 'As salas são destinadas a até quatro jogadores. Testes com dois clientes verificaram itens compartilhados e salvamento; testes de grupos externos e estabilidade continuam.'),('Onde pedir ajuda?', 'Use o canal de suporte do Discord. Informe versão, passos e mensagem de erro, sem enviar senhas, tokens ou arquivos comerciais do jogo.')]}},
'diablo-1-multiplayer':{
'en':{
'title':'Diablo 1 Multiplayer: rooms, co-op, saves and connection guide',
'description':'Understand Diablo 1 multiplayer in Returns from Darkness: join a four-player room, keep compatible versions, preserve local saves and troubleshoot connections.',
'intro':'A good Diablo 1 multiplayer session starts with a compatible client and a group that understands how its room works. This guide explains the cooperative model used by Returns from Darkness and the details to check before inviting friends.',
'sections':[
('Before your first cooperative game', 'Use the current Windows client and compatible original game files. Ask each player to use a separate community account. Let the launcher complete its update before opening a new game; do not replace game files during an active session. Read the current release notes, because the client and online menus are evolving.'),
('Create or join a room', 'The community hub lists rooms and connects your account to the project. Create a room for your party or join an existing one using the hub or supported client flow. Rooms are designed for up to four players. A room password can limit access to your group; use the room’s actual password prompt rather than posting credentials in public chat.'),
('Why must the room creator stay connected?', 'Cloud services keep the lobby, accounts and chat available, but the group’s game runs on its clients. The room creator hosts the session and must remain in the game. Leaving ends that session; automatic host migration is not complete. Agree on a host with a stable connection before a long dungeon run.'),
('Characters, equipment and world persistence', 'The client saves character progress, inventory and gold in local account profiles on the computer. Saves are separate from client updates, with automatic saving and recovery copies. They do not sync across computers. A newly created room starts a new world; character saving is not the same as keeping an entire dungeon permanently online.'),
('Troubleshooting joining and connectivity', 'Check that everyone is on a compatible release, that the room still exists and that its creator is connected. Review the client error message and connection state before retrying. Direct connections and relayed connections have different network paths, so report whether the failure affects one room, one player or all rooms. Avoid disabling security protections as a blanket fix.'),
('Report a multiplayer bug that can be reproduced', 'Tell the support channel the client versions, number of players, whether the room was newly created or already active, and what each player did before the problem. Describe the expected result and the actual result. Never include account passwords, login links, tokens or commercial game data. These details are more useful than a report that only says multiplayer does not work.')],
'faq':[('Can characters move between computers automatically?', 'No. Character profiles currently stay on the computer where you play.'),('Is this compatible with every Diablo 1 mod?', 'No. Use the client and compatible version for this project. A community lobby does not make unrelated Diablo, DevilutionX or other mod clients automatically interoperable.'),('Are four-player games fully verified in every network?', 'No. Rooms support four slots; two-client item and save tests passed, while larger external-party and long-session tests continue.')]},
'pt-BR':{
'title':'Diablo 1 multiplayer: salas, cooperativo, saves e conexão',
'description':'Entenda o multiplayer de Diablo 1 no Returns from Darkness: salas de até quatro jogadores, versões compatíveis, saves locais e ajuda para conexão.',
'intro':'Uma boa partida multiplayer de Diablo 1 começa com versões compatíveis e um grupo que conhece o funcionamento da sala. Este guia explica o cooperativo do Returns from Darkness e o que conferir antes de convidar os amigos.',
'sections':[
('Antes da primeira partida cooperativa', 'Use o cliente Windows atual e os arquivos originais compatíveis. Cada pessoa deve usar sua própria conta da comunidade. Espere o launcher concluir a atualização antes de abrir uma nova partida; não substitua arquivos do jogo durante uma sessão ativa. Confira as notas de versão, pois o cliente e os menus online estão em evolução.'),
('Criar ou entrar numa sala', 'A central mostra as salas e conecta sua conta à comunidade. Crie uma sala para o grupo ou entre em uma existente pelo fluxo disponível no site ou no cliente. São até quatro vagas. Uma senha de sala pode restringir a entrada ao grupo; use o formulário da própria sala e não publique credenciais no chat.'),
('Por que o criador precisa continuar conectado?', 'A nuvem mantém contas, chat e lobby disponíveis, mas a partida roda nos clientes. O criador hospeda a sessão e precisa permanecer no jogo. Sua saída encerra a partida; a migração automática de anfitrião ainda não está concluída. Para uma exploração longa, combinem um anfitrião com conexão estável.'),
('Personagens, equipamentos e persistência do mundo', 'Inventário, ouro e evolução são salvos em perfis locais por conta neste computador. Os saves ficam separados das atualizações, com salvamento automático e cópias de recuperação. Não há sincronização entre computadores. Uma sala nova começa um mundo novo; salvar o personagem não significa manter toda a masmorra online permanentemente.'),
('Problemas ao entrar ou conectar', 'Confira se o grupo usa versões compatíveis, se a sala ainda existe e se o criador está conectado. Leia a mensagem de erro e o estado da conexão antes de tentar novamente. Conexão direta e retransmissão usam caminhos diferentes; informe se a falha afeta uma sala, uma pessoa ou todas as salas. Não desative as proteções do computador como solução genérica.'),
('Relate um bug multiplayer que possa ser reproduzido', 'No suporte, informe as versões, a quantidade de jogadores, se a sala era nova ou já estava ativa e os passos de cada pessoa antes da falha. Explique o resultado esperado e o ocorrido. Não inclua senhas, links de login, tokens ou dados comerciais do jogo. Esses detalhes ajudam mais que dizer somente que o multiplayer não funciona.')],
'faq':[('Os personagens passam automaticamente para outro computador?', 'Não. Os perfis ficam no computador em que você joga.'),('Posso usar qualquer mod de Diablo 1?', 'Não. Use o cliente e uma versão compatível deste projeto. A central não torna clientes de Diablo, DevilutionX ou outros mods automaticamente compatíveis.'),('Quatro jogadores já foram validados em todas as redes?', 'Não. Há quatro vagas por sala e testes de itens e saves com dois clientes aprovados; testes externos maiores e de longa duração continuam.')]}},
'diablo-1-private-server':{
'en':{
'title':'Diablo 1 Private Server: how the community hub works',
'description':'Looking for a Diablo 1 private server? Understand Returns from Darkness: independent cloud accounts and rooms, player-hosted co-op and a community Discord.',
'intro':'Players searching for a Diablo 1 private server often want the same thing: a place to meet, find a party and play without arranging every session from scratch. Returns from Darkness develops that community experience, with a cloud hub and a custom Windows client. Understanding the architecture helps you choose the right expectations.',
'sections':[
('What private server means for this project', 'Here, the phrase describes an independent community service rather than Blizzard’s official infrastructure. Accounts, chat and room discovery are hosted in the cloud. The game itself runs in the group’s clients. This distinction matters: a persistent community lobby is not the same thing as a dedicated authoritative game world that keeps running without its players.'),
('Cloud lobby and player-hosted games', 'The hub remains accessible without the project owner’s PC running. Each party opens its own session for up to four players, hosted by the room creator’s client. Direct connectivity is used when possible, with relaying for restrictive networks. The creator must remain connected; automatic transfer to a new host is not complete.'),
('Accounts do not mean server-authoritative characters', 'Community accounts identify players and organize rooms. Characters and their inventory currently save on the player’s computer, not in a closed server-controlled economy. There is no automatic character synchronization across computers. A new room creates a new world. Do not interpret the account system as a guarantee of an authoritative ladder or MMO persistence.'),
('Independent client and classic Battle.net inspiration', 'The meeting place is inspired by the social experience of classic Battle.net, but this is not the official service or a universal gateway for all Diablo mods. Use the Returns from Darkness client and compatible versions. The project has developed prototypes around DevilutionX and PvPGN and an expanded client based on publicly released The Hell 3 source; authors and asset notices remain credited.'),
('What is available and what is still in development?', 'The Windows client, community hub and launcher are available. Expanded character paths, equipment, spells and challenges are presented in the current release. Full artwork replacement, host migration, external-party validation and project-specific ranked PvP remain unfinished. Check the release notes for the current build rather than relying on an old promotional post.'),
('Join the community without sharing game data', 'The project is independent and noncommercial, with no Blizzard affiliation. Obtain the client from the project hub or its linked official repository, and supply compatible files from your own Diablo installation. Never share commercial game archives, passwords or session tokens in Discord. The community is there for finding groups, support and development feedback.')],
'faq':[('Is Returns from Darkness an official Diablo server?', 'No. It is an independent fan project, not affiliated with Blizzard.'),('Is gameplay hosted entirely in the cloud?', 'No. The cloud hosts the community services; the room creator’s client hosts the game.'),('Can I use it as a persistent MMO or closed ladder?', 'No. Those claims do not describe the current project: saves are local and room worlds are not persistent.')]},
'pt-BR':{
'title':'Diablo 1 private server: como funciona a central comunitária',
'description':'Busca um servidor privado de Diablo 1? Conheça o Returns from Darkness: contas e salas em nuvem, cooperativo hospedado pelos jogadores e comunidade no Discord.',
'intro':'Quem procura Diablo 1 private server ou servidor privado de Diablo 1 costuma querer um lugar para conversar, encontrar grupo e organizar partidas. Returns from Darkness desenvolve essa experiência com central em nuvem e cliente Windows próprio. Entender a estrutura ajuda a saber o que esperar.',
'sections':[
('O que servidor privado significa neste projeto', 'Aqui o termo descreve um serviço comunitário independente da infraestrutura oficial da Blizzard. Contas, chat e descoberta de salas ficam na nuvem. O jogo roda nos clientes do grupo. Essa diferença importa: um lobby que permanece disponível não é um mundo autoritativo dedicado que continua funcionando sem jogadores.'),
('Lobby em nuvem e partidas dos jogadores', 'A central permanece acessível sem depender do computador do responsável pelo projeto. Cada grupo abre uma sessão de até quatro pessoas, hospedada pelo cliente do criador da sala. A conexão é direta quando possível, com retransmissão para redes restritivas. O criador precisa continuar conectado; transferência automática de anfitrião ainda não está completa.'),
('Ter uma conta não significa personagem autoritativo', 'A conta identifica o jogador e organiza o acesso às salas. Personagem e inventário são salvos no computador, sem uma economia fechada controlada exclusivamente pelo servidor. Não existe sincronização automática entre computadores. Uma sala nova cria um mundo novo. Contas não são uma promessa de ladder autoritativa ou persistência de MMO.'),
('Cliente próprio e inspiração na Battle.net clássica', 'O encontro é inspirado na experiência social da Battle.net, mas não é o serviço oficial nem uma entrada universal para todos os mods. Use o cliente Returns from Darkness em versões compatíveis. O projeto desenvolveu protótipos sobre DevilutionX e PvPGN e um cliente ampliado a partir dos fontes públicos do The Hell 3; os créditos aos autores e avisos de uso são preservados.'),
('O que está disponível e o que está em produção?', 'Cliente Windows, central e launcher estão disponíveis. Caminhos de personagem, equipamentos, magias e desafios ampliados são apresentados na versão atual. A substituição completa das artes, migração de anfitrião, validação de grupos externos e PvP ranqueado próprio ainda não estão concluídos. Consulte as notas da versão atual em vez de se basear num anúncio antigo.'),
('Participe sem compartilhar os dados do jogo', 'É um projeto de fã independente, não comercial e sem afiliação com a Blizzard. Obtenha o cliente pela central ou pelo repositório oficial vinculado, usando arquivos compatíveis da sua instalação de Diablo. Não envie arquivos comerciais, senhas ou tokens no Discord. A comunidade serve para encontrar grupo, pedir suporte e discutir o desenvolvimento.')],
'faq':[('Returns from Darkness é um servidor oficial?', 'Não. É um projeto de fã independente, sem afiliação com a Blizzard.'),('A partida inteira fica hospedada na nuvem?', 'Não. A nuvem hospeda os serviços comunitários; o cliente do criador hospeda a partida.'),('É um MMO persistente ou ladder fechada?', 'Não. Isso não descreve o projeto atual: os saves são locais e os mundos das salas não são persistentes.')]}}
}

def apply_search_content(root,config,locales):
    dist=root/'dist'; origin=config['publicOrigin'].rstrip('/')
    for lang in config['languages']:
        paths=[dist/lang/'index.html']+([dist/'index.html'] if lang=='pt-BR' else [])
        for path in paths:
            text=path.read_text(encoding='utf-8')
            text=re.sub(r'<title>.*?</title>',f'<title>{escape(TITLES[lang])}</title>',text,count=1)
            guide_lang='pt-BR' if lang=='pt-BR' else 'en'
            label='Guias de Diablo 1 online' if lang=='pt-BR' else 'Diablo 1 online guides (English)'
            links=' · '.join(f'<a href="/{guide_lang}/{slug}/">{escape(article[guide_lang]["title"])}</a>' for slug,article in ARTICLES.items())
            text=text.replace('</footer>',f'<nav aria-label="{escape(label)}" style="grid-column:1/-1;padding:1rem 0;font-size:.9rem;line-height:1.8"><strong>{label}</strong><br>{links}</nav></footer>')
            # Website identity links the same public community without fabricated reviews.
            text=text.replace('"@type": "WebSite",','"@type": "WebSite", "sameAs": '+json.dumps([config['githubRepository'],config['discordInvite']])+',')
            path.write_text(text,encoding='utf-8')
    generated=[]
    for slug,translations in ARTICLES.items():
        for lang,t in translations.items():
            url=f'{origin}/{lang}/{slug}/'; other='en' if lang=='pt-BR' else 'pt-BR'
            headings=''.join(f'<section><h2>{escape(title)}</h2><p>{escape(body)}</p></section>' for title,body in t['sections'])
            faq=''.join(f'<details open><summary>{escape(q)}</summary><p>{escape(a)}</p></details>' for q,a in t['faq'])
            related=''.join(f'<li><a href="/{lang}/{s}/">{escape(data[lang]["title"])}</a></li>' for s,data in ARTICLES.items() if s!=slug)
            home='/' if lang=='pt-BR' else '/en/'
            labels={'pt-BR':['O projeto','Entrar na central','Comunidade no Discord','Perguntas frequentes','Continue explorando','Atualizado em','Créditos e fontes'], 'en':['The project','Open community hub','Join Discord','Frequently asked questions','Keep exploring','Updated','Credits and sources']}[lang]
            schema={'@context':'https://schema.org','@type':'Article','headline':t['title'],'description':t['description'],'inLanguage':lang,'dateModified':config['updated'],'mainEntityOfPage':url,'author':{'@type':'Organization','name':'Returns from Darkness'},'publisher':{'@type':'Organization','name':'Returns from Darkness','url':origin}}
            html=f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(t['title'])} | Returns from Darkness</title><meta name="description" content="{escape(t['description'])}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="{url}"><link rel="alternate" hreflang="{lang}" href="{url}"><link rel="alternate" hreflang="{other}" href="{origin}/{other}/{slug}/"><link rel="alternate" hreflang="x-default" href="{origin}/en/{slug}/"><meta property="og:title" content="{escape(t['title'])}"><meta property="og:description" content="{escape(t['description'])}"><meta property="og:type" content="article"><meta property="og:url" content="{url}"><meta property="og:image" content="{origin}/assets/cathedral.webp"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/style.css"><style>body{{background:#0c0e10;color:#d9d2c7}}.search-guide{{max-width:900px;margin:auto;padding:32px 24px 80px}}.search-guide h1{{font-size:clamp(2rem,5vw,3.8rem);line-height:1.15;margin:2rem 0}}.search-guide h2{{font-size:1.7rem;margin:2.5rem 0 1rem}}.search-guide p{{line-height:1.85;margin:1rem 0}}.search-guide nav,.guide-actions{{display:flex;flex-wrap:wrap;gap:16px}}.guide-actions{{margin:2rem 0}}.search-guide details{{padding:16px 0;border-bottom:1px solid #49382a}}.search-guide summary{{cursor:pointer;font-size:1.1rem}}.search-guide ul{{padding-left:20px;line-height:2}}.search-guide .lead{{font-size:1.2rem}}.search-guide .note{{font-size:.9rem;color:#aea69a}}</style><script type="application/ld+json">{json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')}</script></head><body><main class="search-guide"><nav aria-label="Navigation"><a href="{home}">{labels[0]}</a><a href="/central/?lang={lang}">{labels[1]}</a><a href="/{other}/{slug}/" lang="{other}">{'English' if other=='en' else 'Português'}</a></nav><p class="eyebrow">RETURNS FROM DARKNESS · DIABLO 1 HD</p><h1>{escape(t['title'])}</h1><p class="lead">{escape(t['intro'])}</p><div class="guide-actions"><a class="button primary" href="/central/?lang={lang}">{labels[1]} ↗</a><a class="button" href="{config['discordInvite']}">{labels[2]} ↗</a></div><p class="note">{labels[5]} <time datetime="{config['updated']}">{config['updated']}</time> · <a href="{config['githubRepository']}/releases">Release notes</a></p>{headings}<h2>{labels[3]}</h2>{faq}<h2>{labels[4]}</h2><ul>{related}<li><a href="{home}">{labels[0]}</a></li><li><a href="{config['discordInvite']}">{labels[2]}</a></li></ul><p class="note">{escape(locales[lang]['footer'])} <a href="{config['githubRepository']}/blob/main/NOTICE.md">{labels[6]}</a>.</p></main></body></html>'''
            folder=dist/lang/slug;folder.mkdir(parents=True,exist_ok=True)
            (folder/'index.html').write_text(html,encoding='utf-8');generated.append((url,lang,slug))
    verification=root/'verification'
    if verification.exists():
        for path in verification.glob('google*.html'):(dist/path.name).write_bytes(path.read_bytes())
    sitemap=dist/'sitemap.xml'
    tree=ET.fromstring(sitemap.read_text(encoding='utf-8'))
    ns='{http://www.sitemaps.org/schemas/sitemap/0.9}'; xhtml='{http://www.w3.org/1999/xhtml}'
    ET.register_namespace('',ns[1:-1]);ET.register_namespace('xhtml',xhtml[1:-1])
    for entry in tree.findall(ns+'url'):ET.SubElement(entry,ns+'lastmod').text=config['updated']
    for url,lang,slug in generated:
        entry=ET.SubElement(tree,ns+'url');ET.SubElement(entry,ns+'loc').text=url;ET.SubElement(entry,ns+'lastmod').text=config['updated']
        for code in ('en','pt-BR'):ET.SubElement(entry,xhtml+'link',{'rel':'alternate','hreflang':code,'href':f'{origin}/{code}/{slug}/'})
        ET.SubElement(entry,xhtml+'link',{'rel':'alternate','hreflang':'x-default','href':f'{origin}/en/{slug}/'})
    sitemap.write_text('<?xml version="1.0" encoding="UTF-8"?>'+ET.tostring(tree,encoding='unicode'),encoding='utf-8')

if __name__=='__main__':
    root=Path(__file__).parent;config=json.loads((root/'site-config.json').read_text(encoding='utf-8'))
    locales={}
    for name in ('locales.json','locales-extra.json'):
        locales.update(json.loads((root/name).read_text(encoding='utf-8')))
    apply_search_content(root,config,locales)
