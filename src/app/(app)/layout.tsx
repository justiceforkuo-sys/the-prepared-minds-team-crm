import { Flame } from "lucide-react";
import { getCurrentPerson } from "@/lib/current-person";
import { SidebarNav, MobileNav } from "@/components/sidebar-nav";
import { signOut } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const person = await getCurrentPerson();

  if (!person) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-[10px] font-semibold tracking-[2px] text-muted">
          PREPARED MINDS TEAM
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink">CRM</h1>
        <p className="text-sm text-muted">
          Ton compte est créé, mais aucune fiche ne lui est encore associée. Demande
          à ton sponsor (ou à l&apos;administrateur) de t&apos;ajouter dans l&apos;équipe avec la
          même adresse email que celle utilisée ici.
        </p>
        <form action={signOut}>
          <button className="rounded-lg border border-line px-4 py-2 text-sm text-muted">
            Déconnexion
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1240px] flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col border-r border-line p-4 md:flex">
        <div className="mb-7 pl-1">
          <div className="text-[10px] font-semibold tracking-[2px] text-muted">
            PREPARED MINDS TEAM
          </div>
          <h1 className="mt-0.5 font-serif text-2xl font-semibold text-ink">CRM</h1>
        </div>
        <div className="flex-1">
          <SidebarNav isAdmin={person.is_admin} />
        </div>
        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-2 text-xs text-muted">
            {person.name} <span className="text-[#5a6b85]">· {person.rank}</span>
          </div>
          <form action={signOut}>
            <button className="w-full rounded-lg border border-line px-3 py-1.5 text-xs text-muted">
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-4 pb-2 pt-5 md:hidden">
          <div>
            <div className="text-[10px] font-semibold tracking-[2px] text-muted">
              PREPARED MINDS TEAM
            </div>
            <h1 className="mt-0.5 font-serif text-2xl font-semibold text-ink">CRM</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5">
              <Flame size={16} className="text-gold-light" />
            </div>
            <form action={signOut}>
              <button className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted">
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 md:mx-auto md:w-full md:max-w-3xl md:px-0 md:py-8">
          {children}
        </main>

        <MobileNav isAdmin={person.is_admin} />
      </div>
    </div>
  );
}
