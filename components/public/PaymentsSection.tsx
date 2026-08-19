import Link from 'next/link';
import { Lock } from 'lucide-react';
import PaymentMethodsCard from '@/components/public/PaymentMethodsCard';

export default function PaymentsSection() {
  return (
    <section className="py-12 md:py-16" style={{ backgroundColor: 'rgb(244, 247, 248)' }}>
      <div className="mx-auto grid max-w-[1000px] items-center gap-8 px-4 md:grid-cols-2 md:gap-12 md:px-6">
        <PaymentMethodsCard />

        <div>
          <h3 className="font-serif text-3xl font-bold italic text-moss md:text-4xl">Secure Online Payment</h3>
          <p className="mt-4 text-sm leading-relaxed text-[#666]">
            Pay for all your tours using any of these payment methods by clicking the button below
          </p>
          <Link
            href="/payment"
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: 'rgb(96, 108, 56)' }}
          >
            Pay for tours
          </Link>
          <p className="mt-4 flex items-center gap-2 text-sm italic text-gray-400">
            <Lock className="h-4 w-4" /> Secured by pesapal
          </p>
        </div>
      </div>
    </section>
  );
}
