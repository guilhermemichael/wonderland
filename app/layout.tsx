import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Mono, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import type { ReactNode } from "react";

import { Lifecycle } from "@/components/Lifecycle";
import { About } from "@/components/ui/About";
import { Cursor } from "@/components/ui/Cursor";
import { Nav } from "@/components/ui/Nav";
import { SITE } from "@/lib/content";
import { STATIC_GATES } from "@/lib/gates";
import { SITE_URL } from "@/lib/site";

import "./globals.css";
import "./experience.css";
import "./paths.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});
const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dmmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE.title, template: "%s · WONDERLAND" },
  description: SITE.description,
  applicationName: "WONDERLAND",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "WONDERLAND",
    locale: "pt_BR",
    url: "/",
    title: SITE.title,
    description: SITE.description,
    images: [{ url: "/og/wonderland.jpg", width: 1200, height: 630, alt: "Follow the White Rabbit. O Rabbit Hole de Wonderland." }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: ["/og/wonderland.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#071118",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/* Decides static-first vs scrub before first paint, with the exact gate
   strings the runtime keeps watching (lib/gates.ts). No flash, no mismatch. */
const MODE_SCRIPT = `(function(){try{var d=document.documentElement;d.classList.add('js');var g=${JSON.stringify(
  STATIC_GATES,
)};var s=g.some(function(q){return window.matchMedia(q).matches});d.setAttribute('data-mode',s?'static':'scrub');}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Pular para o conteúdo
        </a>
        <Nav />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <About />
        <div className="ambient" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <Cursor />
        <div id="veil" className="veil" aria-hidden="true" data-state="idle" />
        <Lifecycle />
        <Analytics />
      </body>
    </html>
  );
}
