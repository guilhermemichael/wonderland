# WONDERLAND · decisões de implementação

Cada decisão abaixo se apoia no briefing, nos assets aprovados ou no `10k-websites-skill` (relatório em [10k-websites-skill-relatorio.md](10k-websites-skill-relatorio.md)).

## 1. Os assets vieram com a interface impressa

**O que encontrei.** Os oito frames e os cinco vídeos aprovados são comps de tela inteira: a UI está dentro da imagem (nav, títulos, parágrafos, telemetria, indicadores). Além disso havia artefatos de geração (asteriscos em `**O CHÃO DEIXA DE IMPORTAR**`, telemetria duplicada no FT3, o texto de prompt "Small faded telemetries / Six distinct planes of depth" no FT4, "FRAME 05" no FT5) e, no FT5/VD5, **olhos e sorriso flutuantes do Cheshire**, que o briefing proíbe explicitamente (§24, §30). Nos vídeos, o texto impresso aparece deformado ("DESCOINNCOON", "TIMEE: JNSTAVEL").

**Decisão.** Gerar *clean plates* derivados: remover localmente só essa camada impressa (e os elementos proibidos), mantendo cena, personagem, luz e composição intactos, e reconstruir a interface como HTML real nas mesmas posições do comp.

**Por quê.** O briefing manda preservar os assets (§0) mas também exige texto vivo com entradas por capítulo (§32), sistema de legibilidade (§31), nav (§34), acessibilidade (§42), responsividade (§43) e proíbe olhos/sorriso flutuantes (§24, §30). Na hierarquia do próprio briefing, restrição explícita e briefing vêm antes do asset. Nada é gerado: a remoção usa inpainting local do OpenCV e o próprio plate limpo como remendo. Os originais na raiz continuam intocados e fora do deploy.

## 2. Correspondência real dos vídeos

O briefing supunha VD1 = FT1→FT2. Na inspeção, **VD1 é o Threshold vivo** (câmera parada, cartas, coelho, portal acendendo) e as transições são VD2 (FT1→FT2), VD3, VD4 e VD5. Usei VD1 como o beat de "atração" no começo da jornada: as primeiras rolagens acordam o mundo antes da queda, o que atende a premissa convite → curiosidade → atração → queda (§2) sem inventar mídia.

## 3. Stack e arquitetura

Next.js 16 + React 19 + TypeScript com **export estático** (`output: "export"`). Isso respeita a stack do briefing (§3) e preserva a razão do skill para "sem build/sem backend": o resultado é um diretório de arquivos estáticos que roda em qualquer host. GSAP entra onde ganha: descida guiada do CTA (interrompível), parallax de ponteiro, avanço de câmera nas páginas dos caminhos e véu de rota. O núcleo do scrub é próprio, seguindo o padrão do skill (alvo/exibido, lerp normalizado por delta-time que dorme, portão de seek coalescido, escrita delta-gated).

**Three.js ficou de fora.** A câmera 3D já está dentro dos vídeos aprovados; recriá-la em WebGL duplicaria o que existe e custaria performance. A profundidade vem de camadas com parallax, máscaras do próprio plate e partículas em canvas 2D (§3 do briefing: 3D só onde traz benefício real).

## 4. Um vídeo por transição, não um arquivo concatenado

O skill concatena segmentos num único filme (Tier 2). Aqui isso obrigaria baixar ~50 MB antes do primeiro scrub. Mantive cinco arquivos com carregamento em sequência priorizado pela posição do leitor, cada transição com seu fallback de stills.

## 5. Ritmo e âncoras de texto

Trilho de 3235vh. Em vez de inventar as bordas das bandas, medi em que frames a interface impressa entrava e saía dentro de cada vídeo aprovado (`scripts/media/text_alpha.py`) e ancorei ali a entrada e a saída do texto vivo. O texto de cada capítulo, portanto, nasce e se despede exatamente nos momentos que a direção dos vídeos já definia, e cobre a área reconstruída enquanto a câmera se move.

## 6. Em dash no copy aprovado

O copy aprovado trazia três travessões e o briefing (§44) proíbe em dash. Troquei apenas a pontuação (dois-pontos ou ponto), sem mexer nas palavras.

## 7. Texto visível sem depender do JS

No modo estático, o texto nasce visível; só os capítulos abaixo da dobra seguram a entrada. Nas páginas dos caminhos, a entrada é uma animação CSS que começa no primeiro paint. Assim, script lento, script ausente ou reduced motion nunca deixam a página com imagem e sem palavras.

## 8. Cursor, grain e ambiente

O cursor do sistema nunca é escondido: em ponteiros finos aparece apenas um rótulo contextual (DESCEND, FOLLOW, CHOOSE, LOOK) sobre elementos interativos. O grain é sutil e some em reduced motion. A camada de luz ambiente muda de temperatura conforme o capítulo (§46) e pausa com a aba oculta.

## 9. Eventos de analytics sem interface definida

`quiz_interaction` e `conversion_submit` fazem parte do funil do briefing (§47), mas o briefing não define quiz nem formulário. Estão tipados e prontos na API de analytics; não são disparados, porque disparar exigiria inventar uma interface que ninguém aprovou.

## 10. Conteúdo do ABOUT e microcopy

A nav exige ABOUT (§34) e o briefing não fornece esse texto. O rodapé usa apenas o que já está aprovado (nome, tagline, a premissa "não é uma página para ser lida, é um lugar para ser atravessado") mais o crédito a Lewis Carroll. Microcopy de navegação criada: "THE CROSSROADS", "STEP BACK", "BACK TO THE THRESHOLD", "Pular para o conteúdo" e a linha do 404.

## 11. CTAs dos caminhos

"KEEP FOLLOWING", "JOIN THE TABLE" e "LOOK CLOSER" encenam a ideia de cada caminho dentro da própria cena: a câmera avança no frame aprovado (porta ao fundo no Rabbit, a cadeira "YOU'RE LATE" no Hatter, o arco com a sombra e a placa no Cheshire), o cenário responde e um "STEP BACK" devolve o leitor. Nenhuma página nova foi inventada.

## 12. Look "near-black + âmbar + serifa"

O skill bane essa combinação como reflexo de IA, com uma ressalva: vale quando é o mundo real do assunto e foi briefada. É o caso. O acento dourado aparece em doses raras (CTA, foco, relógios, um ou dois destaques) e o canvas nunca é preto puro.
