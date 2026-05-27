'use client';

import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { useEffect, useState } from 'react';

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
  locale: 'es-CL'
});

interface Props {
  planId: string;
  monto: number;
  onSubmit: (formData: any) => Promise<void>;
}

export default function CheckoutSuscripcion({ planId, monto, onSubmit }: Props) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
        locale: 'es-CL'
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  if (!isInitialized) return (
    <div className="w-full min-h-105 flex flex-col gap-4 animate-pulse p-2">
      <div className="h-10 bg-gray-200 rounded-full w-full" />
      <div className="flex gap-3">
        <div className="h-10 bg-gray-200 rounded-full flex-1" />
        <div className="h-10 bg-gray-200 rounded-full flex-1" />
      </div>
      <div className="h-10 bg-gray-200 rounded-full w-full" />
      <div className="h-10 bg-gray-200 rounded-full w-3/4" />
      <div className="h-12 bg-gray-300 rounded-full w-full mt-4" />
    </div>
  );

  const initialization = {
    amount: monto
  };

  const onError = async (error: any) => {
    console.error("Error en el Brick:", error);
  };

  const onReady = async () => {
    console.log("Brick listo");
  };

  return (
    <CardPayment
      key={planId}
      initialization={initialization}
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
