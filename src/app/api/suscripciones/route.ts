import { NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { withAuth } from '@/lib/auth-wrapper';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 }
});

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

export const GET = withAuth(async (request: Request, user: any, supabase: any) => {
  try {
    const { data: dbSubscriptions, error } = await supabase
      .from('subscription')
      .select('*')
      .eq('responsible_user', user.id);

    if (error) throw error;

    if (!dbSubscriptions || dbSubscriptions.length === 0) {
      return NextResponse.json({ suscripciones: [] }, { status: 200 });
    }

    const preapproval = new PreApproval(client);

    const suscripcionesCompletas = await Promise.all(
      dbSubscriptions.map(async (subDB: any) => {
        try {
          const mpData = await preapproval.get({ id: subDB.mp_subscription_id });
          return { ...subDB, mp_details: mpData };
        } catch {
          return { ...subDB, mp_details: null };
        }
      })
    );

    const suscripcionesActivas = suscripcionesCompletas
      .filter((sub: any) => sub.mp_details && sub.mp_details.status === 'authorized')
      .map((sub: any) => {
        const auto_recurring = sub.mp_details.auto_recurring || {};
        const freq = auto_recurring.frequency;
        const freqType = auto_recurring.frequency_type;

        let frecuenciaLegible = `${freq} ${freqType}`;
        if (freq === 1 && freqType === 'months') frecuenciaLegible = 'Mensual';
        else if (freq === 6 && freqType === 'months') frecuenciaLegible = 'Semestral';
        else if (freq === 1 && freqType === 'years') frecuenciaLegible = 'Anual';

        return {
          id_local: sub.id,
          mp_subscription_id: sub.mp_subscription_id,
          status: sub.mp_details.status,
          plan_name: sub.mp_details.reason || 'Plan sin nombre',
          monto: auto_recurring.transaction_amount || 0,
          moneda: auto_recurring.currency_id || 'CLP',
          frecuencia: frecuenciaLegible,
          tarjeta: sub.mp_details.payment_method_id || 'N/A',
          proximo_cobro: sub.mp_details.next_payment_date
        };
      });

    return NextResponse.json({ suscripciones: suscripcionesActivas }, { status: 200 });

  } catch (err: any) {
    console.error("Error obteniendo suscripciones:", err);
    return NextResponse.json(
      { error: 'No se pudieron cargar las suscripciones' },
      { status: 500 }
    );
  }
});
