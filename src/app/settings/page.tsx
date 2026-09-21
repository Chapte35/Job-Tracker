"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  X,
  RefreshCw,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CandidateProfile } from "@/types/supabase";

// ─── Tag input (array de strings éditable) ────────────────────────────────

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  label: string;
}

function TagInput({ value, onChange, placeholder, label }: TagInputProps) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div>
      <label className="block text-xs font-medium text-ink mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-overlay border border-border-subtle text-xs text-ink"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-ink-faint hover:text-ink transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Ajouter…"}
          className="flex-1 px-3 py-1.5 text-xs rounded-md border border-border bg-bg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="p-1.5 rounded-md border border-border text-ink-faint hover:text-ink hover:bg-bg-overlay disabled:opacity-40 transition-colors"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

// ─── Champ texte simple ────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "tel";
  hint?: string;
}

function Field({ label, value, onChange, placeholder, type = "text", hint }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-bg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

// ─── Champ textarea ────────────────────────────────────────────────────────

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
  mono?: boolean;
}

function TextareaField({ label, value, onChange, placeholder, rows = 4, hint, mono }: TextareaFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          "w-full px-3 py-2 text-xs rounded-md border border-border bg-bg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent resize-y leading-relaxed",
          mono && "font-mono"
        )}
      />
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [classifyState, setClassifyState] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [classifyResult, setClassifyResult] = useState<string | null>(null);
  const [classifyProgress, setClassifyProgress] = useState<{ done: number; failed: number } | null>(null);

  // ── Charger le profil au mount ──
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: CandidateProfile) => setProfile(data))
      .catch(() => {/* silencieux — profil vide */})
      .finally(() => setLoading(false));
  }, []);

  // ── Mutation helper pour les champs simples ──
  const set = useCallback(
    <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
      setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  // ── Sauvegarde ──
  const save = async () => {
    if (!profile) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  // ── Re-classifier toutes les offres (boucle sur les batches de 20) ──
  const reclassify = async () => {
    setClassifyState("running");
    setClassifyResult(null);
    setClassifyProgress({ done: 0, failed: 0 });

    let totalDone = 0;
    let totalFailed = 0;
    let offset = 0;

    try {
      // Boucle avec offset : force=true réanalyse tout, on pagine par batch de 20
      while (true) {
        const res = await fetch("/api/offers/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: true, offset }),
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);

        const data = (await res.json()) as {
          classified: number;
          failed: number;
          total: number;
        };

        totalDone += data.classified;
        totalFailed += data.failed;
        offset += data.total; // avancer de la taille du batch récupéré
        setClassifyProgress({ done: totalDone, failed: totalFailed });

        // Batch vide = plus rien à récupérer → terminé
        if (data.total === 0) break;
      }

      const s = (n: number) => (n > 1 ? "s" : "");
      setClassifyResult(
        totalDone === 0
          ? "Toutes les offres sont déjà analysées."
          : `${totalDone} offre${s(totalDone)} analysée${s(totalDone)}` +
            (totalFailed > 0 ? ` · ${totalFailed} échouée${s(totalFailed)}` : "")
      );
      setClassifyState("done");
    } catch (err) {
      setClassifyResult(err instanceof Error ? err.message : "Erreur inconnue");
      setClassifyState("error");
    } finally {
      setClassifyProgress(null);
    }
  };

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 bg-bg border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-ink">Paramètres</h1>
            <p className="text-xs text-ink-faint mt-0.5">Profil candidat et outils IA</p>
          </div>
          <Button
            size="sm"
            onClick={() => void save()}
            disabled={!profile || saveState === "saving"}
          >
            {saveState === "saving" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : saveState === "saved" ? (
              <CheckCircle size={13} className="text-green-500" />
            ) : saveState === "error" ? (
              <AlertCircle size={13} className="text-red-500" />
            ) : (
              <Save size={13} />
            )}
            {saveState === "saved"
              ? "Sauvegardé"
              : saveState === "error"
              ? "Erreur"
              : "Sauvegarder"}
          </Button>
        </div>

        {/* Contenu */}
        <div className="max-w-2xl mx-auto px-6 py-6 pb-24 space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-xs text-ink-faint">
              <Loader2 size={14} className="animate-spin" />
              Chargement du profil…
            </div>
          ) : !profile ? (
            <p className="text-sm text-red-500">
              Impossible de charger le profil. Vérifie ta connexion Supabase.
            </p>
          ) : (
            <>
              {/* ── Infos générales ── */}
              <Section title="Infos générales">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Nom complet"
                    value={profile.full_name}
                    onChange={(v) => set("full_name", v)}
                    placeholder="Prénom Nom"
                  />
                  <Field
                    label="Titre"
                    value={profile.title}
                    onChange={(v) => set("title", v)}
                    placeholder="Développeur Full-Stack"
                  />
                  <Field
                    label="Localisation"
                    value={profile.location}
                    onChange={(v) => set("location", v)}
                    placeholder="Ville + remote"
                  />
                  <Field
                    label="Disponibilité"
                    value={profile.availability}
                    onChange={(v) => set("availability", v)}
                    placeholder="CDI, Freelance, AT…"
                  />
                  <Field
                    label="Années d'expérience"
                    value={String(profile.experience_years)}
                    onChange={(v) => set("experience_years", parseInt(v, 10) || 0)}
                    type="number"
                  />
                  <Field
                    label="Téléphone"
                    value={profile.phone}
                    onChange={(v) => set("phone", v)}
                    placeholder="06 XX XX XX XX"
                    type="tel"
                    hint="Utilisé pour pré-remplir les candidatures"
                  />
                </div>
              </Section>

              {/* ── Stack technique ── */}
              <Section title="Stack technique">
                <TagInput
                  label="Backend"
                  value={profile.stack_backend}
                  onChange={(v) => set("stack_backend", v)}
                  placeholder="Node.js, Python…"
                />
                <TagInput
                  label="Frontend"
                  value={profile.stack_frontend}
                  onChange={(v) => set("stack_frontend", v)}
                  placeholder="React, Next.js…"
                />
                <TagInput
                  label="Mobile"
                  value={profile.stack_mobile}
                  onChange={(v) => set("stack_mobile", v)}
                  placeholder="React Native, Flutter…"
                />
                <TagInput
                  label="IA / ML"
                  value={profile.stack_ai}
                  onChange={(v) => set("stack_ai", v)}
                  placeholder="LangChain, Ollama…"
                />
                <TagInput
                  label="DevOps / Infra"
                  value={profile.stack_devops}
                  onChange={(v) => set("stack_devops", v)}
                  placeholder="Docker, CI/CD…"
                />
              </Section>

              {/* ── Préférences missions ── */}
              <Section title="Préférences missions">
                <TagInput
                  label="Types de missions recherchées"
                  value={profile.mission_types}
                  onChange={(v) => set("mission_types", v)}
                  placeholder="SaaS B2B, startup, produit…"
                />
                <TagInput
                  label="Ce qui ne m'intéresse pas"
                  value={profile.not_interested}
                  onChange={(v) => set("not_interested", v)}
                  placeholder="Finance, legacy Java…"
                />
              </Section>

              {/* ── Candidature ── */}
              <Section title="Candidature">
                <TextareaField
                  label="Signature mail"
                  value={profile.mail_signature}
                  onChange={(v) => set("mail_signature", v)}
                  rows={4}
                  mono
                  placeholder={`Prénom Nom\nDéveloppeur Full-Stack — EI\nsite.dev`}
                  hint="Utilisée automatiquement à la fin de chaque mail généré par Ollama."
                />
              </Section>

              {/* ── Texte libre (contexte IA) ── */}
              <Section title="Contexte libre pour l'IA">
                <TextareaField
                  label="Description personnalisée"
                  value={profile.free_text}
                  onChange={(v) => set("free_text", v)}
                  rows={6}
                  mono
                  placeholder="Décris ton profil librement : expériences marquantes, stack de prédilection, ambitions, contraintes…"
                  hint="Si vide, un texte est généré automatiquement depuis les champs ci-dessus."
                />
              </Section>

              {/* ── Actions IA ── */}
              <Section title="Actions IA">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-ink">Re-classifier toutes les offres</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Relance le scoring IA sur toutes les offres non ignorées (max 20 à la fois).
                      Prend environ 1–2 min selon le modèle.
                    </p>
                    {classifyProgress && (
                      <p className="text-xs mt-1.5 text-ink-faint">
                        <Loader2 size={10} className="inline animate-spin mr-1" />
                        {classifyProgress.done} analysée{classifyProgress.done > 1 ? "s" : ""}…
                      </p>
                    )}
                    {classifyResult && !classifyProgress && (
                      <p
                        className={cn(
                          "text-xs mt-1.5",
                          classifyState === "error" ? "text-red-500" : "text-green-600 dark:text-green-400"
                        )}
                      >
                        {classifyState === "done" ? "✓ " : "✗ "}
                        {classifyResult}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void reclassify()}
                    disabled={classifyState === "running"}
                    className="shrink-0"
                  >
                    {classifyState === "running" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    {classifyState === "running" ? "En cours…" : "Lancer"}
                  </Button>
                </div>
              </Section>
            </>
          )}
        </div>
        {/* Footer sticky — bouton sauvegarder en bas de page */}
        {profile && (
          <div className="fixed bottom-0 left-0 right-0 z-10 bg-bg border-t border-border px-6 py-3 flex justify-end">
            <Button
              size="sm"
              onClick={() => void save()}
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saveState === "saved" ? (
                <CheckCircle size={13} className="text-green-500" />
              ) : saveState === "error" ? (
                <AlertCircle size={13} className="text-red-500" />
              ) : (
                <Save size={13} />
              )}
              {saveState === "saved"
                ? "Sauvegardé"
                : saveState === "error"
                ? "Erreur"
                : "Sauvegarder"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
