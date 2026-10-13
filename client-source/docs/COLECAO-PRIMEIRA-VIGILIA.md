# A Primeira Vigília — coleção 0.4.1

A primeira coleção de itens próprios de Returns from Darkness acrescenta três relíquias à campanha. Seus nomes, desenhos, descrições e combinações de atributos são específicos do projeto. O sistema de equipamento, os slots e a serialização continuam usando a engine adaptada de The Hell 3; os créditos das bases permanecem no projeto.

## Relíquias e obtenção

Os nomes abaixo são os nomes em inglês exibidos pelo cliente nativo nesta build. As recompensas exigem **modo de personagem Normal** e **dificuldade de campanha Horror**. São opções diferentes: o modo define as regras do personagem; Horror é o primeiro nível de dificuldade do mundo.

| Relíquia | Tipo | Recompensa de | Atributos fixos |
| --- | --- | --- | --- |
| Signet of the Last Vigil | Anel | Skeleton King | +3 Vitalidade, +10 Vida, +10 resistência a fogo |
| Lantern of the Return | Amuleto | Butcher | +3 Magia, +10 Mana, +10 resistência a relâmpago |
| Ashen Covenant | Amuleto | Diablo clássico | +3 a todos os atributos, +10 a todas as resistências, +15 Vida, +15 Mana |

O Diablo que concede Ashen Covenant é a entidade clássica `BM_110_DIABLO`, não Uber Diablo (`BM_137_UBER_DIABLO`). Esta recompensa não equivale ao marco de conclusão da campanha ampliada usado pelo Santuário.

Clean Hands, Night Kin e o trait Barbarian impedem essas recompensas, respeitando as restrições de loot existentes. Coliseum e as demais dificuldades não concedem a coleção. Invocações não geram a recompensa de chefe. No multiplayer, somente o responsável pelo drop executa a geração; os demais participantes recebem o comando normal de item compartilhado.

A recompensa é adicional ao loot normal e depende das condições e limites de geração de itens da engine. Não há uma trava de resgate único por conta: um novo mundo elegível pode conceder novamente a recompensa. A tabela global de experiência e as taxas ordinárias de drop não mudam, mas estes três encontros passam a oferecer um item nomeado adicional.

## Arte e apresentação

O anel usa ferro antigo com uma pequena brasa âmbar; o primeiro amuleto é uma lanterna de ferro; o segundo traz uma granada vermelha em uma estrutura de metal enegrecido. As silhuetas compactas, o dourado gasto e os tons de cinza, âmbar e brasa seguem a direção de arte das novas molduras do HUD.

As fontes originais ficam em `content/original/sources/`. Os assets RGBA de 256×256 ficam em `content/original/items/`. O cliente converte os ícones uma vez para o formato e a paleta nativos: ícones de inventário de 28×28 e sprites de chão de 96×32, com 12 frames. Portanto, as fontes têm definição maior; os sprites exibidos ainda obedecem à escala nativa do jogo. Não anunciar sprites HD de todos os equipamentos como resultado desta coleção.

As descrições de lore exibidas após identificação são:

- Signet of the Last Vigil: “A vigil kept when every other light had failed.”
- Lantern of the Return: “Its last ember remembers the road to Tristram.”
- Ashen Covenant: “From the ashes, an oath to return together.”

## Compatibilidade

Os IDs únicos `4618`, `4619` e `4620` foram acrescentados ao final da tabela, sem renumerar os itens herdados. As linhas privadas `-100`, `-101` e `-102` excluem a coleção da seleção aleatória antiga de únicos. Os gráficos próprios usam `8880` a `8882`.

A geração salva e restaura o estado de RNG da engine, para que esta recompensa adicional não consuma a sequência de sorteios usada pelos sistemas herdados. Os itens usam o caminho normal de criação, identificação, inventário, serialização e envio de drops, com atributos aplicados já na criação e conservados ao recarregar.

## Validação e limites

O teste isolado em `analysis/original-relics-qa.json` passou pelos ganchos reais de recompensa, bloqueio em modos/dificuldades inelegíveis, preservação de RNG, ícones e sprites próprios, coleta no inventário, serialização e reabertura do personagem com as três relíquias. O teste usa um perfil separado e não altera os personagens dos jogadores. Os ganchos de teste ficam restritos à compilação de QA e não devem constar na build pública.

O relatório **não certifica combate natural contra os três chefes até o fim**, nem a propagação específica das três novas relíquias entre dois computadores externos. Ele confirma o caminho nativo de recompensa e persistência local. A validação geral de multiplayer compartilhado da base continua separada desses cenários. A conferência visual do material HD da interface também tem seu próprio teste; não deve ser inferida deste relatório de itens.

Referências de implementação: `candidates/thehell3/src/UniqueItems.cpp`, `Item.cpp`, `Monster.cpp`, `Tooltip.cpp` e `CommunityRemaster.cpp`. A procedência das artes e os prompts usados estão em `content/original/ART-DIRECTION.md`.
