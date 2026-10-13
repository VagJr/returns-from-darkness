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

## Revisão 0.4.2 — ardósia e ferro, sem dourado dominante

A textura de runtime foi substituída por `content/original/ui/interface-stone.png`, RGB 1254×1254, SHA-256 `13876e8bec22265e76daa4bab83566e8e7a28e230f6c19a2f5d1c65efab2895b`. A saída original está preservada como `content/original/sources/interface-slate-iron.png` (origem `exec-68f137c4-bfc3-46d8-b593-95b6e189dd4b.png`). O material anterior continua em `sources/interface-stone.png` como registro da primeira coleção. O runtime usa apenas a nova revisão.

Molduras, separadores e aros usam cinza/prata fosca, com recessos de carvão. O capacete tem margem dentro da moldura. As esculturas herdadas de Tchernobog são sustentáculos/bustos: sua base completa deve encostar na base do HUD, sem inventar pernas. A textura HD nova é própria do projeto; os frames dos vasos continuam identificados pela procedência extraída.

Prompt exato da chamada `image_gen`:

Use case: stylized-concept. Asset type: seamless raster material for a real-time gothic action RPG HUD and inventory, to be sampled by the game engine. Create one square high-resolution seamlessly tileable texture of finely carved weathered cathedral slate and forged dark iron. Diablo 1 dark medieval mood: restrained cold charcoal and gunmetal, dry porous grey stone, subtle chisel scars, soot in shallow cracks, finely pitted matte metal, occasional tiny pale mineral or bone-grey highlights, very slight cool aged pewter. Uniform close-up material sheet viewed orthographically front-on under soft neutral lighting. Readable high-frequency detail, premium crafted finish, authentic dark gothic dungeon atmosphere. Medium-dark and softly varied, not pitch black; no large gold/brass areas, no brown sandstone, no purple, no blue glossy plastic. No objects, no drawn frames, no interface mockup, no lettering, no logos, no buttons, no gems. No large diagonal bands, no spotlight, no vignette, no directional shadow or perspective. Perfectly continuous seamless edges, controlled small-scale grain suitable for use behind UI at 1920x1080. The entire canvas is one material, not a scene or grid. Opaque background.
