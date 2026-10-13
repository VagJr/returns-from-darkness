# Santuário 0.4.0 — progressão de conta e identidade da comunidade

Revisão de design: `sanctuary-1`. Conferência de fontes: 13/10/2026. Este documento descreve a expansão em desenvolvimento; não declara que o cliente público 0.3.7 já possui estes desbloqueios. A manutenção 0.3.7 e a expansão 0.4.0 são entregas diferentes.

## Resultado pretendido e fronteiras

O jogador começa com seis caminhos de personagem e escolhas introdutórias. Ao evoluir personagens de campanha e concluir dificuldades, sua conta libera caminhos, traits, modificadores e desafios mais avançados. A mesma conta mostra personagens, selos de campanha, títulos e identidade visual no Santuário do site e no hub do cliente.

Os desbloqueios são compartilhados pela conta e se aplicam às novas escolhas de criação. Um herói novo continua começando no nível normal da engine: liberar uma classe não concede níveis, equipamento nem XP ao novo personagem. Heróis existentes conservam classe, traits, modo, equipamentos e saves.

Esta expansão organiza o acesso ao conteúdo existente. Não é uma mudança global dos rates de XP, ouro ou drops, nem uma substituição de todos os requisitos da engine. Restrições de classe, incompatibilidades de traits, ranks de perks, requisitos de itens e condições de áreas continuam valendo depois do desbloqueio de conta.

## Inventário verificado

As contagens abaixo são definições da fonte auditada, não uma certificação de que cada variante aparece em toda campanha ou funciona online.

| Conteúdo | Definições |
|---|---:|
| Caminhos completos de classe e especialização | 29 |
| Traits | 98, além de `NoTrait` |
| Modificadores de criação | 26, além de `None` |
| Modos de criação | 8 |
| Coliseum | 1 modo adicional |
| Dificuldades de campanha | 9 |
| Nível máximo | 150 |
| Quests | 34, sendo 22 com flag multiplayer |
| Áreas | 110, sendo 85 áreas de quest |
| Perks | 179 |
| Sinergias | 75 |
| Sintomas | 12 |
| Definições de itens únicos | 2.373 |
| Registros de itens base | 2.504 |
| Registros de monstros | 286 |
| Registros de magias | 62 |

Fonte: `analysis/content-catalog.json`. O catálogo foi produzido para a base 0.3.5; as integrações posteriores da expansão precisam de nova auditoria antes de transformar contagens em promessas de publicação.

## O que conta como evolução da conta

- **Nível de conta:** maior nível já registrado entre seus heróis de campanha ou solo. Não soma níveis de personagens. Começa em 1 e cresce até 150.
- **Nível de arena:** maior nível registrado nos personagens de Coliseum, armazenado separadamente. Um personagem de arena no nível 150 não libera caminhos ou dificuldades da campanha.
- **Conclusão:** vitória reportada pelo cliente sobre Uber Diablo, ID base de monstro **137**, no **andar 24**, em modo que não seja Coliseum, dentro de uma sessão compatível e vinculada à conta.
- **Chefes:** registros próprios de chefes derrotados; a derrota de um chefe comum não concede automaticamente um selo de conclusão de campanha.
- **Abates PvP:** eventos de Coliseum ligados à sessão e a outro slot que participou da sala. Não contam abates contra o próprio slot.

Diablo clássico, ID **110**, no andar **16**, é uma vitória importante da campanha, mas não é a conclusão da campanha estendida usada nos nove selos. O cliente não deve transformar essa morte em um selo final. Também não se deve confundir o modo de desafio **Nightmare** com a segunda dificuldade **Purgatory**.

Os marcos de nível registrados são **5, 10, 20, 30, 35, 43, 50, 51, 59, 67, 75, 83, 100, 125 e 150**. Nem todo marco libera um novo caminho: os marcos posteriores também dão continuidade à apresentação da evolução de conta.

## Caminhos de personagem: mapa completo

Os nomes e IDs abaixo são os dados gerados em `content/progression/rules.json`. Nível e conclusão, quando presentes na mesma linha, são requisitos cumulativos.

| Requisito da conta | Caminhos liberados |
|---|---|
| Inicial | Warrior (0), Archer (4), Mage (8), Monk (14), Rogue (18), Savage (22) |
| Nível 10 | Inquisitor (1), Scout (5), Elementalist (9), Kensei (15), Assassin (19), Berserker (23) |
| Nível 20 | Guardian (2), Sharpshooter (6), Demonologist (10), Shugoki (16), Iron maiden (20), Executioner (24), Thraex (25) |
| Nível 25 | Murmillo (26) |
| Nível 30 + concluir Horror | Templar (3), Trapper (7), Necromancer (11), Warlock (13), Shinobi (17), Bombardier (21), Dimachaerus (27) |
| Nível 35 + concluir Purgatory | Beastmaster (12), Secutor (28) |

Direção de design: as seis entradas preservam a variedade imediata de combate. Nível 10 introduz especializações antes da primeira conclusão; nível 20 abre builds com maior identidade. Os caminhos de nível 30 exigem experiência efetiva com a campanha inteira. Beastmaster e Secutor ficam depois da segunda conclusão para entregar os caminhos finais de criação como recompensa reconhecível. Os níveis são requisitos de acesso, não uma estimativa de horas necessárias para alcançá-los.

## Traits: entrega gradual de 98 escolhas

Existem 99 entradas na tabela, incluindo `NoTrait`. O desbloqueio da conta não remove a máscara de classes nem os conflitos entre traits. **Crowd Seeker continua excluído do multiplayer**, mesmo quando a conta alcança seu requisito.

| Requisito | Quantidade | Escolhas |
|---|---:|---|
| Inicial | 7 entradas; 6 traits + `NoTrait` | No Trait, Gifted, Survivor, Scrounger, Thick Skinned, Cautious, Gold Digger |
| Nível 5 | 17 traits | Kamikaze, Heavy Handed, Finesse, Bruiser, Negotiant, Adventurer, Ratel Hide, Old Habit, Arrow Dancing, Point Blank, Fast Metabolism, Bouncer, Sandman, A Rose with Thorns, The Best Defense..., Strafer, Piercing Shot |
| Nível 10 | 52 traits | Skilled, Barbarism, Weird, Old Fashioned, Domesticated, Rudiarius, Pyromaniac, Avatar of Cold, Grim Deal, Holy Aura, Destroyer, Chromatic Skin, Tormentor, Armadillo, Bloody Mess, Bestiarius, Petrifier, Toxic at Heart, Hunger, Fechtmeister, Wrecking Block, Two Towers, Puncturing Stab, Blood and Sand, Blood for Blood, Big Frame, Crossbow Training, Blistered Skin, Cleric, Bloodless, Engineer, Necropathy, Treasure Hunter, Breaker of Stones, Cannibalism, Axepertise, Monkey Grip, Zealot, Adrenaline, Bend the Rules, Barbarian, Thrill Seeker, Psychotic, Small Frame, Blue Blood, Insensitive, Iron Fisted, Unshakable, Resolute Guard, Ranger, Nasty Disposition, Coinbound |
| Nível 30 + concluir Horror | 12 traits | Rabid, Leper, Forgetful, Wild Sorcery, Dark Pact, Black Witchery, Sisyphean Task, Fear the Reaper, Crowd Seeker, Blood Oath, Mana Flux, Doomwhorl |
| Nível 35 + concluir Purgatory | 11 traits | Psion, Devastator, Juggernaut, Prodigy, Hydramancer, Paladin, Mamluk, Vigorous, Pistoleer, Stoneform, Lithe Build |

Direção de design: escolhas introdutórias ficam disponíveis na primeira criação, e o nível 5 entrega uma primeira recompensa rápida. No nível 10, a biblioteca abre alternativas de build. Traits com penalidades severas ou funcionamento mais especializado aparecem após conclusões de campanha, quando o jogador já conhece as regras que elas alteram. Não se trata de uma classificação absoluta de poder: vários traits são trocas de benefícios e custos.

## Modificadores de criação

Há 27 entradas, incluindo `None`. O salvamento automático fica disponível desde o começo; não é recompensa que possa deixar o jogador sem uma função essencial.

| Requisito | Modificadores liberados |
|---|---|
| Inicial | None (0), Auto-saving (1) |
| Nível 10 | Bound Gear (2), Item Drops (3), Effortless (4), Imperishable Items (18), Acceleration (25) |
| Nível 20 + concluir Horror | Live off the Land (5), Prohibition (7), Full Contact (8), Hack & Slash (10), No regeneration (13), Ice Age (15), Tougher Monsters (17), No Map (19), Double Damage (20), Tough Luck (23), Asceticism (26) |
| Nível 35 + concluir Purgatory | Impossible (6), Night Kin (9), Vaccinated (11), That's my Secret (12), Clean Hands (14), Groundhog Day (16), See No Evil (21), Black Death (22), Ruthless Iron (24) |

A disponibilidade continua sujeita às combinações permitidas pela engine. Desbloquear um modificador na conta não prova que toda combinação com modo, classe ou partida online é válida.

## Modos de criação e arena

| ID | Modo | Requisito da conta | Uso marcado nas regras da expansão |
|---:|---|---|---|
| 0 | Normal | Inicial | Campanha online |
| 1 | Hardcore | Nível 30 + concluir Horror | Desafio local |
| 2 | Ironman | Nível 35 + concluir Purgatory | Desafio local |
| 3 | Nightmare | Nível 43 + concluir Doom | Desafio local |
| 4 | Easy | Inicial | Desafio local |
| 5 | Survival | Nível 20 + concluir Horror | Desafio local |
| 6 | Hard | Nível 10 | Desafio local |
| 7 | Speedrun | Nível 50 + concluir Doom | Desafio local |
| 8 | Coliseum | Nível 10 de campanha/solo | Arena online experimental |

`online` é verdadeiro somente para os modos **Normal** e **Coliseum** nesta revisão. Os outros modos fazem parte da progressão de criação, mas não devem aparecer no marketing como oito modos online já validados. Coliseum usa a categoria própria de personagens e não fornece níveis de campanha por meio de seus níveis elevados.

Direção de design: a primeira experiência mantém a campanha principal clara. Desafios com restrições, morte permanente ou exigência de domínio chegam depois de experiência e conclusões suficientes. Speedrun pede nível 50 e Doom para não ser oferecido antes do entendimento do percurso. Nenhum desses requisitos altera o efeito original do modo ou restaura um herói apagado por morte permanente.

## As nove dificuldades: acesso sequencial

| ID | Dificuldade | Nível mínimo | Conclusão anterior exigida |
|---:|---|---:|---|
| 0 | Horror | 1 | Nenhuma |
| 1 | Purgatory | 20 | Horror |
| 2 | Doom | 35 | Purgatory |
| 3 | Crucible | 43 | Doom |
| 4 | Torment | 51 | Crucible |
| 5 | Agony | 59 | Torment |
| 6 | Terror | 67 | Agony |
| 7 | Destruction | 75 | Terror |
| 8 | Inferno | 83 | Destruction |

Para uma conta nova, subir de nível não permite pular a conclusão anterior. Criar ou entrar em uma sala usa o desbloqueio da conta; o herói selecionado também precisa atingir o nível mínimo da dificuldade. Por exemplo, uma conta que liberou Doom não leva um novo herói de nível 1 para Doom.

Os mínimos seguem os patamares de dificuldade já levantados na fonte, sem tentar recalibrar todas as tabelas de XP nesta atualização. Do Crucible ao Inferno, os passos de oito níveis dão cadência clara ao percurso de campanha. A confirmação de ritmo real depende de campanhas jogadas; as tabelas não medem tempo de evolução ou tempo para matar.

## Legado e continuidade

O cliente sincroniza uma visão dos saves locais com sua conta autenticada. O maior nível de campanha existente pode liberar as escolhas por nível imediatamente. O campo legado `allowedDifficulty` é usado para conservar acesso às dificuldades e escolhas que esse herói já tinha: para a dificuldade de ID `t`, o acesso legado exige `legacyDifficulty >= t`, além do nível mínimo; para uma escolha que pede conclusão `c`, exige `legacyDifficulty > c`.

Esse caminho de migração evita obrigar quem já progrediu a repetir todo o acesso inicial. **Não inventa vitórias:** legado não preenche os selos de campanha e não concede títulos que exigem conclusão, dots ou moldura dourada. Esses elementos dependem dos eventos de conclusão registrados. A conta também não perde desbloqueios já conquistados ao apagar um personagem: o histórico de maior nível é monotônico, e o personagem removido aparece arquivado no perfil.

Requisitos de criação não devem invalidar heróis existentes. Preservar os saves significa conservar seus bytes durante instalação/atualização; não significa copiar o inventário inteiro para a nuvem. Um perfil social pode mostrar o registro de um herói sem conter uma cópia restaurável de seu save.

## Selos, dots e moldura dourada

- Cada uma das nove dificuldades tem seu selo próprio de conclusão da campanha estendida.
- Os três dots usam os selos **Horror (0), Purgatory (1) e Doom (2)**, um dot por conclusão.
- A moldura dourada exige as três conclusões, não apenas três níveis alcançados ou a dificuldade máxima disponível.
- Avatares são os 29 retratos de caminhos extraídos dos materiais atuais; a conta escolhe um retrato entre seus caminhos desbloqueados.
- O chat e o perfil público mostram avatar, título e dots da mesma conta. Outro jogador pode consultar o perfil sem receber credenciais ou dados de sessão.

O dourado reconhece o primeiro ciclo completo de três dificuldades. Os selos de Crucible até Inferno continuam visíveis para que o ouro não substitua a progressão posterior. O recurso remete à identidade do chat clássico, usando as dificuldades reais desta campanha.

## Títulos conquistáveis

| ID de título | Nome canônico | Requisito |
|---|---|---|
| `wanderer` | Wanderer | Inicial |
| `pathfinder` | Pathfinder | Nível 10 |
| `veteran` | Veteran | Nível 30 |
| `lightbearer` | Lightbearer | Nível 20 + concluir Horror |
| `nightbreaker` | Nightbreaker | Nível 35 + concluir Doom |
| `hellwalker` | Hellwalker | Nível 83 + concluir Inferno |
| `duelist` | Duelist | Nível 10 de campanha/solo + 5 abates PvP registrados no Coliseum |

Os nomes apresentados ao jogador podem ser traduzidos; IDs e requisitos permanecem iguais. O título equipado precisa pertencer à conta. A edição de biografia, avatar ou título não pode alterar nível, histórico de vitórias ou abates. Biografias têm limite de 160 caracteres e devem ser tratadas como texto, sem execução de HTML.

## Perks, itens, magias e áreas

Os 179 perks e suas regras de rank, nível, classe e atributos permanecem no sistema existente. Os 75 registros de sinergia e 12 de sintomas também conservam as restrições da engine. Esta revisão não adiciona uma nova trava de conta a cada perk ou item.

Equipamentos, magias, quests e áreas continuam sendo obtidos pelas regras de jogo atuais: requisitos, drops, geração de campanha, encontros e condições de quest. A biblioteca do Santuário deve explicar o conteúdo disponível e as condições, sem declarar que 2.373 definições de únicos são 2.373 itens garantidos em qualquer sessão. Novas travas específicas por quest ou coleção exigem outra revisão de design e instrumentação; não estão representadas na tabela `sanctuary-1`.

## Relação com RATE e painel administrativo

A auditoria atual de balanceamento usa a base 0.3.5, cuja economia não foi alterada pelas correções de launcher 0.3.6/0.3.7. O nível máximo atual é 150, contra 50 na referência original; existem nove dificuldades, contra três. **100% no painel representa a economia da base atual, e não “Diablo original em rate 1x”.**

Exemplos auditados: nível 2 exige 3.500 XP acumulada contra 2.000 na referência original; nível 20 exige 1.094.223 contra 1.025.154; nível 50 exige 3.010.623.381 contra 1.310.707.109. A chance nominal de passar para seleção de item comum é 10,66%, mas XP, ouro, raridade, Magic Find, modos, traits e regras de cooperação têm fórmulas próprias.

O painel pode simular e exportar candidatos de rates; uma configuração de rascunho não muda por si só os clientes publicados. Os desbloqueios desta expansão usam os níveis e vitórias produzidos por essas fórmulas. Antes de mudar a curva ou os multiplicadores, validar o efeito em personagens existentes e na duração da sequência de desbloqueios. A correção futura da cobrança de XP por morte também precisa constar da auditoria atualizada, sem ser confundida com um aumento geral de XP.

## Integração e confiança

O cliente reporta roster, início de sessão, nível, chefes, conclusão e abates por sua conta autenticada. A nuvem confere formatos, propriedade da conta, ID estável do herói, contexto da sala, modo, dificuldade, hash da build e duplicação de eventos. Eventos repetidos não concedem uma conquista duas vezes. A arena conserva uma categoria separada para evitar que seus níveis liberem o percurso de campanha.

O jogo continua simulado pelos clientes dos jogadores, com a partida hospedada pelo criador da sala. As verificações de API e o pacote assinado **não tornam a simulação nem os reports autoritativos**. O prefixo de identificação do cliente não é atestado criptográfico de integridade. Portanto, títulos, perfis e selos são recursos sociais de progressão; não devem ser anunciados como ranking competitivo protegido contra alterações do cliente.

Os saves completos permanecem locais, separados dos diretórios de versão. Os arquivos de cache e fila de reports são protegidos pelo usuário do Windows e ajudam a retomar a sincronização, mas não constituem backup em nuvem dos personagens. Falhas de serviço devem ter mensagem e recuperação, sem apagar progresso local. Trocar de conta precisa manter separação de personagens, cache e credenciais.

## Apresentação do Santuário

O perfil próprio concentra personagem mais avançado, biblioteca de desbloqueios, próximo requisito, nove selos, dots, títulos, retrato e biografia. O perfil público conserva essa identidade e sua lista de personagens, com edição exclusiva do dono. A página Jogar privilegia escolha de campanha/arena e salas; Comunidade privilegia chat e identidade das contas.

A direção visual usa pedra escura, dourado contido, brasas, retratos existentes e tipografia legível. O nível seguinte deve informar concretamente o que falta: nível da conta, vitória exigida ou nível do herói para uma sala. Não usar o nome técnico da engine como nome de uma novidade do produto; manter os avisos técnicos de fonte e licença nas áreas apropriadas.

## Estado observado e tarefas de publicação 0.4.0

Esta conferência é somente leitura de código e scripts; não publica, não compila e não certifica os testes finais. As regras geradas existem e há hooks nas escolhas nativas, classes, traits, modificadores, modo, roster, ticks e eventos. A implementação da expansão deve passar por validação de campanha, criação e migração antes de aparecer como ativa no site.

O procedimento antigo não pode ser executado diretamente para publicar 0.4.0: ele ainda prepara 0.3.5 e pode sobrescrever metadados corretos da manutenção pública 0.3.7. Pontos encontrados:

| Artefato | Estado encontrado | Preparação necessária |
|---|---|---|
| `tools/package-peer-client.py` | Versão 0.3.5 fixa; copia `build/RfdLauncher.exe` e configuração canônica; grava metadados e hash do Worker | Parametrizar 0.4.0, usar executáveis e launcher 0.4.0 validados, configuração inicial sem flags de QA ou autoload, manifestos com versão exata e guarda explícita contra dados/perfis/segredos indevidos |
| `tools/prepare-peer-publication.py` | Diretório de release, README, links, site-config e notas 0.3.5 fixos | Preparar fonte e engine.patch da build final, incluir regras e fontes geradas da progressão, documentação de compilação completa, nomes/links 0.4.0 e notas verdadeiras da expansão |
| `launcher/Launcher.cs` | AssemblyVersion, instalação inicial e prévia ainda 0.3.5 na fonte de trabalho | Incorporar o conserto publicado 0.3.7, atualizar versão embutida e extração inicial para 0.4.0; testar botão Jogar e atualização real |
| `candidates/thehell3/tools/version.h` | Recursos e rodapé ainda 0.3.5 | Atualizar versão nativa final antes da compilação 0.4.0 |
| `runtime/client-peer-build.json` | Release pública 0.3.7 com executável nativo 0.3.6 e hash correspondente | Gravar novo executável, SHA, hash e evidências 0.4.0 após validação; a distinção atual de versão do launcher/nativo é legítima para manutenção, não um modelo para copiar cegamente |
| `tools/build-peer-installer.py` | Recebe argumento, mas padrão 0.3.5 | Passar 0.4.0 explicitamente; compilar do snapshot correto do launcher e verificar o pacote assinado |
| `tools/sign-peer-release.ps1` e `tools/install-peer-local.ps1` | Recebem parâmetro, mas padrão 0.3.5 | Passar 0.4.0 explicitamente; verificar hashes, handler do protocolo e preservação dos saves |
| `tools/sync-suite-0.3.5.ps1` e finalizadores antigos | Nomes e caminhos antigos fixos | Não executar para 0.4.0; usar sincronização específica que preserve senha administrativa, rascunhos e saves |
| `analysis/content-catalog.json` e `analysis/balance-audit.json` | Fotografias da base 0.3.5; catálogo ainda declara progressão não implementada | Refazer inventário/auditoria da fonte e release final; distinguir implementado, testado e publicado |

Sequência de preparação e verificação:

1. Fechar a integração nativa e preservar todos os fixes públicos 0.3.7, inclusive abertura pelo launcher e caminhos standalone/sala. Conferir duas contas separadas, entrada/saída/reentrada e seleção de personagem.
2. Gerar uma vez as regras canônicas, comparar JSON/backend/header nativo, compilar o cliente final e impedir que funções ou flags de QA estejam ativas no pacote público.
3. Validar conta nova, saves legados, seis caminhos iniciais, bloqueio de escolhas, todos os nove patamares e confirmação do evento 137/24. Validar que 110/16 não concede o selo final.
4. Validar isolamento da arena, eventos repetidos, conta errada, sessão expirada, retomada da fila, avatar/título bloqueados e perfil público sem credenciais.
5. Validar os fluxos reais do site e native hub, edição de perfil, traduções, layout desktop/mobile e sincronização de nível/conquistas. Separar teste de evento sintético de uma conclusão jogada da campanha.
6. Produzir ZIP, setup, manifesto assinado, checksums, fontes e avisos da mesma versão. Testar atualização de 0.3.7 para 0.4.0, instalação isolada e preservação dos saves; os binários de release precisam corresponder à fonte publicada.
7. Preparar a transição do hash do cliente com o Worker e seus dados existentes, sem limpar contas. Tornar arquivos do release disponíveis antes de servir um feed que aponta para eles. A publicação por Git aciona o site automaticamente, então coordenar artefatos, serviço e feed.
8. Conferir links públicos de download, `latest.json`, versão servida, botões do site, protocolo Windows e launcher instalado. Só então declarar 0.4.0 publicada e os desbloqueios disponíveis.

## Fontes locais desta conferência

- `content/progression/rules.json`: requisitos e IDs exatos da revisão.
- `tools/build-progression-rules.py`: geração compartilhada de JSON, módulo do serviço e header nativo.
- `analysis/content-catalog.json` e `docs/INVENTARIO-PARA-PROGRESSAO.md`: contagens, restrições e classificação do inventário.
- `services/peer-realm/progression.mjs`: progresso de conta, regras de legado, perfis, títulos, eventos e isolamento de arena.
- `candidates/thehell3/src/CommunityProgress.cpp` e hooks nas escolhas/eventos: integração nativa em desenvolvimento.
- `analysis/balance-audit.json` e `docs/RATES-E-PAINEL-ADM.md`: fórmulas e limites da auditoria de economia.
- `tools/package-peer-client.py`, `tools/prepare-peer-publication.py`, instalador e scripts de assinatura/instalação: auditoria somente leitura dos caminhos de entrega.
