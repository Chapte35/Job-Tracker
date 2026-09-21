import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types/supabase";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = (await req.json()) as { status?: ApplicationStatus };

  const { data, error } = await supabase
    .from("applications")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
