# Dark Gothic HUD — Pacote de assets para jogos

**Pacote PNG RGBA com fundo transparente**, extraído e organizado a partir do HUD gótico pedido. Contém o atlas original, os painéis separados, alternativas vazias/editáveis, molduras, barras, orbes, botões, ícones, slots e conjunto nine-slice.

## O que usar no jogo

- **01_PAINEIS/painel_personagem_vazio_editavel.png**: personagem limpo (adicione os textos/valores por HTML, Canvas ou sua engine).
- **01_PAINEIS/painel_inventario_vazio_editavel.png**: inventário com grade sem itens fixos. A grade consta no JSON (`inventory_grid`).
- **01_PAINEIS/hud_inferior_completo.png**: painel inferior com vida, mana, hotbar e botões visuais (os rótulos são rasterizados).
- **01_PAINEIS/*_completo.png**: versões ilustrativas com textos e itens embutidos, adequadas à referência de arte. Não utilize seus números fixos como estado do jogo.
- **02_MOLDURAS/**: peças de molduras e overlays com centro aberto. Os arquivos `moldura_*_sobreposta.png` são camadas superiores para UI dinâmica.
- **03_SLOTS/**: espaços individuais de equipamento e atalhos.
- **04_BOTOES_ICONS/**: botões, marcas e ícones para recomposição.
- **05_ORBES_BARRAS/**: orbes e pedaços independentes de barras.
- **06_NINE_SLICE/**: nove pedaços de uma moldura para esticar painéis sem deformar cantos.
- **asset_manifest.json**: nomes, tamanhos, recortes, coordenadas e sugestões de posicionamento.
- **07_INTEGRACAO_WEB/**: demonstração HTML/CSS/JS com atalhos e valores dinâmicos.

## Integração com uma IA de programação

Anexe o ZIP ao projeto e peça:

> Analise asset_manifest.json e 07_INTEGRACAO_WEB/. Integre os sprites PNG RGBA ao HUD atual do projeto, preservando todas as mecânicas. Use os painéis vazios/editáveis para dados dinâmicos. Reutilize os arquivos existentes do jogo e não substitua a lógica de vida, mana, inventário, atributos, ações ou bindings. Posicione e redimensione os painéis de acordo com a viewport de referência 1672×941, mantendo proporções; permita abrir/fechar Personagem (C) e Inventário (I). Separe renderização de UI e estado real do personagem.

## Importante

Estes **são sprites estáticos**, não uma interface funcional pronta para sua engine. O HTML é demonstração de aplicação, não um plugin para qualquer jogo. Textos/ícones dos arquivos `*_completo` estão rasterizados. Para números/nomes/itens modificáveis, use `*_vazio_editavel` ou as molduras vazias e desenhe os componentes dinamicamente. Orbes são arte pronta; a porcentagem de preenchimento precisa ser implementada no HUD de sua engine. Composição de orbes e hotbar pode apresentar pequenas sobreposições da arte-base por serem recortes do mesmo HUD.

## Licença / uso

Arte gerada nesta conversa conforme solicitação do usuário. Nenhum logotipo comercial foi copiado para o atlas. Verifique o uso conforme as condições aplicáveis ao seu jogo.
