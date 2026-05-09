import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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

  const { data, error } = await supabase
    .from("subscription")
    .select(
      `
      id,
      is_active,
      effective_max_nna_allowed,
      subscription_plan!suscription_plan_id (
        id,
        name,
        price,
        duration_days,
        plan_group
      )
    `
    )
    .eq("responsible_user", user.id)
    .eq("is_active", true)

  if (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json([], { status: 200 })
  }

  const subscriptions = (data ?? []).map((sub: any) => {
    const plan = sub.subscription_plan
    const durationLabel =
      plan?.duration_days === 180
        ? "Semestral"
        : plan?.duration_days === 30
        ? "Mensual"
        : plan?.duration_days
        ? `${plan.duration_days} días`
        : ""

    return {
      id: String(sub.id),
      plan_name: plan?.name
        ? `${plan.name}${durationLabel ? ` (${durationLabel})` : ""}`
        : "Plan",
      status: sub.is_active ? "Activa" : "Inactiva",
      price: plan?.price != null
        ? `$${Number(plan.price).toLocaleString("es-CL")}`
        : "-",
      slots: sub.effective_max_nna_allowed ?? "-",
    }
  })

  return NextResponse.json(subscriptions)
}
