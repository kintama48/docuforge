"use client";

import { useEffect, useMemo, useRef } from "react";

type ContactEmailLinkProps = {
  localPart: string;
  domain: string;
  label: string;
  fallbackLabel?: string;
  className?: string;
};

export function ContactEmailLink({
  localPart,
  domain,
  label,
  fallbackLabel,
  className,
}: ContactEmailLinkProps) {
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const address = useMemo(() => `${localPart}@${domain}`, [domain, localPart]);

  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;

    link.setAttribute("href", `mailto:${address}`);
    if (fallbackLabel) {
      link.textContent = label;
    }
  }, [address, fallbackLabel, label]);

  return (
    <a
      ref={linkRef}
      href="#"
      className={className}
      onClick={(event) => {
        const link = linkRef.current;
        if (!link || link.getAttribute("href") === "#") {
          event.preventDefault();
        }
      }}
    >
      {fallbackLabel ?? label}
    </a>
  );
}
