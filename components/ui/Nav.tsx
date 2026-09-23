"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PATH_ORDER, PATHS } from "@/lib/content";

import { VeilLink } from "./VeilLink";

const LINKS = [
  { href: "/#experience", label: "THE EXPERIENCE" },
  { href: "/#paths", label: "THE PATHS" },
  { href: "/#about", label: "ABOUT" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const first = menu.current?.querySelector<HTMLElement>("a");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="nav" data-open={open}>
      <nav className="nav-inner" aria-label="Principal">
        <div className="nav-left">
          <button
            ref={toggle}
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="nav-toggle-lines" aria-hidden="true" />
            <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
          </button>
          <VeilLink href="/#experience" className="brand" aria-label="Wonderland, voltar ao início">
            WONDERLAND
          </VeilLink>
        </div>
        <div className="nav-links">
          {LINKS.map((l) => (
            <VeilLink key={l.href} href={l.href}>
              {l.label}
            </VeilLink>
          ))}
        </div>
        <div className="nav-right" aria-hidden="true">
          <svg className="nav-mark" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeOpacity=".5" />
            <circle cx="16" cy="12.6" r="3.6" fill="none" stroke="currentColor" strokeOpacity=".8" />
            <path d="M14.4 15.6 13 23h6l-1.4-7.4" fill="none" stroke="currentColor" strokeOpacity=".8" />
          </svg>
        </div>
      </nav>

      <div id="site-menu" className="menu" ref={menu} aria-hidden={!open} inert={!open}>
        <ul className="menu-list">
          <li>
            <VeilLink href="/#experience" onClick={close}>
              The Experience
            </VeilLink>
          </li>
          <li>
            <VeilLink href="/#paths" onClick={close}>
              The Paths
            </VeilLink>
            <div className="menu-sub">
              {PATH_ORDER.map((id) => (
                <VeilLink key={id} href={`/${id}/`} onClick={close}>
                  {PATHS[id].number} · {PATHS[id].label.split(" / ")[0]}
                </VeilLink>
              ))}
            </div>
          </li>
          <li>
            <VeilLink href="/#about" onClick={close}>
              About
            </VeilLink>
          </li>
        </ul>
        <p className="menu-foot">FOLLOW THE WHITE RABBIT.</p>
      </div>
    </header>
  );
}
