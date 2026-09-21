import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3";

/**
 * Supabase Edge Function — send-follow-ups
 * Déclenchée chaque jour par pg_cron.
 * Récupère les relances dues (scheduled_at <= now, status = pending)
 * et les envoie via Resend.
 */

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL")!;
const myEmail = Deno.env.get("MY_EMAIL")!;

Deno.serve(async () => {
  // Récupérer les relances dues
  const { data: followUps, error } = await supabase
    .from("follow_ups")
    .select(`
      id,
      subject,
      body,
      application_id,
      applications (
        email_to,
        offers ( title, company )
      )
    `)
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  if (error) {
    console.error("Erreur fetch follow_ups:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!followUps || followUps.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "Aucune relance due" }), {
      status: 200,
    });
  }

  let sent = 0;
  let failed = 0;

  for (const fu of followUps) {
    const app = fu.applications as {
      email_to: string;
      offers: { title: string; company: string } | null;
    } | null;

    if (!app?.email_to || !fu.subject || !fu.body) {
      console.warn(`follow_up ${fu.id}: données manquantes, skip`);
      continue;
    }

    const recipients = [app.email_to];
    if (myEmail && myEmail !== app.email_to) recipients.push(myEmail);

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject: fu.subject,
      text: fu.body,
    });

    if (sendError) {
      console.error(`follow_up ${fu.id} échec:`, sendError.message);
      failed++;
      continue;
    }

    // Marquer comme envoyé
    await supabase
      .from("follow_ups")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", fu.id);

    sent++;
    console.log(`✅ Relance envoyée: ${app.offers?.title ?? "offre"} → ${app.email_to}`);
  }

  return new Response(
    JSON.stringify({ sent, failed, total: followUps.length }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
