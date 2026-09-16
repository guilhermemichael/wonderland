import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
