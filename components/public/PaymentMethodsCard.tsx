import Link from 'next/link';

const PAYMENT_METHODS = [
  { label: 'VISA', className: 'italic font-bold text-[15px]', style: { color: 'rgb(26, 31, 113)' } },
  { label: 'Mastercard', className: 'text-red-600 font-bold' },
  { label: 'AMEX', className: 'rounded px-1.5 py-0.5 text-[10px] font-bold text-white', style: { background: 'rgb(46, 119, 188)' } },
  { label: 'M-PESA', className: 'text-[11px] font-bold', style: { color: 'rgb(76, 175, 80)' } },
  { label: 'Tigo Pesa', className: 'text-blue-900 font-semibold text-xs' },
  { label: 'Vodacom', className: 'text-red-600 font-bold text-xs' },
  { label: 'MTN MoMo', className: 'text-yellow-600 font-bold text-xs' },
  { label: 'airtel', className: 'text-red-600 font-bold lowercase' },
];

type PaymentMethodsCardProps = {
  linkMethods?: boolean;
};

export default function PaymentMethodsCard({ linkMethods = true }: PaymentMethodsCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-36"
        style={{
          background: 'linear-gradient(135deg, rgb(0, 168, 89) 0%, rgb(255, 209, 0) 45%, rgb(27, 158, 222) 100%)',
          borderRadius: '0 0 0 100%',
          opacity: 0.85,
        }}
      />
      <p className="relative mb-6 text-2xl font-bold tracking-tight">
        <span style={{ color: 'rgb(27, 158, 222)' }}>pesa</span>
        <span style={{ color: 'rgb(216, 30, 5)' }}>pal</span>
      </p>
      <div className="relative grid grid-cols-4 gap-3">
        {PAYMENT_METHODS.map((method) =>
          linkMethods ? (
            <Link
              href="/payment"
              key={method.label}
              className="flex aspect-[3/2] items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-2"
            >
              <span className={method.className} style={method.style}>
                {method.label}
              </span>
            </Link>
          ) : (
            <div
              key={method.label}
              className="flex aspect-[3/2] items-center justify-center rounded-lg border border-gray-100 bg-gray-50 px-2"
            >
              <span className={method.className} style={method.style}>
                {method.label}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
