import { CalendarDays, ChartColumn, House, Megaphone, Package, Settings2, Wallet, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; primaryMobile?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House, primaryMobile: true },
  { href: "/eventi", label: "Eventi", icon: CalendarDays, primaryMobile: true },
  { href: "/finanze", label: "Finanze", icon: Wallet, primaryMobile: true },
  { href: "/marketing", label: "Marketing", icon: Megaphone, primaryMobile: true },
  { href: "/risorse", label: "Risorse", icon: Package },
  { href: "/analisi", label: "Analisi", icon: ChartColumn },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings2 },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
