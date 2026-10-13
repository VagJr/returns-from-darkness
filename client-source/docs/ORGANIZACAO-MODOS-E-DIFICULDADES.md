# Organização das escolhas de jogo — 0.4.1

## O que parecia ser a mesma escolha

As regras de personagem e a dificuldade da campanha são escolhas diferentes. A base usava palavras como “default difficulty” e “level of difficulty” na descrição de Normal, Easy e Hard. Isso confundia a escolha de regras com os nove graus da campanha. As descrições desses modos agora dizem explicitamente **Character rules**, com a dificuldade da campanha apresentada como outra escolha.

| Escolha | O que define | Onde pertence |
| --- | --- | --- |
| Classe, caminho, traits e modificadores compatíveis | A construção do personagem | Criação de personagem |
| Regras de personagem | Morte permanente, limitações de salvamento, agressividade e outros desafios de uma jornada local | Criação de personagem solo |
| Campanha cooperativa ou Coliseum | O tipo de atividade e o conjunto compatível de personagens | Criação de sala online |
| Horror, Purgatory, Doom, Crucible, Torment, Agony, Terror, Destruction ou Inferno | O grau da campanha, incluindo escalas e conteúdo dependente dessa dificuldade | Criação da sala cooperativa; início de uma nova jornada solo |
| Seleção de personagem | Qual personagem compatível entra na atividade escolhida | Entrada na sala; seleção antes de iniciar uma jornada solo |
| Desbloqueios | Quais novas opções estão disponíveis para a conta | Progressão do Santuário; consulta no perfil |

**Normal não significa Horror.** Normal é um conjunto de regras; Horror é o primeiro grau da campanha. Um personagem solo com regras Normal pode iniciar jornadas de dificuldades diferentes quando atender aos requisitos. Hardcore mantém a morte permanente mesmo quando o grau da campanha muda.

## Fluxo online consolidado

1. Criar ou escolher a sala.
2. Na criação, escolher a atividade: campanha cooperativa ou Coliseum.
3. Para campanha cooperativa, escolher uma dificuldade desbloqueada da conta. Essa dificuldade pertence à sala inteira.
4. Selecionar ou criar um personagem compatível e atender ao nível mínimo exigido pela sala.
5. Entrar na partida com a mesma dificuldade e a mesma semente dos outros participantes.

A criação de um novo personagem de campanha online usa as regras **Normal** da sala e não abre uma segunda escolha de regras conflitante. Criar um personagem de arena usa **Coliseum**. Classe, traits e modificadores continuam obedecendo às restrições e aos desbloqueios existentes; essa alteração não libera modificadores incompatíveis.

Um personagem antigo com regras incompatíveis recebe um aviso dentro do jogo e volta ao seletor. O arquivo é preservado; nenhuma conversão silenciosa acontece. A mesma validação protege a abertura automática de um personagem de campanha nos testes do cliente.

Ao entrar em uma sala existente, não há outro seletor de dificuldade. O cliente usa o grau recebido da sala. A escolha feita na criação da sala, tanto pelo site quanto pelo hub do jogo, é a origem dessa configuração.

A validação de nível foi corrigida: a entrada online não consulta mais o ponteiro temporário do seletor de dificuldade solo. Ela lê a descrição nativa gerada do save do personagem escolhido, antes de inicializar a rede. Assim, um herói de nível 20 pode cumprir o mínimo de Purgatory; um personagem recém-criado de nível 1 não herda o nível alto de outro personagem da conta. A QA privada exercita a serialização e leitura reais de nível 1, 20, 35 e 83 e seus mínimos, sem alterar saves de jogadores.

Depois da conexão inicial, o cliente verifica novamente o nível mínimo usando a dificuldade efetivamente informada pela sessão. Se o convite tiver um grau incorreto, a dificuldade da sessão prevalece; o cliente fecha a conexão e apresenta o aviso antes de ativar a partida. O registro de progressão também exige Normal em uma sala cooperativa e Coliseum em uma sala de arena.

## Coliseum não usa graus de campanha

Coliseum usa personagens de arena e suas próprias regras. As nove dificuldades de campanha não devem aparecer como configuração de PvP. A arena conserva internamente o valor técnico `difficulty=0`, compatível com a base, sem apresentá-lo como “Horror” ao jogador.

No site, o campo de dificuldade fica oculto e desabilitado ao escolher Coliseum. Ao voltar para campanha, a dificuldade anteriormente escolhida é restaurada. As listas de arena mostram a atividade e a ocupação, sem um rótulo de dificuldade de campanha.

O serviço normaliza para zero uma dificuldade enviada por um cliente antigo ao criar arena. Isso evita que uma seleção anterior de Inferno, por exemplo, imponha indevidamente uma conclusão de campanha ou nível 83 para uma arena. O desbloqueio de Coliseum continua exigindo nível 10 na progressão da campanha da conta. Níveis de personagens de arena não liberam os graus da campanha.

## Desbloqueios e requisitos preservados

| Grau de campanha | Nível mínimo do personagem | Desbloqueio da conta |
| --- | ---: | --- |
| Horror | 1 | Disponível desde o início |
| Purgatory | 20 | Concluir Horror |
| Doom | 35 | Concluir Purgatory |
| Crucible | 43 | Concluir Doom |
| Torment | 51 | Concluir Crucible |
| Agony | 59 | Concluir Torment |
| Terror | 67 | Concluir Agony |
| Destruction | 75 | Concluir Terror |
| Inferno | 83 | Concluir Destruction |

A conta também precisa alcançar o nível correspondente. Saves importados preservam o acesso avançado já registrado por seu campo de dificuldade permitida. Isso não cria selos, dots ou conquistas de conclusão inventados.

As regras solo continuam disponíveis conforme seus desbloqueios: Easy, Normal, Hard, Survival, Hardcore, Ironman, Speedrun e Nightmare. Essas opções não foram removidas do jogo solo nem tiveram seu balanceamento alterado por esta organização.

## Implementação e evidência

- `candidates/thehell3/src/GameModes.cpp`: descrições de regras e validação do modo de personagem compatível com a sala. A QA privada percorre os nove IDs em contexto solo, cooperativo e arena, sem rede ou progressão fictícia.
- `candidates/thehell3/src/Hell.cpp`: criação online segue as regras da atividade; retorno dos modificadores leva aos traits; personagem incompatível não fecha o seletor para tentar entrar no mundo.
- `candidates/thehell3/src/MainMenu.cpp`: campanha e Coliseum conservam seus seletores e arquivos próprios; abertura automática de campanha verifica o modo salvo.
- `candidates/thehell3/src/CommunityHub.cpp`: atividade e dificuldade da sala no hub nativo.
- `candidates/thehell3/src/CommunityOnline.cpp`: dificuldade recebida da sessão compartilhada, sem segunda escolha individual.
- `services/peer-realm/worker.mjs`: campanha mantém validação de faixa e desbloqueios; arena normaliza grau interno para zero.
- `site/central/app.js` e `site/central/sanctuary.js`: formulário e lista de salas coerentes com o tipo de atividade, preservando as traduções existentes.
- `tools/test-room-options-041.mjs`: fixture com o serviço real de salas e progressão; testa os bloqueios da campanha, nível 10 da arena, compatibilidade de cliente antigo, entrada de convidado, lançamento e início de progresso com a mesma configuração.
- `tools/test-citadel-ui.mjs`: navegador verifica ocultação do grau na arena, restauração da escolha de campanha e ausência do rótulo Horror na lista de PvP.

Esta organização não altera os rates, não implementa migração de anfitrião e não transforma a simulação entre participantes em um servidor de combate autoritativo.
