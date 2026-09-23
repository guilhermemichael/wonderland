"use client";

import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

import { coverVeil } from "@/lib/veil";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * A route link that crosses between places through the veil. Same-page
 * hash links fall through untouched so the journey can handle them.
 */
export function VeilLink({ href, onClick, onMouseEnter, children, ...rest }: Props) {
  const router = useRouter();
  const handle = async (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;
    e.preventDefault();
    await coverVeil();
    router.push(url.pathname + url.hash);
  };
  return (
    <a
      href={href}
      onClick={handle}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        const url = new URL(href, window.location.href);
        if (url.pathname !== window.location.pathname) router.prefetch(url.pathname);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
