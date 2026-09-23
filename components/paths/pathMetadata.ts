import type { Metadata } from "next";

import type { PathId } from "@/lib/analytics";
import { PATHS } from "@/lib/content";

export function pathMetadata(id: PathId): Metadata {
  const p = PATHS[id];
  const image = { url: `/og/${id}.jpg`, width: 1200, height: 630, alt: p.label };
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/${id}/` },
    openGraph: { type: "website", url: `/${id}/`, title: `${p.title} · WONDERLAND`, description: p.description, images: [image] },
    twitter: { card: "summary_large_image", title: `${p.title} · WONDERLAND`, description: p.description, images: [image.url] },
  };
}
