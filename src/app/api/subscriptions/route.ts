import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function mapTarjeta(paymentMethodId: string): string {
  if (!paymentMethodId) return "-"
  const t = paymentMethodId.toLowerCase()
  if (t.includes("visa")) return "Visa"
  if (t.includes("master")) return "Master"
  return paymentMethodId
}

function mapStatus(status: string): string {
  if (status === "authorized") return "Activa"
  if (status === "paused") return "Pausada"
  if (status === "cancelled") return "Cancelada"
  return status ?? "Inactiva"
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("es-CL", {
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

  // Get the MercadoPago customer ID for this user
  const { data: responsibleUser, error: userDbError } = await supabase
    .from("responsible_user")
    .select("mp_customer_id")
    .eq("id", user.id)
    .single()

  if (userDbError || !responsibleUser?.mp_customer_id) {
    return NextResponse.json([], { status: 200 })
  }

  const mpCustomerId = responsibleUser.mp_customer_id
  const mpAccessToken = process.env.MP_ACCESS_TOKEN

  if (!mpAccessToken) {
    console.error("MP_ACCESS_TOKEN is not set")
    return NextResponse.json([], { status: 200 })
  }

  // Search MercadoPago preapprovals (subscriptions) by payer ID
  const mpRes = await fetch(
    `https://api.mercadopago.com/preapproval/search?payer_id=${mpCustomerId}&status=authorized`,
    {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
      cache: "no-store",
    }
  )

  if (!mpRes.ok) {
    console.error("MercadoPago API error:", mpRes.status, await mpRes.text())
    return NextResponse.json([], { status: 200 })
  }

  const mpData = await mpRes.json()
  const results: any[] = mpData.results ?? []

  const subscriptions = results.map((sub) => ({
    id: sub.id,
    plan_name: sub.reason ?? "Plan",
    status: mapStatus(sub.status),
    next_payment_date: formatDate(sub.next_payment_date),
    price:
      sub.auto_recurring?.transaction_amount != null
        ? `$${Number(sub.auto_recurring.transaction_amount).toLocaleString("es-CL")}`
        : "-",
    payment_method: mapTarjeta(sub.payment_method_id ?? ""),
  }))

  return NextResponse.json(subscriptions)
}
