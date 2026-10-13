# Composição da HUD — 0.4.5

A nova revisão mantém os 52 PNGs originais do Dark Gothic HUD Kit, seu atlas e as coordenadas interativas da interface. Corrige a composição em quatro estados encontrados durante o uso real: transparência da moldura, chat, arraste de itens e descrições.

## Transparência e chat

Quando o atlas está disponível, DrawMainPanel deixa de copiar o retângulo de 640×128 pixels do painel antigo. O cenário é desenhado até o limite da tela e aparece nas regiões transparentes da escultura, sem eliminar detalhes da arte. A limpeza retangular que removia o material de cenário daquela região também fica limitada ao renderizador de fallback. O cinturão evita a cópia antiga pelo mesmo motivo.

O chat usa couro e molduras do kit no espaço central. O texto continua na fonte do jogo, com o editor de três linhas e os destinatários nativos. As coordenadas visuais e de clique compartilham o deslocamento de resolução; a seleção ignora o próprio jogador e limita o índice aos outros três participantes. Controles de Chat/PvP que ficariam encobertos pelo editor não recebem cliques enquanto ele está aberto. O cursor animado preserva apenas seus pixels opacos.

## Encaixes e descrições

O shader aplica um contorno de baixa saturação, com preenchimento leve, sobre os slots do kit. A máscara preserva texto, ícones e cursor. As regras originais de equipamento, requisitos, posição e uso do cinturão não mudam. Painéis herdados que não usam o kit conservam seu renderizador.

As três janelas de descrição/comparação recebem uma base texturizada própria e a mesma moldura gótica. A antiga transformação de índices de paleta deixa de atingir o fundo temporário do inventário. A fonte e as informações reais do item permanecem nativas.

## Conferência

Capturas do render target do jogo, em perfil isolado, comparam o cenário atrás das regiões transparentes, a abertura/edição/fechamento do chat, os encaixes válidos e inválidos, o cinturão e a mesma descrição com inventário aberto ou fechado. A conferência do atlas e das grades de encaixe permanece separada. Os relatórios finais registram os resultados e o alcance das verificações.
