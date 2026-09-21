export type OfferSource =
  | "france_travail"
  | "welcome_to_the_jungle"
  | "linkedin"
  | "indeed"
  | "manual";

export type OfferStatus = "new" | "to_apply" | "ignored";

export type ApplicationStatus = "sent" | "interview" | "refused" | "offer";

export type FollowUpStatus = "pending" | "sent" | "cancelled";

export interface Offer {
  id: string;
  url: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  contract_type: string | null;
  description: string | null;
  source: OfferSource;
  status: OfferStatus;
  starred: boolean;
  relevance_score: number | null;
  relevance_summary: string | null;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface CvVersion {
  id: string;
  label: string;
  file_path: string;
  created_at: string;
}

export interface Application {
  id: string;
  offer_id: string;
  cv_version_id: string | null;
  email_to: string;
  subject: string;
  body: string;
  status: ApplicationStatus;
  sent_at: string;
  follow_up_delay_days: number;
  created_at: string;
  updated_at: string;
  offer?: Offer;
  cv_version?: CvVersion;
}

export interface FollowUp {
  id: string;
  application_id: string;
  scheduled_at: string;
  sent_at: string | null;
  subject: string | null;
  body: string | null;
  status: FollowUpStatus;
  created_at: string;
  application?: Application;
}

export type CreateOfferPayload = Omit<
  Offer,
  "id" | "created_at" | "updated_at" | "scraped_at" | "starred" | "relevance_score" | "relevance_summary"
> & { scraped_at?: string };

export type CreateApplicationPayload = Omit<
  Application,
  "id" | "created_at" | "updated_at" | "sent_at" | "offer" | "cv_version"
> & { sent_at?: string };
