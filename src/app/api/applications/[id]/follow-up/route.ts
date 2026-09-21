import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/server";

// Annuler la relance planifiée d'une candidature
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "cancelled" })
    .eq("application_id", params.id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
