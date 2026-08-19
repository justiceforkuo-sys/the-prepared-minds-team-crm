"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LogIn } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { RANKS_INFO } from "@/lib/ranks";
import type { Person, Rank } from "@/types/database";
import { startImpersonation } from "./impersonation-actions";

function isDescendantOf(all: Person[], candidateId: string, ofId: string): boolean {
  const visited = new Set<string>();
  let current = all.find((p) => p.id === candidateId);
  while (current?.reports_to) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    if (current.reports_to === ofId) return true;
    current = all.find((p) => p.id === current!.reports_to);
  }
  return false;
}

type EditForm = {
  rank: Rank;
  active: boolean;
  is_admin: boolean;
  reports_to: string;
  personal_pts: number;
  team_quarterly_pts: number;
  directs_count: number;
  ranking_position: string;
  ranking_points: string;
  ranking_days_to_promo: string;
  phone: string;
  email: string;
  notes: string;
  vision: string;
};

function toForm(p: Person): EditForm {
  return {
    rank: p.rank,
    active: p.active,
    is_admin: p.is_admin,
    reports_to: p.reports_to ?? "",
    personal_pts: p.personal_pts,
    team_quarterly_pts: p.team_quarterly_pts,
    directs_count: p.directs_count,
    ranking_position: p.ranking_position?.toString() ?? "",
    ranking_points: p.ranking_points?.toString() ?? "",
    ranking_days_to_promo: p.ranking_days_to_promo?.toString() ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    notes: p.notes ?? "",
    vision: p.vision ?? "",
  };
}

export function PeoplePanel({ people: initialPeople, meId }: { people: Person[]; meId: string }) {
  const supabase = createClient();
  const [people, setPeople] = useState(initialPeople);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  const filtered = useMemo(
    () => people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [people, search]
  );

  const open = (p: Person) => {
    if (openId === p.id) {
      setOpenId(null);
      setForm(null);
      return;
    }
    setOpenId(p.id);
    setForm(toForm(p));
  };

  const save = async (id: string) => {
    if (!form) return;
    const payload = {
      rank: form.rank,
      active: form.active,
      is_admin: form.is_admin,
      reports_to: form.reports_to || null,
      personal_pts: form.personal_pts,
      team_quarterly_pts: form.team_quarterly_pts,
      directs_count: form.directs_count,
      ranking_position: form.ranking_position ? Number(form.ranking_position) : null,
      ranking_points: form.ranking_points ? Number(form.ranking_points) : null,
      ranking_days_to_promo: form.ranking_days_to_promo ? Number(form.ranking_days_to_promo) : null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
      vision: form.vision || null,
    };
    const { data } = await supabase.from("people").update(payload).eq("id", id).select().single();
    if (data) {
      setPeople((prev) => prev.map((p) => (p.id === id ? (data as Person) : p)));
    }
    setOpenId(null);
    setForm(null);
  };

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        Toutes les personnes ({people.length})
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
        className="mb-2.5 w-full rounded-lg border border-line bg-card-alt px-3 py-2 text-sm text-ink outline-none focus:border-gold"
      />
      <div className="flex flex-col gap-2">
        {filtered.map((p) => {
          const isOpen = openId === p.id;
          const sponsorOptions = people.filter(
            (cand) => cand.id !== p.id && !isDescendantOf(people, cand.id, p.id)
          );
          return (
            <div key={p.id} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex w-full items-center justify-between gap-2">
                <button onClick={() => open(p)} className="flex flex-1 items-center justify-between text-left">
                  <div>
                    <div className="text-sm font-bold text-ink">
                      {p.name} {p.is_admin && <span className="text-[10px] text-gold-light">ADMIN</span>}
                      {!p.active && <span className="text-[10px] text-red"> · inactif</span>}
                    </div>
                    <div className="text-xs text-muted">{p.rank}</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                </button>
                {p.id !== meId && (
                  <form action={startImpersonation.bind(null, p.id)}>
                    <button
                      title="Se connecter en tant que"
                      className="flex flex-shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted"
                    >
                      <LogIn size={12} /> Devenir
                    </button>
                  </form>
                )}
              </div>

              {isOpen && form && (
                <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Rang</label>
                      <select
                        value={form.rank}
                        onChange={(e) => setForm((f) => f && { ...f, rank: e.target.value as Rank })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      >
                        {RANKS_INFO.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Sponsor</label>
                      <select
                        value={form.reports_to}
                        onChange={(e) => setForm((f) => f && { ...f, reports_to: e.target.value })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      >
                        <option value="">— aucun (racine) —</option>
                        {sponsorOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((f) => f && { ...f, active: e.target.checked })}
                      />
                      Actif
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={form.is_admin}
                        onChange={(e) => setForm((f) => f && { ...f, is_admin: e.target.checked })}
                      />
                      Admin
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Pts perso</label>
                      <input
                        type="number"
                        value={form.personal_pts}
                        onChange={(e) => setForm((f) => f && { ...f, personal_pts: Number(e.target.value) })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Pts équipe/trim</label>
                      <input
                        type="number"
                        value={form.team_quarterly_pts}
                        onChange={(e) => setForm((f) => f && { ...f, team_quarterly_pts: Number(e.target.value) })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Directs</label>
                      <input
                        type="number"
                        value={form.directs_count}
                        onChange={(e) => setForm((f) => f && { ...f, directs_count: Number(e.target.value) })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Position classement</label>
                      <input
                        value={form.ranking_position}
                        onChange={(e) => setForm((f) => f && { ...f, ranking_position: e.target.value })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Pts classement</label>
                      <input
                        value={form.ranking_points}
                        onChange={(e) => setForm((f) => f && { ...f, ranking_points: e.target.value })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Jours avant promo</label>
                      <input
                        value={form.ranking_days_to_promo}
                        onChange={(e) => setForm((f) => f && { ...f, ranking_days_to_promo: e.target.value })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Téléphone</label>
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((f) => f && { ...f, phone: e.target.value })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] text-muted">Email</label>
                      <input
                        value={form.email}
                        onChange={(e) => setForm((f) => f && { ...f, email: e.target.value })}
                        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] text-muted">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => f && { ...f, notes: e.target.value })}
                      className="h-14 w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-muted">Vision</label>
                    <textarea
                      value={form.vision}
                      onChange={(e) => setForm((f) => f && { ...f, vision: e.target.value })}
                      className="h-14 w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
                    />
                  </div>

                  <button
                    onClick={() => save(p.id)}
                    className="mt-1 rounded-lg bg-gold py-2 text-xs font-bold text-night"
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
