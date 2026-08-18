import type { LucideIcon } from "lucide-react";
import {
  Sunrise,
  LayoutDashboard,
  Users,
  Clock,
  Wallet,
  Contact,
  Network,
  Rocket,
  GraduationCap,
  BookOpen,
  Target,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Aujourd'hui", icon: Sunrise },
  { href: "/dashboard", label: "Tableau", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/suivis", label: "Suivis", icon: Clock },
  { href: "/revenus", label: "Revenus", icon: Wallet },
  { href: "/clients", label: "Clients", icon: Contact },
  { href: "/equipe", label: "Équipe", icon: Network },
  { href: "/recrutement", label: "Recrutement", icon: UserPlus },
  { href: "/onboarding", label: "Onboarding", icon: Rocket },
  { href: "/formation", label: "Formation", icon: GraduationCap },
  { href: "/scripts", label: "Scripts", icon: BookOpen },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
