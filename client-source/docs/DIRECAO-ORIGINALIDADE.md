# Returns from Darkness — direção e originalidade

Estudo de 13/10/2026. Próximo escopo após a expansão Santuário; não descreve artes ou itens já entregues.

## Posicionamento recomendado

Returns from Darkness é uma comunidade online com cliente adaptado de Diablo/Hellfire e mods de comunidade, central de contas, chat e salas, launcher atualizado, integração entre site e jogo e uma camada própria de progressão da conta. Esse conjunto tem valor próprio mesmo enquanto a maior parte do conteúdo de combate e das artes continua herdada. O multiplayer atual é hospedado pelo criador da sala com serviços de descoberta/contas/relay na nuvem; não equivale a uma simulação de mundo persistente em servidor autoritativo.

A recomendação é assumir essa base com clareza agora e evoluir para uma edição de comunidade com HUD, coleções e eventos próprios. Uma interface original não torna retroativamente originais os monstros, mapas, classes ou equipamentos existentes. A apresentação deve distinguir conteúdo disponível na edição de conteúdo criado pelo projeto. Uma página de créditos e origem legível deve acompanhar os avisos técnicos; os nomes das bases não precisam dominar cada botão ou título da experiência.

## O que existe na build atual

| Camada | Origem e situação | O que podemos afirmar |
|---|---|---|
| Mundo, sprites, áudio e estrutura Diablo/Hellfire | Conteúdo herdado | Experiência adaptada; não autoria RFD |
| 29 caminhos, 98 traits, 26 modificadores, 9 dificuldades, áreas/itens/perks | Definições da base The Hell 3, fonte 1.265 / dados 1.267 | Conteúdo disponível na edição; não chamar de criação exclusiva |
| HUD, inventário, personagens e ícones atuais | Predominantemente herdados | HUD próprio ainda é próximo escopo |
| Resolução e apresentação | D3D9, configuração1920 × 1080, filtros e integração parcial de piso | Não significa substituir todas as artes por versões HD |
| Material de piso | Atlas de catedral fornecido no pacote DamnationX beta3; máscara/composição adaptada | Cobertura parcial de pedra da cidade/catedral; não renderizador DamnationX completo |
| Marca, logo animada, site e launcher | Identidade/composição RFD | Identidade do projeto; ilustrações promocionais não são screenshots do jogo |
| Transporte, descoberta, conta/SSO e atualização | Integração RFD com bibliotecas e serviços existentes | Plataforma online de comunidade própria, mantendo créditos das dependências |
| Desbloqueios, perfis, dots e títulos | Regras e integração RFD em desenvolvimento040; retratos adaptados dos dados existentes | Camada própria de progressão e identidade; não novos sprites de personagens |

As contagens do catálogo representam definições, não disponibilidade de todos os itens para toda classe, dificuldade ou partida. As regras de perks, ranks, sinergias, incompatibilidades e requisitos de equipamento continuam sendo as da base.

## Primeira entrega visual própria: HUD

Tema proposto: um relicário de pedra escura e ferro envelhecido, ouro discreto, marcas de cinza e brasa como acento. Preservar leitura instantânea de vida vermelha, mana azul, cinto, habilidade ativa, mensagens e retratos do grupo. Usar o emblema RFD como detalhe de composição, evitando logos grandes sobre a ação. Tipografia gótica apenas em títulos; números, descrições e comandos precisam de legibilidade.

Entregar primeiro o HUD e seus estados completos: normal, hover, pressionado, indisponível, dano, morte, grupo incompleto, conexão degradada, inventário/character/mapa abertos. Incluir escala ajustável, foco por teclado e áreas clicáveis consistentes, em 1080p, 1440p e 4K e formatos 4:3, 16:9 e ultrawide. Ilustração de mockup só conta como proposta; a entrega exige screenshot do cliente em execução e interação funcionando.

Pontos de integração verificados: `src/Panel.cpp` desenha orbes, cinto e elementos do painel; `InventoryPanel.cpp` e `CharPanel.cpp` controlam painéis; `CommunityVisual.cpp` já usaWIC e texturas RGBA para logo/footer em D3D9. É viável acrescentar uma camadaRGBA própria para HUD sem converter toda a simulação para outra engine. A composição precisa ocorrer depois do mundo/remaster, preservar e restaurar o estado D3D e excluir o HUD da máscara de piso. Alterações de posição precisam atualizar hitboxes e tooltips juntos. A atual pintura em buffer indexado não pode receber imagens grandes arbitrariamente sem adaptar coordenadas e escalas.

Critérios de aceite: nenhuma faixa residual; inventário/character não revertendo material do mundo; textos legíveis; nenhuma animação escondendo valores; medições CPU/GPU e memória comparadas ao mesmo cenário; nenhum trabalho de carregar/decodificar imagens por frame. Orçamento definido após o protótipo medido, sem prometer taxa de quadros antes desse teste.

## Segunda entrega: coleção própria pequena e completa

Começar com uma coleção de 6 a 12 peças com nomes, história, ícones, sprites no chão, efeitos e critérios de obtenção próprios. Conceitos iniciais a avaliar: Lanterna do Retorno, Sinete da Última Vigília e Lâmina das Cinzas. São propostas, não itens existentes. Uma arma visível na mão pode exigir sprites de todas as animações/direções da classe; ícone de inventário sozinho não representa esse trabalho.

Pipeline: referência de arte e escala → arte fonte e estados → transparência/paleta ou atlas RGBA → inventário e sprite de chão → ID estável fora das faixas usadas → nome/descrição/traduções → afixos/requisitos/efeitos/drop → save e versão do gerador → distribuição assinada. Preservar seeds dos itens antigos, slots de inventário, detecção de pickup, hitboxes e compatibilidade entre builds. Não substituir IDs antigos para dar aparência de novidade. Imagens geradas podem servir como conceito/base de produção quando aprovadas; cada sprite precisa de acabamento e validação no cliente.

Os itens podem vir de objetivos ou eventos do Santuário, mas é necessário escolher entre recompensas cosméticas e poder de combate, testar o balanço e evitar tornar o conteúdo herdado obsoleto. Ranking ou economia competitiva exigem autoridade e proteção adicionais; o modelo peer atual não oferece isso por si só.

## Como comunicar sem exagerar

Agora: plataforma de comunidade para jogar uma edição ampliada de Diablo, com salas integradas e adaptações próprias. Após a validação da 0.4.0: progressão de conta, perfis, selos e títulos do Santuário. Após a validação do HUD: interface de combate criada para Returns from Darkness. Após a publicação da coleção: listar exatamente as peças e objetivos criados pelo projeto. Não anunciar remake completo, todo o mundo HD, engine integral de outro projeto, autoria de classes herdadas ou coleção pronta a partir de apenas um mockup.

## Pesquisa em fontes primárias

- [DevilutionX](https://github.com/diasurgical/DevilutionX): apresenta-se como port com melhorias de engine e qualidade de vida, mantendo origem e créditos; exemplo de posicionamento claro.
- [Belzebub — recursos publicados pelos autores](https://mod.diablo.noktis.pl/features): diferencia aumento de resolução, melhorias de interface e conteúdo; não é prova de que toda arte existente tem nova definição.
- [The Hell 3 — página publicada pela equipe](https://www.moddb.com/mods/diablo-the-hell-3) e README da fonte local: base comunitária adotada, autoria/créditos retidos.
- [DamnationX — repositório oficial](https://github.com/trygentic/damnationx): repositório de builds, não código-fonte integral. Em 13/10/2026, o README informa que a beta 4 para Windows, Linux e Android ainda não inclui renderizador WebGPU HD nem acesso ao lobby DamnationX. Isso impede tratar um download Windows como renderizador HD pronto para integrar à nossa engine D3D9. Browser/macOS têm capacidades diferentes.

Conclusão de engenharia: HUD próprio e coleção piloto sobre a engine atual são os primeiros passos mais controláveis. Transplantar renderizador WebGPU de outro executável sem fonte publicável não é uma base de planejamento verificável. Assets encontrados em pacotes precisam de proveniência/avisos preservados; extração não transfere autoria.
