import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // skip verification if not configured

  const xSignature = req.headers.get("x-signature") ?? ""
  const xRequestId = req.headers.get("x-request-id") ?? ""
  const dataId = new URL(req.url).searchParams.get("data.id") ?? ""

  // MP signature format: "ts=...,v1=..."
  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")))
  const ts = parts["ts"] ?? ""
  const v1 = parts["v1"] ?? ""

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const hmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex")

  return hmac === v1
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  if (!verifySignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Only handle preapproval (subscription) events
  if (payload.type !== "subscription_preapproval") {
    return NextResponse.json({ ok: true })
  }

  const preapprovalId = payload.data?.id
  if (!preapprovalId) return NextResponse.json({ ok: true })

  // Fetch full preapproval from MP
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    cache: "no-store",
  })

  if (!mpRes.ok) {
    console.error("[webhook] failed to fetch preapproval", preapprovalId, mpRes.status)
    return NextResponse.json({ ok: true })
  }

  const preapproval = await mpRes.json()

  // external_reference must be the user's Supabase UUID (set when creating the subscription link)
  const userId = preapproval.external_reference
  const payerId = String(preapproval.payer_id)
  const status = preapproval.status // "authorized", "paused", "cancelled"

  if (!userId || !payerId) {
    console.warn("[webhook] missing userId or payerId in preapproval", preapprovalId)
    return NextResponse.json({ ok: true })
  }

  // Save the MP numeric payer_id so future card/subscription lookups work
  await supabaseAdmin
    .from("responsible_user")
    .update({ mp_customer_id: payerId })
    .eq("id", userId)

  // Keep local subscription table in sync with MP status
  if (status === "authorized") {
    // Find matching subscription plan by plan name/reason
    const { data: plans } = await supabaseAdmin
      .from("subscription_plan")
      .select("id, name")

    const matchedPlan = plans?.find((p: any) =>
      preapproval.reason?.toLowerCase().includes(p.name.toLowerCase())
    )

    if (matchedPlan) {
      // Upsert subscription row keyed on preapproval id stored as external ref
      const { data: existing } = await supabaseAdmin
        .from("subscription")
        .select("id")
        .eq("responsible_user", userId)
        .eq("suscription_plan_id", matchedPlan.id)
        .eq("is_active", true)
        .maybeSingle()

      if (!existing) {
        await supabaseAdmin.from("subscription").insert({
          responsible_user: userId,
          suscription_plan_id: matchedPlan.id,
          is_active: true,
        })
      }
    }
  } else if (status === "cancelled") {
    // Deactivate subscriptions for this user
    await supabaseAdmin
      .from("subscription")
      .update({ is_active: false })
      .eq("responsible_user", userId)
  }

  return NextResponse.json({ ok: true })
}
