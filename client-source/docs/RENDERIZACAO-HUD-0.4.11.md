# Acabamento dos contornos — 0.4.11

O fundo e a moldura da área central avançavam sobre os lados internos dos recipientes de HP/mana. Uma proteção elíptica nas coordenadas originais do HUD agora recorta apenas as novas camadas centrais, mantendo as bordas da arte original. As mesmas medidas em CommunityHudBounds.h são usadas pela pintura de fallback e pelo shader; o chat usa a mesma proteção. As orbs e suas animações não foram redesenhadas.

A ponta superior do selo já estava transparente no PNG moldura_inventario_sobreposta.png: os pixels RGB existiam, mas seu alpha tinha sido removido junto com a área da grade ilustrativa. A versão painel_inventario_completo.png preservava a ponta inteira. O atlas acrescenta seu recorte original (217,574)-(310,604), com um contorno aplicado pelo compositor para excluir os fragmentos da grade ilustrativa. A ponta usa a escala da moldura atual. Ela é composta antes dos ícones reais; textos, ícones e cursor conservam suas máscaras de prioridade. Nenhum PNG original foi retocado.

O atlas contém 25 recortes; os 52 arquivos originais continuam com seus hashes. Os controles, os 70 slots do inventário e os oito do cinturão conservam as coordenadas.

A auditoria hud-edge-refinement-0411.json compara regiões neutras das bordas com a arte e uma captura histórica anterior de mesma geometria. A diferença média de cor caiu de 51,42 para 16,47 na borda de HP e de 58,54 para 22,40 na de mana. Na ponta, 162 pixels opacos selecionados ficaram todos dentro de diferença média de 20 por pixel; a diferença média foi 3,80, contra 65,87 na captura anterior. A comparação se restringe à arte de interface, sem tratar frames históricos de gameplay como idênticos.

As capturas atuais são feitas na build privada de QA com o mesmo compositor. Passaram o preenchimento vazio→cheio, 48 frames de animação por recurso, preservação dos valores nativos, abertura/fechamento do chat, slots válidos/inválidos e descrições independentes do inventário. Isso não certifica jogabilidade prolongada ou novas redes. A entrega pública tem pacote e fonte separados da build privada.
