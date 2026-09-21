"use client";

import { useEffect, useState, useCallback } from "react";
import { ExternalLink, MoreHorizontal, X, CheckCircle, XCircle, Clock, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ApplicationStatus, FollowUpStatus } from "@/types/supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FollowUpRow {
  id: string;
  scheduled_at: string;
  sent_at: string | null;
  status: FollowUpStatus;
  subject: string | null;
  body: string | null;
}

interface OfferSnippet {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  source: string;
}

interface ApplicationRow {
  id: string;
  offer_id: string;
  email_to: string;
  subject: string;
  body: string;
  status: ApplicationStatus;
  sent_at: string;
  follow_up_delay_days: number;
  offer: OfferSnippet | null;
  follow_ups: FollowUpRow[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  sent:      "Envoyée",
  interview: "Entretien",
  refused:   "Refusée",
  offer:     "Offre reçue",
};

const STATUS_VARIANT: Record<ApplicationStatus, "default" | "secondary" | "success" | "warning" | "danger"> = {
  sent:      "secondary",
  interview: "default",
  refused:   "danger",
  offer:     "success",
};

function getFollowUpBadge(followUps: FollowUpRow[]) {
  const pending = followUps.find((f) => f.status === "pending");
  const sent    = followUps.find((f) => f.status === "sent");

  if (pending) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="h-3 w-3" />
        Relance le {new Date(pending.scheduled_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </Badge>
    );
  }
  if (sent) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Mail className="h-3 w-3" />
        Relance envoyée
      </Badge>
    );
  }
  return <span className="text-ink-faint text-xs">—</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Modale de confirmation ────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, description, confirmLabel, variant = "default", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>Annuler</Button>
          <Button variant={variant === "danger" ? "danger" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modale corps du mail ──────────────────────────────────────────────────────

function MailBodyDialog({ app, onClose }: { app: ApplicationRow | null; onClose: () => void }) {
  if (!app) return null;
  return (
    <Dialog open={!!app} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mail envoyé — {app.offer?.company ?? "?"}</DialogTitle>
          <DialogDescription className="text-xs font-mono">{app.subject}</DialogDescription>
        </DialogHeader>
        <pre className="text-sm text-ink whitespace-pre-wrap font-mono leading-relaxed bg-bg-overlay rounded-md p-4 mt-2 border border-border text-xs">
          {app.body}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    variant?: "danger" | "default";
    action: () => Promise<void>;
  } | null>(null);

  const [mailApp, setMailApp] = useState<ApplicationRow | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = (await res.json()) as ApplicationRow[];
      setApps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  function askCancelFollowUp(app: ApplicationRow) {
    setConfirm({
      title: "Annuler la relance",
      description: `Annuler la relance planifiée pour « ${app.offer?.title ?? app.subject} » ?`,
      confirmLabel: "Annuler la relance",
      variant: "danger",
      action: async () => {
        await fetch(`/api/applications/${app.id}/follow-up`, { method: "DELETE" });
        await fetchApps();
      },
    });
  }

  function askUpdateStatus(app: ApplicationRow, status: ApplicationStatus) {
    const label = STATUS_LABELS[status];
    setConfirm({
      title: `Marquer comme « ${label} »`,
      description: `Mettre à jour le statut de la candidature chez ${app.offer?.company ?? "?"} ?`,
      confirmLabel: `Marquer ${label}`,
      action: async () => {
        await fetch(`/api/applications/${app.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        await fetchApps();
      },
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 h-[52px] flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-medium text-ink">Candidatures</h1>
          <span className="text-xs text-ink-faint">
            {apps.length} envoyée{apps.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-40 text-ink-faint text-sm">
            Chargement…
          </div>
        )}

        {error && (
          <div className="m-6 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs">
            {error}
          </div>
        )}

        {!loading && !error && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-1.5">
            <p className="text-ink-muted text-sm">Aucune candidature pour l&apos;instant.</p>
            <p className="text-ink-faint text-xs">Postule depuis la vue Offres !</p>
          </div>
        )}

        {!loading && !error && apps.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-ink-muted w-1/3">Poste</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-muted">Date d&apos;envoi</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-muted">Statut</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-ink-muted">Relance</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apps.map((app) => (
                <tr key={app.id} className="hover:bg-bg-overlay transition-colors group">
                  {/* Poste */}
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-ink text-sm truncate max-w-xs">
                        {app.offer?.title ?? app.subject}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-muted text-xs">{app.offer?.company}</span>
                        {app.offer?.location && (
                          <>
                            <span className="text-border-strong text-xs">·</span>
                            <span className="text-ink-faint text-xs">{app.offer.location}</span>
                          </>
                        )}
                        {app.offer?.url && (
                          <a
                            href={app.offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink-faint hover:text-ink transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-ink-muted text-xs whitespace-nowrap">
                    {formatDate(app.sent_at)}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[app.status]}>
                      {STATUS_LABELS[app.status]}
                    </Badge>
                  </td>

                  {/* Relance */}
                  <td className="px-4 py-3">
                    {getFollowUpBadge(app.follow_ups ?? [])}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                        <DropdownMenuItem onClick={() => setMailApp(app)}>
                          <Mail className="h-4 w-4" />
                          Voir le mail envoyé
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>

                        {app.status !== "interview" && (
                          <DropdownMenuItem onClick={() => askUpdateStatus(app, "interview")}>
                            <CheckCircle className="h-4 w-4" />
                            Entretien obtenu
                          </DropdownMenuItem>
                        )}
                        {app.status !== "offer" && (
                          <DropdownMenuItem onClick={() => askUpdateStatus(app, "offer")}>
                            <CheckCircle className="h-4 w-4" />
                            Offre reçue
                          </DropdownMenuItem>
                        )}
                        {app.status !== "refused" && (
                          <DropdownMenuItem onClick={() => askUpdateStatus(app, "refused")}>
                            <XCircle className="h-4 w-4 text-red-500" />
                            Marquer refusée
                          </DropdownMenuItem>
                        )}
                        {app.status !== "sent" && (
                          <DropdownMenuItem onClick={() => askUpdateStatus(app, "sent")}>
                            <Mail className="h-4 w-4" />
                            Remettre en &quot;Envoyée&quot;
                          </DropdownMenuItem>
                        )}

                        {app.follow_ups?.some((f) => f.status === "pending") && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => askCancelFollowUp(app)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <X className="h-4 w-4" />
                              Annuler la relance
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? "Confirmer"}
        variant={confirm?.variant}
        onConfirm={async () => {
          await confirm?.action();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      <MailBodyDialog app={mailApp} onClose={() => setMailApp(null)} />
    </div>
  );
}
