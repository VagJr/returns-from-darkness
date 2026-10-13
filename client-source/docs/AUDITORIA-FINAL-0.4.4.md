# Entrega e conferência da HUD — 0.4.4

Build publicada e instalada em 13/10/2026. O site, o manifesto assinado, o cliente Windows e a suíte em `C:\diabloHD` usam 0.4.4. A revisão 0.4.3 foi preservada como histórico; 0.4.4 acrescenta a correção final das legendas dos botões inferiores.

## Arte, recortes e alinhamento

- 52 PNGs do Dark Gothic HUD Kit conferidos e preservados byte a byte. O atlas 2048×2048 contém 24 peças com margens transparentes de dois pixels; cada região foi comparada com sua fonte.
- Molduras completas de personagem e inventário, com proporções preservadas, coroas e ornamentos inferiores dentro da tela 1920×1080. O recorte das amostras ilustrativas preserva a ponta da coroa e as travessas em torno do pentagrama.
- Painel central inferior texturizado. O texto de ouro é desenhado pelo jogo sobre o espaço da moldura; o número ilustrativo foi retirado da composição.
- Grades de cinco pixels, com linhas principais a cada 25 pixels, aplicadas sobre capturas reais. As 32 legendas do personagem cabem em suas colunas. Os nove botões ativos do cenário de teste têm suas legendas dentro das molduras; a coluna esquerda mede 58 pixels e mantém margem para a fonte e seu contorno.
- 70 células do inventário e oito posições do cinturão preservadas. Slots de equipamentos não se sobrepõem; os botões reais de personagem/inventário abrem e fecham os painéis. As quatro áreas de aumento de atributos continuam interativas.
- Abas de armas com a arte gótica do kit. Barra de experiência reposicionada junto ao cinturão, sem o traço claro sob a moldura inferior.
- Esculturas completas do kit e líquidos animados adaptados dos 48 quadros do Tchernobog. Capturas GPU verificam vazio, 25%, 50%, 75% e máximo, preenchimento crescente e animação. Não se apresenta o líquido de aproximadamente 110 pixels úteis como arte nativa nova de 256 pixels.

## Funcionamento e distribuição

Os testes passaram para primeira pintura dos menus em janela e fullscreen, formulários sem apagar o último caractere, avisos nativos, relíquias no inventário e reload do personagem, launcher em 14 idiomas e recursos de ícone nos executáveis. A medição isolada de 20 segundos do menu não teve timeout; não é uma certificação de gameplay a 60 FPS.

Dois clientes de produção compartilharam uma sala no mesmo PC, trocaram de sala mantendo os processos e registraram seus personagens na central publicada. A verificação do navegador confirmou cadastro, criação/saída de sala e transferência de sessão entre site e cliente. A seleção inicial de dificuldade mostra Horror; ações de sala ficam desabilitadas durante a requisição. Esse comportamento também foi conferido com uma resposta propositalmente retida em uma fixture local.

O instalador e os 25 arquivos do pacote correspondem aos hashes e ao manifesto assinado. Um launcher 0.3.5 atualizou para 0.4.4; verificações concorrentes passaram e a assinatura adulterada foi rejeitada. A instalação preservou os 15 arquivos de personagens existentes. O painel privado manteve autenticação, rascunho e proteção das rotas. As tabelas públicas de experiência e drops não foram alteradas nesta entrega.

Os relatórios locais estão em `analysis/final-release-audit.json`, `analysis/hud-kit-layout-qa.json`, `analysis/hud-kit-controls-qa.json` e `analysis/resource-orbs-qa.json`. As grades e ampliações estão em `analysis/hud-kit`. O arquivo de fontes da release é um snapshot imutável; este relatório final e a auditoria atualizada de rates também ficam disponíveis no repositório e na suíte local.

## Limites da verificação

Não foi certificada uma campanha completa em todas as dificuldades nem uma partida gráfica entre PCs externos. A progressão online é informada pelo cliente e permanece sem ranking autoritativo. As artes herdadas do mundo, monstros e personagens continuam presentes: esta entrega refina a interface, sem afirmar que todas as texturas do jogo foram substituídas.
