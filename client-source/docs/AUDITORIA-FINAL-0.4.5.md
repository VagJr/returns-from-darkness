# Entrega e conferência — 0.4.5

A 0.4.5 foi publicada e instalada em 13/10/2026. Site Vercel, central Cloudflare, manifesto assinado, instalador e cliente local correspondem à mesma versão. A instalação preservou os 15 arquivos de personagens existentes. O painel administrativo preservou autenticação e rascunhos.

## Quatro correções da HUD

O painel antigo deixou de preencher com preto o retângulo abaixo da arte transparente. A comparação da captura com o cenário sem HUD teve correspondência total na região exposta testada; mais de 50 mil pixels de arte continuam presentes. Molduras e esculturas não foram removidas.

O chat usa a textura e as molduras do kit. Os testes conferiram editar texto, selecionar os outros três destinatários e fechar com Esc; o cinturão retornou sem resíduos. A seleção de destinatários teve seus deslocamentos corrigidos para a resolução atual. A fixture gráfica não certifica entrega de mensagem de chat entre computadores externos.

Os encaixes usam contorno discreto e transparência leve, preservando sinais distintos para requisitos atendidos e não atendidos. Foram capturados os anéis, oito posições do cinturão e um item grande na grade. A descrição do mesmo item manteve sua composição sobre o cenário e sobre o inventário, com diferença média de 1,34 em canais de 0 a 255 e todos os pixels dentro da tolerância de seis níveis.

## Validação da entrega

Passaram as capturas reais de 11 estados de interação, 27 quadros de menus em janela e 27 em fullscreen, formulários, inventário e reload do personagem, preenchimento e animação de vida/mana, abertura pelo launcher e separação das instâncias por conta. A conferência do atlas preservou os 52 PNGs e as 24 peças, as 70 células do inventário e as oito do cinturão. Os alinhamentos foram novamente examinados com grades de cinco pixels.

Dois clientes de produção entraram na central publicada e trocaram de sala mantendo seus processos. A verificação pública confirmou cadastro, criação/saída de sala e transferência de sessão entre navegador e cliente; o chat público foi apenas lido. Um launcher 0.3.5 atualizou para 0.4.5 com verificações concorrentes, preservação de save e rejeição de assinatura adulterada.

A Vercel confirmou o commit 22b2cfc. O manifesto público e as cinco imagens da galeria correspondem byte a byte aos arquivos preparados. A navegação, traduções e galerias passaram em 14 idiomas, desktop e celular. A medição isolada de 20 segundos no menu não teve timeout; não constitui certificação de gameplay a 60 FPS. A revisão não altera taxas de experiência, drops nem desbloqueios.

Os hashes dos três artefatos e os 25 arquivos do pacote foram conferidos. Fontes da release permanecem imutáveis; este relatório final fica também no repositório. Evidências: `analysis/final-release-audit.json`, `analysis/hud-interactions-qa.json` e `analysis/hud-kit-layout-qa.json`. As capturas e grades ficam em `analysis/hud-interactions` e `analysis/hud-kit`.

## Limites

Não foi certificada campanha completa em todas as dificuldades nem partida gráfica entre PCs externos. Conquistas são informadas pelo cliente e permanecem sem ranking autoritativo. Artes herdadas do mundo continuam presentes; esta revisão corrige a composição da interface, sem anunciar substituição completa das texturas.
