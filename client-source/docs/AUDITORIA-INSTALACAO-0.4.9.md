# Auditoria de instalação e desenho dos menus — candidata 0.4.9

Este documento separa a evidência da versão pública 0.4.8 das correções da candidata 0.4.9, agora verificadas em fixtures e testes gráficos locais. A existência desses resultados não significa que a publicação, a atualização ou o teste em outro computador estejam concluídos. A conferência da entrega pública ainda deve confirmar esses passos.

## Evidência real do jogador

O arquivo `diagnostico.txt` da 0.4.8 registra cinco encerramentos `C0000005` na etapa `main-menu`, com offset de dependência `0x1A102`. O diagnóstico informa dados de jogo compatíveis. Esse caso ocorre antes de a partida estar plenamente carregada e não permite atribuir automaticamente a falha à conectividade entre jogadores.

A desmontagem da cópia de Strm2.dll examinada encontrou, no RVA `0x1A102`, uma instrução de escrita de pixel `mov [edi], cl`. Isso combina com a investigação do desenho de fontes em superfícies de menu pequenas. Porém, o diagnóstico real da 0.4.8 não identifica o nome da DLL. **Strm2 é uma inferência forte, não uma atribuição definitiva do módulo de cada crash.** O mesmo offset fica fora da imagem examinada de SmackW32.dll, o que reduz essa alternativa sem transformar o relatório em uma stack completa.

A fixture `analysis/menu-glyph-bounds-049.json` reforça essa hipótese com uma reprodução: as funções de fonte do código publicado 0.4.7/0.4.8, iguais entre si, chamam a Strm2.dll realmente distribuída sobre uma superfície protegida de 9 × 3 pixels. Um glifo de 7 × 4, iniciado em x=1/y=3, provoca `C0000005` na própria Strm2.dll no offset `0x1A102`. A candidata passa 46 casos sem escrita fora dos limites, incluindo recortes horizontal/vertical, superfícies de um pixel e coordenadas negativas. Pixels válidos e quebra de linha existente são preservados. **É uma reprodução local do defeito e do offset, não uma stack do computador do jogador nem confirmação externa da correção.**

## Dados comerciais/mod que foram conferidos

As duas cópias canônicas de `TH3data.mor` encontradas têm o mesmo conteúdo:

| Campo | Valor |
|---|---|
| Tamanho | 886.065.900 bytes |
| SHA-256 | `3701381c29181d5420e3b7319387e277d2cadf1d50c632bc1516d663f7581a6e` |
| Referência | `C:\diabloHD\references\thehell3-1.267\TH3data.mor` |
| Runtime | `C:\diabloHD\runtime\thehell3\bin\TH3data.mor` |

O hash corresponde ao arquivo esperado pelo manifesto assinado da 0.4.8. A auditoria `analysis/data-archive-copies-048.json` não encontrou conteúdo distinto nessas duas fontes. Elas não foram extraídas, substituídas ou modificadas nessa conferência.

Isso verifica o arquivo de conteúdo indicado, não o conjunto inteiro da instalação de qualquer jogador. A verificação antiga de `DIABDAT.MPQ` aceitava tamanho mínimo e a presença de um cabeçalho MPQ; esses testes não demonstram que todo o arquivo tem o conteúdo esperado. A candidata 0.4.9 acrescenta comparação do arquivo completo com a edição conhecida e compatível. A preparação do manifesto fixa `baseDataSha256` em `63fb47d9c76484024c7640d90ab6b7ec5e13f567a7e1a917b6c03a6631d3f2b0` e exige que a referência local corresponda antes de empacotar. Esse é o conjunto de dados aceito pela candidata; não comprova retroativamente que o DIABDAT do jogador já tinha esse hash na 0.4.8.

## Defeitos encontrados e escopo da candidata

| Evidência no código | Correção na candidata 0.4.9 | Validação correspondente |
|---|---|---|
| A condição vertical de DrawFontString não considerava a altura inteira do glifo | Recorte do glifo à superfície de destino, incluindo controles pequenos e fallback de desenho | Fixture de superfície pequena, limites e guardas de memória |
| LoadFont percorria os índices até 256 inclusive, alcançando `[256]` fora de um conjunto de 256 entradas | Cabeçalho validado e índices de 0 a 255 | Quatro cabeçalhos reais de 258 bytes conferidos; limite de 256 entradas revisado no código |
| A conferência de DIABDAT não comprovava o conteúdo integral do arquivo | Hash da edição conhecida, rejeição/recuperação de importação incompatível com backup | Arquivo válido, conteúdo alterado e preservação da cópia anterior |
| Diagnóstico da 0.4.8 não nomeava a dependência que falhou | Nome do módulo, acesso de memória e etapas adicionais no resumo seguro | Exceção controlada e confirmação de ausência de credenciais |
| Um reparo tentava renomear um hardlink da referência de dados; outro cliente podia manter a mesma referência aberta sem compartilhamento de exclusão | Reparo de destino existente usa cópia temporária própria e substituição com backup; destino ausente recebe os dados sem renomear o hardlink da origem | Fontes mantidas abertas somente para leitura durante o reparo |

Não há mudança de direção de arte, HUD, taxas ou regras de conteúdo neste hotfix. A atribuição do crash observado deve ser refinada pelos novos diagnósticos e testes, não pelo nome de uma biblioteca escolhido por suposição.

O relatório `analysis/menu-font-headers-049.json` também confere os quatro cabeçalhos reais no TH3data.mor de hash conhecido: todos contêm 258 bytes e 256 larguras de glifo. A leitura foi somente de metadados, sem modificar os arquivos ou extrair artes.

## Validação do launcher final da candidata

`analysis/game-data-repair-049.json` executa por reflexão os métodos reais do launcher 0.4.9, com seu hash conferido contra o manifesto assinado: `824bc8eee358e47f6fd520e8d0b0b3774073e8c24cc7b0a38c4836fdf9d819b1`.

- O launcher publicado 0.4.8 aceita um DIABDAT falso de 100.000.001 bytes com cabeçalho MPQ e conteúdo vazio; o novo rejeita esse mesmo arquivo pelo hash completo.
- DIABDAT.MPQ e TH3data.mor válidos são aceitos. Ambos ausentes ou truncados são recusados; metadados de hash malformados também são recusados.
- Dois destinos quebrados na pasta de versão são reparados a partir de dados válidos já existentes no Root de teste. Cada arquivo antigo permanece em um backup com conteúdo exato.
- Destinos inicialmente ausentes são preparados. Uma segunda preparação não cria backups extras nem substitui arquivos válidos.
- As duas referências permanecem abertas com `FileShare.Read`, sem permissão para exclusão, durante esses casos. O reparo passa sem renomear a referência compartilhada.
- Um marcador de save permanece inalterado. Os arquivos originais não são escritos; o diagnóstico conserva os hashes esperados e elimina campos arbitrários de senha, token, convite e caminho local.

A fixture usa apenas pastas próprias, não abre o jogo, não cria diálogos, não toca o registro e não acessa a rede. Não usa a busca automática de dados em `C:\diabloHD`: o Root isolado já contém referências compatíveis. O reparo da importação na própria pasta Root não foi exercitado nesta execução, que evita uma cópia adicional do arquivo de 886 MB. Esse teste não representa uma instalação em outro computador.

## O que os testes anteriores comprovam

A 0.4.8 concluiu fixtures de limites de pacotes, burst, autenticação e admissão após carregamento do anfitrião, além de testes gráficos locais em conexão direta e relay. A central pública passou a responder versão/hash 0.4.8 e a publicação preservou o armazenamento existente. Esses resultados têm seu próprio escopo e não devem receber um rótulo 0.4.9 sem execução da nova candidata.

Uma instalação privada isolada da 0.4.8, com apenas o pacote público e os dois arquivos de dados, chegou a `GAME_READY 26228` em modo solo. Isso demonstra abertura nesse ambiente de teste; **não é prova de uma instalação limpa em outro PC, de clone de máquina, nem de multiplayer entre dispositivos.**

## Testes gráficos atuais da candidata 0.4.9

Os três relatórios seguintes estão aprovados para a 0.4.9. Usam os binários de produção da candidata, perfis/contas de teste e diálogos reais de criação de personagem. Nenhum deles utiliza PCs externos:

| Relatório | Caminho exercitado | Resultado confirmado |
|---|---|---|
| `analysis/fresh-offline-flow-0.4.9-qa.json` | Abertura solo com perfil novo, classe, especialização, traits, regras Normal, modificadores, nome e dificuldade | Mundo solo carregado; somente o pacote e os dois arquivos de dados; nenhum personagem copiado |
| `analysis/fresh-hero-flow-0.4.9-direct-qa.json` | Entrada pelo site com duas contas novas e instalações independentes, conexão direta e criação real dos dois personagens | Os dois mundos carregam e cada cliente confirma dois jogadores ativos; carregamento automático desativado |
| `analysis/fresh-hero-flow-0.4.9-ingame-relay-qa.json` | Play Online, entrada na sala pelo menu nativo, encaminhamento ao launcher, retransmissão e criação dos dois personagens | Os dois mundos carregam e cada cliente confirma dois jogadores ativos; a sessão é resgatada pelo launcher de produção |

Isso confirma abertura e entrada compartilhada nesses caminhos da candidata **neste mesmo computador**. Não certifica instalação limpa em outra máquina, jogabilidade prolongada, redes WAN específicas nem a resolução do encerramento real do convidado em outro PC. O resultado externo permanece pendente do reteste da comunidade.

## Estado da 0.4.9 nesta preparação

- Código de correção de fontes e instalação: fixtures específicas de fonte e launcher final aprovadas conforme os relatórios acima.
- Arte e conteúdo: mantidos; remasterização integral do mundo não é declarada concluída.
- Fixture de fontes 0.4.9: 46 casos aprovados, com reprodução da violação de acesso/offset no caminho antigo e sem escrita fora da superfície no caminho corrigido. Fixture de dados do launcher final aprovada, incluindo reparo com referência em uso e preservação de saves.
- Testes gráficos locais 0.4.9: abertura solo, entrada pelo site em conexão direta e entrada por Play Online em retransmissão aprovadas com perfis novos e personagens criados pelos diálogos reais. Nos dois casos online, cada cliente confirma dois jogadores ativos.
- Manifesto assinado e pacote candidato 0.4.9: preparados privadamente e usados no teste de dados. Instalador, publicação e feed público aguardam a conferência final de entrega.
- Atualização automática e preservação de saves da nova build: aguardam validação final.
- Confirmação gráfica em outros computadores, mesma LAN e redes distintas: pendente de reteste da comunidade.

O lançamento só pode ser marcado como concluído depois da conferência dos artefatos públicos, do feed, da instalação local e dos relatórios correspondentes. O reteste externo deve observar menus completos, criação/seleção de personagem, abertura da sala, entrada no mesmo mundo, movimento, drop/coleta e saída/retorno. Se houver novo encerramento, o resumo atualizado deve registrar o módulo e o acesso de memória para reduzir a incerteza restante.
