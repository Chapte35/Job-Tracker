/**
 * Lecture du profil candidat depuis Supabase.
 * Expose un helper buildProfileText() pour le passer aux prompts Ollama.
 */

import { supabaseServer } from "@/lib/supabase/server";
import type { CandidateProfile } from "@/types/supabase";

let profileCache: CandidateProfile | null = null;
let profileCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function getCandidateProfile(): Promise<CandidateProfile | null> {
  const now = Date.now();
  if (profileCache && now - profileCacheAt < CACHE_TTL_MS) {
    return profileCache;
  }

  const { data, error } = await supabaseServer
    .from("candidate_profile")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) return null;

  profileCache = data as CandidateProfile;
  profileCacheAt = now;
  return profileCache;
}

/** Invalide le cache (utile après une mise à jour du profil) */
export function invalidateProfileCache() {
  profileCache = null;
  profileCacheAt = 0;
}

/**
 * Construit le texte de profil à injecter dans les prompts.
 * Si le profil a un free_text non-vide, on l'utilise en priorité.
 * Sinon on construit depuis les champs structurés.
 */
export function buildProfileText(profile: CandidateProfile): string {
  if (profile.free_text?.trim()) {
    return profile.free_text.trim();
  }

  const stacks = [
    profile.stack_backend?.length ? `Back-End: ${profile.stack_backend.join(", ")}` : null,
    profile.stack_frontend?.length ? `Front-End: ${profile.stack_frontend.join(", ")}` : null,
    profile.stack_mobile?.length ? `Mobile: ${profile.stack_mobile.join(", ")}` : null,
    profile.stack_ai?.length ? `IA/Automation: ${profile.stack_ai.join(", ")}` : null,
    profile.stack_devops?.length ? `DevOps: ${profile.stack_devops.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const parts = [
    `Candidat : ${profile.full_name}`,
    `Poste visé : ${profile.title}`,
    `Localisation : ${profile.location} — Disponibilité : ${profile.availability}`,
    `Expérience : ${profile.experience_years} ans en production`,
    stacks ? `\nStack technique :\n${stacks}` : "",
    profile.mission_types?.length
      ? `\nTypes de mission : ${profile.mission_types.join(", ")}`
      : "",
    profile.not_interested?.length
      ? `Pas intéressé par : ${profile.not_interested.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return parts;
}
