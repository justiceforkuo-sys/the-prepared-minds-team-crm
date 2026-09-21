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
  CalendarClock,
  AlertTriangle,
  Map,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  trialHidden?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Aujourd'hui", icon: Sunrise },
  { href: "/dashboard", label: "Tableau", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/suivis", label: "Suivis", icon: Clock },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/revenus", label: "Revenus", icon: Wallet, trialHidden: true },
  { href: "/clients", label: "Clients", icon: Contact },
  { href: "/cartographie", label: "Carte", icon: Map },
  { href: "/recouvrement", label: "Recouvrement", icon: AlertTriangle, trialHidden: true },
  { href: "/equipe", label: "Équipe", icon: Network, trialHidden: true },
  { href: "/recrutement", label: "Recrutement", icon: UserPlus, trialHidden: true },
  { href: "/onboarding", label: "Onboarding", icon: Rocket },
  { href: "/formation", label: "Formation", icon: GraduationCap },
  { href: "/scripts", label: "Scripts", icon: BookOpen },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
