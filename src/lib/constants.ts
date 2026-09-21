import type { ApplicationStatus, OfferSource } from "@/types/supabase";

export const OFFER_SOURCE_LABELS: Record<OfferSource, string> = {
  france_travail:        "France Travail",
  welcome_to_the_jungle: "WTTJ",
  linkedin:              "LinkedIn",
  indeed:                "Indeed",
  manual:                "Manuel",
};

export const OFFER_SOURCE_DOT: Record<OfferSource, string> = {
  welcome_to_the_jungle: "bg-source-wttj",
  france_travail:        "bg-source-ft",
  linkedin:              "bg-source-linkedin",
  indeed:                "bg-source-indeed",
  manual:                "bg-source-manual",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  sent:      "Envoyée",
  interview: "Entretien",
  refused:   "Refus",
  offer:     "Offre reçue",
};

export const DEFAULT_FOLLOW_UP_DELAY_DAYS = 7;

export const OFFER_FILTERS = [
  { id: "all",      label: "Toutes" },
  { id: "new",      label: "Nouvelles" },
  { id: "to_apply", label: "À postuler" },
  { id: "starred",  label: "Suivies" },
  { id: "ignored",  label: "Ignorées" },
] as const;

export type OfferFilter = typeof OFFER_FILTERS[number]["id"];
