import { NextRequest, NextResponse } from "next/server";
import { generateMail, type MailGenerationInput } from "@/lib/mail/ollama";
import { getCandidateProfile } from "@/lib/ai/profile";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: MailGenerationInput;
  try {
    body = (await req.json()) as MailGenerationInput;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.offerTitle || !body.offerCompany) {
    return NextResponse.json(
      { error: "offerTitle et offerCompany requis" },
      { status: 400 }
    );
  }

  try {
    // Injecter la signature depuis le profil si non fournie dans le body
    if (!body.signature) {
      const profile = await getCandidateProfile();
      if (profile?.mail_signature?.trim()) {
        body = { ...body, signature: profile.mail_signature };
      }
    }

    const mail = await generateMail(body);
    return NextResponse.json(mail);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mail/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
