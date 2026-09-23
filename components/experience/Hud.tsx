import { CHAPTER_ORDER, CHAPTERS } from "@/lib/content";

/**
 * The instrument layer of the scrub journey: descent rail, chapter label,
 * telemetry and the scroll cue whose outline doubles as the honest loading
 * indicator for the next film (it fills with real bytes).
 */
export function Hud() {
  return (
    <div className="hud" aria-hidden="true">
      <div className="hud-rail">
        <span className="hud-rail-label">DESCEND</span>
        <span className="hud-rail-line">
          <span className="hud-rail-fill" />
        </span>
        <span className="hud-rail-arrow">↓</span>
      </div>

      <div className="hud-bar">
        <div className="hud-chapter">
          {CHAPTER_ORDER.map((id) => (
            <span key={id} data-for={id}>
              {CHAPTERS[id].hud}
            </span>
          ))}
        </div>
        <div className="hud-telemetry">
          {CHAPTER_ORDER.map((id) => (
            <span key={id} data-for={id}>
              {(CHAPTERS[id].telemetry ?? []).map(([k, v]) => (
                <span className="tm" key={k}>
                  <span className="tm-k">{k}:</span> <span className="tm-v">{v}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
        <div className="hud-cue" data-cue>
          <span className="hud-cue-label">SCROLL</span>
          <svg className="hud-cue-icon" viewBox="0 0 16 26">
            <rect className="track" x="1" y="1" width="14" height="24" rx="7" pathLength={1} />
            <rect className="fill" x="1" y="1" width="14" height="24" rx="7" pathLength={1} />
            <circle className="dot" cx="8" cy="8" r="1.4" />
          </svg>
        </div>
      </div>
    </div>
  );
}
