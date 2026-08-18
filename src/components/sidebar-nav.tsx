"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav-items";

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              active ? "bg-card-alt font-bold text-gold-light" : "text-muted hover:bg-card-alt/60"
            }`}
          >
            <Icon size={18} className={active ? "text-gold-light" : "text-muted"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around overflow-x-auto border-t border-line bg-card-alt px-1 pb-3 pt-2 md:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-shrink-0 flex-col items-center px-1.5 ${
              active ? "text-gold-light" : "text-muted"
            }`}
          >
            <Icon size={18} />
            <span className="mt-0.5 text-[9px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
