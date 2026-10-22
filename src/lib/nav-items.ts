import type { LucideIcon } from "lucide-react";
import {
  Sunrise,
  LayoutDashboard,
  Users,
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
  PiggyBank,
  Table2,
  Send,
  Lightbulb,
  Library,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  trialHidden?: boolean;
  /** masqué pour un nouveau collaborateur avant FT2 / JFA II (le LinkedIn est proposé après) */
  newcomerHidden?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Aujourd'hui", icon: Sunrise },
  { href: "/dashboard", label: "Tableau", icon: LayoutDashboard },
  { href: "/prospects", label: "Prospects", icon: Users },
  { href: "/linkedin", label: "LinkedIn", icon: Send, newcomerHidden: true },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/revenus", label: "Revenus", icon: Wallet, trialHidden: true },
  { href: "/finances", label: "Finances", icon: PiggyBank },
  { href: "/clients", label: "Clients", icon: Contact },
  { href: "/cartographie", label: "Carte", icon: Map },
  { href: "/recouvrement", label: "Recouvrement", icon: AlertTriangle, trialHidden: true },
  { href: "/equipe", label: "Équipe", icon: Network, trialHidden: true },
  { href: "/structure", label: "Structure", icon: Table2, trialHidden: true },
  { href: "/recrutement", label: "Recrutement", icon: UserPlus, trialHidden: true },
  { href: "/onboarding", label: "Onboarding", icon: Rocket },
  { href: "/formation", label: "Starter Pack", icon: GraduationCap },
  { href: "/scripts", label: "Scripts", icon: BookOpen },
  { href: "/solutions", label: "Solutions", icon: Library },
  { href: "/objectifs", label: "Objectifs", icon: Target },
  { href: "/idees", label: "Mes idées", icon: Lightbulb },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
