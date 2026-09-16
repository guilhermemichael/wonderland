# MILESTONE 01 VERIFICATION FAILED

Data: 2026-09-16. Alvo: checkout Git wonderland-git-verification; código identificado pelo commit-base abaixo.

## Identificação do artefato

Reexecução nova, após clone de https://github.com/guilhermemichael/wonderland.git. O remoto estava vazio: ls-remote sem refs; clone avisou empty repository; pull --ff-only origin main falhou por ausência de main. Foi importado o código local existente sem mudanças de implementação, em commit-base `6d0d4bca4b0ba53be4ba3c9b5a9d169363f0c2d0` (33 arquivos). A execução usa essa cópia Git, não o diretório anterior.

A versão M01.1 anunciada não está no remoto nem no código importado. O contrato continua sem client_event_id; docs/MILESTONE_01_HARDENING_REPORT.md permanece ausente. Os resultados são referentes ao commit-base acima.

Nenhuma implementação foi alterada. Armazenamento em memória NÃO é motivo de reprovação. Os FAIL decorrem dos critérios funcionais solicitados. JSONs, screenshots e logs foram regenerados nesta execução; não são cópias das evidências anteriores.

## Checks 1–21

| # | Check | Result | Evidência |
|---|---|---|---|
| 1 | Rabbit Hole continuity | FAIL | Testados 0/25/50/75/100% em 1440×900, 768×1024, 390×844 e 375×812. A 50%, sticky top = −1350/−1536/−1266/−1218px respectivamente. Cena sai da viewport; final fica fora da tela. Sem overflow horizontal nos pontos medidos. |
| 2 | Direct /rabbit-hole | FAIL | Rota contém zero links e nenhum Crossroads/CTA de continuação. |
| 3 | Same event retry | PASS | Dois POST idênticos retornaram HTTP 202 e o mesmo event_id. Este PASS cobre o retry idêntico; client_event_id não existe no schema e é ignorado. |
| 4 | Different events | FAIL | IDs cliente diferentes, mesma sessão e sequência 1: path_selected retornou o cta_click anterior e seu event_id. |
| 5 | Reload behavior | FAIL | Sequência reinicia em 1 sob a mesma sessão. Após recargas, scroll_depth de sequência 2 recebeu o cta_click anterior de sequência 2. |
| 6 | Concurrent requests | PASS | 20 POST simultâneos com sequências distintas retornaram 20 IDs; 20 retries idênticos simultâneos retornaram 1 ID; todos HTTP 202. Limitado a esta execução, sem alegação de prova de ausência de races. A colisão por sequência do check 4 permanece. |
| 7 | Semantic start | FAIL | rabbit_hole_started enviado na home antes de clicar/rolar, em todos os contextos novos. |
| 8 | Completion | FAIL | Percurso até 100% não emite rabbit_hole_completed; não há chamada emissora no componente. |
| 9 | Skip semantics | FAIL | Clicar Choose emite scroll_depth 25/50/75/100; nenhum rabbit_hole_skipped. |
| 10 | Normal analytics flow | FAIL | Ordem observada: started antes de CTA, CTA, quatro depths, path_selected; completed ausente. |
| 11 | Page context | FAIL | Caso home emite page=/crossroads, sem surface. Caso rota /crossroads informa corretamente /crossroads. |
| 12 | Queue success | FAIL | Com resposta retida: 1 evento pending. Após liberação e HTTP 202 válido: o mesmo evento continua na fila. |
| 13 | Queue failure | PASS | Requisição de evento abortada para simular indisponibilidade; CTA continua utilizável e evento permanece na fila. Zero retries adicionais em janela de 4s; código não agenda retries. |
| 14 | Queue recovery | FAIL | Restaurada conectividade, online/focus não reenviam/removem pendentes. Reload apenas acrescenta evento de montagem; pendentes continuam. |
| 15 | Reduced motion | FAIL | Mesma timeline/transforms e seção de 3600px em viewport de 900px; nenhuma redução dos 400vh. |
| 16 | Mobile Crossroads | FAIL | Em 390×844 e 375×812, Cheshire começa em y≈912px. Nenhum scene switcher/preview control. CTA emite path_selected, mas as três escolhas não ficam imediatamente descobríveis. |
| 17 | Desktop Crossroads | PASS | Três colunas coexistem e estão visíveis em 1440×900. Tab alcança os três links; Enter no Cheshire navega a /cheshire. |
| 18 | Typography | FAIL | CDP informa Georgia e Segoe UI Black/Symbol, todas isCustomFont=false; Cormorant/Manrope não carregadas. |
| 19 | Accessibility hardening | FAIL | Cores anteriores permanecem: Rabbit sobre Ivory 1,84:1; foco gold/Ivory 2,20:1. Links com 22px de altura; hover troca fundo, foco não. Reduced motion continua falhando. Teclado básico funciona. |
| 20 | Public Cheshire placeholder | FAIL | Texto renderizado contém server-authoritative scoring e Milestone 02. |
| 21 | Documentation | FAIL | README afirma reduced-motion support sem runtime correspondente. Documentação ainda especifica dedupe por session_id/client_sequence. Relatório M01.1 solicitado não existe. |

As alturas não especificadas no pedido foram definidas como 1024px para largura 768 e 812px para largura 375.

## 22. Automated validation

| Command | Result |
|---|---|
| npm run lint | PASS |
| npm run typecheck | PASS |
| npm run test | PASS |
| npm run build | PASS |
| .venv/Scripts/python.exe -m py_compile apps/api/main.py | PASS |

npm foi disponibilizado com launcher temporário fora do projeto; os scripts npm originais foram executados. Build Next.js 15.5.25 passou com warning informativo de detecção do plugin ESLint. O teste fornecido cobre health, ingestão e retry idêntico; não detecta a colisão entre fatos diferentes.

## 23. New regressions

Não foi possível atribuir novas regressões ao hardening: o artefato disponível mantém as implementações anteriores nas áreas solicitadas. Os defeitos reportados acima são reproduções dos achados anteriores, não uma nova auditoria nem novos critérios. Uma declaração de ausência de regressões do M01.1 exigiria acesso a essa versão.

## 24. Final gate

| Check | Result |
|---|---|
| Rabbit Hole continuity | FAIL |
| Direct route continuity | FAIL |
| Event idempotency | FAIL |
| Reload uniqueness | FAIL |
| Semantic start | FAIL |
| Completion event | FAIL |
| Skip semantics | FAIL |
| Event queue | FAIL |
| Reduced motion | FAIL |
| Mobile Crossroads | FAIL |
| Desktop Crossroads | PASS |
| Typography | FAIL |
| Accessibility hardening | FAIL |
| Public copy | FAIL |
| Documentation | FAIL |
| Automated checks | PASS |

## 25. Verdict

MILESTONE 01 VERIFICATION FAILED

Blockers anteriores continuam reproduzíveis na cópia entregue. Não é uma reprovação da limitação de armazenamento em memória.

## Git tag

milestone-01-verified NÃO foi criada porque o gate reprovou. O código-base e este relatório são versionados no repositório informado; nenhum commit representa aprovação do M01.1.

## Evidence

- source-manifest.json: commit-base e hashes SHA-256 dos 33 arquivos importados.
- api-gate.json: schema servido, retry, colisão e concorrência.
- continuity.json: dimensões, posições, transforms, eventos e escolhas.
- behavior.json: recarga, respostas reais, skip, fontes, fila, foco e copy.
- context-focus.json: page context nos dois casos e teclado.
- desktop-fall-50.png; tablet-fall-50.png; mobile390-fall-50.png; mobile375-fall-50.png: cena fora da viewport.
- mobile390-crossroads.png; mobile375-crossroads.png: terceira escolha abaixo da primeira visão.
- Capturas em 0/25/50/75/100% estão nesta pasta, incluindo reduced motion.

Fontes relevantes: apps/web/app/globals.css:46,65–66,111; apps/web/components/rabbit-hole.tsx:24–47; apps/web/lib/analytics.ts:9–38; apps/api/main.py:48–57; apps/web/components/crossroads.tsx:24; apps/web/app/cheshire/quiz/page.tsx:9.

## Reprodução

1. Instalar dependências do projeto; executar API em 127.0.0.1:8000 e build/start do frontend em 127.0.0.1:3000.
2. Disponibilizar Playwright em ambiente de teste separado. Os scripts usam `PLAYWRIGHT_MODULE` quando definido, ou `require('playwright')`. Browser channel: msedge, headless.
3. Executar os scripts `api-gate.cjs`, `continuity.cjs`, `behavior.cjs` e `context-focus.cjs` desta pasta. Eles gravam novas evidências no próprio diretório. Não executar contra backend de produção: geram eventos sintéticos de teste.
4. Os scripts capturam evidências e retornam sucesso de execução mesmo quando o produto reprova. Consultar asserções e resultados em `results.json` e este gate; exit code do coletor não é aprovação do produto.

Logs: lint.log, typecheck.log, test.log, build.log e *-run.log. O ambiente compartilhou dependências locais já instaladas, sem incluí-las no Git. Manutenção de in-memory store é permitida pelo gate.
