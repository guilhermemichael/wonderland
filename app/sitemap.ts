import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/rabbit/", "/hatter/", "/cheshire/"].map((path, i) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    priority: i === 0 ? 1 : 0.8,
  }));
}
