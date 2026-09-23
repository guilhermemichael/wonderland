import type { CSSProperties, ReactNode } from "react";

import { hashString, rng } from "@/lib/math";

type Mode = "words" | "chars";

interface Props {
  text: string;
  mode?: Mode;
  /** stagger spread across the whole text (0-1 of the band's --k) */
  spread?: number;
  /** jitter scale in px for scatter-like entrances */
  jitter?: number;
  className?: string;
}

/**
 * Splits a headline into lines, words and (optionally) characters, once, on
 * the server. Offsets come from a seeded generator so they are identical on
 * every load and hydrate without mismatch. Screen readers get the sentence
 * once, from a visually hidden copy; the animated copy is aria-hidden.
 *
 * Syntax: "\n" is a designed line break, *word* is set in italic.
 */
export function SplitText({ text, mode = "words", spread = 0.5, jitter = 18, className }: Props) {
  const plain = text.replace(/\*/g, "").replace(/\n/g, " ");
  const rand = rng(hashString(text));
  const lines = text.split("\n");
  const totalWords = lines.reduce((n, l) => n + l.split(" ").filter(Boolean).length, 0);
  const totalChars = plain.replace(/\s/g, "").length;
  let wi = 0;
  let ci = 0;

  const out: ReactNode[] = lines.map((line, li) => {
    const words = line.split(" ").filter(Boolean);
    return (
      <span className="ln" key={li} style={{ "--li": li } as CSSProperties}>
        {words.map((raw, i) => {
          const em = raw.startsWith("*") && raw.replace(/[^*]/g, "").length >= 2;
          const word = raw.replace(/\*/g, "");
          const w = wi++;
          const sign = w % 2 === 0 ? 1 : -1;
          const wStyle = {
            "--wi": w,
            "--th": ((w / Math.max(1, totalWords)) * spread + rand() * 0.06).toFixed(3),
            "--jx": `${((rand() - 0.5) * jitter * 2).toFixed(1)}px`,
            "--jy": `${((rand() - 0.5) * jitter * 2).toFixed(1)}px`,
            "--jr": `${((rand() - 0.5) * 16).toFixed(1)}deg`,
            "--sg": sign,
          } as CSSProperties;
          const content =
            mode === "chars"
              ? Array.from(word).map((ch, k) => {
                  const c = ci++;
                  const cStyle = {
                    "--ci": c,
                    "--th": ((c / Math.max(1, totalChars)) * spread + rand() * 0.05).toFixed(3),
                    "--jx": `${((rand() - 0.5) * jitter * 2).toFixed(1)}px`,
                    "--jy": `${((rand() - 0.5) * jitter).toFixed(1)}px`,
                    "--jr": `${((rand() - 0.5) * 24).toFixed(1)}deg`,
                  } as CSSProperties;
                  return (
                    <span className="c" key={k} style={cStyle}>
                      {ch}
                    </span>
                  );
                })
              : word;
          return (
            <span key={i} className="wrap">
              <span className={em ? "w em" : "w"} style={wStyle}>
                {content}
              </span>
              {i < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </span>
    );
  });

  return (
    <span className={className ? `split ${className}` : "split"}>
      <span className="sr-only">{plain}</span>
      <span className="split-vis" aria-hidden="true">
        {out}
      </span>
    </span>
  );
}
