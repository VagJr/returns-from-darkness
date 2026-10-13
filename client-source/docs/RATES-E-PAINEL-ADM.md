# Auditoria de rates — Returns from Darkness

Base publicada: **0.3.5**, fonte 1.265, dados 1.267. Nenhum rate foi aumentado nesta entrega.

## Acesso à administração

Abra `C:\diabloHD\ABRIR-OFICINA.cmd` ou http://127.0.0.1:8090/. Usuário: `admin`. A senha inicial está em `C:\diabloHD\runtime\ADMIN-FIRST-LOGIN.txt`. Ela não é a senha da conta do jogo. Se você já mudou a senha, use a atual. A oficina escuta apenas o próprio PC e exige autenticação.

Na aba **Rates e evolução**, compare os valores auditados, altere o rascunho, use **Simular rates**, salve e gere uma versão em **Versões e pacotes**. Ela exporta fontes C++ candidatas e um perfil JSON. Ainda é necessário compilar, validar saves/loot/multiplayer e publicar uma atualização assinada. O pacote da oficina não é um instalador.

## Comparação da curva

| Nível | XP acumulada atual | XP acumulada original | Relação dos limiares |
|---|---:|---:|---:|
| 2 | 3,500 | 2000 | 1.75 |
| 5 | 23,062 | 12489 | 1.8466 |
| 10 | 103,209 | 63364 | 1.6288 |
| 20 | 1,094,223 | 1025154 | 1.0674 |
| 30 | 12,323,757 | 15571031 | 0.7915 |
| 40 | 186,992,186 | 169122009 | 1.1057 |
| 50 | 3,010,623,381 | 1310707109 | 2.2969 |
| 75 | 347,612,211,516 | — | — |
| 100 | 2,191,711,227,541 | — | — |
| 125 | 5,341,710,227,541 | — | — |
| 150 | 11,001,617,000,000 | — | — |

Essa relação compara XP necessária, **não velocidade de evolução**.

## Fórmulas e comportamento

### Não há um multiplicador único em relação ao original

100% neste painel representa a base publicada 0.3.5. Tabelas, teto de nível, XP por dificuldade, raridade e filtros de loot foram alterados separadamente.

### XP por monstro

O valor da tabela varia aproximadamente de 80% a 120% na criação do monstro. Purgatory usa 3 × XP + 2.100 + aleatório 0..100. A partir de Doom entram multiplicadores e acréscimos próprios de cada dificuldade.

### O ritmo não acompanha apenas o número de XP

Nível 2 exige 3.500 XP na base atual contra 2.000 no original. Curvas maiores e 150 níveis tornam inadequado inferir velocidade de evolução só pelos multiplicadores de monstros.

### Antipowerlevel e cooperação

O original ajusta XP pela diferença de nível monstro/personagem e aplica dois tetos em multiplayer. A base atual desativou o ajuste de diferença e o teto de 200 × nível; mantém tabela acumulada / 20 em vários modos. Não é 5% da distância até o próximo nível. Bônus de áreas entram depois desse teto. Divisão por atacantes e uma regra de cooperação também participam do resultado.

### Drops comuns: item semelhante, menos ouro

As comparações > 40 e > 25 produzem rolagens nominais de 41% e 26%. Isso dá 10,66% para entrar na seleção de item, como no original. A base adiciona outra rolagem para ouro: em Horror são 13,0462% para ouro e 76,2938% sem drop. Exceções de quests, chefes e filtros de classe não entram nessa conta.

### Magic Find e raridade são condicionais

A primeira rolagem mágica usa 51/1.000 resultados; existe ainda a rolagem por qlvl e exceções que garantem item mágico. A rolagem de único/raro comum usa 2/1.000 e a de chefe 81/1.000, antes de Magic Find, somente em itens elegíveis. Falta de um único compatível pode resultar em raro. Não são probabilidades de obter um único específico por abate.

### Raros no cliente atual

O pacote publicado inclui DropRares ativado. Essa opção também existe no arquivo de configuração local de cada perfil; desativá-la altera a geração de novos raros. Um inventário de configurações, equipamentos, traits e modo é necessário para reproduzir exatamente o loot de um personagem; a auditoria nominal assume a opção padrão.

### Comparação de raridade com o original

No original, a primeira rolagem mágica usa 11/100 resultados; CheckUnique usa 2/100 no caso comum e 16/100 para chefes, depois da elegibilidade. Portanto não é correto anunciar o mod como drop aumentado de únicos apenas por ter mais conteúdo.

### Quantidade de ouro

Ouro comum: 2 × andar − 1 + acréscimo da dificuldade + aleatório 0..33, antes de Gold Find. No original: 5 × andar ajustado + aleatório de até 10 × andar ajustado − 1. Chefes da base atual têm ouro extra próprio e multiplicadores por chefe.

### Modos, traits e áreas mudam a economia

Survival, Ironman, Nightmare e Speedrun possuem bônus próprios de XP e Magic Find. Traits podem dar penalidades severas ou drops extras. Algumas quests concedem bônus de XP de 20%, 25%, cerca de 33%, 50%, 75% ou 100%. Essas regras ficam preservadas quando se altera o rate geral.

### O servidor de salas não calcula recompensas

A nuvem coordena contas, chat, salas e transporte. A simulação de XP e drops roda nos clientes. O content hash exige o mesmo pacote na sala. Isto não equivale a anticheat autoritativo ou a progressão validada por servidor.

### Coliseum, Serenity e ganhos especiais

Coliseum calcula XP por abate a partir do nível da vítima elevado à quarta potência × 1.000, limitada por uma fração da distância de XP do nível do atacante; depois aplica AddPlayerExperience. Serenity concede XP passiva a cada segundo por uma rota separada. O painel distingue estes dois rates dos abates de monstros. O perk Here and Now continua concedendo exatamente a XP que falta para um nível, sem multiplicador.

### Perdas de XP também alteram a evolução

Forgetful retira 1 + nível² / 10 de XP por segundo. A morte pode consumir ouro; sem ouro suficiente, há uma cobrança de XP por nível, andar e dificuldade. Essas perdas e o apagamento do personagem em modos de morte permanente não são removidos pelos rates de ganho. A cobrança de morte da fonte atual contém uma verificação de saldo depois da subtração; isso pode zerar mais XP do que a cobrança nominal e precisa de correção e teste de jogabilidade próprios.

## XP por dificuldade

| Dificuldade | Multiplicador do monstro | Acréscimo | Jitter extra |
|---|---:|---:|---:|
| Horror | 1 | 0 | 0..0 |
| Purgatory | 3 | 2100 | 0..100 |
| Doom | 30 | 6000 | 0..0 |
| Crucible | 250 | 60000 | 0..0 |
| Torment | 1000 | 500000 | 0..0 |
| Agony | 1500 | 2410000 | 0..0 |
| Terror | 2000 | 5290000 | 0..0 |
| Destruction | 2500 | 9140000 | 0..0 |
| Inferno | 3000 | 13960000 | 0..0 |

## Drops comuns: probabilidades nominais

| Dificuldade | Seleção de item | Ouro | Sem drop |
|---|---:|---:|---:|
| Horror | 10.66% | 13.0462% | 76.2938% |
| Purgatory | 10.66% | 8.7986% | 80.5414% |
| Doom | 10.66% | 5.1578% | 84.1822% |
| Crucible | 10.66% | 4.8544% | 84.4856% |
| Torment | 10.66% | 4.551% | 84.789% |
| Agony | 10.66% | 4.2476% | 85.0924% |
| Terror | 10.66% | 3.9442% | 85.3958% |
| Destruction | 10.66% | 3.6408% | 85.6992% |
| Inferno | 10.66% | 3.3374% | 86.0026% |

## Controles e limites

- XP por monstros, XP por abates no Coliseum, XP passiva de Serenity, quantidade de ouro com Gold Find, rolagens comuns de drop, ouro por dificuldade, XP por dificuldade, raridade condicional, peso de Magic Find, teto de XP multiplayer e curva acumulada dos 150 níveis.
- **Balanceamento** continua oferecendo registros individuais: XP/HP/dano de monstros, pesos/requisitos/valores dos itens e tabelas de magias.
- IDs de itens e personagens são preservados. Alterar a curva pode recalcular o nível de personagens existentes; simule migração antes da publicação.
- Alterações de raridade criam uma nova geração de itens (8) no candidato, mantendo as regras das gerações anteriores. Não sobrescreva uma geração já publicada com valores diferentes.
- Esta primeira auditoria exporta a partir da geração 7. Após integrar uma nova geração, registre o histórico e refaça a auditoria antes da próxima alteração de raridade.
- Sprites, novas habilidades, eventos e arenas ainda têm etapas próprias de integração. Estes controles não prometem edição automática de toda lógica da engine.

## Fontes verificadas

- [Diablo reconstruído — player.cpp](https://github.com/diasurgical/devilution/blob/9f01757243412bb154d02d9af65c804159e6e0ea/Source/player.cpp)
- [Diablo reconstruído — items.cpp](https://github.com/diasurgical/devilution/blob/9f01757243412bb154d02d9af65c804159e6e0ea/Source/items.cpp)
- [Diablo reconstruído — monster.cpp](https://github.com/diasurgical/devilution/blob/9f01757243412bb154d02d9af65c804159e6e0ea/Source/monster.cpp)

Fórmulas atuais: `Player.cpp`, `Monster.cpp`, `Item.cpp`, `AffixEffects.cpp`, `thehell2.cpp`, `th2data.cpp`. Hashes e dados completos em `analysis/balance-audit.json`.
