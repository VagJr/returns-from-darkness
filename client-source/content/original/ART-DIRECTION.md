# Artes próprias — primeira coleção visual

Produção de 13/10/2026 para a entrega 0.4.1. Ilustrações, ícones de itens e o material da interface foram gerados com a ferramenta integrada `image_gen` e adaptados apenas em escala/formato para uso no projeto. São assets do projeto, não artes extraídas de outros mods. O emblema vetorial foi desenhado em código a partir da identidade já usada pelo site.

## Arquivos

- Fontes PNG: `content/original/sources/` — catedral, Last Vigil, Lantern of the Return, Ashen Covenant e interface-stone.
- Ícones do cliente: `content/original/items/{last-vigil,return-lantern,ashen-covenant}.png`, RGBA 256×256. A engine converte para a escala/paleta nativa uma vez ao carregar.
- Ilustração web: `site/central/assets/sanctuary-citadel.webp` no repositório do site.
- Emblema: `brand/project-icon.svg`; ícone Windows em sete tamanhos em `brand/project-icon.ico`, também embutido no launcher, instalador e jogo.
- Material HD da interface: `content/original/ui/interface-stone.png`, 1254×1254, PNG RGB reencodado para o runtime sem alterar a composição. A saída integral `exec-9c3d2fcc-8035-45db-919e-78d4baab766b.png`, armazenada em `C:/Users/vagmi/.codex/generated_images/01a12d11-e98c-73d3-9af0-e46f2279c132/`, é preservada em `content/original/sources/interface-stone.png`.

Não anunciar substituição completa das artes do mundo ou renderer integral de outro projeto. A catedral é uma ilustração da interface da comunidade, não screenshot de gameplay.

## Material HD aplicado à interface

O material representa pedra basáltica escura e ferro envelhecido, com relevos discretos, fissuras finas e desgaste em tons de carvão e bronze. Sua finalidade é dar detalhe às superfícies das molduras do HUD e do inventário sem introduzir uma cor lisa roxa ou uma direção visual incompatível com o ambiente do jogo.

Briefing de produção, **não transcrição da chamada**: superfície plana de basalto negro e ferro envelhecido, composição ortográfica, detalhes finos, bronze discreto, paleta carvão/âmbar; sem roxo, texto, símbolos, perspectiva ou iluminação de cena. A ferramenta foi `image_gen` e a saída original está identificada acima. O prompt exato desta chamada não foi preservado neste documento.

`CommunityRemaster.cpp` carrega o PNG uma vez por dispositivo através do Windows Imaging Component, em textura de 32 bits RGBA/BGRA. Uma máscara de alpha A8 identifica as superfícies próprias desenhadas pela interface; a GPU compõe o material após a imagem principal. O recorte preserva os ícones de itens, textos, linhas dos slots e conteúdos das esferas. O estado de renderização é restaurado após a passagem para manter os demais elementos da engine.

O asset não substitui o atlas do mundo, os monstros, os personagens ou todos os painéis herdados. A existência do material em alta definição não torna automaticamente cada sprite clássico um sprite HD. Os detalhes da interface precisam ser conferidos em screenshots reais da build final.

Estado nesta revisão: a QA nativa da candidata 0.4.1 confirmou a composição GPU do material 1254×1254 em canvas 1920×1080, decodificado uma vez e aplicado pela máscara A8. A conferência usou screenshots reais e um perfil isolado (`analysis/original-relics-qa.json`). Este registro de produção não confirma, por si só, que a build já foi publicada.

## Prompt da ilustração (ferramenta integrada)

Create a production background illustration for the game-community Sanctuary hub of 'Returns from Darkness', an independent gothic dark fantasy Diablo-inspired game project. Original hand-painted premium game key art, panoramic 16:9 landscape. A ruined medieval cathedral above an old rain-soaked village courtyard at dusk, aged black stone, iron gates with restrained gilded filigree, a few glowing amber braziers and a distant crimson-lit cathedral entrance. Atmospheric fog and physical chiaroscuro; rich fine stone and metal surface details, professional restrained composition. Right two-thirds contain the cathedral, monumental architecture, foreground gate and ornamental stone framing; left third stays dark, quiet and low-detail for readable UI text. Palette near-black charcoal, weathered bronze, muted parchment, ember amber and sparse burgundy. No characters or monsters in close-up, no logos, no text, no UI, no HUD, no watermarks, no blue science fiction glow, no generic saturated fantasy. Art should fit an intimate dangerous old gothic action RPG, not a bright heroic themepark. HD crisp detailed painted illustration suitable for a premium community game launcher interface.

## Prompts dos ícones (três chamadas separadas com transparência)

Prefixo comum a cada chamada:

Production inventory item icon for Returns from Darkness, original gothic dark fantasy action RPG. Single object centered, complete silhouette including all edges, isolated on genuinely transparent background, no shadow outside object, no text, no lettering, no logo, no border. Painted realistic worn medieval metal with restrained dark bronze and ember accents, high readability at 56 pixels, crisp clean silhouette, subtle highlights, controlled internal detail. Square image, item fills about 80 percent with clear transparent margin. Design fits ancient dangerous gothic Diablo-like world but is an original object.

Last Vigil:

A signet ring named Last Vigil: thick aged black iron ring, octagonal bezel, tiny amber ember glass inset with a single vertical slit, four restrained worn gold engraved guard marks. Clearly a wearable ring, strong ring opening, three-quarter isometric view.

Lantern of the Return:

A pendant amulet named Lantern of the Return: miniature ancient iron lantern attached to a short visible loop, pointed gothic cage, warm muted amber core glowing inside, aged brass corner studs, no long chain. Elegant compact suspended relic, three-quarter isometric view.

Ashen Covenant:

A pendant amulet named Ashen Covenant: symmetrical narrow pointed diamond of weathered black iron, two angular crossed clasps holding a fractured red garnet, delicate worn gold rim, ash etched surface, small top hanging loop, no long chain. Strong distinctive compact silhouette, three-quarter isometric view.
