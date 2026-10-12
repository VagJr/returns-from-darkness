import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

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

    async def test_compact_structure_and_four_player_voice(self):
        public=[c for cat in app.CONFIG['categories'] if not cat.get('private') for c in cat['channels']]
        self.assertEqual(sum(c['mode']!='voice' for c in public),7)
        voices=[c for c in public if c['mode']=='voice']
        self.assertEqual(len(voices),2)
        self.assertTrue(all(c['limit']==4 for c in voices))


if __name__=='__main__': unittest.main()
