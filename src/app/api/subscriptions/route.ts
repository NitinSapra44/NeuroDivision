import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // If MP_ACCESS_TOKEN is configured, fetch from MercadoPago for live data
  const mpAccessToken = process.env.MP_ACCESS_TOKEN
  if (mpAccessToken) {
    const { data: ru } = await supabase
      .from("responsible_user")
      .select("mp_customer_id")
      .eq("id", user.id)
      .single()

    if (ru?.mp_customer_id) {
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/search?payer_id=${ru.mp_customer_id}&status=authorized`,
        { headers: { Authorization: `Bearer ${mpAccessToken}` }, cache: "no-store" }
      )
      if (mpRes.ok) {
        const mpData = await mpRes.json()
        const results: any[] = mpData.results ?? []
        return NextResponse.json(
          results.map((sub) => {
            const mapTarjeta = (s: string) =>
              s?.toLowerCase().includes("visa")
                ? "Visa"
                : s?.toLowerCase().includes("master")
                ? "Master"
                : s ?? "-"
            const mapStatus = (s: string) =>
              s === "authorized" ? "Activa" : s === "paused" ? "Pausada" : s === "cancelled" ? "Cancelada" : s ?? "-"
            return {
              id: String(sub.id),
              plan_name: sub.reason ?? "Plan",
              status: mapStatus(sub.status),
              price:
                sub.auto_recurring?.transaction_amount != null
                  ? `$${Number(sub.auto_recurring.transaction_amount).toLocaleString("es-CL")}`
                  : "-",
              proximo_cobro: sub.next_payment_date ? formatDate(new Date(sub.next_payment_date)) : "-",
              tarjeta: mapTarjeta(sub.payment_method_id ?? ""),
            }
          })
        )
      }
    }
  }

  // Fallback: query local subscription + subscription_plan tables
  const { data, error } = await supabase
    .from("subscription")
    .select(
      `
      id,
      created_at,
      is_active,
      suscription_plan_id,
      subscription_plan!suscription_plan_id (
        name,
        price,
        duration_days,
        plan_group
      )
    `
    )
    .eq("responsible_user", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json([], { status: 200 })
  }

  // Deduplicate: keep only the most recent subscription per plan
  const seen = new Set<number>()
  const unique = (data ?? []).filter((sub: any) => {
    if (seen.has(sub.suscription_plan_id)) return false
    seen.add(sub.suscription_plan_id)
    return true
  })

  const subscriptions = unique.map((sub: any) => {
    const plan = sub.subscription_plan
    const durationDays: number = plan?.duration_days ?? 30

    // Estimate next payment from created_at + duration_days
    const createdAt = new Date(sub.created_at)
    const now = new Date()
    // Advance by duration cycles until we pass today
    const nextPayment = new Date(createdAt)
    while (nextPayment <= now) {
      nextPayment.setDate(nextPayment.getDate() + durationDays)
    }

    const durationLabel =
      durationDays === 180 ? "Semestral" : durationDays === 30 ? "Mensual" : `${durationDays} días`

    return {
      id: String(sub.id),
      plan_name: plan?.name
        ? `${plan.name} (${durationLabel})`
        : "Plan",
      status: sub.is_active ? "Activa" : "Inactiva",
      price:
        plan?.price != null
          ? `$${Number(plan.price).toLocaleString("es-CL")}`
          : "-",
      proximo_cobro: formatDate(nextPayment),
      tarjeta: "-", // populated from MercadoPago once MP_ACCESS_TOKEN is set
    }
  })

  return NextResponse.json(subscriptions)
}
