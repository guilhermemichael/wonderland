import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./globals.css";
import { AnalyticsBootstrap } from "../components/analytics-bootstrap";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "WONDERLAND — Follow the White Rabbit",
  description: "An experimental digital product where storytelling, product design, engineering and MarTech meet.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "WONDERLAND — Follow the White Rabbit",
    description: "The White Rabbit is late. Will you follow him?",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AnalyticsBootstrap />{children}</body>
    </html>
  );
}
