"""Local community bot. No game credentials, privileged intents or public HTTP server."""
import asyncio
import json
import logging
import os
from pathlib import Path

import discord
from discord import app_commands

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
GUILD_ID = int(CONFIG['guild_id'])
GUILD = discord.Object(id=GUILD_ID)
STATE_FILE = ROOT / 'state.json'
LANGUAGES = {
    'pt-BR': 'Português (Brasil)', 'en': 'English', 'es': 'Español',
    'fr': 'Français', 'de': 'Deutsch', 'it': 'Italiano', 'pl': 'Polski',
    'ru': 'Русский', 'uk': 'Українська', 'tr': 'Türkçe', 'ja': '日本語',
    'ko': '한국어', 'zh-CN': '简体中文', 'ar': 'العربية',
}
RULES = {
    'pt-BR': 'Respeite todos. Sem assédio, spam ou divulgação sem autorização. Não compartilhe arquivos comerciais do jogo, cheats ou credenciais. Use os canais apropriados e marque o idioma das conversas. O servidor do jogo ainda não é público.',
    'en': 'Respect everyone. No harassment, spam or unauthorized promotion. Do not share commercial game files, cheats or credentials. Use the appropriate channels and label your conversation language. The game server is not public yet.',
    'es': 'Respeta a todos. Sin acoso, spam ni promoción sin permiso. No compartas archivos comerciales, trampas o credenciales. Usa los canales adecuados e indica tu idioma. El servidor del juego aún no es público.',
    'fr': 'Respectez chacun. Pas de harcèlement, spam ni publicité sans autorisation. Ne partagez pas de fichiers commerciaux, de triches ou d’identifiants. Utilisez les bons salons et indiquez votre langue. Le serveur de jeu n’est pas encore public.',
    'de': 'Respektiert alle. Keine Belästigung, Spam oder unerlaubte Werbung. Keine kommerziellen Spieldateien, Cheats oder Zugangsdaten teilen. Nutzt passende Kanäle und kennzeichnet eure Sprache. Der Spielserver ist noch nicht öffentlich.',
    'it': 'Rispetta tutti. Niente molestie, spam o pubblicità non autorizzata. Non condividere file commerciali, trucchi o credenziali. Usa i canali appropriati e indica la lingua. Il server di gioco non è ancora pubblico.',
    'pl': 'Szanuj wszystkich. Bez nękania, spamu i nieautoryzowanej reklamy. Nie udostępniaj komercyjnych plików gry, cheatów ani danych logowania. Używaj właściwych kanałów i oznaczaj język. Serwer gry nie jest jeszcze publiczny.',
    'ru': 'Уважайте всех. Без травли, спама и рекламы без разрешения. Не делитесь коммерческими файлами игры, читами или учётными данными. Используйте нужные каналы и указывайте язык. Игровой сервер пока не открыт для всех.',
    'uk': 'Поважайте всіх. Без цькування, спаму та реклами без дозволу. Не діліться комерційними файлами гри, читами чи обліковими даними. Використовуйте відповідні канали й указуйте мову. Ігровий сервер ще не відкритий для всіх.',
    'tr': 'Herkese saygı gösterin. Taciz, spam ve izinsiz tanıtım yapmayın. Ticari oyun dosyaları, hile veya kimlik bilgileri paylaşmayın. Uygun kanalları kullanın ve dilinizi belirtin. Oyun sunucusu henüz herkese açık değil.',
    'ja': '互いを尊重してください。嫌がらせ、スパム、無断宣伝は禁止です。市販ゲームのファイル、チート、認証情報を共有しないでください。適切なチャンネルを使い、会話の言語を示してください。ゲームサーバーはまだ一般公開していません。',
    'ko': '모두를 존중하세요. 괴롭힘, 스팸, 무단 홍보는 금지합니다. 상용 게임 파일, 치트, 인증 정보를 공유하지 마세요. 적절한 채널을 사용하고 대화 언어를 표시하세요. 게임 서버는 아직 공개되지 않았습니다.',
    'zh-CN': '请尊重每个人。禁止骚扰、垃圾信息及未经许可的宣传。请勿分享商业游戏文件、作弊工具或登录凭据。使用合适的频道并标明交流语言。游戏服务器尚未公开。',
    'ar': 'احترم الجميع. يُمنع التحرش والرسائل المزعجة والترويج دون إذن. لا تشارك ملفات اللعبة التجارية أو أدوات الغش أو بيانات الدخول. استخدم القنوات المناسبة وحدد لغة الحديث. خادم اللعبة لم يُفتح للجمهور بعد.',
}


def load_state():
    if not STATE_FILE.exists():
        return {'guild_id': str(GUILD_ID), 'roles': {}, 'channels': {}, 'messages': {}}
    value = json.loads(STATE_FILE.read_text(encoding='utf-8'))
    if value.get('guild_id') != str(GUILD_ID):
        raise ValueError('state.json belongs to another guild; use a separate installation.')
    return value


state = load_state()
setup_lock = asyncio.Lock()
role_lock = asyncio.Lock()


def save_state():
    pending = STATE_FILE.with_suffix('.tmp')
    pending.write_text(json.dumps(state, indent=2), encoding='utf-8')
    pending.replace(STATE_FILE)


def permitted(interaction):
    return interaction.guild_id == GUILD_ID and isinstance(interaction.user, discord.Member)


def get_role(guild, key):
    role = guild.get_role(int(state['roles'].get(key, 0)))
    if role and (key in ('traveler', 'watcher') or key.startswith('lang:')):
        if role.managed or role.permissions.value or role >= guild.me.top_role:
            raise ValueError('Self-assigned roles must be ordinary roles with no server privileges, below the bot.')
    return role


def install_url(application_id):
    permissions = discord.Permissions(manage_guild=True, manage_roles=True, manage_channels=True,
        view_channel=True, send_messages=True, embed_links=True, read_message_history=True)
    return discord.utils.oauth_url(application_id, permissions=permissions,
        scopes=['bot', 'applications.commands'], guild=GUILD, disable_guild_select=True)


def setup_denial(interaction):
    if interaction.guild_id != GUILD_ID:
        return f'Use /setup dentro do servidor do projeto ({GUILD_ID}), não por mensagem direta ou em outro servidor. {CONFIG["invite"]}'
    guild = interaction.guild
    if guild is None:
        return 'O bot ainda não reconhece este servidor. Instale-o com os escopos bot + applications.commands e reinicie.'
    # The owner is authorized independently of named roles and member-cache permissions.
    if interaction.user.id == guild.owner_id:
        return None
    if interaction.permissions.administrator:
        return None
    if isinstance(interaction.user, discord.Member) and interaction.user.guild_permissions.administrator:
        return None
    return f'Somente o dono do servidor ou um administrador pode configurar. Dono: <@{guild.owner_id}>. Sua conta: <@{interaction.user.id}>. Dar administrador ao bot não muda os seus cargos.'


def locale_for(interaction):
    if isinstance(interaction.user, discord.Member):
        held = {r.id for r in interaction.user.roles}
        for language in LANGUAGES:
            if int(state['roles'].get('lang:' + language, 0)) in held:
                return language
    value = str(interaction.locale)
    return value if value in LANGUAGES else ('en' if value.startswith('en') else 'pt-BR')


def guide_embed(language):
    text = json.loads((ROOT / 'translations.json').read_text(encoding='utf-8'))[language]
    embed = discord.Embed(title='Diablo 1 HD — Returns from Darkness',
                          description=text['summary'], color=int(CONFIG['color'], 16))
    embed.add_field(name=text['now'][0], value=text['now'][1], inline=False)
    embed.add_field(name='📜 ' + LANGUAGES[language], value=RULES[language], inline=False)
    embed.add_field(name=text['sections'][4], value=f"[Website]({CONFIG['website']}/{language}/) · [GitHub]({CONFIG['github']}) · [Discord]({CONFIG['invite']})", inline=False)
    embed.set_footer(text=text['footer'])
    return embed


class LanguageSelect(discord.ui.Select):
    def __init__(self):
        super().__init__(placeholder='Language / Idioma / 言語', custom_id='rfd:language:v1',
                         options=[discord.SelectOption(label=name, value=code) for code, name in LANGUAGES.items()])

    async def callback(self, interaction):
        await interaction.response.defer(ephemeral=True)
        language = self.values[0]
        role = get_role(interaction.guild, 'lang:' + language)
        if not role:
            await interaction.followup.send('A administração precisa executar /setup apply primeiro.', ephemeral=True)
            return
        async with role_lock:
            member = await interaction.guild.fetch_member(interaction.user.id)
            if role not in member.roles:
                await member.add_roles(role, reason='Self-selected community language')
            old_ids = {int(v) for k, v in state['roles'].items() if k.startswith('lang:')}
            old = [r for r in member.roles if r.id in old_ids and r.id != role.id]
            if old:
                await member.remove_roles(*old, reason='Changed community language')
        await interaction.followup.send(embed=guide_embed(language), view=AcceptRulesView(), ephemeral=True)


class SafeView(discord.ui.View):
    async def interaction_check(self, interaction):
        if not permitted(interaction):
            await interaction.response.send_message('This bot is reserved for its project server.', ephemeral=True)
            return False
        return True

    async def on_error(self, interaction, error, item):
        logging.error('Component failed: %s', type(error).__name__)
        message = 'Não foi possível concluir. Confira as permissões e a posição do cargo do bot.'
        if interaction.response.is_done():
            await interaction.followup.send(message, ephemeral=True)
        else:
            await interaction.response.send_message(message, ephemeral=True)


class AcceptRulesView(SafeView):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label='Accept rules / Aceitar regras', style=discord.ButtonStyle.success, custom_id='rfd:accept:v1')
    async def accept(self, interaction, button):
        await interaction.response.defer(ephemeral=True)
        role = get_role(interaction.guild, 'traveler')
        if not role:
            await interaction.followup.send('Execute /setup apply first.', ephemeral=True)
            return
        await interaction.user.add_roles(role, reason='Accepted community rules')
        await interaction.followup.send('✅ Welcome to Tristram! / Bem-vindo a Tristram! Use /guide.', ephemeral=True)


class WelcomeView(AcceptRulesView):
    def __init__(self):
        super().__init__()
        self.add_item(LanguageSelect())

    @discord.ui.button(label='News / Novidades 🔔', style=discord.ButtonStyle.secondary, custom_id='rfd:news:v1')
    async def news(self, interaction, button):
        await interaction.response.defer(ephemeral=True)
        role = get_role(interaction.guild, 'watcher')
        if not role:
            await interaction.followup.send('Execute /setup apply first.', ephemeral=True)
            return
        async with role_lock:
            member = await interaction.guild.fetch_member(interaction.user.id)
            enabled = role not in member.roles
            if enabled:
                await member.add_roles(role, reason='Opted into project updates')
            else:
                await member.remove_roles(role, reason='Opted out of project updates')
        await interaction.followup.send('🔔 Updates: ' + ('ON' if enabled else 'OFF'), ephemeral=True)


class CommunityBot(discord.Client):
    def __init__(self):
        intents = discord.Intents.none()
        intents.guilds = True
        super().__init__(intents=intents, allowed_mentions=discord.AllowedMentions.none())
        self.tree = app_commands.CommandTree(self)
        self.commands_registered = False
        self.command_sync_lock = asyncio.Lock()

    async def setup_hook(self):
        self.add_view(WelcomeView())

    async def sync_project_commands(self):
        async with self.command_sync_lock:
            if self.commands_registered:
                return
            url = install_url(self.application_id)
            if self.get_guild(GUILD_ID) is None:
                print('O token funciona, mas este bot ainda não está instalado no servidor do projeto.')
                print('Abra o link abaixo e autorize a instalação no servidor indicado:')
                print(url)
                print('O bot aguardará a instalação. Se os comandos não aparecerem após autorizar, reinicie INICIAR-BOT.cmd.')
                return
            try:
                await self.tree.sync(guild=GUILD)
            except discord.Forbidden:
                print('O Discord recusou o registro de comandos. Reautorize este bot com bot + applications.commands:')
                print(url)
                print('Depois da autorização, reinicie INICIAR-BOT.cmd.')
                return
            except discord.HTTPException as error:
                print(f'Não foi possível registrar os comandos (HTTP {error.status}). Reinicie para tentar novamente.')
                return
            self.commands_registered = True
            print('Comandos registrados. Use /setup plan e /setup apply no servidor.')

    async def on_ready(self):
        print(f'Bot conectado: {self.user}. Servidor autorizado: {GUILD_ID}.')
        await self.sync_project_commands()

    async def on_guild_join(self, guild):
        if guild.id == GUILD_ID:
            await self.sync_project_commands()

    async def on_guild_remove(self, guild):
        if guild.id == GUILD_ID:
            self.commands_registered = False


bot = CommunityBot()


async def ensure_role(guild, key, name, color):
    role = get_role(guild, key)
    if not role:
        role = discord.utils.get(guild.roles, name=name)
    if role and (role.managed or role.permissions.value):
        raise ValueError(f'Existing role {name} has privileges; rename it before setup.')
    if not role:
        role = await guild.create_role(name=name, color=discord.Color(color),
                                       permissions=discord.Permissions.none(), reason='RFD community setup')
    if role >= guild.me.top_role:
        raise ValueError(f'Move the bot role above {name}.')
    state['roles'][key] = role.id
    save_state()
    return role


def category_permissions(guild, spec):
    bot_member = guild.me
    traveler = get_role(guild, 'traveler')
    sentinel = get_role(guild, 'sentinel')
    result = {
        guild.default_role: discord.PermissionOverwrite(view_channel=spec['key'] == 'gate', send_messages=False, connect=False),
        bot_member: discord.PermissionOverwrite(view_channel=True, send_messages=True, embed_links=True,
                                               read_message_history=True, manage_channels=True),
        sentinel: discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True,
                                             attach_files=True, embed_links=True, connect=True, speak=True),
    }
    if not spec.get('private'):
        result[traveler] = discord.PermissionOverwrite(view_channel=True, send_messages=spec['key'] != 'gate',
                                                       attach_files=True, embed_links=True, add_reactions=True,
                                                       connect=True, speak=True, use_application_commands=True)
    return result


async def ensure_channel(guild, key, spec, category=None, overwrites=None):
    channel = guild.get_channel(int(state['channels'].get(key, 0)))
    expected = discord.CategoryChannel if category is None else (discord.VoiceChannel if spec['mode'] == 'voice' else discord.TextChannel)
    if channel and not isinstance(channel, expected):
        raise ValueError(f'Saved channel type does not match: {key}')
    if not channel:
        matches = [c for c in guild.channels if c.name == spec['name'] and isinstance(c, expected)
                   and (category is None or c.category_id == category.id)]
        if len(matches) > 1:
            raise ValueError(f'Ambiguous existing channel: {spec["name"]}')
        channel = matches[0] if matches else None
    if not channel:
        if category is None:
            channel = await guild.create_category(spec['name'], overwrites=overwrites, reason='RFD community setup')
        elif spec['mode'] == 'voice':
            channel = await guild.create_voice_channel(spec['name'], category=category, user_limit=spec['limit'], reason='RFD community setup')
        else:
            channel = await guild.create_text_channel(spec['name'], category=category, topic=spec['topic'], slowmode_delay=5 if spec['mode'] == 'chat' else 0, reason='RFD community setup')
    state['channels'][key] = channel.id
    save_state()
    # Only the explicitly configured channels are managed; unrelated channels are retained.
    if category is None:
        await channel.edit(overwrites=overwrites, reason='RFD category permissions')
    else:
        await channel.edit(category=category, sync_permissions=True, reason='RFD channel permissions')
    return channel


async def ensure_message(key, channel, embed, view=None):
    message = None
    saved_id = state['messages'].get(key)
    if saved_id:
        try:
            message = await channel.fetch_message(int(saved_id))
        except discord.NotFound:
            pass
    if message is None:
        async for candidate in channel.history(limit=100):
            if candidate.author.id == bot.user.id and candidate.embeds and candidate.embeds[0].title == embed.title:
                message = candidate
                break
    if message and message.author.id != bot.user.id:
        raise ValueError('Saved message is not owned by this bot.')
    if message:
        await message.edit(content=None, embed=embed, view=view)
    else:
        message = await channel.send(embed=embed, view=view)
    state['messages'][key] = message.id
    save_state()


@bot.tree.command(name='setup', description='Administrar a estrutura compacta da comunidade', guild=GUILD)
@app_commands.default_permissions(administrator=True)
@app_commands.choices(action=[app_commands.Choice(name='plan — revisar estrutura', value='plan'),
                             app_commands.Choice(name='apply — criar ou atualizar', value='apply')])
async def setup(interaction: discord.Interaction, action: app_commands.Choice[str]):
    denial = setup_denial(interaction)
    if denial:
        await interaction.response.send_message(denial, ephemeral=True)
        return
    if action.value == 'plan':
        lines = ['**7 canais públicos de texto + 2 salas de voz para 4 pessoas + 1 canal privado da equipe.**',
                 '**14 cargos de idioma**, Traveler, Watchers e Sentinels. Sem apagar canais existentes.']
        for spec in CONFIG['categories']:
            lines.append(spec['name'] + '\n' + ' · '.join(c['name'] for c in spec['channels']))
        lines.append('Apply ajusta nome e ícone do servidor, permissões dos canais listados e mensagens iniciais. Não ativa Community e não publica no Reddit.')
        await interaction.response.send_message('\n\n'.join(lines), ephemeral=True)
        return
    await interaction.response.defer(ephemeral=True, thinking=True)
    if setup_lock.locked():
        await interaction.followup.send('Outra configuração já está em andamento.', ephemeral=True)
        return
    async with setup_lock:
        permissions = interaction.guild.me.guild_permissions
        missing = [p for p in ['manage_guild', 'manage_roles', 'manage_channels', 'view_channel', 'send_messages', 'embed_links', 'read_message_history'] if not getattr(permissions, p)]
        if missing:
            await interaction.followup.send('Permissões faltando: ' + ', '.join(missing), ephemeral=True)
            return
        guild = interaction.guild
        await ensure_role(guild, 'traveler', 'Traveler', 0xb78c45)
        await ensure_role(guild, 'watcher', 'Watchers', 0x965038)
        await ensure_role(guild, 'sentinel', 'Sentinels', 0x873434)
        for code, name in LANGUAGES.items():
            await ensure_role(guild, 'lang:' + code, 'Language • ' + name, 0x5a6359)
        for spec in CONFIG['categories']:
            category = await ensure_channel(guild, 'category:' + spec['key'], spec, overwrites=category_permissions(guild, spec))
            for child in spec['channels']:
                await ensure_channel(guild, child['key'], child, category=category)
        await guild.edit(name=CONFIG['server_name'], icon=(ROOT/'server-icon.png').read_bytes(), reason='RFD project community branding')
        welcome = discord.Embed(title='Welcome to Tristram • Bem-vindo a Tristram',
            description='Select your language to read the project guide and rules. Then accept the rules to unlock the tavern.\n\nEscolha seu idioma, leia as regras e aceite para entrar na comunidade.\n\n**Shared channels, 14 languages.** /guide', color=int(CONFIG['color'], 16))
        welcome.set_image(url=CONFIG['website'] + '/assets/cooperative.webp')
        await ensure_message('welcome', guild.get_channel(state['channels']['welcome']), welcome, WelcomeView())
        await ensure_message('guide', guild.get_channel(state['channels']['guide']), guide_embed('en'), WelcomeView())
        news = discord.Embed(title='Returns from Darkness • Development journal',
             description='Independent, non-commercial fan project. The game server is not publicly available yet.\n\nFollow verified progress on the website and GitHub. Use /guide for your language.', color=int(CONFIG['color'], 16))
        news.add_field(name='Project', value=f"[Website]({CONFIG['website']}) · [GitHub]({CONFIG['github']})")
        await ensure_message('news', guild.get_channel(state['channels']['news']), news)
        await interaction.followup.send('✅ Comunidade configurada. Repita /setup apply sem duplicar a estrutura. Atribua Sentinels manualmente à equipe confiável.', ephemeral=True)


@bot.tree.command(name='guide', description='Read the project guide in your language / Guia do projeto', guild=GUILD)
async def guide(interaction: discord.Interaction):
    if not permitted(interaction):
        await interaction.response.send_message('This bot is reserved for its project server.', ephemeral=True)
        return
    await interaction.response.send_message(embed=guide_embed(locale_for(interaction)), view=WelcomeView(), ephemeral=True)


@bot.tree.error
async def command_error(interaction, error):
    actual = getattr(error, 'original', error)
    logging.error('Command failed: %s', type(actual).__name__)
    detail = str(actual) if isinstance(actual, ValueError) else 'Confira as permissões, a posição do cargo do bot e a conexão. Pode repetir /setup apply para continuar.'
    if interaction.response.is_done():
        await interaction.followup.send('⚠ ' + detail, ephemeral=True)
    else:
        await interaction.response.send_message('⚠ ' + detail, ephemeral=True)


def token_from_environment():
    environment = dict(os.environ)
    if (ROOT / '.env').exists():
        for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
            key, separator, value = line.partition('=')
            if separator and not key.strip().startswith('#'):
                environment.setdefault(key.strip(), value.strip())
    if environment.get('DISCORD_GUILD_ID', str(GUILD_ID)) != str(GUILD_ID):
        raise ValueError('DISCORD_GUILD_ID must match the authorized server in config.json.')
    token = environment.get('DISCORD_TOKEN', '')
    if not token:
        raise ValueError('Execute CONFIGURAR-BOT.cmd para salvar o token localmente.')
    return token


if __name__ == '__main__':
    try:
        bot.run(token_from_environment(), log_level=logging.WARNING)
    except (ValueError, discord.LoginFailure) as error:
        print('Configuração inválida. Confira o token local e config.json.' if isinstance(error, discord.LoginFailure) else str(error))
        raise SystemExit(1)
