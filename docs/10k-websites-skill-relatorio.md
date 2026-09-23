# Relatório de compreensão operacional: `10k-websites-skill.zip`

Legenda usada em todo o documento:

- **[E]** regra explícita no ZIP (com o arquivo de origem).
- **[I]** inferência minha, derivada do ZIP, mas que não está escrita nele.
- **[N]** tema não coberto pelo ZIP.
- **[B]** vem do briefing WONDERLAND, não do skill.

Arquivos abreviados: `SKILL` = SKILL.md, `SCRUB` = references/scrub-pipeline.md, `LAWS` = references/prompt-laws.md, `FF` = references/ffmpeg-recipes.md, `PKG` = references/design-package.md, `DEPLOY` = references/deploy.md, `TS` = references/troubleshooting.md.

---

## 1. Estrutura do ZIP

### 1.1 Inventário (7 arquivos, 134 KB de texto, sem código executável, sem templates HTML)

| Arquivo | Tamanho | Papel | Natureza |
|---|---|---|---|
| `10k-websites/SKILL.md` | 41 KB | **Arquivo principal.** Orquestrador: papel do agente, tom com o usuário, critério de "done", 11 fases, gates, regra dos três tools, índice das referências | Processo + princípios |
| `references/scrub-pipeline.md` | 40 KB | **Núcleo técnico.** Padrão de engenharia do hero com scrub, sistema de legibilidade, coreografia de texto, gates de static hero, reduced motion, direção de design, quality floor, checklist de self-test | Engenharia + snippets |
| `references/prompt-laws.md` | 13.5 KB | 12 leis do vídeo-hero, templates de prompt, receita de encadeamento (Tier 2), seam law, custo | Geração de mídia |
| `references/troubleshooting.md` | 15 KB | Tabelas sintoma → causa → correção (geração, scrub hero, página, deploy, setup), receita de Chrome headless via CDP, two-hang rule | Diagnóstico |
| `references/ffmpeg-recipes.md` | 9.5 KB | Comandos exatos: encode de scrub (`-g 8`), poster, frame final, checagem de repouso, tail trim, concat, crossfade, stills | Processamento de mídia |
| `references/deploy.md` | 10 KB | Fluxo Hostinger, talk de custos, patch de og tags, zip, verificação live, speed receipts | Deploy |
| `references/design-package.md` | 4.8 KB | Template do "design package", o documento único que liga a Fase 5 (design) à Fase 8 (build) | Template |

Integridade: os 7 entries do ZIP foram comparados por SHA-256 com `extracted/`; todos idênticos.

### 1.2 Grafo de dependência conceitual

```
SKILL.md (orquestra 11 fases; define gates, papéis, "done")
 ├─ LAWS  ← ler antes de QUALQUER prompt de geração
 │    ├─ lei 10 → SCRUB (sistema de legibilidade)
 │    ├─ lei 11 → SCRUB (pacing em vh + flick test)
 │    └─ chaining → FF (frame grab PNG, concat, xfade)
 ├─ PKG   ← entregável da Fase 5, entrada da Fase 8
 │    └─ seção 8 "engineering list" → SCRUB inteiro
 ├─ SCRUB ← "Build the hero exactly to the engineering standard"
 │    ├─ -g 8 → FF
 │    ├─ headless Chrome → TS
 │    └─ checklist final = Fase 9
 ├─ FF    ← Fase 7 "Follow exactly"
 ├─ DEPLOY← Fases 1 (talk de custos) e 10
 └─ TS    ← "Check first" quando algo quebra
```

### 1.3 Central vs. opcional (para um projeto como WONDERLAND)

- **Central, aplicável quase integralmente:** SCRUB (todo), SKILL Fases 5, 7, 8, 9, 11 (princípios), FF (encode de scrub, poster/ending, checagem de repouso, verificação pós-encode), TS (seções "scrub hero" e "page"), PKG (como estrutura de pensamento: band map, static copy block, vector plan, engineering list).
- **Contextual / não aplicável aqui:** Fase 1 (wizard Higgsfield/ffmpeg/Node), Fases 2, 3, 4, 6 (conversa de design, pesquisa de clientes, tiers, geração), LAWS (serve para *gerar*; aqui serve para *ler* os assets aprovados), DEPLOY (específico de Hostinger; os princípios de verificação live e speed receipts continuam válidos), links de parceiro, rigidez "tutorial".

### 1.4 Regras repetidas em vários arquivos (peso alto)

| Regra | Onde aparece |
|---|---|
| Blob fetch do vídeo (Range) | SKILL F8, SCRUB, TS |
| Seek gating + DOM delta-gated | SKILL F8, SCRUB, TS |
| `-g 8` keyframes | SCRUB, FF, TS |
| Pacing em vh, plateau longo, flick test | LAWS lei 11, SCRUB, PKG, SKILL F9 |
| Worst-frame, nunca o frame médio | LAWS lei 10, SCRUB, SKILL F9 |
| 5 gates do static hero, idênticos CSS/JS, vivos | SCRUB, TS (2 linhas) |
| Página completa sem vídeo | SKILL F8, SCRUB, TS |
| Sem em dash; sem palavras de estoque | SKILL (tom + F9), PKG §9 |
| Nunca Inter/Roboto como display | SKILL F3, SCRUB, PKG |
| Nunca `#000`/`#fff` puros | SKILL F3, SCRUB, PKG |
| Raws fora da pasta de deploy | SKILL F7, FF, DEPLOY, TS |
| "Nothing snaps" / easing em tudo | SKILL F8, SCRUB |
| Um único CTA | SKILL F3/F8, PKG |
| Reduced motion completo e ao vivo | SCRUB (2 seções), PKG §7 |

### 1.5 Regras que aparecem uma única vez (fáceis de esquecer)

`ch` no elemento de texto e nunca no container; `align-items: baseline` em linhas de texto; marquee com trilho > 2560px; `animation-play-state` não é herdado; `fetch(..., {priority:'low'})`; `VIDEO_BYTES` hardcoded como fallback de `Content-Length`; manter referências às `MediaQueryList` (listeners perdidos em browsers antigos); `setTouchEmulationEnabled` exige `maxTouchPoints: 5`; `<!-- DEPLOY STEP -->` para og tags; mojibake em find-and-replace via shell; two-hang rule; poster com timeout de segurança de 4 s; ring throttled a 100 ms com escrita terminal garantida; `--k` com delta-gate de 0.008.

### 1.6 Tensões e contradições internas

1. **Rampas calibradas para ~900vh.** SCRUB fala em "rampas de ~20vh" e dá a fórmula `f = Math.min(0.02, (b - a) / 3)` em unidades de progresso, com o exemplo "0.02 num range de 900vh = 18vh". Num range de 3000vh, 0.02 vira 60vh. O número absoluto e a fórmula divergem em trilhos longos. **[I] Resolução:** calcular a rampa em vh e converter: `f = 20 / rangeVh`.
2. **Janela de montagem `--k`** (`Math.min(0.025, len * 0.35)`) tem a mesma calibração implícita (0.025 × 900 = 22.5vh).
3. **Dimensionamento por segundos vs. por beats.** "400vh para 6 s" e "1000vh para 18 s" dão ~55–67 vh por segundo de footage, enquanto cada beat pede plateau de 80–130vh. Numa narrativa com estados parados entre vídeos, o orçamento precisa ser por beat e não só por segundo. [I]
4. **Banimento estético vs. carve-out.** A direção de design bane "near-black com acento âmbar quente e serifa de alto contraste" como default, mas libera quando é o mundo real do sujeito e está briefado. WONDERLAND é exatamente essa paleta, briefada e presente nos frames: o carve-out se aplica, com a exigência de "merecer" (tons amostrados da footage, elemento-assinatura, layout fora do template).
5. **"Use all of it, every time" (SCRUB) vs. "numbers are proven defaults, not laws" (SKILL).** Resolução [I]: os *padrões* de engenharia são obrigatórios; os *números* são pontos de partida.
6. **"Architecture non-negotiable: one index.html, no framework"** é justificada pelo público iniciante (deploy de um comando, preview por duplo clique). Quando o projeto tem stack definida, é a razão que conta, não a forma. [I]
7. **Scrim global "sempre ligado" vs. não escurecer o frame inteiro [B].** Não é conflito real: o scrim global do skill é uma vinheta radial transparente até 35%, não um overlay chapado.
8. **Chip scrim com `backdrop-filter: blur(10px)`** vs. proibição de glassmorphism [B]. Tensão real: resolvo com chip de fundo tingido sem aparência de vidro e sem backdrop-filter sobre vídeo (que também custa GPU). [I]
9. **Modelo "um vídeo-hero"** vs. múltiplos vídeos com estados entre eles. O Tier 2 concatena tudo num arquivo único; isso é incompatível com carregamento progressivo de 5 vídeos pesados. Decisão de projeto (§22).

---

## 2. Filosofia central do skill

O skill é um **sistema de produção** em três camadas, e é essencial não confundi-las:

1. **Processo fixo** (fases, gates, três ferramentas, ordem das perguntas). Existe porque o skill acompanha um tutorial em vídeo e o usuário compara o chat com o que assistiu. Não é criativo; é um trilho.
2. **Licença criativa** ("the defaults are launch pads, not fences"). Dentro das leis, o agente é designer e diretor, pode inventar entradas, motivos, interações, desde que diga em voz alta quando desvia.
3. **Piso de engenharia** (SCRUB). Cada regra "either created the polish or prevented a bug that actually shipped". É o conteúdo mais transferível do ZIP.

A unidade de design é a **jornada de scroll**: um filme pré-renderizado cujo tempo pertence ao scroll do visitante. O **princípio keystone** inverte a ordem intuitiva: *a página é desenhada primeiro, completa* (seções, beats, onde cada headline pousa, o que o visitante sente), e só depois o filme é roteirizado como veículo desses beats. "O gerador nunca sabe que está fazendo um site."

### Respostas diretas ao modelo mental

- **O que é premium.** "Looks and feels like it cost thousands": (a) dirigido: cada movimento de texto ecoa o que a footage faz (echo principle); (b) coerente: paleta amostrada da footage, uma camada de ambiente fixa, o frame final reaproveitado; (c) suave: rAF que descansa, seeks gated, DOM delta-gated; (d) legível no pior frame; (e) completo em todas as condições (sem vídeo, phone, reduced motion); (f) "one signature element" cuja ausência seria notada; (g) nada dá snap. [E SCRUB, SKILL F8]
- **O que é genérico.** Os looks de IA (creme+serifa+terracota, near-black+verde ácido, near-black+âmbar+serifa, brutalismo de hairline), duas seções vizinhas com o mesmo esqueleto, copy de estoque, fade-up igual em tudo, acento em todo lugar, preto/branco puros, loops free-running, elementos flutuando sem motivo, assimetria entre elementos paralelos. [E SCRUB "Design direction", F9 fresh-eyes]
- **Hierarquia narrativa / UI / motion.** Narrativa (premissa + band map) → footage (veículo) → UI (captions no espaço negativo, fora do "action lane") → motion (a serviço do eco; só transform/opacity). O motion nunca é decoração autônoma: "Entrance and footage read as one event, which is what makes the page feel directed instead of decorated." [E SCRUB]
- **Papel do scroll.** O scroll é o eixo do tempo, não um navegador de seções. Progresso 0→1 numa região alta com stage sticky dirige o tempo do vídeo, a opacidade das bandas e a montagem do texto. Descer precisa *parecer* descer (lei 1). Dimensionado em vh. Totalmente reversível. [E SCRUB, LAWS]
- **Continuidade visual.** Um plano contínuo, sem cortes (lei 2); segmentos encadeados com vetor de movimento contínuo (seam law); a página "assenta" exatamente quando o vídeo repousa (lei 4); o frame final vira imagem de design abaixo; uma camada ambiental fixa faz a página inteira ser um lugar. [E]
- **Mídia pré-renderizada.** A câmera 3D vive no vídeo: "The video IS the scroll, so the camera can journey in full 3D". A web não reconstrói o 3D, ela faz scrub. [E SKILL F5] → [I] para WONDERLAND: não reconstruir o Rabbit Hole em Three.js.
- **Como não parecer slideshow.** Transições são footage, não fades; cada banda tem entrada própria que ecoa o frame; entradas são scrubadas (não disparadas por tempo), portanto reversíveis e contínuas; plateau longo + rampas curtas; nada snap. [E SCRUB]
- **Estados intermediários.** Todo valor de progresso é um estado composto válido: opacidade e `--k` são funções puras de `p`; o lerp converge e o vídeo pousa no frame exato; parar no meio é legítimo. [I, derivado do caráter funcional das fórmulas]
- **Mobile.** Static hero por padrão nos 5 gates; é "a designed layout, not a fallback apology". Scrub mobile só se três condições valerem (vídeo < ~8 MB, composição sobrevive ao crop retrato, verificado em phone real). Phones não baixam poster nem vídeo. [E SCRUB]
- **Reduced motion.** É um dos 5 gates; honrado completamente e ao vivo nos dois sentidos; estados finais pinados; vídeo nem é requisitado. [E SCRUB]
- **Performance.** Loop que descansa, seeks gated, DOM só na mudança, vídeo em camada própria, transform/opacity, IO pausa offscreen, body.paused em aba oculta, fontes enxutas, blob com `priority:'low'`, poster vence a corrida de banda, speed receipts medidos. [E]
- **User agency.** Scroll nativo (o skill nunca intercepta wheel, nunca usa scroll-snap, nunca trava o body [I: ausência total desses padrões]); rolar para cima desmonta; o visitante lê no próprio ritmo; "one designed interactive moment" que ele *executa*; player de prova sem autoplay. [E + I]
- **Carregamento.** Página utilizável instantaneamente; poster primeiro; blob depois do poster; anel honesto (bytes reais); watchdog de 20 s; falha vira chevron de scroll. [E SCRUB]
- **Falha de assets.** Página completa sem vídeo; `error` esconde o vídeo morto; testar renomeando o arquivo ou bloqueando a URL; `file://` é um estado projetado. [E]
- **Loops ambientais.** Um elemento vivo por seção, sussurrado, ciclos ≥ 4 s, delays negativos, pausados offscreen e em aba oculta; ambiente ≥ 60 s. [E] Dessincronizar loops com durações diferentes é [B]; o skill só exige delays negativos.
- **QA.** Adversarial, "prove it, don't assume it"; checklist de 12 itens; Chrome headless para testes reais de touch, media e bloqueio; revisores independentes; fresh-eyes por último; relatar o que achou e corrigiu. [E SCRUB]

---

## 3. Princípios fundamentais

1. **Design first, film second** (keystone). [E SKILL F5]
2. **Um mundo só:** paleta, tipo, motion e imagem saem do mundo da footage. [E SCRUB]
3. **Scroll = tempo**, medido em vh, nunca em segundos. [E LAWS 11, SCRUB]
4. **O movimento concorda com o scroll** (descer é descer). [E LAWS 1]
5. **Nunca escrever o scroll bruto no estado de mídia:** alvo + valor exibido + interpolação. [E SCRUB]
6. **Um seek por vez**, coalescido ao mais recente. [E SCRUB]
7. **O DOM só é tocado quando o valor muda.** [E SCRUB]
8. **Texto sobre vídeo ganha sua legibilidade** com 4 camadas e auditoria do pior frame. [E LAWS 10, SCRUB]
9. **Cada beat tem sua personalidade de entrada, que ecoa a footage.** [E SCRUB]
10. **Só transform e opacity.** Filtro nunca animado (blur estático em crossfade). [E SCRUB]
11. **Nada dá snap; tudo tem easing; até a página entra com easing.** [E SCRUB]
12. **Completo sem vídeo; static hero projetado nos 5 gates, decididos ao vivo.** [E SCRUB]
13. **Reduced motion completo, ao vivo, nos dois sentidos, sem quebrar layout.** [E SCRUB]
14. **Loops descansam** (rAF converge, IO offscreen, aba oculta). [E SCRUB]
15. **Um elemento-assinatura; acento raro; ambiente fixo ≥ 60 s.** [E SCRUB]
16. **Copy é um entregável desenhado**, na voz da marca, sem em dash, sem estoque, sem AI tells. [E SKILL F8/F9]
17. **Um momento interativo que o visitante executa**, espelhando a ideia central. [E SCRUB]
18. **Inspeção nos dois sentidos:** achar erros e aproveitar "presentes" da footage, recompondo o layout. [E SKILL F6]
19. **Provar, não presumir:** self-test adversarial, métricas reais, fresh eyes. [E SCRUB, DEPLOY]
20. **Defaults são plataformas de lançamento; desvio dito em voz alta.** [E SKILL]

---

## 4. Arquitetura recomendada

### 4.1 O que o skill prescreve [E SKILL F8, SCRUB]

- Um `index.html` + `assets/`; HTML, CSS e JS vanilla; sem build. (Motivo: deploy de um comando e preview por duplo clique.)
- **Documento:** skip link → `<nav>` → `<main id="main" tabindex="-1">` → hero (trilho alto + stage sticky 100vh com camada poster, `<video>`, scrim global, bandas com `::before`, anel, cue/HUD) → seções reais → `<footer>`.
- **Motor JS:** handler de scroll (só escreve `target`), IO (`heroOnScreen`), tick rAF (lerp dt-normalizado → `requestSeek` + `updateCaptions`), portão de seek, driver de bandas (opacity + `--k`, delta-gated), gates via `matchMedia` (`enableScrub`/`disableScrub`/`applyHeroMode`), `pinToFinalStates`/`unpinFinalStates`, loader (poster → stream blob → `canplay` → `video-ready`), `failVideo`.
- **CSS:** tokens de cor e de easing (2 curvas), classes de entrada `.in` via IO, `body.paused`, bloco reduced-motion, `(pointer:coarse)` para alvos 44px, guardas `max-height`, `overflow-x: clip` em html e body.

### 4.2 Separações de responsabilidade que o skill implica [I]

| Tipo de decisão | Exemplos |
|---|---|
| **Arquitetural** | trilho + stage sticky; vídeo como Blob; gates CSS=JS; motor fora do estado de UI; página completa sem vídeo |
| **Runtime** | lerp dt-normalizado, loop que dorme, seek gating, delta-gating, IO, visibilitychange, gates vivos |
| **Visual** | paleta da footage, type trio, assinatura, scrims, entrada por beat, ambiente fixo |
| **Otimização** | `-g 8`, crf por tipo de footage, fontes enxutas, `priority:'low'`, throttle 10 Hz, camada de compositor |
| **UX** | pacing em vh, plateau, CTA único, momento interativo, nada snap, legibilidade |

### 4.3 Taxonomia A–U

**A. Arquitetura.** Recomendações: trilho alto + stage sticky; motor único; página completa sem vídeo; gates idênticos CSS/JS; raws fora do deploy. Por quê: separar "o que o scroll diz" de "o que se mostra" e garantir que cada modo seja completo. Implementação: container `height: Nvh`, filho `position: sticky; top:0; height:100vh`; um controlador JS. Riscos evitados: hero em branco após rotação; phones baixando vídeo; site quebrado sem vídeo. [E]

**B. Scroll / timeline.** Progresso 0→1; bandas `[a,b]`; plateau 80–130vh; rampas ~20vh; smoothstep; flick test. Por quê: scroll é lido em flicks. Implementação: §5. Riscos: captions que piscam, beats puláveis, texto "pop". [E]

**C. Mídia.** Blob (Range), stream com anel acima de ~8 MB, `preload="none"`, `muted playsinline aria-hidden tabindex=-1`, poster via JS no caminho gated, `-g 8`, crf por família de footage, poster e ending frame. Riscos: scrub morto em produção, primeira impressão congelada, seeks imprecisos. [E]

**D. Animação.** Echo principle; 9 entradas; `--k`; split com RNG semeado; IO + stagger 60–150 ms; retirar delays; 2 curvas de easing; living element ≥ 4 s. Riscos: entradas mortas por cascata, hovers atrasados, aparência de template. [E]

**E. 3D.** Só dentro do vídeo ("the camera can journey in full 3D"). WebGL/Three/CSS 3D: **[N]**.

**F. Interatividade.** Um momento interativo desenhado (press-and-hold como prova), progresso cresce, soltar cedo volta com easing, completar acende conteúdo em sequência, reduced motion recebe estado final. Hover com easing. Riscos: gimmick, snap. [E]

**G. Performance.** §10. [E + N para DPR/WebGL/prefetch]

**H. Loading.** Poster vence a corrida; blob depois; anel honesto; watchdog; chevron em falha; `canplay` → seek para o progresso atual → fade in. [E]

**I. Fallback.** Página completa sem vídeo; static hero projetado; `file://` como estado projetado; "still-image fallbacks carry the full journey" (comentário em `failVideo`). [E]

**J. Responsividade.** 5 gates; guarda de altura curta (`max-height:560px` esconde overlays pequenos); screenshots em 1280×800, 1440×900, 375×812, 375×667; decorações nunca colidem com conteúdo; `ch` no elemento de texto. [E]

**K. Acessibilidade.** Landmarks, skip link, headings reais, `aria-hidden` em decorações e no vídeo, vídeo fora do tab order, `:focus-visible` no acento, alvos 44px em coarse, texto dividido com cópia visually-hidden. [E]

**L. Reduced motion.** §12. [E]

**M. UX.** CTA único; funil; copy nas palavras do comprador; mobile honesto; player sem autoplay; formulário que diz a verdade. [E]

**N. Design system.** Tokens de paleta com papéis (canvas, panel, accent, accent-hover, accent-muted, text-secondary, text-primary); trio tipográfico; 2 curvas de easing; `--tshadow`; nunca Inter/Roboto display; acento raro; nunca `#000/#fff`. [E PKG, SCRUB]

**O. Copy / conteúdo.** Copy verbatim do package; sem em dash; sem leverage/seamless/empower/unlock/robust/actionable/data-driven/solutions; sem "not just X, it's Y", falsos ranges, atribuições vagas, finais genéricos, testament/landscape/delve/elevate; dispositivos deliberados (tríades, staccato) permanecem. [E SKILL F9, PKG]

**P. Analytics.** **[N]**. Nada no ZIP.

**Q. QA / testes.** §15. [E]

**R. Error resilience.** `error` do vídeo, reset do portão de seek, watchdog, página sem vídeo, falha de fetch em `file://`. Fontes, WebGL, JS desligado: **[N]**.

**S. Deployment / runtime.** Hostinger, zip do conteúdo, og absolutos no deploy, HTTPS, speed receipts, teste no aparelho real, re-deploy barato. [E DEPLOY]

**T. Organização de código.** Só o implícito: um arquivo, controle por atributos (`data-ramp`, `data-spread`), classes de estado, "Never overwrite `el.style.transition`". Estrutura de módulos/componentes: **[N]**.

**U. Navegação / rotas.** Barra de navegação exigida; links âncora testados contra overflow lateral. Rotas múltiplas: **[N]** (o skill é one-page).

---

## 5. Scroll system

### 5.1 Estrutura da timeline [E SCRUB]

- Região alta "pinned" com stage sticky de 100vh. `scrollRange = heroHeight − 100vh`. `p = (scrollY − heroTop) / scrollRange`, clampado em [0,1].
- `p` dirige `video.currentTime = p × duration` (ou uma sub-faixa por segmento) e todas as bandas.
- "The page settles exactly when the video reaches its composed resting ending, and the real website begins there."
- Dimensionamento: ~400vh para 6 s, ~1000vh para 18 s.

**Pinned sem hijack [I].** O skill usa `position: sticky` dentro de um container alto; o scroll continua nativo, a barra de rolagem é real, `Home/End/PageDown` funcionam, o usuário pode sair a qualquer momento. Nenhuma linha do ZIP intercepta wheel, usa scroll-snap ou trava `overflow` do body.

### 5.2 Bandas / beats [E SCRUB, PKG]

- Cada caption possui uma banda `[a,b]` de progresso.
- **Plateau totalmente visível de ~80–130vh**, rampas de ~20vh em cada borda. "The plateau is most of the band; the ramps are trim."
- **Opacidade:** `smoothstep(p, a, a+f) × (1 − smoothstep(p, b−f, b))`, com `f = min(0.02, (b−a)/3)`.
- A primeira banda não tem ease-in; a última não tem ease-out (a jornada começa e termina com texto assentado).
- **Montagem `--k`:** `k = clamp((p − a) / (ramp || min(0.025, (b−a)·0.35)), 0, 1)`, isto é, o texto termina de montar ~20vh depois do início da banda e fica assentado o resto do plateau.
- `data-ramp` e `data-spread` no markup ajustam a sensação sem tocar na matemática.

**Snippet smoothstep.** `t = clamp((p−e0)/(e1−e0))`, `t²(3−2t)`: curva S com derivada zero nas pontas, então a opacidade entra e sai sem "degrau". Limitação: com `f` fixo em progresso, rampas crescem em trilhos longos (§1.6).

### 5.3 Mapeamento scroll → progresso exibido [E SCRUB]

```js
shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));   // k = 0.16
```

- `target` é escrito pelo handler de scroll (passivo); `shown` é o que se exibe.
- O expoente `dt/16.667` normaliza para 60 fps: a 120 Hz cada frame aplica ~8.35% e dois frames somam os mesmos 16%. Constante de tempo ≈ 96 ms; ~90% em ~220 ms; ~99% em ~440 ms. [I: cálculo meu]
- `dt` limitado a 100 ms: evita salto enorme ao voltar de aba oculta ou após um stall.
- Converge com `|target − shown| < 0.0005` → `shown = target`, `rafId = null`, `lastTick = 0` (descansa).
- O handler só agenda rAF se o loop está parado e `heroOnScreen` (IO).

### 5.4 Cenários de input

| Cenário | Tratamento | Fonte |
|---|---|---|
| Scroll rápido | lerp suaviza; seek coalescido ao mais recente; flick 360px não pode pular beat | [E] |
| Scroll lento | lerp converge e dorme; DOM só na mudança | [E] |
| Reversão | entradas reversíveis (desmontam), vídeo "toca para trás" via seeks; única exceção é a rampa de carga da banda 1 | [E] |
| Pausa no meio | loop converge, último seek pousa no frame exato, estado é válido | [E/I] |
| Resize | gates via `matchMedia` change; overlays escondidos em `max-height:560px`; recalcular range | [E] gates / [I] range |
| Orientação | gates vivos (tablet portrait→landscape rearma o scrub) | [E] |
| Touch | coarse portrait e landscape curto vão para static; tablet landscape coarse com altura > 560px **recebe scrub** e usa momentum nativo | [E] gates / [I] |
| Wheel | flick test com passos 120/240/360px | [E] |
| Trackpad | não citado; muitos deltas pequenos, o lerp absorve | [N]/[I] |
| Teclado | só "keyboard users land on captions" (vídeo fora do tab order); Space/PageDown saltam ~90vh e o lerp suaviza | [E parcial]/[I] |
| Reduced motion | gate 5 → static hero, sem vídeo | [E] |

### 5.5 Flick test [E SCRUB]

Harness no console: `flick(120,12)`, `flick(240,8)`, `flick(360,6)`, cada um partindo do topo, 400 ms entre passos, logando a opacidade computada de cada `.band`. Critérios: uma banda que nunca chega a opacidade 1 durante o run de 360px é pulável; uma banda que segura opacidade 1 por menos de 5 passos consecutivos de 120px é curta demais. Se falhar: **fundir com a vizinha**, nunca encolher rampas.

---

## 6. Motion system

### 6.1 Entradas de texto [E SCRUB]

**Echo principle:** a entrada de cada beat faz com as palavras o que a footage faz naquele instante. Parte fixa de toda entrada (inclusive inventadas): só transform/opacity, scrubada por `--k`, delta-gated a 0.008, totalmente reversível.

Menu:

| Entrada | Ecoa | Mecânica |
|---|---|---|
| (a) Scatter | tinta juntando, partículas | por caractere; `--th ∈ [0,0.55]` aleatório; `--kc = clamp((k−th)·2.6)`; translate/rotate por `--jx/--jy/--jr` |
| (b) Grid snap-align | alinhamento | como scatter, jitter só horizontal, `--th = i/total·spread + rng·0.06` |
| (c) Blur-to-sharp | névoa clareando, foco chegando | duas cópias; a suave tem `filter: blur(10px)` **estático**; crossfade por opacidade |
| (d) Word-punch | impacto | `scale = 0.6 + (0.4+ov)·kc − ov·ks`; `.em` com overshoot 0.24 |
| (e) Word-by-word rise + settle | chegada em repouso | palavras sobem; subline `(k−0.66)·4`; CTA `(k−0.78)·5` |
| (f) Drift-down | queda, derramamento | `translateY((1−kc)·−24px)`, slope 2.8 |
| (g) Approach-from-depth | túnel, avanço | `scale(0.82 + 0.18·kc)` (+ blur-to-sharp opcional) |
| (h) Halves parting | cortinas | metades com `--jx` de sinais opostos |
| (i) Weave | fios cruzando | scatter vertical com sinal alternado |

Cálculos [I]: no scatter, o último caractere começa em k=0.55 e termina em ~0.935. No word-punch, com `kc=1, ks=0` a escala é `1+ov` (1.12 ou 1.24) e volta a 1 quando `ks=1`.

**Primeira banda abre assentada:** `k = max(scrollK, loadK)`, com `loadK` indo de 0 a 1 por tempo nos primeiros instantes. Única exceção à reversibilidade.

**Split uma vez no load com RNG semeado** (LCG com constantes 1664525/1013904223 da Numerical Recipes): offsets idênticos em todo carregamento, sem "tremor" entre visitas. Estrutura: span visually-hidden com a frase completa + cópia visual `aria-hidden` feita de `.w > .c`.

### 6.2 Motion fora do scroll [E SCRUB]

- **Nothing snaps.** Duas curvas de easing como tokens, usadas em tudo; até a página entra com easing.
- **Entradas por IO** (`.in`), stagger de 60–150 ms. Estados inicial e final prefixados pelo container (`.card .part` / `.card.in .part`) para vencer a cascata. Depois, **retirar** os delays com seletor de especificidade ≥ às regras `:nth-child`, e provar passando o mouse no 2º e 3º itens.
- **Nunca estilo dinâmico em elemento com animação `forwards`** (o valor final vence para sempre). Entrada no pai, dinâmica no filho.
- **Um elemento vivo por seção**, sussurrado, ciclo ≥ 4 s, delays negativos, pausado offscreen e em aba oculta.
- **Glow:** sombra em pseudo-elemento com força total, animar só a opacidade dele.
- **Nunca sobrescrever `el.style.transition`**: alternar uma classe que declara a transição combinada.
- **Descenders:** revelações com `overflow:hidden` recebem padding em em com margem negativa correspondente.

### 6.3 O que o skill NÃO cobre

Follow-through, inércia, secondary motion, física de mola, reação a cursor, parallax, tilt, eventos raros, dessincronização explícita por durações diferentes: **[N]**. Overshoot aparece só no word-punch. Tudo isso vem do briefing [B].

### 6.4 O que NÃO deve ser vinculado ao scroll [E/I]

Loops vivos e ambiente (tempo), hover e micro, rampa de carga da banda 1, entradas por IO das seções abaixo (disparadas e depois temporais), momento interativo (dirigido por hold). **Vinculados ao scroll:** tempo do vídeo, opacidade das bandas, `--k`, linhas SVG que se desenham no scroll, contadores e readouts.

---

## 7. Video / media system

### 7.1 Regra do Range e Blob [E SCRUB, TS]

Muitos hosts não suportam Range; sem ele todo seek volta a 0 e o scrub "não faz nada" em produção enquanto funciona localmente. Solução: baixar o arquivo inteiro como Blob e usar `URL.createObjectURL`. Abaixo de ~8 MB: `fetch → blob → src`.

### 7.2 Loader em stream com anel (acima de ~8 MB) [E SCRUB]

Passo a passo do snippet:

1. `<video preload="none" muted playsinline aria-hidden="true" tabindex="-1">` sem `src`.
2. Anel SVG r=20 → circunferência 2π·20 ≈ 125.66 ≈ **126**; `stroke-dashoffset: var(--ld,126)`; uma única CSS var dirige tudo.
3. **O poster vence a corrida:** pinta o poster; o fetch do blob só começa no `onload`/`onerror` do poster, com timeout de segurança de **4 s**.
4. `fetch(url, {priority:'low', signal})`; `total = Content-Length || VIDEO_BYTES` (tamanho hardcoded como fallback).
5. `reader.read()` em loop; **watchdog de 20 s re-armado a cada chunk** (20 s sem progresso aborta).
6. Anel atualizado com throttle de **100 ms**, mas a escrita terminal (frac=1) sempre acontece.
7. `new Blob(chunks)` → `src` → `load()` → `canplay` (once) → `requestSeek(progress × duration)` e classe `video-ready` (o CSS faz o fade do vídeo sobre o poster).
8. `failVideo()`: substitui o anel por um chevron de scroll honesto e adiciona `video-failed`.

Limitações do snippet [I]: não checa `res.ok` (um 404 viraria blob de HTML e depois `error`); segura chunks e Blob ao mesmo tempo (pico de ~2× o arquivo em memória); nunca chama `URL.revokeObjectURL` ([N]); `failVideo` não é ligado ao `error` do elemento após o blob (isso é feito à parte); o portão de seek não tem timeout próprio.

### 7.3 Seek gating [E SCRUB]

```js
if (seekBusy) { pendingTime = t; return; }  // coalescer: só o mais novo
seekBusy = true; video.currentTime = t;
// 'seeked' → libera e emite exatamente um follow-up com o pendente
// 'error'  → libera e limpa pendente (saída do deadlock)
```

"Under stress this pattern produces one completion per seek and zero overlaps." Se ainda estiver áspero: o intervalo de keyframes é longo → `-g 8 -keyint_min 8`.

### 7.4 Encode para scrub [E FF]

`ffmpeg -i raw.mp4 -c:v libx264 -crf 18 -preset slow -g 8 -keyint_min 8 -pix_fmt yuv420p -movflags +faststart -an out.mp4`

- `-g 8`: keyframe a cada 8 frames (o browser só busca com precisão em keyframes).
- `+faststart`: moov na frente. `-an`: sem áudio.
- Alvo ~4–8 MB por 6 s em 1080p; acima, subir crf para 20–22.
- **Fork de compressão:** footage com detalhe denso mascara artefatos (crf 25–26 + downscale ~1728px); gradientes suaves fazem banding (checar frames calmos). Mudar **uma variável por vez** (crf, depois largura), julgar os piores frames **scrubando**, não pausando. Downscale antes de sacrificar densidade de keyframes.
- **Checagem objetiva de repouso:** `tblend=all_mode=difference,signalstats` → curva YAVG; chegada sobe e volta ao nível inicial; deriva fica alta.
- **Tail trim** em vez de re-roll quando o final não repousa.
- Poster = primeiro frame; ending = `-sseof -0.1`.
- **Verificar após cada encode.**

### 7.5 Outros pontos

- Vídeo decorativo: `aria-hidden`, sem `controls`, fora do tab order (ou `inert` na camada). [E]
- Camada de compositor: `will-change: transform` ou `translateZ(0)` no vídeo. [E]
- Visibilidade de aba para vídeo: [N] (o vídeo nunca está em play; só seeks). Múltiplos vídeos simultâneos: [N]. Limpeza de memória: [N].

---

## 8. Loading

| Momento | Comportamento | Fonte |
|---|---|---|
| First paint | Página inteira utilizável; poster pintado já; nada espera o vídeo | [E] |
| Início do download | depois que o poster carrega/falha, ou 4 s | [E] |
| Progresso | anel honesto por bytes reais, 100 ms | [E] |
| Troca poster → vídeo | em `canplay`, seek para o progresso atual, fade CSS | [E] |
| Esconder loading | anel completa (escrita terminal); some com a troca | [E/I] |
| Erro | chevron de scroll + `video-failed`; página segue como site de stills | [E] |
| Stall | watchdog 20 s sem bytes → abort → fallback | [E] |
| Offline | **[N]**; [I] cai no mesmo caminho de erro do fetch | |
| Loader genérico, tela branca | implicitamente proibidos ("the page is fully usable instantly") | [I] |

---

## 9. Fallback

O fallback não é tela de erro: é **uma experiência paralela completa**. O skill diz "The static hero is a designed layout, not a fallback apology" e "Every caption, every section, and the call to action must work with a still image behind them". O comentário do `failVideo` ("still-image fallbacks carry the full journey") implica que, numa jornada longa, **cada beat precisa do seu still**, não um poster único. [E + I]

Implicações práticas [I]:

- A arquitetura visual existe independente do vídeo: stills, scrims, bandas, entradas e CTA funcionam sobre imagem.
- O mesmo motor de bandas roda no modo "vídeo falhou" (as bandas continuam scrubadas; só a camada de imagem muda).
- `file://` exercita esse estado de graça: é um teste, não um bug.
- O static hero dos gates usa a cópia do "static-hero copy block" do package: headline, subline e CTA escritos para ficarem sobre o poster ou ending frame, sem jornada atrás.

---

## 10. Performance

| Problema | Solução | Custo | Quando | Fonte |
|---|---|---|---|---|
| Loop rAF eterno gasta bateria | loop que dorme ao convergir e offscreen (IO) | trivial | sempre | [E] |
| Sensação diferente por refresh rate | lerp dt-normalizado (`Math.pow`) | trivial | sempre | [E] |
| Salto após aba oculta | `dt` limitado a 100 ms | trivial | sempre | [E] |
| Scrub picotado no Chrome | seek gating coalescido | trivial | sempre com vídeo | [E] |
| Scrub picotado mesmo com gating | `-g 8` | arquivo maior | sempre | [E] |
| Style/layout por frame | delta-gating; textos a 10 Hz e só se mudou | trivial | sempre | [E] |
| Repaint do vídeo arrastando a página | camada própria (`will-change`/`translateZ`) | memória GPU | vídeo scrubado | [E] |
| Primeira impressão congelada | stream com anel, poster primeiro, `priority:'low'` | código | vídeo > 8 MB | [E] |
| Animações offscreen / aba oculta | classe por IO; `body.paused *` em `visibilitychange` | trivial | sempre | [E] |
| Propriedades caras | só transform/opacity; glow por opacidade de pseudo | disciplina | sempre | [E] |
| Fontes pesadas | só os pesos usados + preconnect | trivial | sempre | [E] |
| Imagens | ~1920px, uma passada de compressão (`-q:v 2`) | — | stills | [E] |
| Phones baixando mídia inútil | poster e fetch só no caminho gated | — | sempre | [E] |
| Prova de velocidade | speed receipts medidos (dezenas de KB sem vídeo; load < 1 s) | — | após deploy | [E] |
| `will-change` genérico, DPR, texturas, contextos WebGL, prefetch, lazy loading, `revokeObjectURL` | — | — | — | **[N]** |

---

## 11. Mobile

- **Quando mudar de experiência:** nos 5 gates, decididos ao vivo e idênticos em CSS e JS. [E]
  1. `(max-width: 720px)`
  2. `(orientation: portrait) and (max-width: 1024px)`
  3. `(orientation: portrait) and (pointer: coarse)`
  4. `(orientation: landscape) and (pointer: coarse) and (max-height: 560px)`
  5. `(prefers-reduced-motion: reduce)`
- **Quando remover vídeo:** em qualquer gate; poster e vídeo só existem no caminho gated. [E]
- **Scrub mobile** só se: vídeo < ~8 MB **e** a composição sobrevive ao crop retrato **e** foi verificado em phone real. Senão, static hero "proudly". [E]
- **WebGL:** [N].
- **Layout:** o static hero é um layout projetado (poster ou ending frame + captions visíveis). [E]
- **Telas curtas com scrub** (desktop baixo): manter scrub, esconder overlays pequenos (`max-height:560px`). [E]
- **Touch:** alvos ≥ 44px em `(pointer:coarse)` sem mudar layout (re-declarar alinhamento ao trocar display). [E]
- **Comunicação:** a diferença phone/desktop é dita no conceito, como fato de design. [E]

---

## 12. Reduced motion

- **Detecção:** `matchMedia('(prefers-reduced-motion: reduce)')`, parte dos 5 gates. [E]
- **Ao vivo, nos dois sentidos:** listener de `change`. Entrando: `pinToFinalStates()` (linhas desenhadas, contadores no alvo, holds completos, drivers parados). Saindo: `applyHeroMode()` rearma o scrub pelo mesmo gate, **resetando caches** (`op=-1, k=-1`) e **desfazendo os pins** (`unpinFinalStates`). "Re-arming the hero while leaving the rest of the page pinned is the half-fix that looks done and is not." [E]
- **O que para:** animações e transições em elementos e pseudo-elementos; todo `transition-delay` zerado; vídeo nem é requisitado; drivers JS. [E]
- **O que continua:** conteúdo completo, estados finais visíveis; momento interativo entregue no estado final sem hold. [E]
- **Preservar composição:** reaplicar transforms posicionais por breakpoint dentro do bloco reduced-motion; nunca `transform: none !important` cego. [E]
- **Mídia:** nenhum download de vídeo nem poster de scrub (o static hero usa sua imagem própria). [E]

---

## 13. Acessibilidade

| Item | Implementação | Fonte |
|---|---|---|
| Landmarks | `<nav>`, `<main id="main" tabindex="-1">`, `<footer>` | [E] |
| Skip link | para `#main` | [E] |
| Headings | hierarquia real | [E] |
| Decorações | `aria-hidden="true"` | [E] |
| Vídeo | `aria-hidden`, sem controls, `tabindex="-1"` ou `inert` na camada | [E] |
| Texto dividido | span visually-hidden com a frase + cópia visual `aria-hidden` | [E] |
| Foco | `:focus-visible` no acento | [E] |
| Alvos touch | ≥ 44px em coarse | [E] |
| Contraste | 4.5:1 corpo; 3:1 texto grande e bordas de UI; 3.5:1 pior pixel sobre vídeo | [E] |
| Bordas interativas | cor própria mais forte que hairline | [E] |
| Movimento | reduced motion completo | [E] |
| Player de prova | sem autoplay, inicia sob pedido, respeita reduced motion | [E] |
| Hotspots, cursor customizado, anúncios ARIA live | **[N]** | |

---

## 14. UX

- **Um CTA** e tudo funil para ele. [E]
- **Copy nas palavras do público**; herói em primeira pessoa quando o sujeito é uma pessoa. [E]
- **Trust furniture** (prova, passos, objeções, formulário único): contexto comercial. [E, contextual]
- **Formulário honesto** sobre para onde vai a mensagem. [E]
- **Leitura no próprio ritmo:** plateau longo, sem precisar parar. [E]
- **Momento interativo** executado pelo visitante; completar "ganha" algo real. [E]
- **Nenhuma surpresa desagradável:** sem autoplay com som, tudo com easing, nada pula. [E]
- **Nav bar e footer** reais. [E]
- **Fresh eyes:** nada flutua sem explicação; elementos paralelos iguais. [E]

---

## 15. QA

Checklist explícito (12 itens) [E SCRUB], organizado por tipo:

| Tipo | Testes |
|---|---|
| Visual | screenshots em 1280×800, 1440×900, 375×812, 375×667; caudas de g/y/p a 100% de zoom; fresh-eyes; elementos paralelos iguais |
| Interação | todo botão e link; formulário e estado de resposta; entradas realmente tocam (cascata); hovers dos irmãos após stagger; press-and-hold real (mouse down/up com intervalo) |
| Scroll | scrub no topo, meio e fundo; scrub rápido; flick 120/240/360 |
| Vídeo | choppiness no Chrome; vídeo ausente (renomear ou `Network.setBlockedURLs`); scrub no host real (Range) |
| Mobile | gates com touch emulation real (`pointer: coarse` só casa assim); phone do usuário na rede real |
| Acessibilidade | landmarks, foco, vídeo fora do tab order [I para o teste; E para a regra] |
| Performance | speed receipts; loops descansam [I para o teste] |
| Erro | console zerado em desktop e phone; vídeo ausente |
| Resize | forçar overflow lateral (âncoras, decorações largas, larguras estreitas); rotação [E regra/I teste] |
| Reduced motion | antes do load e **ligado com a página aberta**; nenhum request de vídeo |
| Navegação | links âncora não deslocam a página lateralmente |
| Analytics | **[N]** |

Pontos de método [E]: "Prove it, don't assume it"; screenshots de camada promovida podem sair em branco (verificar pelo DOM: `--k`, opacidades, `currentTime`); painel de preview oculto congela rAF (usar Chrome headless via CDP); revisores independentes se houver; relatar o que achou e corrigiu.

Cenários do briefing não citados no ZIP: recarregar no meio [N], aba em background [E parcial via body.paused], assets lentos [E via watchdog], zoom 125/150% [N], keyboard-only [N], ultrawide [N].

---

## 16. Anti-patterns (o que o skill não quer que você faça)

| Anti-pattern | Fonte |
|---|---|
| Escrever scroll direto em `currentTime` | SCRUB |
| Seeks sobrepostos | SCRUB, TS |
| Loop rAF rodando desde o load | SCRUB ("marks the build as amateur") |
| Lerp com constante por frame | SCRUB |
| Mexer no DOM a cada frame; alternar classe todo frame | SCRUB |
| `await fetch().blob()` sem feedback em arquivo grande | SCRUB |
| Anel travado para sempre (sem watchdog) | SCRUB |
| Poster no HTML (phones baixam) | TS |
| Gates diferentes entre CSS e JS; gate decidido uma vez | SCRUB, TS |
| Página quebrada sem vídeo | SCRUB, TS |
| Pacing em segundos; testar arrastando devagar; encolher rampas para caber | LAWS, SCRUB |
| Checar contraste no frame médio | LAWS, SCRUB |
| Um scrim só esticado sobre sujeito centralizado | SCRUB |
| Text-shadow em botões | SCRUB |
| Animar `filter` | SCRUB |
| A mesma entrada em tudo; entrada que não ecoa a footage | SCRUB |
| Estilo dinâmico em elemento com `forwards` | SCRUB, TS |
| Delays positivos em loops | TS |
| Pausar animação no container (não herda) | SCRUB, TS |
| Sobrescrever `el.style.transition` | SCRUB, TS |
| `transform: none !important` global no reduced motion | SCRUB, TS |
| `overflow-x: hidden` sozinho | SCRUB, TS |
| Texto com clip sem espaço para descenders | SCRUB, TS |
| `ch` no container | SCRUB |
| Duas seções vizinhas com o mesmo esqueleto | SCRUB |
| Acento em todo lugar; `#000`/`#fff` | SCRUB |
| Looks de IA por reflexo | SCRUB |
| Inter/Roboto como display | SKILL, SCRUB |
| Em dash; palavras de estoque; AI tells | SKILL F9 |
| Autoplay no player de prova | SKILL F8 |
| Decoração colidindo com conteúdo | SCRUB |
| Raws/review na pasta de deploy | FF, DEPLOY |
| Find-and-replace por shell em UTF-8 | DEPLOY, TS |
| Terceira chamada num subsistema travado | TS |
| Assumir que "done" do usuário é verificação | SKILL, TS |

---

## 17. Ordem operacional

### 17.1 A ordem real do skill [E]

| Fase | Objetivo | Inputs | Decisões | Implementação | Validação | Avança quando |
|---|---|---|---|---|---|---|
| 1 Setup | ferramentas prontas | máquina | nenhuma criativa | scan, instalar, conectar | verificar cada item | checklist todo ✓ |
| 2 Conversa | entender sujeito e sentimento | usuário | ramo de visuais, assets | perguntas clicáveis | respostas | 4 respostas |
| 3 Pesquisa + proposta | linguagem real, CTA único, conceitos | reviews, fóruns | conceito, marca, paleta, tipo, layout pela composição | proposta | usuário escolhe | conceito escolhido |
| 4 Tier | escopo | conceito | Tier 1/2/3 | — | — | tier dito |
| 5 Design package | página primeiro, filme depois | tudo acima | band map, copy, vector plan, engineering list | documento PKG | aprovação do storyboard | aprovado |
| 6 Geração | frame + vídeo com gates | package | modelo, custo | gerar, inspecionar | **video gate** | aprovado pelo usuário |
| 7 Processamento | mídia web | vídeo aprovado | crf/largura | FF | verificar encode | arquivos ok |
| 8 Build | site | package + assets | entradas, living elements, form | SCRUB | — | construído |
| 9 Self-test | provar | build | correções | checklist, copy gate, fresh eyes | tudo passa | só então mostrar |
| 10 Deploy | live | site | domínio | DEPLOY | live checado + receipts + aparelho real | usuário confirma |
| 11 Polish | refinar | feedback | — | estrutura → polish → motion | re-verificar live | usuário satisfeito |

Ordem interna do polish: **estrutura primeiro, depois polish (alinhamento, clipping, imagem), depois motion.** [E SKILL F11]

### 17.2 Ordem adaptada a WONDERLAND [I + B]

Os assets já passaram pelo "video gate" do usuário, então as Fases 1–4 e 6 colapsam. O que sobra, em ordem:

1. **Inspeção** (repo, assets, correspondência FT ↔ VD, início/fim de cada vídeo, alinhamento de enquadramento FT vs. vídeo).
2. **Design package a partir dos assets** (band map com ranges em vh, copy verbatim, entradas por beat, static copy, vector plan, engineering list).
3. **Processamento** (encode de scrub `-g 8` em cópias, posters, stills web; originais intocados).
4. **Esqueleto** (tokens, fontes, layout, nav, rotas, página completa sem JS).
5. **Motor** (progresso, lerp, seek gating, delta-gating, gates vivos).
6. **Pipeline de mídia** (poster-first, stream blob por segmento, anel, falha).
7. **Bandas e coreografia** (legibilidade de 4 camadas, entradas por beat).
8. **Crossroads e rotas** (momento interativo).
9. **Static mode e reduced motion** (layouts projetados, ao vivo).
10. **Vida ambiental** (loops, partículas, grain, eventos raros).
11. **Performance** (sono dos loops, IO, visibilidade).
12. **QA adversarial** (checklist completo + flick + worst-frame + headless).
13. **Fresh-eyes pass** e correções.

---

## 18. Matriz conceito → implementação

| Conceito do skill | O que significa | Como implementar |
|---|---|---|
| Keystone | a página decide o filme | band map antes do código; cada beat de texto amarrado a um momento da footage |
| Trilho + stage sticky | scroll é tempo, não seções | container `Nvh` + stage `sticky` 100vh; `p = (scrollY−top)/(H−vh)` |
| Blob (Range) | seek não pode depender do host | `fetch` → Blob → objectURL |
| Stream + anel | nunca congelar a 1ª impressão | `getReader()`, bytes/total, `--ld`, 100 ms, watchdog 20 s |
| Poster first | visual imediato | poster pintado antes; blob após `onload/onerror` ou 4 s; troca em `canplay` + seek ao progresso atual |
| Smooth scrub | scroll bruto não escreve em mídia | `target`/`shown`, lerp dt-normalizado, dt ≤ 100 ms |
| Loop que descansa | rAF só quando há diferença | `|Δ| < 0.0005` → para; IO desliga offscreen; handler religa |
| Seek gating | um seek por vez | `seekBusy` + `pendingTime` coalescido + 1 follow-up + reset em `error` |
| Delta-gated writes | DOM só na mudança | caches por banda (`op`, `k`), limiar 0.008, labels a 10 Hz |
| Banda | caption dona de `[a,b]` | smoothstep nas bordas, plateau longo, 1ª sem ease-in, última sem ease-out |
| `--k` | progresso de montagem 0→1 | `clamp((p−a)/ramp)`; CSS lê `--k` para transform/opacity |
| Echo principle | a entrada imita a footage | escolher/inventar entrada pelo que o frame faz |
| Primeira banda assentada | nada de hero vazio no load | `k = max(scrollK, loadK)` |
| Split semeado | aleatório determinístico | LCG com seed; `--th/--jx/--jy/--jr` por span |
| Blur-to-sharp | foco sem animar filter | duas cópias, blur estático, crossfade |
| Legibilidade 4 camadas | texto sobre vídeo ganha contraste | vinheta global + scrim por banda (`::before`, sobe com `--k`) + `--tshadow` + chip |
| Worst-frame | o pior frame manda | amostrar pixels com scrim aplicado; ≥ 3.5:1 |
| Flick test | validar pacing real | `scrollBy` 120/240/360 + log de opacidade |
| 5 gates vivos | static hero correto sempre | listas `matchMedia` com `change` → `applyHeroMode` |
| Static hero projetado | mobile completo e bonito | imagem composta + copy do static block; nenhum vídeo |
| Completo sem vídeo | falha é invisível | `video-failed`: stills carregam a jornada; testar bloqueando a URL |
| Reduced motion ao vivo | preferência muda com página aberta | `pinToFinalStates` / `applyHeroMode` + `unpinFinalStates` |
| Nothing snaps | tudo com easing | 2 curvas-token; transições em todos os estados |
| Living element | cada seção respira | loop ≥ 4 s, delay negativo, IO + `body.paused` |
| Ambiente fixo | página = lugar | camada fixa com drift/grain/glow, ciclo ≥ 60 s |
| Momento interativo | o visitante executa a ideia | progresso sob ação, volta com easing, completa acendendo conteúdo |
| Assinatura | um elemento cuja ausência se nota | concentrar ousadia num lugar |
| Acento raro | acento é exceção | CTA, foco, 1–2 ênfases |
| Copy gate | voz sem estoque | grep de em dash e palavras; varredura de AI tells |
| `-g 8` | seek preciso | encode com keyint 8 |
| Checagem de repouso | final medido | `tblend` + `signalstats` YAVG |
| Fresh eyes | olhar de visitante | por último, fora do checklist |

---

## 19. Matriz risco → sintoma → causa → mitigação

| Risco | Sintoma | Causa | Mitigação segundo o skill |
|---|---|---|---|
| Scrub morto em produção | funciona local, não no host | host sem Range | Blob |
| Vídeo engasga | saltos, picote no Chrome | seek spam + DOM por frame | seek gating + delta-gating |
| Ainda engasga | picote residual | GOP longo | `-g 8 -keyint_min 8` |
| Scrub congela para sempre | para no meio | `seekBusy` travado após erro | reset no `error` |
| Primeira impressão congelada | nada acontece no load | blob grande sem stream | stream + anel + poster primeiro |
| Anel travado | anel parado eternamente | stream pendurado | watchdog 20 s → fallback |
| Phones baixam vídeo | dados gastos à toa | poster no HTML / load fora do gate | poster via JS no caminho gated |
| Static no desktop / vídeo no phone | modo errado | gates diferentes CSS × JS | strings idênticas |
| Hero em branco após rotação | stage vazio | gate decidido uma vez | listeners `change` nos 5 gates |
| Site quebrado sem vídeo | buracos | sem caminho de erro | `error` → esconder vídeo, stills |
| Texto ilegível | some em alguns frames | contraste medido no frame médio | worst-frame + scrim local mais forte |
| Texto pisca | aparece e some entre flicks | banda curta / pacing em segundos | plateau 80–130vh, flick test, fundir beats |
| Beat pulável | nunca atinge opacidade 1 a 360px | banda estreita | fundir com vizinha |
| Hero sem texto no load | footage sem palavras em p=0 | `--k=0` na banda 1 | rampa de carga `max(scrollK, loadK)` |
| Entrada nunca toca | elemento só aparece | cascata venceu o estado inicial | prefixar com container; provar |
| Hover atrasado | 2º/3º itens lentos | delays do stagger não retirados | seletor de limpeza com especificidade ≥ |
| Estilo dinâmico morto | para de responder | `forwards` | entrada no pai, dinâmico no filho |
| Loop pisca no início | salto visível | delay positivo | delays negativos |
| Pausa não pausa | animações seguem | `animation-play-state` não herda | `body.paused *, ::before, ::after` |
| Hovers dão snap | transição perdida | JS sobrescreveu `style.transition` | alternar classe |
| Elemento fora da tela em RM | sumiu no mobile | `transform:none` global | reaplicar transforms por breakpoint |
| Página arrasta de lado | scroll horizontal | `overflow-x: hidden` só | `clip` em html e body, `hidden` antes |
| Descenders cortados | g/y/p sem cauda | máscara sem folga | padding em em + margem negativa |
| Headline quebra errado | 3 linhas | `ch` no container | `ch` no próprio elemento |
| Loop óbvio | parece GIF | mesmo período/fase | [E] delays negativos; [B] durações diferentes + eventos raros |
| Screenshot branco | stage vazio no preview | camada promovida não compõe | verificar via DOM ou Chrome real |
| Preview morto | rAF parado | painel oculto | Chrome headless via CDP |
| Look de IA | "parece template" | paleta/estrutura por reflexo | direção única, assinatura, esqueletos distintos |
| Copy corporativa | "seamless", em dash | deriva de geração longa | grep gate + varredura de tells |
| Mojibake | caracteres corrompidos | shell com encoding errado | editar com ferramenta; recuperar 1252→UTF-8 |
| og quebrado | preview sem imagem | URL não absoluta | `<!-- DEPLOY STEP -->` patch no deploy |

---

## 20. Checklist operacional (derivado do skill)

**ANTES DE CODAR**
- [ ] Ler o skill inteiro e todas as referências.
- [ ] Inspecionar todos os assets; extrair início/meio/fim de cada vídeo; checar repouso do final.
- [ ] Escrever o design package: premissa, tokens, trio, band map (range, momento, copy verbatim, entrada), static copy, vector plan, engineering list, copy gate.
- [ ] Planejar o layout pela composição (action lane livre, texto no espaço calmo).
- [ ] Decidir: o que é assinatura; qual é o momento interativo; onde o acento aparece.

**IMPLEMENTAÇÃO BASE**
- [ ] Landmarks, skip link, headings, `main#main[tabindex=-1]`.
- [ ] Tokens de cor (nunca #000/#fff), 2 curvas de easing, `--tshadow`.
- [ ] Fontes só nos pesos usados.
- [ ] `overflow-x: hidden; overflow-x: clip` em html e body.
- [ ] Página completa sem JS de vídeo.

**MÍDIA**
- [ ] Encode `-g 8`, `+faststart`, `-an`, crf por família.
- [ ] Vídeo `preload=none muted playsinline aria-hidden tabindex=-1`, sem src.
- [ ] Poster primeiro; stream blob com anel e watchdog; `canplay` → seek ao progresso → fade.
- [ ] Falha → chevron + stills.

**SCROLL**
- [ ] Trilho alto + stage sticky; progresso normalizado.
- [ ] Lerp dt-normalizado, dt ≤ 100 ms, loop que dorme, IO.
- [ ] Seek gating coalescido com reset em erro.
- [ ] Bandas com plateau longo, smoothstep, 1ª/última sem rampa externa.
- [ ] Rampas calculadas em vh.

**MOTION**
- [ ] Entrada única por beat, ecoando a footage; só transform/opacity; reversível.
- [ ] Banda 1 com rampa de carga.
- [ ] Split com RNG semeado + cópia acessível.
- [ ] IO + stagger, delays retirados, nada com `forwards` + dinâmico.
- [ ] Living elements ≥ 4 s, delays negativos; ambiente ≥ 60 s.

**MOBILE**
- [ ] 5 gates idênticos CSS/JS, vivos.
- [ ] Static hero projetado; nenhum vídeo baixado.
- [ ] Alvos 44px em coarse; overlays escondidos em `max-height:560px`.

**A11Y**
- [ ] `:focus-visible` no acento; decorações `aria-hidden`.
- [ ] Contraste calculado (4.5 / 3 / 3.5 pior pixel).

**PERFORMANCE**
- [ ] DOM delta-gated; labels 10 Hz.
- [ ] Vídeo em camada própria.
- [ ] `body.paused` em aba oculta; IO offscreen.

**QA**
- [ ] 4 viewports; botões e links; scrub topo/meio/fundo e rápido.
- [ ] Flick 120/240/360; worst-frame por banda.
- [ ] Entradas provadas; overflow forçado; reduced motion antes e durante.
- [ ] Vídeo bloqueado; console zerado; descenders.
- [ ] Copy gate (grep) + tells.
- [ ] Fresh eyes.

**DONE CRITERIA**
- [ ] Jornada suave; toda palavra legível; CTA claro.
- [ ] Funciona em phone real.
- [ ] Velocidade medida.
- [ ] O dono diz que ficou como imaginou.

---

## 21. Classificação hard / soft / heuristic / optimization / anti-pattern

| Regra | Classe |
|---|---|
| Blob para o vídeo de scrub | **HARD** |
| Seek gating com reset em erro | **HARD** |
| Nunca escrever scroll direto em `currentTime` | **HARD** |
| Loop rAF que descansa | **HARD** |
| DOM delta-gated | **HARD** |
| Página completa sem vídeo | **HARD** |
| 5 gates idênticos e vivos | **HARD** |
| Poster/vídeo só no caminho gated | **HARD** |
| Reduced motion completo, ao vivo, nos dois sentidos | **HARD** |
| Legibilidade 4 camadas + worst-frame ≥ 3.5 | **HARD** |
| Pacing em vh + flick test | **HARD** |
| Só transform/opacity; não animar filter | **HARD** |
| Landmarks, skip link, foco, vídeo aria-hidden fora do tab | **HARD** |
| `overflow-x: clip` em html e body | **HARD** |
| Sem em dash / palavras de estoque (copy gate) | **HARD** |
| Nunca #000/#fff; nunca Inter/Roboto display | **HARD** |
| Nada snap | **HARD** |
| Video gate / storyboard gate / self-test antes de mostrar | **HARD** (GATE) |
| Stream com anel acima de ~8 MB | **HARD** (limiar soft) |
| Static hero no mobile | **SOFT** (default forte; scrub mobile com 3 condições) |
| Tier 1 como início | **SOFT** |
| Uma única página, vanilla, sem build | **SOFT** fora do público iniciante |
| Trust furniture, formulário, pricing | **SOFT** (comercial) |
| Um momento interativo; press-and-hold | **SOFT** (forma livre) |
| Assinatura única; acento raro; ambiente fixo | **HEURISTIC** forte |
| Esqueletos distintos em seções vizinhas | **HEURISTIC** |
| Echo principle e o menu de entradas | **HEURISTIC** (menu aberto) |
| k = 0.16; plateau 80–130vh; rampa 20vh; 400vh/6 s | **HEURISTIC** (números de partida) |
| Peak alpha 0.62–0.72 | **HEURISTIC** |
| Stagger 60–150 ms; ciclos ≥ 4 s; ambiente ≥ 60 s | **HEURISTIC** |
| `-g 8` | **OPTIMIZATION** (quase hard para scrub) |
| crf/downscale por família | **OPTIMIZATION** |
| `priority:'low'`, throttle 100 ms / 10 Hz | **OPTIMIZATION** |
| Camada de compositor no vídeo | **OPTIMIZATION** |
| Fontes trimadas + preconnect | **OPTIMIZATION** |
| Stills 1920px uma passada | **OPTIMIZATION** |
| Looks de IA por reflexo | **ANTI-PATTERN** |
| Scrub linear sem lerp; seeks sobrepostos; loops eternos | **ANTI-PATTERN** |
| `forwards` + dinâmico; `style.transition` via JS; delay positivo | **ANTI-PATTERN** |

---

## 22. Pontos que exigem decisão de projeto (WONDERLAND)

1. **Stack.** Skill: vanilla sem build. Briefing: Next.js + React + TS + GSAP. O briefing tem prioridade [B]. Síntese [I]: Next.js com `output: 'export'` (arquivos estáticos, sem backend, deploy em qualquer host), o que preserva a razão do skill.
2. **Um vídeo concatenado vs. cinco vídeos separados.** Concatenar (Tier 2) obrigaria baixar dezenas de MB antes do primeiro scrub. Separar permite carregar em sequência, cada transição com seu fallback de stills. Recomendação: separados.
3. **Re-encode `-g 8`.** Não é regenerar mídia: mesmo conteúdo, só o intervalo de keyframes. Os originais ficam intocados; as cópias web vão para `public/`.
4. **Comprimento do trilho e band map.** Ranges em vh por beat, validados pelo flick test.
5. **Correspondência FT ↔ VD** (sobretudo VD4/VD5) e **alinhamento de enquadramento**: frames e vídeos têm proporções levemente diferentes (FT ≈ 1.79–1.83, vídeo 1.78); é preciso medir para que a troca still ↔ vídeo não salte.
6. **3D.** O skill só conhece o 3D dentro do vídeo. Uso de CSS 3D/WebGL precisa justificar benefício real [B].
7. **Scrims tingidos** para a cor do canvas (não o `rgba(5,5,10)` neutro).
8. **Chip sem glassmorphism** (sem backdrop-filter).
9. **Em dash no copy aprovado** (FT2, FT3, FT5): o briefing proíbe em dash e manda preservar o copy. Trocar só a pontuação (dois-pontos ou ponto), mantendo as palavras.
10. **Eventos `quiz_interaction` e `conversion_submit`** sem UI definida no briefing: expor na API, não inventar quiz nem formulário.
11. **Conteúdo do ABOUT** não fornecido: texto mínimo, factual, derivado do conceito aprovado.
12. **Destino dos CTAs dos paths** (KEEP FOLLOWING / JOIN THE TABLE / LOOK CLOSER): ação dentro da cena, sem páginas inventadas.
13. **Crossroads no mobile:** hotspots físicos precisam continuar ≥ 44px num frame 16:9 em tela retrato.
14. **Momento interativo** do skill = a escolha no Crossroads (execução da ideia central: escolher).

---

## 23. Pontos que NÃO devem ser aplicados cegamente

- **Pipeline de três ferramentas, wizard, links de parceiro, perguntas clicáveis a cada passo, fidelidade ao tutorial.** Pertencem ao produto "tutorial"; aqui os assets já existem e o usuário concedeu autonomia.
- **"One index.html, no framework."** Razão válida para iniciantes; aqui a stack foi definida.
- **Trust furniture de conversão** (pricing, FAQ, depoimentos, formulário): WONDERLAND é narrativa; o "CTA único" vira a escolha do caminho.
- **Pesquisa de linguagem de compradores.** Não há compradores; o copy já foi aprovado.
- **Banimento do look near-black + âmbar + serifa.** Aqui é o mundo do sujeito e está briefado; aplica-se o carve-out, com a obrigação de merecê-lo.
- **Números de rampa calibrados em 900vh**; "400vh por 6 s". Recalcular para o trilho real.
- **Cores de scrim `rgba(5,5,10)`/`rgba(10,10,18)`.** Tingir para a paleta.
- **Chip com `backdrop-filter`.** Conflita com o banimento de glassmorphism e custa GPU sobre vídeo.
- **Concat Tier 2 num arquivo único.** Pior para carregamento progressivo de 5 vídeos.
- **Deploy Hostinger, patch de og por Hostinger.** Deploy não foi pedido; og com URL absoluta via `metadataBase` configurável.
- **Disclosure de marca fictícia.** Não se aplica; o equivalente honesto é o crédito a Lewis Carroll.
- **Press-and-hold** como forma do momento interativo: é exemplo, não lei.

---

## 24. Conclusão: como pensar segundo o 10k-websites-skill

1. **Comece pelo fim e pela página.** Onde a jornada repousa, onde cada frase pousa, o que o visitante sente em cada beat. A mídia é o veículo.
2. **Trate o scroll como tempo físico.** Uma região alta, um stage fixo, um número 0→1 e tudo derivado dele por funções puras, reversíveis, com easing.
3. **Separe intenção de exibição.** O scroll diz o alvo; um loop dt-normalizado exibe; a mídia recebe um seek por vez; o DOM só é tocado quando muda.
4. **Pague a legibilidade no pior frame**, localmente, sem apagar a imagem.
5. **Faça cada beat ter personalidade**, e que ela ecoe o que a imagem está fazendo.
6. **Projete cada modo como completo:** com vídeo, sem vídeo, phone, reduced motion. Nenhum é pedido de desculpas.
7. **Deixe tudo dormir** quando não está sendo visto.
8. **Prove tudo** com testes adversariais e olhos frescos antes de mostrar a alguém.
9. **Números são pontos de partida; padrões de engenharia são piso.** Desvie quando o projeto pedir e diga por quê.
