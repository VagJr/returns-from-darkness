# Composição das esferas e do cinturão — 0.4.2

As esferas preservam as **estátuas, molduras e animação líquida do Tchernobog 0.2.2f**, integradas às superfícies texturizadas do projeto. `CommunityOrb.hlsl` separa a quantidade real de vida ou mana dos recortes e deslocamentos do painel herdado. O shader próprio compõe a área circular e a máscara independente de preenchimento. O cinturão conserva oito células e os controles existentes.

Cada esfera usa 48 quadros. Os dois atlases de **2048×1536** organizam os canvases RGBA originais de **256×256** em 8×6 tiles, sem reamostragem. Cada canvas inclui margens transparentes, estátuas e molduras; o diâmetro útil do líquido é aproximadamente **110 pixels**. Essa adaptação não aumenta o detalhe nativo dos quadros nem torna todas as artes do jogo HD.

Os arquivos `health-vessel-atlas.png` e `mana-vessel-atlas.png` ficam em `assets/remaster`. A procedência e os hashes estão em `content/visual/tchernobog/orbs-runtime/orb-atlases.json`; o pacote de fontes inclui metadados sanitizados e exclui quadros brutos, previews e atlases opcionais de recorte líquido. O material das superfícies e a integração são próprios do projeto; as estátuas, molduras e animação das esferas permanecem creditadas ao Tchernobog.

A verificação gráfica usa a fixture privada `tools/test-resource-orbs.mjs`: capturas GPU, quantidades de zero a máximo, preenchimento crescente, mana visível, topo preenchido no máximo, animação entre quadros e oito células. O relatório produzido é `analysis/resource-orbs-qa.json`. Este documento descreve a implementação e o teste; publicação, instalação e aprovação final dependem dos relatórios da entrega correspondente.

As superfícies da interface usam material próprio de ardósia e ferro, 1254×1254, com molduras de prata fosca em vez do dourado dominante. Os espaços interativos do inventário têm recessos cinza/carvão e divisões mais claras. O slot de capacete foi recuado dez pixels para dentro da moldura, junto com suas coordenadas de interação.

Os vasos e sustentáculos mantêm proporções de 80% da fonte: o centro do líquido está a 72 pixels da base da tela e a escultura se apoia na base do HUD. A fonte contém bustos/sustentáculos completos; não existem pernas adicionais perdidas na extração. A composição não deve truncar os braços nem criar uma linha simulando continuação.

A primeira pintura dos menus é observada sem pedir redesenho antes da captura. O teste guarda a composição final nativa apenas quando a janela pertence ao processo do jogo, está visível e não está coberta por outra aplicação. O backbuffer isolado não contém todos os controles Storm.

A medição local do menu de 0.4.2 reduziu o consumo de um núcleo de CPU de cerca de 97,25% para 9,37% em amostras de 20–25 segundos. O intervalo máximo entre apresentações na amostra final foi 69,45 ms; houve zero timeout da fila de interface. O logo fonte tem quadros de 80 ms; estes dados não significam menu a 60 FPS nem certificação de desempenho em outro computador. Esta medição final mantém a janela de teste em primeiro plano. O relatório é `analysis/menu-performance-qa.json`.
