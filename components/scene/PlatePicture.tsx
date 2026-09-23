import { NARROW_MEDIA } from "@/lib/gates";
import type { SceneId } from "@/lib/content";
import { FORMATS, plateFallback, plateSrcSet } from "@/lib/media";

interface Props {
  scene: SceneId;
  /** stage plates start without src; the engine activates them in order */
  deferred?: boolean;
  priority?: boolean;
  /** static layouts: portrait crop on narrow/portrait screens */
  responsiveCrop?: boolean;
  lazy?: boolean;
  className?: string;
  alt?: string;
}

const COVER_SIZES = "(max-aspect-ratio: 16/9) 177.78vh, 100vw";

export function PlatePicture({ scene, deferred, priority, responsiveCrop, lazy, className, alt = "" }: Props) {
  const attr = (v: string) => (deferred ? { "data-srcset": v } : { srcSet: v });
  const src = plateFallback(scene);
  return (
    <picture className={className}>
      {responsiveCrop &&
        FORMATS.map((f) => (
          <source
            key={`p-${f.ext}`}
            media={NARROW_MEDIA}
            type={f.type}
            sizes="100vw"
            {...attr(plateSrcSet(scene, f.ext, true))}
          />
        ))}
      {FORMATS.map((f) => (
        <source key={f.ext} type={f.type} sizes={COVER_SIZES} {...attr(plateSrcSet(scene, f.ext))} />
      ))}
      <img
        {...(deferred ? { "data-src": src } : { src })}
        alt={alt}
        width={1920}
        height={1080}
        decoding="async"
        loading={lazy ? "lazy" : "eager"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </picture>
  );
}
