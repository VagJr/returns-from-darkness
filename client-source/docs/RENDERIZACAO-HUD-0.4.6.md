# Interface e coleção — 0.4.6

As correções da 0.4.5 permanecem: cantos transparentes, chat com a mesma arte, encaixes discretos e fundo independente para descrições. O jogo não substitui todas as artes clássicas do mundo nesta versão.

A camada de ícones próprios usa um atlas RGBA e uma segunda composição limitada à área dos itens. A máscara é alocada sob demanda; apenas o retângulo alterado é enviado à GPU. Proporção, transparência e encaixes do inventário são preservados. O formato CEL continua como alternativa.

Cinzas do Retorno tem 36 desenhos próprios em seis folhas. Os testes gráficos reúnem seis itens por captura; não demonstram obtenção natural. Definições e ícones estão no cliente, mas a coleção ainda não é distribuída pela campanha pública. Balanceamento, obtenção e aparência equipada original continuam em desenvolvimento.

O menu inicial oferece English e Português (Brasil). Os menus principais e telas próprias de conta e salas têm uma camada de tradução; a tradução integral da campanha e os glifos acentuados ainda precisam de revisão. A música usa as faixas clássicas do arquivo local quando o pacote opcional está ausente, respeitando o volume salvo.

Os contratos diários ficam desativados no serviço público. A documentação e o código do protótipo não constituem anúncio de disponibilidade.
