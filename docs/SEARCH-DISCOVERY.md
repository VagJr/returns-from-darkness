# Descoberta nas buscas — Returns from Darkness

Atualizado em 13/10/2026. Meta: trazer jogadores de Diablo 1 interessados em cooperativo, cliente Windows, mods e comunidade. Não há estimativas de volume ou promessa de ranking: os termos abaixo foram organizados a partir de buscas públicas e do escopo real do projeto.

## Páginas por intenção

| Intenção | Exemplos de buscas | Página |
|---|---|---|
| Encontrar o projeto | Returns from Darkness, Returns from Darkness HD, Diablo 1 HD Returns from Darkness | Home localizada nos 14 idiomas |
| Encontrar jogadores e jogar online | diablo 1 online, diablo i online, play diablo 1 online, diablo 1 community, diablo 1 discord, diablo 1 co-op community | /en/diablo-1-online/ e /pt-BR/diablo-1-online/ |
| Entender conexão, coop e saves | diablo 1 multiplayer, diablo 1 coop, diablo 1 co-op, diablo 1 four players, diablo 1 multiplayer windows, diablo 1 join game, diablo 1 host game, diablo 1 multiplayer save, diablo 1 online connection | /en/diablo-1-multiplayer/ e tradução pt-BR |
| Procurar infraestrutura comunitária | diablo 1 private server, diablo i private server, diablo 1 community server, diablo 1 online server, diablo 1 battle.net community, diablo 1 custom client | /en/diablo-1-private-server/ e tradução pt-BR; explicam corretamente nuvem versus partida no cliente |
| Começar a jogar em português | diablo 1 jogar online, como jogar diablo 1 online, diablo 1 cooperativo, diablo 1 multiplayer português, diablo 1 servidor privado, servidor comunitário diablo 1, comunidade diablo 1, discord diablo 1, cliente diablo 1 windows | Guias em pt-BR e home |
| Cliente e desenvolvimento | diablo 1 hd client, diablo 1 windows client, diablo 1 mod multiplayer, diablo 1 expanded classes, diablo 1 hd co-op, diablo 1 launcher, diablo 1 client download | Home, guia online, central e notas das releases |

Termos não foram adicionados como um bloco escondido ou meta keywords. Títulos, descrições, seções e links internos explicam assuntos reais. Não tentar captar buscas de jogos ou plataformas ausentes: o site não anuncia jogo no navegador, cliente móvel, remasterização integral, servidor autoritativo ou ranking pronto.

## Busca internacional

As 14 páginas existentes têm títulos próprios para Diablo 1 online/cooperativo no idioma correspondente, canonical e hreflang. Os seis novos guias têm conteúdo completo em inglês e português, com alternates recíprocos. Não criar centenas de variações de keywords com o mesmo texto: expandir traduções de guias somente quando houver conteúdo revisado e útil ao público.

## Mecanismos de alcance

1. Search Console: verificar o prefixo HTTPS, enviar sitemap.xml e inspecionar a home, versão inglesa e guias prioritários. Confirmar separadamente solicitação enviada e página de fato indexada.
2. Sitemap: 20 URLs canônicas, seis guias e páginas de apresentação. Arquivo anunciado no robots.txt, com alternates de idioma e última atualização.
3. Descoberta interna: links dos guias nas páginas de apresentação e links de retorno, central e Discord em cada guia. Conteúdo HTML disponível sem login e sem depender de JavaScript.
4. Dados estruturados: WebSite e Article descrevendo a página, sem avaliações, estrelas ou números de jogadores inventados. Isso não garante rich results.
5. Guias que resolvem dúvidas: como formar grupo, versões compatíveis, anfitrião, salvamento e diferença entre servidor comunitário e partida. Atualizar junto das mudanças de funcionamento.
6. Releases e devlogs: publicar capturas reais e relatos verificáveis, com links para os guias relevantes, na própria comunidade e em destinos que permitam projetos. Sem compra de backlinks, spam ou publicidade em anúncios de outros mods.
7. Bing Webmaster Tools: após verificar o Google, pode importar a propriedade ou verificar diretamente. Checar a conta e os termos antes de qualquer cadastro. Não foi presumido um cadastro já concluído.
8. IndexNow: configurado com chave pública preservada pelo build; 20 URLs enviadas em 13/10/2026, com resposta HTTP 202 (aceitas para processamento). Não equivale a indexação Google e não substitui Search Console. Reenviar somente páginas novas ou alteradas usando tools/submit-indexnow.py.
9. Medição: acompanhar consultas, impressões, cliques, país e páginas no Search Console. Uma visita ao site não prova entrada no Discord; medir cliques de saída ou usar convites específicos por origem quando isso for implementado.

## Pesquisa e fontes oficiais

- [Guia de SEO do Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Search Console: começar](https://developers.google.com/search/docs/monitor-debug/search-console-start)
- [Criar e enviar sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Políticas: keyword stuffing e spam de links](https://developers.google.com/search/docs/essentials/spam-policies)
- [Indexação não é garantida](https://developers.google.com/search/help/crawling-index-faq)

Buscas exploratórias mostraram interesse por multiplayer, Battle.net clássico, DevilutionX, mods e grupos no Discord. Isso é evidência de tópicos e intenção, não pesquisa de volume. Não usar a Indexing API de vagas/livestreams para este site de jogo.

## Verificação

O arquivo Google recebido pela conta do responsável é mantido em site/verification e copiado pelo build para a raiz pública. Não remover após a verificação. A validação técnica roda com python tools/verify-search.py. Resultados da propriedade, sitemap e solicitações devem ser registrados após o retorno do Google.

### Resultado de 13/10/2026

- Propriedade https://returns-from-darkness.vercel.app/ cadastrada e verificada no Google Search Console.
- sitemap.xml processado pelo Google: 20 páginas encontradas; última leitura em 13/10/2026. Páginas encontradas no sitemap não significam páginas já indexadas.
- Inspeção da home: Google ainda não reconhecia o URL. A solicitação individual de indexação foi recusada por cota diária excedida; não registrar como solicitação aceita. Pode ser tentada novamente após a renovação da cota.
- Publicação na Vercel concluída; sitemap, arquivo de verificação e guias prioritários responderam HTTP 200. Validação local das 20 URLs passou.
- IndexNow recebeu as 20 URLs com HTTP 202. Recebimento não confirma indexação nos buscadores participantes. Bing Webmaster Tools ainda não foi cadastrado.
- Próxima medição: cobertura/indexação, impressões e consultas no Search Console quando houver dados. Não há garantia de prazo, posição ou quantidade de visitantes.

Referências: [solicitar novo rastreamento ao Google](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) e [documentação do IndexNow](https://www.indexnow.org/documentation).
