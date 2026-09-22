"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fmtEUR, fmtDate } from "@/lib/format";
import {
  computeFinances,
  mensualiteObjectif,
  moisRestants,
  cotisationAnnuelle,
  avantageFiscalAnnuel,
  coutReelNetAnnuel,
} from "@/lib/finances";
import type {
  DeductibleSaving,
  DeductibleSavingType,
  Expense,
  ExpenseType,
  FinancialSettings,
  SavingsGoal,
} from "@/types/database";

const DEDUCTIBLE_TYPE_LABEL: Record<DeductibleSavingType, string> = {
  epargne_pension: "Épargne-pension",
  epargne_long_terme: "Épargne à long terme",
  plci_cpti: "PLCI / CPTI",
  revenu_garanti: "Assurance revenu garanti",
  autre: "Autre",
};

const emptyExpenseForm = {
  categorie: "",
  montant: "",
  type: "professionnelle" as ExpenseType,
  date: new Date().toISOString().slice(0, 10),
  recurrente: false,
};

const emptySavingForm = {
  type: "epargne_pension" as DeductibleSavingType,
  nom: "",
  cotisation_mensuelle: "",
  avantage_fiscal_taux: "30",
};

const emptyGoalForm = { nom: "", montant_cible: "", montant_actuel: "0", date_cible: "" };

export function FinancesWorkspace({
  personId,
  revenusAnnee,
  initialExpenses,
  initialDeductibleSavings,
  initialSettings,
  initialGoals,
}: {
  personId: string;
  revenusAnnee: number;
  initialExpenses: Expense[];
  initialDeductibleSavings: DeductibleSaving[];
  initialSettings: FinancialSettings;
  initialGoals: SavingsGoal[];
}) {
  const supabase = createClient();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [deductibleSavings, setDeductibleSavings] = useState(initialDeductibleSavings);
  const [settings, setSettings] = useState(initialSettings);
  const [goals, setGoals] = useState(initialGoals);

  const result = useMemo(
    () => computeFinances({ revenusAnnee, expenses, deductibleSavings, settings }),
    [revenusAnnee, expenses, deductibleSavings, settings]
  );

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold text-ink">Finances</h2>
      <div className="mt-1 mb-4 text-xs text-muted">Vue d&apos;ensemble {new Date().getFullYear()}.</div>

      <div className="mb-4 flex gap-2 rounded-2xl border border-line bg-card p-3.5 text-xs text-muted">
        <AlertTriangle size={16} className="flex-shrink-0 text-gold-light" />
        <span>
          Estimation simplifiée (taux forfaitaires, pas de tranches progressives ni de quotité exemptée d&apos;impôt).
          Sert de repère de planification — fais valider tes chiffres par ton comptable ou ton secrétariat social
          avant toute décision.
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <KpiTile label={`Revenus ${new Date().getFullYear()}`} value={fmtEUR(result.revenusAnnee)} />
        <KpiTile label={`Charges pro ${new Date().getFullYear()}`} value={fmtEUR(result.chargesProAnnee)} />
        <KpiTile
          label="Cotisations sociales / an"
          value={fmtEUR(result.cotisationsSociales)}
          sub={`${fmtEUR(result.cotisationsSocialesTrimestre)} / trimestre`}
        />
        <KpiTile label="Impôt estimé / an" value={fmtEUR(result.impot)} />
        <KpiTile
          label="Revenu net disponible"
          value={`${fmtEUR(result.revenuNetDisponibleAnnee)} / an`}
          sub={`${fmtEUR(result.revenuNetDisponibleMois)} / mois en moyenne`}
        />
      </div>

      <ExpensesSection personId={personId} expenses={expenses} setExpenses={setExpenses} supabase={supabase} />

      <SavingsSection
        personId={personId}
        deductibleSavings={deductibleSavings}
        setDeductibleSavings={setDeductibleSavings}
        settings={settings}
        supabase={supabase}
      />

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Budget mensuel moyen</div>
        <div className="flex flex-col gap-1.5 text-sm">
          <Row label="Revenu net disponible" value={fmtEUR(result.revenuNetDisponibleMois)} />
          <Row label="− Épargne-pension / assurances" value={`−${fmtEUR(result.epargneMensuelleTotale)}`} />
          <Row label="− Charges personnelles" value={`−${fmtEUR(result.chargesPersoMensuelles)}`} />
          <div className="mt-1 flex items-center justify-between border-t border-line pt-1.5 font-bold">
            <span className="text-ink">= Épargne mensuelle moyenne</span>
            <span className={result.epargneMensuelleMoyenne >= 0 ? "text-gold-light" : "text-red"}>
              {fmtEUR(result.epargneMensuelleMoyenne)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">Fonds d&apos;urgence</div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-bold text-ink">
            {fmtEUR(settings.fonds_urgence_actuel)} / {fmtEUR(result.fondsUrgenceCible)}
          </span>
          <span className="text-xs text-muted">
            Objectif : {settings.objectif_fonds_urgence_mois} mois de charges pro. (
            {Math.round(result.fondsUrgenceProgression * 100)}% atteint)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-card-alt">
          <div
            className="h-full rounded-full bg-gold"
            style={{ width: `${Math.min(100, result.fondsUrgenceProgression * 100)}%` }}
          />
        </div>
      </div>

      <GoalsSection personId={personId} goals={goals} setGoals={setGoals} supabase={supabase} />

      <SettingsSection settings={settings} setSettings={setSettings} supabase={supabase} />
    </div>
  );
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-serif text-lg font-semibold text-gold-light">{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

function ExpensesSection({
  personId,
  expenses,
  setExpenses,
  supabase,
}: {
  personId: string;
  expenses: Expense[];
  setExpenses: (fn: (prev: Expense[]) => Expense[]) => void;
  supabase: SupabaseClient;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyExpenseForm);

  const add = async () => {
    const montant = parseFloat(form.montant.replace(",", ".")) || 0;
    if (!form.categorie.trim() || montant <= 0) return;
    const { data } = await supabase
      .from("expenses")
      .insert({
        person_id: personId,
        categorie: form.categorie.trim(),
        montant,
        type: form.type,
        date: form.date,
        recurrente: form.recurrente,
      })
      .select()
      .single();
    if (data) setExpenses((prev) => [data as Expense, ...prev]);
    setForm(emptyExpenseForm);
    setShowForm(false);
  };

  const remove = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id);
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Charges (pro &amp; personnelles)</div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gold px-2.5 py-1 text-xs font-bold text-night">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {expenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-card-alt p-2.5">
            <div className="flex-1">
              <div className="text-sm font-bold text-ink">{e.categorie}</div>
              <div className="text-[11px] text-muted">
                {e.type === "professionnelle" ? "Professionnelle" : "Personnelle"}
                {e.recurrente ? " · récurrente" : ""} · {fmtDate(e.date)}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <span className="text-sm font-bold text-ink">{fmtEUR(e.montant)}</span>
              <button onClick={() => remove(e.id)}>
                <Trash2 size={13} className="text-red" />
              </button>
            </div>
          </div>
        ))}
        {expenses.length === 0 && <div className="text-xs text-muted">Aucune dépense enregistrée.</div>}
      </div>

      {showForm && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-2.5">
          <input
            value={form.categorie}
            onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
            placeholder="ex. Carburant, Loyer..."
            className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={form.montant}
              onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
              placeholder="Montant (€)"
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ExpenseType }))}
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            >
              <option value="professionnelle">Professionnelle</option>
              <option value="personnelle">Personnelle</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="flex-1 rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="checkbox"
                checked={form.recurrente}
                onChange={(e) => setForm((f) => ({ ...f, recurrente: e.target.checked }))}
              />
              Récurrente
            </label>
          </div>
          <button onClick={add} className="rounded-md bg-gold py-1.5 text-xs font-bold text-night">
            Ajouter la dépense
          </button>
        </div>
      )}
    </div>
  );
}

function SavingsSection({
  personId,
  deductibleSavings,
  setDeductibleSavings,
  settings,
  supabase,
}: {
  personId: string;
  deductibleSavings: DeductibleSaving[];
  setDeductibleSavings: (fn: (prev: DeductibleSaving[]) => DeductibleSaving[]) => void;
  settings: FinancialSettings;
  supabase: SupabaseClient;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptySavingForm);

  const capitalProjete = useMemo(() => {
    const cotisationAnnuelleTotale = deductibleSavings.reduce((s, d) => s + cotisationAnnuelle(d), 0);
    const r = settings.rendement_epargne_pension;
    const n = settings.annees_avant_pension;
    return r > 0 ? cotisationAnnuelleTotale * ((Math.pow(1 + r, n) - 1) / r) : cotisationAnnuelleTotale * n;
  }, [deductibleSavings, settings]);

  const add = async () => {
    const cotisation = parseFloat(form.cotisation_mensuelle.replace(",", ".")) || 0;
    const taux = (parseFloat(form.avantage_fiscal_taux.replace(",", ".")) || 0) / 100;
    if (cotisation <= 0) return;
    const { data } = await supabase
      .from("deductible_savings")
      .insert({
        person_id: personId,
        type: form.type,
        nom: form.nom.trim() || null,
        cotisation_mensuelle: cotisation,
        avantage_fiscal_taux: taux,
      })
      .select()
      .single();
    if (data) setDeductibleSavings((prev) => [...prev, data as DeductibleSaving]);
    setForm(emptySavingForm);
    setShowForm(false);
  };

  const remove = async (id: string) => {
    setDeductibleSavings((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("deductible_savings").delete().eq("id", id);
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Épargne-pension &amp; assurances déductibles
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gold px-2.5 py-1 text-xs font-bold text-night">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {deductibleSavings.map((d) => (
          <div key={d.id} className="rounded-lg border border-line bg-card-alt p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">{d.nom || DEDUCTIBLE_TYPE_LABEL[d.type]}</div>
                <div className="text-[11px] text-muted">
                  {DEDUCTIBLE_TYPE_LABEL[d.type]} · {fmtEUR(d.cotisation_mensuelle)}/mois · avantage fiscal{" "}
                  {Math.round(d.avantage_fiscal_taux * 100)}%
                </div>
              </div>
              <button onClick={() => remove(d.id)}>
                <Trash2 size={13} className="text-red" />
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted">Cotisation/an</div>
                <div className="font-bold text-ink">{fmtEUR(cotisationAnnuelle(d))}</div>
              </div>
              <div>
                <div className="text-muted">Avantage fiscal/an</div>
                <div className="font-bold text-green">{fmtEUR(avantageFiscalAnnuel(d, settings.taxe_communale))}</div>
              </div>
              <div>
                <div className="text-muted">Coût réel net/an</div>
                <div className="font-bold text-ink">{fmtEUR(coutReelNetAnnuel(d, settings.taxe_communale))}</div>
              </div>
            </div>
          </div>
        ))}
        {deductibleSavings.length === 0 && <div className="text-xs text-muted">Aucun produit enregistré.</div>}
      </div>

      {deductibleSavings.length > 0 && (
        <div className="mt-3 border-t border-line pt-2.5 text-xs text-muted">
          Capital projeté dans {settings.annees_avant_pension} ans (cotisations constantes, rendement{" "}
          {(settings.rendement_epargne_pension * 100).toFixed(1)}%/an) :{" "}
          <span className="font-bold text-ink">{fmtEUR(capitalProjete)}</span>
          <div className="mt-1">
            Projection indicative uniquement — ne tient pas compte de la fiscalité à la sortie (précompte, cotisation
            INAMI, solidarité) ni des plafonds légaux propres à chaque produit.
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-2.5">
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DeductibleSavingType }))}
            className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          >
            {(Object.keys(DEDUCTIBLE_TYPE_LABEL) as DeductibleSavingType[]).map((t) => (
              <option key={t} value={t}>
                {DEDUCTIBLE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <input
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            placeholder="ex. PLCI chez Ethias (optionnel)"
            className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={form.cotisation_mensuelle}
              onChange={(e) => setForm((f) => ({ ...f, cotisation_mensuelle: e.target.value }))}
              placeholder="Cotisation mensuelle (€)"
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={form.avantage_fiscal_taux}
              onChange={(e) => setForm((f) => ({ ...f, avantage_fiscal_taux: e.target.value }))}
              placeholder="Avantage fiscal (%)"
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
          </div>
          <button onClick={add} className="rounded-md bg-gold py-1.5 text-xs font-bold text-night">
            Ajouter
          </button>
        </div>
      )}
    </div>
  );
}

function GoalsSection({
  personId,
  goals,
  setGoals,
  supabase,
}: {
  personId: string;
  goals: SavingsGoal[];
  setGoals: (fn: (prev: SavingsGoal[]) => SavingsGoal[]) => void;
  supabase: SupabaseClient;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyGoalForm);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateValue, setUpdateValue] = useState("");

  const add = async () => {
    const cible = parseFloat(form.montant_cible.replace(",", ".")) || 0;
    const actuel = parseFloat(form.montant_actuel.replace(",", ".")) || 0;
    if (!form.nom.trim() || cible <= 0) return;
    const { data } = await supabase
      .from("savings_goals")
      .insert({
        person_id: personId,
        nom: form.nom.trim(),
        montant_cible: cible,
        montant_actuel: actuel,
        date_cible: form.date_cible || null,
      })
      .select()
      .single();
    if (data) setGoals((prev) => [...prev, data as SavingsGoal]);
    setForm(emptyGoalForm);
    setShowForm(false);
  };

  const remove = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("savings_goals").delete().eq("id", id);
  };

  const update = async (id: string) => {
    const num = parseFloat(updateValue.replace(",", ".")) || 0;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, montant_actuel: num } : g)));
    setUpdatingId(null);
    await supabase.from("savings_goals").update({ montant_actuel: num }).eq("id", id);
  };

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Objectifs d&apos;épargne</div>
        <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-gold px-2.5 py-1 text-xs font-bold text-night">
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {goals.map((g) => (
          <div key={g.id} className="rounded-lg border border-line bg-card-alt p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">{g.nom}</div>
                <div className="text-[11px] text-muted">
                  {fmtEUR(g.montant_actuel)} / {fmtEUR(g.montant_cible)}
                  {g.date_cible ? ` · ${fmtDate(g.date_cible)}` : ""}
                </div>
              </div>
              <button onClick={() => remove(g.id)}>
                <Trash2 size={13} className="text-red" />
              </button>
            </div>
            <div className="mt-1 text-xs text-muted">
              {fmtEUR(mensualiteObjectif(g))}/mois nécessaire
              {g.date_cible ? ` (${moisRestants(g.date_cible)} mois restants)` : ""}
            </div>
            {updatingId === g.id ? (
              <div className="mt-1.5 flex gap-1.5">
                <input
                  type="number"
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  className="flex-1 rounded-md border border-line bg-card px-2 py-1 text-xs text-ink outline-none focus:border-gold"
                />
                <button onClick={() => update(g.id)} className="rounded-md bg-gold px-2 py-1 text-xs font-bold text-night">
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setUpdatingId(g.id);
                  setUpdateValue(String(g.montant_actuel));
                }}
                className="mt-1.5 text-[11px] font-bold text-gold-light"
              >
                Mettre à jour
              </button>
            )}
          </div>
        ))}
        {goals.length === 0 && <div className="text-xs text-muted">Aucun objectif pour l&apos;instant.</div>}
      </div>

      {showForm && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-line bg-card-alt p-2.5">
          <input
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            placeholder="ex. Achat véhicule professionnel"
            className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={form.montant_cible}
              onChange={(e) => setForm((f) => ({ ...f, montant_cible: e.target.value }))}
              placeholder="Montant cible (€)"
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
            <input
              type="number"
              min={0}
              value={form.montant_actuel}
              onChange={(e) => setForm((f) => ({ ...f, montant_actuel: e.target.value }))}
              placeholder="Déjà épargné (€)"
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
            />
          </div>
          <input
            type="date"
            value={form.date_cible}
            onChange={(e) => setForm((f) => ({ ...f, date_cible: e.target.value }))}
            className="w-full rounded-md border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
          />
          <button onClick={add} className="rounded-md bg-gold py-1.5 text-xs font-bold text-night">
            Créer l&apos;objectif
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsSection({
  settings,
  setSettings,
  supabase,
}: {
  settings: FinancialSettings;
  setSettings: (fn: (prev: FinancialSettings) => FinancialSettings) => void;
  supabase: SupabaseClient;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    taux_cotisations_sociales: String(settings.taux_cotisations_sociales * 100),
    taux_imposition: String(settings.taux_imposition * 100),
    taxe_communale: String(settings.taxe_communale * 100),
    objectif_fonds_urgence_mois: String(settings.objectif_fonds_urgence_mois),
    fonds_urgence_actuel: String(settings.fonds_urgence_actuel),
    rendement_epargne_pension: String(settings.rendement_epargne_pension * 100),
    annees_avant_pension: String(settings.annees_avant_pension),
  });

  const save = async () => {
    const patch = {
      person_id: settings.person_id,
      taux_cotisations_sociales: (parseFloat(form.taux_cotisations_sociales.replace(",", ".")) || 0) / 100,
      taux_imposition: (parseFloat(form.taux_imposition.replace(",", ".")) || 0) / 100,
      taxe_communale: (parseFloat(form.taxe_communale.replace(",", ".")) || 0) / 100,
      objectif_fonds_urgence_mois: parseFloat(form.objectif_fonds_urgence_mois.replace(",", ".")) || 0,
      fonds_urgence_actuel: parseFloat(form.fonds_urgence_actuel.replace(",", ".")) || 0,
      rendement_epargne_pension: (parseFloat(form.rendement_epargne_pension.replace(",", ".")) || 0) / 100,
      annees_avant_pension: parseInt(form.annees_avant_pension, 10) || 0,
    };
    const { data } = await supabase
      .from("financial_settings")
      .upsert(patch, { onConflict: "person_id" })
      .select()
      .single();
    if (data) setSettings(() => data as FinancialSettings);
    setOpen(false);
  };

  const field = (key: keyof typeof form, label: string) => (
    <div>
      <label className="mb-1 block text-[10px] text-muted">{label}</label>
      <input
        type="number"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-md border border-line bg-card-alt px-2 py-1.5 text-xs text-ink outline-none focus:border-gold"
      />
    </div>
  );

  return (
    <div className="mt-4 rounded-2xl border border-line bg-card p-3.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Hypothèses fiscales &amp; sociales
        </span>
        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-2.5">
            {field("taux_cotisations_sociales", "Cotisations sociales (%)")}
            {field("taux_imposition", "Imposition moyenne (%)")}
            {field("taxe_communale", "Taxe communale (%)")}
            {field("objectif_fonds_urgence_mois", "Fonds d'urgence — objectif (mois)")}
            {field("fonds_urgence_actuel", "Fonds d'urgence — montant épargné (€)")}
            {field("rendement_epargne_pension", "Rendement épargne-pension (%/an)")}
            {field("annees_avant_pension", "Années avant la pension")}
          </div>
          <button onClick={save} className="rounded-lg bg-gold py-2 text-sm font-bold text-night">
            Enregistrer
          </button>
        </div>
      )}
    </div>
  );
}
