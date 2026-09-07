"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/entry/normal", label: "Normal Entry" },
  { href: "/entry/lot", label: "Lot Entry" },
  { href: "/entry/no-pkt", label: "No Pkt No." }
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  return (
    <header className="border-b border-line/20">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display italic text-lg text-paper">Register</span>
          <nav className="flex items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors ${
                  pathname === l.href ? "text-brass" : "text-paper/50 hover:text-paper"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {role === "admin" && (
              <Link
                href="/dashboard/admin"
                className={`text-sm transition-colors ${
                  pathname?.startsWith("/dashboard/admin")
                    ? "text-brass"
                    : "text-paper/50 hover:text-paper"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-paper/40 text-sm font-mono">{session?.user?.name}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-paper/50 hover:text-paper text-sm">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
