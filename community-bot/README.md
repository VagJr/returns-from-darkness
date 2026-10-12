# Bot local — Returns from Darkness

Site e GitHub já publicados. Este bot organiza somente o servidor **1559307218762072174**, com uma comunidade pequena e multilíngue. Ele não é o servidor do jogo.

## Criar a aplicação e instalar

1. Abra https://discord.com/developers/applications e escolha **New Application**. Nome sugerido: **Returns from Darkness**. Use `server-icon.png` como ícone se desejar.
2. Em **Bot**, obtenha o token. Não envie o token no chat. Não é necessário habilitar Presence, Server Members ou Message Content Intent.
3. Em **Installation**, escolha **Guild Install**. Use os escopos `bot` e `applications.commands`.
4. Escolha as permissões **Manage Server**, **Manage Roles**, **Manage Channels**, **View Channels**, **Send Messages**, **Embed Links** e **Read Message History**. Não é preciso conceder Administrator.
5. Abra o Install Link mostrado pelo Discord e selecione seu servidor. Depois, em Configurações do servidor → Cargos, deixe o cargo do bot acima dos cargos que ele vai administrar. Cargos criados depois normalmente ficam abaixo dele.

Guia oficial: https://docs.discord.com/developers/quick-start/getting-started

## Rodar no Windows

Python 3.12 ou mais recente. A instalação local desta entrega já tem um ambiente isolado e a biblioteca instalada.

1. Abra **CONFIGURAR-BOT.cmd**. Ele instala as dependências e pede o token em uma entrada oculta, salvando-o somente em `.env`.
2. Abra **INICIAR-BOT.cmd** e mantenha a janela aberta. O bot fica online enquanto esse programa e o computador estiverem ligados.
3. No Discord, como administrador, execute **/setup plan** para ver a estrutura e **/setup apply** para criá-la.

Se preferir configurar manualmente, copie `.env.example` para `.env` e preencha `DISCORD_TOKEN`. O Application ID não é necessário no código, pois é obtido pela autenticação do bot. Não configure um Interactions Endpoint URL: este bot usa uma conexão de saída com o Discord, sem servidor HTTP ou encaminhamento de porta.

## Estrutura compacta

- Entrada: welcome-rules, announcements e begin-here.
- Comunidade: tavern, find-a-party, help-bugs e ideas-art.
- Voz: Party I e Party II, quatro pessoas por sala.
- Equipe: um canal privado staff.
- Cargos: Traveler, Watchers, Sentinels e 14 cargos de idioma.

Escolher um idioma mostra um guia e regras traduzidos em mensagem privada do Discord. Aceitar as regras libera a área da comunidade. O botão News alterna o cargo de interesse em novidades; os anúncios são publicados manualmente pela equipe. **Sentinels não concede poderes de administrador**: permite acesso ao espaço da equipe e escrita nos canais de entrada. Atribua esse cargo manualmente às pessoas responsáveis.

Idiomas: português brasileiro, inglês, espanhol, francês, alemão, italiano, polonês, russo, ucraniano, turco, japonês, coreano, chinês simplificado e árabe. Os canais de conversa são compartilhados. O bot não traduz automaticamente as mensagens dos usuários.

`/guide` abre o guia no idioma selecionado. `/setup apply` pode ser repetido: usa os IDs salvos, recupera canais por nome/tipo quando necessário e atualiza suas mensagens. Nenhum canal ou cargo é apagado. O nome, o ícone e as permissões da estrutura listada são ajustados. Não ativa o recurso Community do Discord, onboarding nativo, AutoMod ou anúncios automáticos.

## Configuração e verificação

- `config.json`: nome, servidor autorizado, links, canais e limites de voz.
- `translations.json`: textos em 14 idiomas, baseados na documentação pública.
- `state.json`: IDs de canais, cargos e mensagens; criado ao configurar. Mantenha esse arquivo local.
- `.env`: token local; ignorado pelo Git. A instalação do bot deve usar somente a aplicação destinada a esse projeto.
- `server-icon.png`: ícone derivado do SVG original do site.

Execute `.venv\Scripts\python.exe -m unittest -v` para as verificações locais. Elas usam simulações e não modificam o Discord. A configuração real só pode ser verificada depois de instalar a aplicação e fornecer o token local. Se a execução for interrompida no meio da criação, corrija a permissão e repita `/setup apply`.

Não publique os arquivos comerciais de Diablo, dados de jogadores ou tokens. O bot não coleta mensagens privadas, não lê o conteúdo das conversas e não exige permissões de membros ou presenças.

## Se aparecer Missing Access (50001)

Criar a aplicação e salvar o token não instala o bot no servidor. A inicialização agora primeiro conecta o bot, confere a presença no servidor autorizado e registra os comandos somente quando ele tem acesso. Se não estiver instalado, mostra um link de instalação com o ID da aplicação autenticada, o servidor correto, os dois escopos e as permissões necessárias. O programa continua conectado, aguardando a instalação.

Abra esse link com sua conta que administra o servidor e autorize a instalação. Se o bot já estiver no servidor mas o Discord recusar o registro dos comandos, use o mesmo link para reautorizar `bot` e `applications.commands`, depois reinicie. Não é necessário gerar outro token para resolver uma instalação ausente.

`/setup` deve ser usado em um canal do servidor configurado, não na conversa privada com o aplicativo. O dono do servidor é aceito mesmo sem um cargo chamado Administrador. Outros usuários precisam da permissão Administrator. A mensagem de recusa agora distingue servidor errado, cache indisponível e falta de permissão, e mostra as contas do dono e de quem executou quando aplicável. Conceder Administrator ao bot não remove privilégios do dono.
