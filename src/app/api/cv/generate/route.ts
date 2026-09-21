import { NextRequest, NextResponse } from "next/server";
import { generateCvPdf } from "@/lib/cv/generator";
import type { CvPatch } from "@/lib/cv/patcher";

export const maxDuration = 30;

interface GenerateCvBody {
  accroche: string;
  accentTags: string[];
}

export async function POST(req: NextRequest) {
  let body: GenerateCvBody;
  try {
    body = (await req.json()) as GenerateCvBody;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (!body.accroche) {
    return NextResponse.json({ error: "accroche requise" }, { status: 400 });
  }

  const patch: CvPatch = {
    accroche: body.accroche,
    accentTags: body.accentTags ?? [],
  };

  try {
    const pdfBuffer = await generateCvPdf(patch);
    const base64 = pdfBuffer.toString("base64");

    return NextResponse.json({ pdf: base64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cv/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
