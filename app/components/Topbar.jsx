"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Nova Reunião" },
  { href: "/agenda", label: "Agenda" },
  { href: "/admin", label: "Configurações" },
];

export default function Topbar() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Image src="/logo-v4.png" alt="V4 Company" width={34} height={34} priority />
        </span>
        <span>
          Calendário SDR <span className="brand-sub">· V4 Company</span>
        </span>
      </Link>
      <nav className="nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
