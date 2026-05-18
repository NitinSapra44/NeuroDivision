import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function formatDate(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(date.getUTCDate()).padStart(2, "0")
  const yyyy = date.getUTCFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function mapTarjeta(paymentMethodId: string): string {
  const lower = (paymentMethodId ?? "").toLowerCase()
  if (lower.includes("visa")) return "Visa"
  if (lower.includes("master")) return "Mastercard"
  if (lower.includes("amex")) return "Amex"
  if (lower.includes("debvisa")) return "Visa Débito"
  if (lower.includes("debmaster")) return "Mastercard Débito"
  return paymentMethodId || "-"
}

function mapStatus(s: string): string {
  if (s === "authorized") return "Activa"
  if (s === "paused") return "Pausada"
  if (s === "cancelled") return "Cancelada"
  return s ?? "-"
}

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch all active subscriptions for this user, including mp_subscription_id
  const { data, error } = await supabase
    .from("subscription")
    .select(`
      id,
      created_at,
      is_active,
      suscription_plan_id,
      mp_subscription_id,
      next_payment_date,
      subscription_plan!suscription_plan_id (
        name,
        price,
        duration_days
      )
    `)
    .eq("responsible_user", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json([], { status: 200 })
  }

  const mpAccessToken = process.env.MP_ACCESS_TOKEN

  // For each subscription, enrich with real MP data if mp_subscription_id exists
  const subscriptions = await Promise.all(
    (data ?? []).map(async (sub: any) => {
      const plan = sub.subscription_plan
      const durationDays: number = plan?.duration_days ?? 30
      const durationLabel =
        durationDays === 180 ? "Semestral" : durationDays === 30 ? "Mensual" : `${durationDays} días`

      // Calculate next payment from DB field or estimate from created_at
      let proximoCobro = "-"
      if (sub.next_payment_date) {
        proximoCobro = formatDate(new Date(sub.next_payment_date))
      } else {
        const createdAt = new Date(sub.created_at)
        const now = new Date()
        const nextPayment = new Date(createdAt)
        while (nextPayment <= now) {
          nextPayment.setDate(nextPayment.getDate() + durationDays)
        }
        proximoCobro = formatDate(nextPayment)
      }

      let tarjeta = "-"
      let status = sub.is_active ? "Activa" : "Inactiva"
      let ultimo_cobro = "-"
      let ultimo_monto = "-"
      let semaphore = ""

      // Fetch real card + status from MercadoPago using mp_subscription_id
      if (mpAccessToken && sub.mp_subscription_id) {
        try {
          const mpRes = await fetch(
            `https://api.mercadopago.com/preapproval/${sub.mp_subscription_id}`,
            { headers: { Authorization: `Bearer ${mpAccessToken}` }, cache: "no-store" }
          )
          if (mpRes.ok) {
            const mp = await mpRes.json()
            tarjeta = mapTarjeta(mp.payment_method_id ?? "")
            status = mapStatus(mp.status ?? "")
            if (mp.next_payment_date) {
              proximoCobro = formatDate(new Date(mp.next_payment_date))
            }
            if (mp.summarized?.last_charged_date) {
              ultimo_cobro = formatDate(new Date(mp.summarized.last_charged_date))
            }
            if (mp.summarized?.last_charged_amount != null) {
              ultimo_monto = `$${Number(mp.summarized.last_charged_amount).toLocaleString("es-CL")}`
            }
            semaphore = mp.summarized?.semaphore ?? ""
          }
        } catch {
          // fallback to local data if MP fetch fails
        }
      }

      return {
        id: String(sub.id),
        plan_name: plan?.name ? `${plan.name} (${durationLabel})` : "Plan",
        status,
        price: plan?.price != null ? `$${Number(plan.price).toLocaleString("es-CL")}` : "-",
        proximo_cobro: proximoCobro,
        tarjeta,
        ultimo_cobro,
        ultimo_monto,
        semaphore,
      }
    })
  )

  return NextResponse.json(subscriptions)
}
