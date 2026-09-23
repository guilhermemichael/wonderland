/**
 * Approved copy, verbatim from the brief. The only edit: the three em dashes
 * in the approved paragraphs became a colon or a full stop, because the
 * brief's copy rules forbid em dashes. Words are untouched.
 *
 * Headlines use "\n" for their designed line breaks and *asterisks* for the
 * italic word the comps set in Cormorant Italic.
 */
import type { PathId } from "./analytics";

export type StateId = "threshold" | "fall" | "disorientation" | "landing" | "crossroads";
export type SceneId = StateId | PathId;

export type Telemetry = ReadonlyArray<readonly [key: string, value: string]>;

export interface Chapter {
  id: StateId;
  hud: string;
  kicker: string;
  headline: string;
  body: string;
  /** Literary chapters set their passage in the display serif, as the comps do. */
  bodySerif?: boolean;
  cue?: string;
  cta?: { label: string; href: string; cursor: string };
  telemetry?: Telemetry;
}

export const CHAPTERS: Record<StateId, Chapter> = {
  threshold: {
    id: "threshold",
    hud: "CHAPTER 00 / THE THRESHOLD",
    kicker: "UMA DESCIDA INTERATIVA AO DESCONHECIDO",
    headline: "FOLLOW\nTHE *WHITE*\nRABBIT.",
    body: "Alguns caminhos começam com uma escolha.\nOutros começam quando você decide seguir aquilo que não deveria estar ali.",
    cta: { label: "ENTER THE RABBIT HOLE", href: "#fall", cursor: "DESCEND" },
    cue: "Scroll to descend",
  },
  fall: {
    id: "fall",
    hud: "01 / QUEDA",
    kicker: "CAPÍTULO 01 / A QUEDA",
    headline: "A QUEDA COMEÇA",
    body:
      "Não havia chão, nem direção: apenas a certeza de que cada camada do mundo ficava mais distante a cada segundo. Entre relógios, páginas e fragmentos esquecidos, a queda deixava de ser acidente e se tornava convite.",
    bodySerif: true,
    cue: "SCROLL TO CONTINUE",
    telemetry: [
      ["ALTITUDE", "DESCONHECIDA"],
      ["TEMPO", "INSTÁVEL"],
      ["PROFUNDIDADE", "AUMENTANDO"],
    ],
  },
  disorientation: {
    id: "disorientation",
    hud: "02 / DESORIENTAÇÃO",
    kicker: "CAPÍTULO 02 / A DESORIENTAÇÃO",
    headline: "O CHÃO DEIXA\nDE IMPORTAR",
    body:
      "Não havia mais cima, nem baixo: apenas trajetórias. Molduras e páginas orbitavam num salão sem eixo, e o coelho, cênico e relaxado, conhecia cada curva do impossível.",
    bodySerif: true,
    cue: "SCROLL TO CONTINUE",
    telemetry: [
      ["EIXO", "INDEFINIDO"],
      ["GRAVIDADE", "INSTÁVEL"],
      ["TEMPO", "DISTORCIDO"],
      ["TRAJETÓRIA", "ORBITAL"],
    ],
  },
  landing: {
    id: "landing",
    hud: "03 / A CHEGADA",
    kicker: "CAPÍTULO 03 / A CHEGADA",
    headline: "O IMPOSSÍVEL\nTEM CHÃO.",
    body:
      "Depois de uma queda sem fim, o mundo finalmente oferece um lugar para pousar. Mas, do outro lado do buraco, até os caminhos parecem guardar segredos.",
    cta: { label: "DISCOVER WHAT LIES AHEAD", href: "#paths", cursor: "FOLLOW" },
    telemetry: [
      ["LOCALIZAÇÃO", "DESCONHECIDA"],
      ["GRAVIDADE", "RESTABELECIDA?"],
      ["TEMPO", "INDETERMINADO"],
    ],
  },
  crossroads: {
    id: "crossroads",
    hud: "04 / OS CAMINHOS",
    kicker: "CAPÍTULO 04 / OS CAMINHOS",
    headline: "“QUALQUER DIREÇÃO\nPODE ESTAR ERRADA.”",
    body:
      "Três caminhos surgiram onde deveria existir apenas um. Cada entrada parecia reconhecer uma parte diferente de Wonderland. E o coelho, como sempre, não ofereceu resposta. Apenas esperou.",
    bodySerif: true,
    cue: "CHOOSE WHEN YOU’RE READY",
  },
};

export const CHAPTER_ORDER: StateId[] = ["threshold", "fall", "disorientation", "landing", "crossroads"];

export interface PathCopy {
  id: PathId;
  number: string;
  label: string;
  kicker: string;
  headline: string;
  body: string;
  cta: string;
  cursor: string;
  telemetry: Telemetry;
  title: string;
  description: string;
}

export const PATHS: Record<PathId, PathCopy> = {
  rabbit: {
    id: "rabbit",
    number: "01",
    label: "RABBIT / PATH 01",
    kicker: "CAPÍTULO / WHITE RABBIT",
    headline: "FOLLOW\nWHAT MOVES\nFIRST.",
    body: "Nem tudo que desaparece está perdido. Algumas coisas apenas deixam sinais suficientes para serem seguidas.",
    cta: "KEEP FOLLOWING",
    cursor: "FOLLOW",
    telemetry: [
      ["CURIOSITY", "RISING"],
      ["DISTANCE", "UNKNOWN"],
      ["TIME", "RUNNING"],
    ],
    title: "Rabbit / Path 01",
    description: "Nem tudo que desaparece está perdido. Algumas coisas apenas deixam sinais suficientes para serem seguidas.",
  },
  hatter: {
    id: "hatter",
    number: "02",
    label: "HATTER / PATH 02",
    kicker: "CAPÍTULO / THE HATTER",
    headline: "TAKE A SEAT.\nOR DON’T.",
    body:
      "Toda mesa tem regras. Algumas apenas esquecem quais eram. Aqui, tempo, etiqueta e lógica parecem estar no meio de uma discussão antiga.",
    cta: "JOIN THE TABLE",
    cursor: "CHOOSE",
    telemetry: [
      ["TEA", "STILL WARM"],
      ["TIME", "DISPUTED"],
      ["GUESTS", "UNKNOWN"],
    ],
    title: "Hatter / Path 02",
    description: "Toda mesa tem regras. Algumas apenas esquecem quais eram.",
  },
  cheshire: {
    id: "cheshire",
    number: "03",
    label: "CHESHIRE / PATH 03",
    kicker: "CAPÍTULO / CHESHIRE",
    headline: "NOT EVERYTHING\nTHAT WATCHES\nWANTS TO BE SEEN.",
    body:
      "Alguns caminhos mostram para onde levam. Outros preferem observar quem decide segui-los. Aqui, presença e ausência parecem significar quase a mesma coisa.",
    cta: "LOOK CLOSER",
    cursor: "LOOK",
    telemetry: [
      ["VISIBILITY", "UNCERTAIN"],
      ["PRESENCE", "DETECTED"],
      ["DIRECTION", "OPTIONAL"],
    ],
    title: "Cheshire / Path 03",
    description: "Alguns caminhos mostram para onde levam. Outros preferem observar quem decide segui-los.",
  },
};

export const PATH_ORDER: PathId[] = ["rabbit", "hatter", "cheshire"];

export const SITE = {
  name: "WONDERLAND",
  title: "WONDERLAND · Follow the White Rabbit",
  tagline: "UMA DESCIDA INTERATIVA AO DESCONHECIDO",
  description:
    "Uma descida interativa ao desconhecido. Alguns caminhos começam com uma escolha. Outros começam quando você decide seguir aquilo que não deveria estar ali.",
  premise: ["Wonderland não é uma página para ser lida.", "É um lugar para ser atravessado."],
  credit: "Inspirado em Alice’s Adventures in Wonderland, de Lewis Carroll (1865).",
};
