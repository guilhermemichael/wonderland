import type { Metadata } from "next";
import "./cheshire.css";

export const metadata: Metadata = {
  title: "WONDERLAND — The Cheshire Cat",
  description: "Questions are terribly excellent.",
};

export default function CheshireLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="cheshire-experience">{children}</div>;
}
