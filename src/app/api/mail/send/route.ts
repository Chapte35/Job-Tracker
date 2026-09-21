import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase/server";
import { generateCvPdf } from "@/lib/cv/generator";
import { generateFollowUpMail } from "@/lib/mail/ollama";
import type { CvPatch } from "@/lib/cv/patcher";

// ─── Conversion texte brut → HTML email ───────────────────────────────────────

function mailTextToHtml(text: string): string {
  const lines = text.split("\n");
  const htmlLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed === "") return '<div style="height:12px"></div>';
    return `<p style="margin:0;padding:0;line-height:1.6">${trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Candidature</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7">
          <tr>
            <td style="background:#18181b;padding:20px 32px">
              <p style="margin:0;color:#ffffff;font-size:13px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;opacity:0.7">Candidature</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#18181b;font-size:15px">
              ${htmlLines.join("\n              ")}
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px">
              <a href="https://chapte.dev" style="color:#71717a;font-size:12px;text-decoration:none">chapte.dev</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const maxDuration = 120;

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendMailBody {
  offerId: string;
  emailTo: string;
  subject: string;
  body: string;
  followUpDelayDays: number;
  cvPatch: CvPatch;
}

export async function POST(req: NextRequest) {
  let body: SendMailBody;
  try {
    body = (await req.json()) as SendMailBody;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { offerId, emailTo, subject, body: mailBody, followUpDelayDays, cvPatch } = body;

  if (!offerId || !emailTo || !subject || !mailBody) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const myEmail = process.env.MY_EMAIL;

  if (!fromEmail) {
    return NextResponse.json({ error: "RESEND_FROM_EMAIL non configuré" }, { status: 500 });
  }

  // 1. Récupérer l'offre pour le mail de relance
  const { data: offer } = await supabaseServer
    .from("offers")
    .select("title, company")
    .eq("id", offerId)
    .single();

  // 2. Générer le PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateCvPdf(cvPatch);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Génération CV: ${msg}` }, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const pdfFilename = `CV_LIGHT_${date}_Sébastien_LALOË.pdf`;

  // 3. Envoyer via Resend
  const recipients = [emailTo];
  if (myEmail && myEmail !== emailTo) recipients.push(myEmail);

  const { data: resendData, error: resendError } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject,
    text: mailBody,
    html: mailTextToHtml(mailBody),
    attachments: [{ filename: pdfFilename, content: pdfBuffer }],
  });

  if (resendError) {
    return NextResponse.json({ error: resendError.message }, { status: 500 });
  }

  const sentAt = new Date().toISOString();

  // 4. Enregistrer la candidature en DB
  const { data: application, error: dbError } = await supabaseServer
    .from("applications")
    .insert({
      offer_id: offerId,
      email_to: emailTo,
      subject,
      body: mailBody,
      status: "sent",
      sent_at: sentAt,
      follow_up_delay_days: followUpDelayDays,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[mail/send] DB error:", dbError);
  }

  // 5. Générer et stocker le mail de relance
  if (application?.id && followUpDelayDays > 0 && offer) {
    const scheduledAt = new Date(
      Date.now() + followUpDelayDays * 24 * 60 * 60 * 1000
    ).toISOString();

    // Générer le mail de relance via Qwen pendant qu'on a le contexte
    let followUpSubject = `Relance — ${offer.title} chez ${offer.company}`;
    let followUpBody = `Bonjour,\n\nJe me permets de relancer suite à ma candidature du ${new Date(sentAt).toLocaleDateString("fr-FR")} pour le poste de ${offer.title}.\n\nLe poste est-il toujours disponible ?\n\nCordialement,\nSébastien Laloë\nchapte.dev`;

    try {
      const generated = await generateFollowUpMail({
        offerTitle: offer.title,
        offerCompany: offer.company,
        originalMailBody: mailBody,
        sentAt,
        delayDays: followUpDelayDays,
      });
      followUpSubject = generated.subject;
      followUpBody = generated.body;
    } catch (err) {
      // Fallback sur le template par défaut si Qwen échoue
      console.warn("[mail/send] Génération relance échouée, fallback template:", err);
    }

    await supabaseServer.from("follow_ups").insert({
      application_id: application.id,
      scheduled_at: scheduledAt,
      subject: followUpSubject,
      body: followUpBody,
      status: "pending",
    });
  }

  // 6. Mettre à jour le statut de l'offre
  await supabaseServer
    .from("offers")
    .update({ status: "to_apply" })
    .eq("id", offerId);

  return NextResponse.json({
    success: true,
    emailId: resendData?.id,
    applicationId: application?.id,
  });
}
