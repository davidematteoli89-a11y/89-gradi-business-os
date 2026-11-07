"use server";

import { revalidatePath } from "next/cache";
import { dataMode, getDataset } from "@/lib/data/source";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validation/finance";
import { linkSchema, partnerSchema, sharesSchema } from "@/lib/validation/settings";

const DEMO = "Modalità demo: non salvato.";

async function adminOnly(): Promise<ActionResult | null> {
  const ds = await getDataset();
  return ds.currentUser.role === "admin" ? null : { ok: false, message: "Solo un amministratore può modificare soci e quote." };
}

function errors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.join(".")] ??= i.message;
  return out;
}

export async function addPartner(input: unknown): Promise<ActionResult> {
  const parsed = partnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors: errors(parsed.error.issues) };
  const denied = await adminOnly();
  if (denied) return denied;
  const v = parsed.data;
  if (dataMode() === "demo") return { ok: true, message: `Socio ${v.name} verificato. ${DEMO}` };

  const sb = await createSupabaseServerClient();
  const { data: partner, error } = await sb
    .from("g89_partners")
    .insert({ name: v.name, short_name: v.shortName, color: v.color })
    .select("id")
    .single();
  if (error) return { ok: false, message: `Socio non salvato: ${error.message}` };

  if (v.email) {
    const { error: le } = await sb.rpc("g89_link_user", { p_email: v.email, p_partner_id: partner.id, p_role: v.role, p_display_name: v.name });
    revalidatePath("/", "layout");
    if (le) return { ok: true, id: partner.id, message: `Socio aggiunto, ma l'accesso non è stato collegato: ${le.message}` };
    return { ok: true, id: partner.id, message: `Socio aggiunto e collegato a ${v.email}` };
  }
  revalidatePath("/", "layout");
  return { ok: true, id: partner.id, message: "Socio aggiunto" };
}

export async function linkPartnerAccount(input: unknown): Promise<ActionResult> {
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors: errors(parsed.error.issues) };
  const denied = await adminOnly();
  if (denied) return denied;
  const v = parsed.data;
  if (dataMode() === "demo") return { ok: true, message: `Accesso verificato. ${DEMO}` };
  const ds = await getDataset();
  const name = ds.partners.find((p) => p.id === v.partnerId)?.name ?? v.email;
  const sb = await createSupabaseServerClient();
  const { error } = await sb.rpc("g89_link_user", { p_email: v.email, p_partner_id: v.partnerId, p_role: v.role, p_display_name: name });
  if (error) return { ok: false, message: error.message, fieldErrors: { email: error.message } };
  revalidatePath("/", "layout");
  return { ok: true, message: `Accesso collegato a ${v.email}` };
}

export async function setShares(input: unknown): Promise<ActionResult> {
  const parsed = sharesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: Object.values(errors(parsed.error.issues))[0], fieldErrors: errors(parsed.error.issues) };
  const denied = await adminOnly();
  if (denied) return denied;
  const v = parsed.data;
  if (dataMode() === "demo") return { ok: true, message: `Quote verificate. ${DEMO}` };
  const sb = await createSupabaseServerClient();
  // un'unica insert: il controllo "somma 100%" scatta a fine transazione
  const { error } = await sb.from("g89_partner_shares").upsert(
    v.shares.map((s) => ({ partner_id: s.partnerId, share_bp: Math.round(Number(s.percent.replace(",", ".")) * 100), valid_from: v.validFrom })),
    { onConflict: "partner_id,valid_from" },
  );
  if (error) return { ok: false, message: `Quote non salvate: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, message: "Quote salvate" };
}

export async function listAccess(): Promise<{ userId: string; email: string; role: string; partnerId: string | null; displayName: string }[]> {
  if (dataMode() !== "supabase") return [];
  const sb = await createSupabaseServerClient();
  const { data } = await sb.rpc("g89_list_access");
  return ((data ?? []) as { user_id: string; email: string; role: string; partner_id: string | null; display_name: string }[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role,
    partnerId: r.partner_id,
    displayName: r.display_name,
  }));
}
