# Cinzas do Retorno — 36 itens

Artes originais da primeira coleção ampla de Returns from Darkness. Foram geradas pelo **image_gen integrado**, em **seis pranchas com seis itens por geração**, conforme a direção solicitada.

- `masters/`: seis originais RGBA de 1536 × 1024, preservados.
- `art/`: 36 recortes individuais transparentes. A menor dimensão útil no eixo maior é de 417 pixels. Os pixels retidos são idênticos aos originais; não houve repintura na extração.
- `generation.json`: os seis prompts completos, caminhos e assinaturas SHA-256.
- `sprite-extraction.json`: recortes, dimensões e verificações por item.
- `gpu-atlas.json`: atlas de exibição em cor completa, com proporção preservada nos espaços nativos do inventário.
- `balance-draft.json`: bases, efeitos e requisitos em avaliação. Os patamares previstos são níveis 8, 24 e 45.

A coleção cobre 22 tipos, incluindo armas, armaduras, joias, luvas, botas, cintos, frasco, armadilha e códice. A direção usa ferro escurecido, couro gasto, prata nas arestas e vermelho de brasa discreto, combinando com o HUD gótico do projeto.

## Estado da integração

Os 36 itens possuem definições e ícones incluídos no cliente **0.4.6**, alternativa em CEL, 12 quadros derivados de queda e requisitos de nível. A leitura e a gravação do formato de item passaram nos testes. A exibição RGBA do inventário usa um atlas separado e uma segunda composição restrita à área dos itens.

**Coleção ainda indisponível para obter na campanha pública.** Balanceamento de campanha, obtenção natural, animações de queda em cenário, sincronização dos novos itens e aparência equipada original ainda precisam de validação ou implementação. A aparência equipada atual usa as animações herdadas do tipo de equipamento; não deve ser apresentada como arte equipada nova.

As capturas usam uma ferramenta de teste para reunir os itens no inventário. A inclusão das definições no cliente não libera recompensas, não altera personagens existentes e não ativa os contratos diários no serviço público. As artes e as etapas de integração são apresentadas como desenvolvimento no site e no Santuário.
