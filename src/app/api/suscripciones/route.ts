import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { withAuth } from '@/lib/auth-wrapper';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 }
});

function formatDate(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function mapTarjeta(paymentMethodId: string): string {
  const lower = (paymentMethodId ?? '').toLowerCase();
  if (lower.includes('visa')) return 'Visa';
  if (lower.includes('master')) return 'Mastercard';
  if (lower.includes('amex')) return 'Amex';
  if (lower.includes('debvisa')) return 'Visa Débito';
  if (lower.includes('debmaster')) return 'Mastercard Débito';
  return paymentMethodId || '-';
}

function mapStatus(s: string): string {
  if (s === 'authorized') return 'Activa';
  if (s === 'paused') return 'Pausada';
  if (s === 'cancelled') return 'Cancelada';
  return s ?? '-';
}

export const POST = withAuth(async (request: Request, user: any, supabase: any) => {
  try {
    const body = await request.json();
    const { token, plan_id, payer_email, shipping, user_id } = body;
    const { mp_customer_id } = body;

    console.log("=== PROCESANDO SUSCRIPCIÓN PARA CUSTOMER:", mp_customer_id, "===");

    if (!token || !plan_id || !payer_email || !user_id) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos (Token, Plan o Usuario)' },
        { status: 400 }
      );
    }

    const preapproval = new PreApproval(client);

    const mpResponse = await preapproval.create({
      body: {
        preapproval_plan_id: plan_id,
        payer_email: payer_email,
        card_token_id: token,
        status: "authorized",
      }
    });

    console.log(`=== RESPUESTA MP: ID ${mpResponse.id} - Estado: ${mpResponse.status} ===`);

    if (mpResponse.status !== 'authorized') {
      return NextResponse.json(
        { error: 'El pago no pudo ser autorizado. Intenta con otra tarjeta.' },
        { status: 400 }
      );
    }

    try {
      const { data: planData, error: planError } = await supabase
        .from('subscription_plan')
        .select('id')
        .eq('mp_preapproval_plan_id', plan_id)
        .single();

      if (planError || !planData) {
        throw new Error(`Plan local no encontrado para: ${plan_id}`);
      }

      const { error: dbError } = await supabase
        .from('subscription')
        .insert({
          suscription_plan_id: planData.id,
          responsible_user: user_id,
          status: mpResponse.status,
          effective_max_nna_allowed: 1,
          is_active: true,
          next_payment_date: mpResponse.next_payment_date || null,
          shipping_address: shipping,
          mp_subscription_id: mpResponse.id
        });

      if (dbError) {
        console.error("ERROR BD AL GUARDAR SUSCRIPCIÓN:", dbError);
      }
    } catch (dbProcessError) {
      console.error("Error procesando base de datos:", dbProcessError);
    }

    return NextResponse.json({
      success: true,
      subscription_id: mpResponse.id
    }, { status: 200 });

  } catch (error: any) {
    console.error("ERROR CRÍTICO EN API SUSCRIPCIONES:", error);
    return NextResponse.json(
      { error: error.message || 'Error interno en el servidor de pagos' },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: Request, user: any, supabase: any) => {
  try {
    const body = await request.json();
    const { mp_subscription_id, token } = body;

    if (!mp_subscription_id || !token) {
      return NextResponse.json(
        { error: 'Faltan datos: mp_subscription_id y token son requeridos' },
        { status: 400 }
      );
    }

    const preapproval = new PreApproval(client);

    const mpResponse = await preapproval.update({
      id: mp_subscription_id,
      body: { card_token_id: token },
    });

    console.log(`=== TARJETA ACTUALIZADA: ${mpResponse.id} - Estado: ${mpResponse.status} ===`);

    return NextResponse.json({ success: true, status: mpResponse.status }, { status: 200 });

  } catch (error: any) {
    console.error("ERROR AL ACTUALIZAR TARJETA:", error);
    return NextResponse.json(
      { error: error.message || 'No se pudo actualizar la tarjeta' },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (request: Request, user: any, supabase: any) => {
  try {
    const { data, error } = await supabase
      .from('subscription')
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
      .eq('responsible_user', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mpAccessToken = process.env.MP_ACCESS_TOKEN;

    const subscriptions = await Promise.all(
      (data ?? []).map(async (sub: any) => {
        const plan = sub.subscription_plan;
        const durationDays: number = plan?.duration_days ?? 30;
        const durationLabel =
          durationDays === 180 ? 'Semestral' : durationDays === 30 ? 'Mensual' : `${durationDays} días`;

        let proximoCobro = '-';
        if (sub.next_payment_date) {
          proximoCobro = formatDate(new Date(sub.next_payment_date));
        } else {
          const createdAt = new Date(sub.created_at);
          const now = new Date();
          const nextPayment = new Date(createdAt);
          while (nextPayment <= now) nextPayment.setDate(nextPayment.getDate() + durationDays);
          proximoCobro = formatDate(nextPayment);
        }

        let tarjeta = '-';
        let status = sub.is_active ? 'Activa' : 'Inactiva';
        let ultimo_cobro = '-';
        let ultimo_monto = '-';
        let semaphore = '';

        if (mpAccessToken && sub.mp_subscription_id) {
          try {
            const mpRes = await fetch(
              `https://api.mercadopago.com/preapproval/${sub.mp_subscription_id}`,
              { headers: { Authorization: `Bearer ${mpAccessToken}` }, cache: 'no-store' }
            );
            if (mpRes.ok) {
              const mp = await mpRes.json();
              tarjeta = mapTarjeta(mp.payment_method_id ?? '');
              status = mapStatus(mp.status ?? '');
              if (mp.next_payment_date) proximoCobro = formatDate(new Date(mp.next_payment_date));
              if (mp.summarized?.last_charged_date) ultimo_cobro = formatDate(new Date(mp.summarized.last_charged_date));
              if (mp.summarized?.last_charged_amount != null) ultimo_monto = `$${Number(mp.summarized.last_charged_amount).toLocaleString('es-CL')}`;
              semaphore = mp.summarized?.semaphore ?? '';
            }
          } catch {
            // fallback to local data if MP fetch fails
          }
        }

        return {
          id: String(sub.id),
          mp_subscription_id: sub.mp_subscription_id ?? null,
          plan_name: plan?.name ? `${plan.name} (${durationLabel})` : 'Plan',
          status,
          price: plan?.price != null ? `$${Number(plan.price).toLocaleString('es-CL')}` : '-',
          monto: plan?.price != null ? Number(plan.price) : 0,
          proximo_cobro: proximoCobro,
          tarjeta,
          ultimo_cobro,
          ultimo_monto,
          semaphore,
        };
      })
    );

    return NextResponse.json(subscriptions);

  } catch (err: any) {
    console.error("Error obteniendo suscripciones:", err);
    return NextResponse.json(
      { error: 'No se pudieron cargar las suscripciones' },
      { status: 500 }
    );
  }
});
