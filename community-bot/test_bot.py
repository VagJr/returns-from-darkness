import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import redirect_stdout
from io import StringIO

import discord
import bot as app


class BotTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.patches = [patch.object(app, 'STATE_FILE', Path(self.temp.name)/'state.json'),
                        patch.object(app, 'state', {'guild_id':str(app.GUILD_ID), 'roles':{}, 'channels':{}, 'messages':{}}),
                        patch.object(app.bot._connection, 'user', SimpleNamespace(id=123))]
        for p in self.patches: p.start()

    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.temp.cleanup()

    async def test_all_translations_fit_discord_limits(self):
        self.assertEqual(len(app.LANGUAGES),14)
        for language in app.LANGUAGES:
            embed = app.guide_embed(language)
            self.assertLessEqual(len(embed),6000,language)
            for field in embed.fields: self.assertLessEqual(len(field.value),1024,language)
        view=app.WelcomeView()
        self.assertTrue(view.is_persistent())
        self.assertFalse(app.bot.intents.members)
        self.assertFalse(app.bot.intents.message_content)

    async def test_repeated_setup_role_is_not_duplicated(self):
        guild=SimpleNamespace(id=app.GUILD_ID, roles=[])
        def role_data(id,name,position):
            return discord.Role(guild=guild,state=app.bot._connection,data={'id':str(id),'name':name,'permissions':'0','position':position,'color':0,'hoist':False,'managed':False,'mentionable':False})
        guild.me=SimpleNamespace(top_role=role_data(900,'Bot',100))
        guild.get_role=lambda id: next((r for r in guild.roles if r.id==id),None)
        async def create(**kw):
            role=role_data(len(guild.roles)+1,kw['name'],1)
            guild.roles.append(role)
            return role
        guild.create_role=AsyncMock(side_effect=create)
        first=await app.ensure_role(guild,'traveler','Traveler',0)
        second=await app.ensure_role(guild,'traveler','Traveler',0)
        self.assertIs(first,second)
        guild.create_role.assert_awaited_once()
        self.assertEqual(json.loads(app.STATE_FILE.read_text())['roles']['traveler'],first.id)

    async def test_existing_privileged_role_is_rejected(self):
        guild=SimpleNamespace(id=app.GUILD_ID,roles=[SimpleNamespace(name='Traveler',managed=False,permissions=discord.Permissions(administrator=True))],get_role=lambda id:None)
        with self.assertRaises(ValueError): await app.ensure_role(guild,'traveler','Traveler',0)

    async def test_changed_self_assignable_role_cannot_grant_admin(self):
        app.state['roles']['watcher']=77
        guild=SimpleNamespace(get_role=lambda id:SimpleNamespace(managed=False,permissions=discord.Permissions(administrator=True)))
        with self.assertRaises(ValueError): app.get_role(guild,'watcher')

    async def test_seed_message_recovers_after_state_loss(self):
        embed=discord.Embed(title='Welcome to Tristram')
        message=SimpleNamespace(id=55,author=SimpleNamespace(id=123),embeds=[embed],edit=AsyncMock())
        async def history(**kwargs): yield message
        channel=SimpleNamespace(history=history,send=AsyncMock(),fetch_message=AsyncMock(return_value=message))
        await app.ensure_message('welcome',channel,embed)
        await app.ensure_message('welcome',channel,embed)
        channel.send.assert_not_awaited()
        self.assertEqual(message.edit.await_count,2)

    async def test_setup_cannot_run_in_other_server(self):
        interaction=SimpleNamespace(guild_id=42,response=SimpleNamespace(send_message=AsyncMock()))
        await app.setup.callback(interaction,app.app_commands.Choice(name='apply',value='apply'))
        interaction.response.send_message.assert_awaited_once()
        self.assertFalse(app.STATE_FILE.exists())

    async def test_server_owner_does_not_need_an_administrator_role(self):
        interaction=SimpleNamespace(guild_id=app.GUILD_ID,guild=SimpleNamespace(owner_id=77),user=SimpleNamespace(id=77),permissions=discord.Permissions.none())
        self.assertIsNone(app.setup_denial(interaction))

    async def test_resolved_administrator_permissions_are_accepted(self):
        interaction=SimpleNamespace(guild_id=app.GUILD_ID,guild=SimpleNamespace(owner_id=77),user=SimpleNamespace(id=88),permissions=discord.Permissions(administrator=True))
        self.assertIsNone(app.setup_denial(interaction))

    async def test_non_administrator_cannot_configure_server(self):
        interaction=SimpleNamespace(guild_id=app.GUILD_ID,guild=SimpleNamespace(owner_id=77),user=SimpleNamespace(id=88),permissions=discord.Permissions.none())
        self.assertIn('Somente o dono',app.setup_denial(interaction))

    async def test_direct_message_explains_correct_server(self):
        interaction=SimpleNamespace(guild_id=None)
        self.assertIn('mensagem direta',app.setup_denial(interaction))

    async def test_bot_keeps_connect_permission_in_restricted_categories(self):
        member=object(); everyone=object(); traveler=object(); sentinel=object()
        guild=SimpleNamespace(me=member,default_role=everyone)
        with patch.object(app,'get_role',side_effect=lambda guild,key:traveler if key=='traveler' else sentinel):
            for category in app.CONFIG['categories']:
                overwrites=app.category_permissions(guild,category)
                self.assertTrue(overwrites[member].connect)
                self.assertTrue(overwrites[member].manage_channels)
                self.assertFalse(overwrites[everyone].connect)

    async def test_configuration_rejects_unrelated_server(self):
        with self.assertRaises(ValueError):await app.configure_community(SimpleNamespace(id=42))

    async def test_interrupted_voice_channel_restores_connect_before_edit(self):
        # A hashable member mock is needed for Discord's overwrite mapping.
        member=MagicMock(roles=[],add_roles=AsyncMock(),remove_roles=AsyncMock())
        traveler=object()
        category=SimpleNamespace(id=30,overwrites={member:discord.PermissionOverwrite(connect=True,view_channel=True,manage_channels=True)})
        voice=MagicMock(spec=discord.VoiceChannel)
        voice.id=55
        voice.permissions_for.return_value=discord.Permissions(connect=False)
        async def edit(**kwargs):
            member.add_roles.assert_awaited_once_with(traveler,reason='Recover interrupted RFD voice setup')
            return voice
        voice.edit=AsyncMock(side_effect=edit)
        guild=SimpleNamespace(me=member,get_channel=lambda id:voice)
        app.state['channels']['voice1']=55
        with patch.object(app,'get_role',return_value=traveler):
            result=await app.ensure_channel(guild,'voice1',{'mode':'voice','name':'Party I'},category=category)
        self.assertIs(result,voice)
        member.remove_roles.assert_awaited_once_with(traveler,reason='Finish RFD voice setup recovery')

    async def test_founder_is_assigned_only_to_server_owner_once(self):
        role=SimpleNamespace(edit=AsyncMock())
        owner=SimpleNamespace(roles=[],add_roles=AsyncMock())
        guild=SimpleNamespace(owner_id=77,fetch_member=AsyncMock(return_value=owner))
        with patch.object(app,'ensure_role',AsyncMock(return_value=role)):
            await app.ensure_founder(guild)
            guild.fetch_member.assert_awaited_once_with(77)
            owner.add_roles.assert_awaited_once_with(role,reason='Project founder: server owner')
            owner.roles=[role]
            await app.ensure_founder(guild)
            self.assertEqual(owner.add_roles.await_count,1)

    async def test_compact_structure_and_four_player_voice(self):
        public=[c for cat in app.CONFIG['categories'] if not cat.get('private') for c in cat['channels']]
        self.assertEqual(sum(c['mode']!='voice' for c in public),7)
        voices=[c for c in public if c['mode']=='voice']
        self.assertEqual(len(voices),2)
        self.assertTrue(all(c['limit']==4 for c in voices))

    async def test_startup_without_installation_does_not_register_commands(self):
        client=app.CommunityBot()
        client._connection.application_id=555
        client.tree.sync=AsyncMock()
        output=StringIO()
        with redirect_stdout(output): await client.sync_project_commands()
        client.tree.sync.assert_not_awaited()
        self.assertIn('client_id=555',output.getvalue())
        self.assertIn(str(app.GUILD_ID),output.getvalue())
        self.assertFalse(client.commands_registered)

    async def test_command_registration_missing_access_is_explained(self):
        client=app.CommunityBot()
        client._connection.application_id=555
        response=SimpleNamespace(status=403,reason='Forbidden')
        client.tree.sync=AsyncMock(side_effect=discord.Forbidden(response,{'code':50001,'message':'Missing Access'}))
        with patch.object(client,'get_guild',return_value=SimpleNamespace(id=app.GUILD_ID)):
            output=StringIO()
            with redirect_stdout(output): await client.sync_project_commands()
        self.assertIn('applications.commands',output.getvalue())
        self.assertFalse(client.commands_registered)

    async def test_guild_install_event_syncs_only_project_once(self):
        client=app.CommunityBot()
        client._connection.application_id=555
        client.tree.sync=AsyncMock()
        with patch.object(client,'get_guild',return_value=SimpleNamespace(id=app.GUILD_ID)), redirect_stdout(StringIO()):
            await client.on_guild_join(SimpleNamespace(id=42))
            client.tree.sync.assert_not_awaited()
            await client.on_guild_join(SimpleNamespace(id=app.GUILD_ID))
            await client.sync_project_commands()
            client.tree.sync.assert_awaited_once_with(guild=app.GUILD)
            self.assertTrue(client.commands_registered)


if __name__=='__main__': unittest.main()
