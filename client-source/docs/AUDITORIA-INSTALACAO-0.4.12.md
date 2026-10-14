# Instalação com dados do mod — 0.4.12

O instalador completo inclui TH3data.mor 1.267, com 886.065.900 bytes e SHA-256 `3701381c29181d5420e3b7319387e277d2cadf1d50c632bc1516d663f7581a6e`.
DIABDAT.MPQ não está incluído; continua sendo importado da instalação do jogador e validado pelo conjunto compatível.

O manifesto assinado contém a origem HTTPS, tamanho e hash do pacote opcional de dados. A instalação valida o arquivo extra antes de movê-lo atomicamente para `data/TH3data.mor`. Dados incorretos existentes recebem backup. O launcher usa links locais nas versões, com cópia como alternativa.

O instalador inclui os dados; o ZIP de atualização e o repositório de fontes continuam sem arquivos de jogo. A recuperação de dados ausentes usa um pacote separado, valida o ZIP e o conteúdo antes da ativação e é serializada entre contas. Arquivos válidos não são baixados novamente. Reinstalar a mesma versão não substitui seus executáveis; uma versão antiga não rebaixa a instalação atual.

Os créditos e README originais do mod acompanham a distribuição. Esta adaptação não declara autoria ou relicenciamento dos dados herdados. Não houve mudança de regras, tabelas, HUD, transportes, salvamento ou desbloqueios nesta atualização, além da identificação da versão.

Validação é registrada em `analysis/bundled-mod-data-0.4.12-qa.json` e `analysis/bundled-mod-data-install-0.4.12-qa.json`. Abertura nativa e salas recebem verificações separadas. A confirmação externa da comunidade refere-se à 0.4.9 e não é reapresentada como certificação desta build.
