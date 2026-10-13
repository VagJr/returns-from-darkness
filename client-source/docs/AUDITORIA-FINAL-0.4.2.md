# Auditoria final — Returns from Darkness HD 0.4.2

Publicado e instalado em 13/10/2026. A entrega contém 24 arquivos de runtime, manifesto assinado, instalador e ZIPs de cliente e fontes. O site e o Santuário servem 0.4.2, e o protocolo `rfd://` instalado aponta para o launcher desta versão. Quinze arquivos de personagens foram conferidos antes/depois da instalação, sem alteração. A senha e o rascunho da oficina foram preservados.

## Interface

Material próprio de ardósia e ferro 1254×1254, molduras e aros em prata fosca, oito células visíveis no cinturão, divisões cinza no inventário e slot do capacete recuado para dentro da moldura. Os vasos mantêm os 48 quadros por recurso do Tchernobog, com os sustentáculos completos apoiados na base do HUD. A quantidade de líquido acompanha os valores reais; o teste observou vazio, 25%, 50%, 75%, máximo e animação no máximo.

Os menus foram observados em nove telas, três estados por tela, tanto em janela quanto em tela cheia, sem exigir pintura para capturar a primeira exibição. Os campos passaram em 22 capturas com texto e cursor estáveis. O launcher passou nas 14 traduções e no roteamento de contas por instância.

## Publicação e online

A Vercel confirmou o commit `9601ca89319530e8d65f35923757de95b7b399e3`. Cinco imagens reais 1920×1080 publicadas foram comparadas byte a byte com as capturas preparadas, e o feed público corresponde ao manifesto assinado. Navegação, idiomas, download, perfil, abas e salas passaram nas verificações de desktop e celular, sem erros JavaScript.

Duas instâncias nativas da distribuição publicada entraram na mesma sala, transmitiram pacotes, registraram personagens no perfil público e trocaram de sala mantendo os mesmos processos. O transporte continuou conectado durante bloqueio temporário do arquivo de estatísticas. Os testes usaram contas e perfis isolados.

Um launcher 0.3.5 atualizou pelo feed público para 0.4.2; verificações concorrentes, preservação de save e rejeição de assinatura adulterada passaram. O teste roda no CLR .NET Framework correspondente ao launcher.

As três relíquias passaram no gancho de recompensa, coleta, serialização e carregamento do personagem. A captura de distribuição em tela cheia foi feita em uma execução aprovada; uma tentativa anterior da fixture deixou uma relíquia no chão e foi repetida. Isso não certifica combate natural completo até os três chefes.

## Administração e rates

Oficina: http://127.0.0.1:8090/ ou `C:\diabloHD\ABRIR-OFICINA.cmd`. Usuário `admin`; senha inicial no arquivo local `C:\diabloHD\runtime\ADMIN-FIRST-LOGIN.txt`. As rotas privadas exigem autenticação. A aba de rates simula e exporta candidatos; publicar alterações de balanceamento exige compilação e validação.

Os rates globais continuam na base 100%, sem novo multiplicador de XP ou loot ordinário nesta entrega. A coleção própria acrescenta três recompensas específicas. A auditoria compara a curva de 150 níveis com o original de 50 níveis e distingue probabilidades nominais, filtros e efeitos de modos/traits. O cálculo de recompensas roda na simulação dos clientes; a nuvem coordena contas, salas, chat e transporte.

## Desempenho e limites

A amostra final de menu em primeiro plano durou 25.00 segundos: 9.37% de um núcleo, zero timeout da fila de UI e intervalo máximo de apresentação 69.45 ms. A referência anterior consumia 97.25% de um núcleo. O GIF fonte tem quadros de 80 ms; estes resultados não significam animação a 60 FPS nem certificam outro computador.

- Não certifica uma campanha completa em todas as dificuldades.
- Dois mundos gráficos foram validados no mesmo PC; falta o teste gráfico entre PCs externos.
- As conquistas são informadas pelo cliente e não constituem um ranking autoritativo.
- O HUD e o fundo do inventário têm material próprio HD; a substituição completa das artes do mundo permanece em desenvolvimento.
- As relíquias passaram pelo gancho de recompensa, inventário e reload; combate natural até os três chefes e envio específico desses itens entre PCs externos não foram certificados.

Relatório detalhado: `analysis/final-release-audit.json`. Os relatórios individuais registram fixtures, versões e limites das verificações.
