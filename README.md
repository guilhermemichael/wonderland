# WONDERLAND

Uma descida interativa ao desconhecido. Next.js (App Router, export estático), React, TypeScript e GSAP, construído sobre os assets aprovados FT1–FT8 e VD1–VD5.

## Rodar

```bash
npm ci              # Node.js 24.x, dependências fixadas no package-lock.json
npm run build        # gera out/ (arquivos estáticos, sem servidor)
npm start            # serve out/ em http://localhost:4173
```

Para preview rápido sem npm: `python -m http.server 4173 -d out`.

Na Vercel, `VERCEL_PROJECT_PRODUCTION_URL` fornece o domínio de produção para canonical, `og:url`, `og:image`, robots e sitemap. Fora da Vercel, defina `NEXT_PUBLIC_SITE_URL` no build (veja `.env.example`). A variável explícita tem prioridade e deve conter apenas a origem pública do site.

## Publicação

O repositório é `guilhermemichael/wonderland`, com produção a partir de `main`. Importe-o na Vercel com framework **Next.js**, Root Directory na raiz, Node.js **24.x** e Output Directory automático. `vercel.json` define instalação com `npm ci --no-fund` e build com `npm run build`. O Next.js mantém `output: "export"` e publica somente a exportação estática.

Não há backend, segredo obrigatório, banco de dados ou endpoint de quiz nesta implementação. A única configuração pública opcional é a origem do site. Os originais FT/VD permanecem locais e ignorados pelo Git; todos os derivados web necessários estão em `public/` e são versionados normalmente, sem Git LFS.

O inventário em `docs/asset-audit.json` registra dimensões, tamanhos, codecs e SHA-256 dos originais e dos derivados verificados, sem alterar mídia.

## Estrutura

```
app/                      rotas: / (jornada), /rabbit, /hatter, /cheshire, 404, robots, sitemap, icon
  globals.css             tokens, tipografia, nav, cursor, véu, grain, luz ambiente, reduced motion
  experience.css          jornada: static-first (padrão) e html[data-mode="scrub"] (desktop)
  paths.css               cenas dos três caminhos
components/
  experience/             Experience (cliente), engine.ts (ScrubEngine), videoSlot.ts (Blob + seek gate),
                          timeline.ts (mapa de beats em vh), Band, Hud, Crossroads
  scene/                  PlatePicture (AVIF/WebP/JPEG + recorte retrato), SceneLife + life.ts
                          (vida sussurrada das cenas), parallax.ts
  paths/PathScene.tsx     páginas Rabbit/Hatter/Cheshire
  atmosphere/Particles    partículas por cena (um canvas 2D, dorme quando não visível)
  ui/                     Nav, VeilLink, Cursor, About (rodapé), Arrow
lib/                      content.ts (copy aprovado), gates.ts (5 gates), analytics.ts, media.ts,
                          media-manifest.json (gerado), math.ts, pointer.ts, veil.ts
scripts/media/            pipeline de mídia (Python + ffmpeg local)
scripts/qa/               QA adversarial via Chrome headless (DevTools Protocol, sem dependências)
docs/                     relatório de compreensão do 10k-websites-skill
```

## Os assets

Os originais na raiz (`FT*.jpeg`, `VD*.mp4`) nunca são alterados nem publicados. Todos os comps aprovados vieram com a interface impressa na imagem (nav, títulos, parágrafos, telemetria) e com alguns artefatos de geração (asteriscos, telemetria duplicada, o texto "Small faded telemetries / Six distinct planes of depth", "FRAME 05") e, no FT5/VD5, os olhos e o sorriso flutuantes do Cheshire que o briefing proíbe.

`scripts/media/build_media.py` gera versões de trabalho em `public/media/`:

1. **Remove apenas essas camadas impressas** com inpainting local do OpenCV (Telea), dentro de zonas medidas (`zones.py`), só em traços finos e claros de tipografia. Nenhum pixel é gerado por IA, nenhum elemento de cena é redesenhado. Nos vídeos, a remoção acompanha a opacidade medida do texto impresso quadro a quadro (`text_alpha.py`), e no início do VD2 a máscara segue o plano do texto por features ORB enquanto a câmera avança.
2. **Recorta os FT para a mesma janela 16:9 dos vídeos** (registro medido por ORB: escala 0,703, rotação < 0,05°), então still e vídeo compartilham um único sistema de coordenadas.
3. **Recodifica para scrub**: H.264, keyframe a cada 8 frames (os originais tinham 1 keyframe no clipe inteiro), sem áudio, `faststart`.
4. Exporta plates em AVIF/WebP/JPEG (1280/1920/2560) e recortes retrato 4:5 para mobile.

```bash
python scripts/media/build_media.py all      # plates + vídeos (~20 min)
python scripts/media/write_manifest.py       # bytes reais e frames -> lib/media-manifest.json
python scripts/media/build_og.py             # cartões Open Graph a partir dos comps
```

Correspondência real dos vídeos: **VD1** = o Threshold vivo (cartas, coelho, portal acendendo; câmera parada), **VD2** = FT1→FT2, **VD3** = FT2→FT3, **VD4** = FT3→FT4, **VD5** = FT4→FT5.

## Como a jornada funciona

- **Modo**: um script no `<head>` decide antes do primeiro paint, com os 5 gates do skill (`lib/gates.ts`), entre `static` (phones, tablets em retrato, pointer coarse em retrato, phone deitado, reduced motion, e sem JS) e `scrub`. A decisão é refeita ao vivo em rotação, resize e troca de preferência.
- **Scrub**: trilho de 3235vh com stage sticky (scroll nativo, sem hijack). O scroll só escreve o alvo; um rAF interpola com suavização normalizada por delta-time e dorme ao convergir, fora da tela ou com a aba oculta. Cada seek passa por um portão coalescido com escape de deadlock. Escritas no DOM só quando o valor muda.
- **Mídia**: o plate do Threshold pinta primeiro; depois os demais plates; os vídeos chegam em sequência como Blob (sem depender de Range no host), com progresso real no indicador SCROLL, watchdog de 20 s e prioridade pela posição do leitor. Sem vídeo, cada transição vira uma travessia de stills (push-in no quadro anterior, assentamento no próximo).
- **Texto**: cada capítulo tem sua entrada, dirigida por `--k` e escrita pelo motor; o texto de cada capítulo entra e sai nos mesmos frames em que a interface entrava e saía dentro dos vídeos aprovados.
- **Crossroads**: três links reais sobre as áreas físicas da cena, com reações do ambiente (CSS `:has()`), o coelho olhando para o caminho sob o cursor, e transição de véu de 300 ms para a rota.

## QA

Não há scripts de lint ou testes unitários configurados. Execute `npm run typecheck`, `npm run build` e as verificações de navegador abaixo. O driver usa Chrome instalado (`CHROME` permite informar outro executável) e Node.js 24. A auditoria de mídia `python scripts/qa/assets.py` requer Pillow e imageio-ffmpeg ou um executável ffmpeg informado por `FFMPEG`.

```bash
python -m http.server 4173 -d out
node scripts/qa/release.mjs .qa/release/matrix              # 7 resoluções × 4 rotas, CTA, rede e console
node scripts/qa/journey.mjs .qa 1440 900                    # passada visual da jornada
node scripts/qa/suite.mjs .qa flick mobile reduced reducedLive blocked overflow keyboard paths hover jumps rest
node scripts/qa/legibility.mjs .qa/legib && python scripts/qa/legibility.py .qa/legib
node scripts/qa/perf.mjs                                    # speed receipts
node scripts/qa/motion.mjs .qa/motion http://127.0.0.1:4173/ 1 && python scripts/qa/motion_report.py .qa/motion .qa/motion.jpg
```

Resultados históricos da implementação (não substituem uma nova execução antes de publicar):

| Teste | Resultado |
|---|---|
| Flick test (120 / 240 / 360px) | toda banda chega a opacidade total; nenhuma pulável; plateaus de 14–31 flicks normais |
| Contraste no pior frame | mínimo 3,67:1 (headline do Threshold); todo o resto acima de 4:1 |
| rAF em repouso | zero escritas de estilo em 2,5 s parado; volta a escrever ao rolar |
| Vídeos bloqueados | jornada completa em stills, sem erro e sem indicador travado |
| Mobile (375×812, 375×667, 768×1024, 844×390) | modo estático, **zero requisições de vídeo**, zero overflow, console limpo |
| Reduced motion (antes e ao vivo) | estático com estados finais; ao voltar, o scrub rearma e nada fica preso |
| Overflow lateral (6 viewports, incl. 2560×1080 e 1280×520) | zero |
| Teclado | skip link, nav, CTA e os três caminhos; focar um capítulo leva a jornada até ele |
| Links internos | todos resolvem |
| Copy gate | zero em dash, zero palavras de estoque no HTML construído |
| Peso | 53 KB de HTML, 570 KB de imagens no primeiro paint; vídeos (48 MB) chegam em sequência, depois |

## Analytics

`lib/analytics.ts` emite `page_view`, `cta_click`, `rabbit_hole_started`, `scroll_depth` (25/50/75/100), `rabbit_hole_completed`, `path_selected` com deduplicação por visita, para `window.dataLayer`, `gtag` ou `plausible` se existirem, e sempre como evento DOM `wonderland:analytics`. `quiz_interaction` e `conversion_submit` estão tipados e prontos, mas o briefing não define a interface de quiz nem de conversão, então não são disparados.
