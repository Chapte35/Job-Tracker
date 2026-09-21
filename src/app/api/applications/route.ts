import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabase
    .from("applications")
    .select(`
      *,
      offer:offers(id, title, company, location, url, source),
      follow_ups(id, scheduled_at, sent_at, status, subject, body)
    `)
    .order("sent_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
