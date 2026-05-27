'use client';

import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// Initialize once at module level — runs on the client only (this is a 'use client' component)
initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
  locale: 'es-CL'
});

interface Props {
  planId: string;
  monto: number;
  onSubmit: (formData: any) => Promise<void>;
}

export default function CheckoutSuscripcion({ planId, monto, onSubmit }: Props) {
  const onError = async (error: any) => {
    console.error("Error en el Brick:", error);
  };

  const onReady = async () => {
    console.log("Brick listo");
  };

  return (
    <CardPayment
      key={planId}
      initialization={{ amount: monto }}
      onSubmit={onSubmit}
      onReady={onReady}
      onError={onError}
      customization={{
        visual: {
          style: {
            theme: 'default',
            customVariables: {
              textPrimaryColor: '#000000',
              fontWeightSemiBold: '700',
              fontWeightNormal: '600',
              inputVerticalPadding: '8px',
              fontSizeMedium: '14px',
              fontSizeLarge: '14px',
              borderRadiusMedium: '30px',
              borderRadiusLarge: '20px',
              inputBorderWidth: '2px',
              outlinePrimaryColor: '#d1d5db',
              baseColor: '#404242',
              textSecondaryColor: '#9ca3af',
            },
          },
        },
        paymentMethods: {
          maxInstallments: 1
        }
      }}
    />
  );
}
