export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  bookingStatusAfterPayment,
  guestPaymentNotice,
  normalizeBookingStatus,
  parseMoneyAmount,
  paymentStatusAfterAmount,
} from '@/lib/booking-status';
import { SITE } from '@/lib/collections';
import { deliverIncomingAlert } from '@/lib/deliver-alert';
import { pesapalRequest } from '@/lib/pesapal';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveWithColumnFallback } from '@/lib/supabase-save';

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isCompleted(status: string): boolean {
  return /completed|paid|success/i.test(status) && !/not.?completed|failed|invalid/i.test(status);
}

function money(value: number, currency = 'USD'): string {
  return `${currency} ${value.toFixed(2)}`;
}

function paymentReceiptHtml(input: {
  clientName: string;
  bookingReference: string;
  currency: string;
  finalTourPrice: number;
  amountPaid: number;
  totalPaid: number;
  remainingBalance: number;
  paymentStatus: string;
  tour?: string;
  paymentLink?: string;
}): string {
  const completed = input.remainingBalance <= 0.009;
  const rows = [
    ['Client Name', input.clientName],
    ['Booking Reference', input.bookingReference],
    ['Tour', input.tour || '—'],
    ['Final Tour Fee', money(input.finalTourPrice, input.currency)],
    ['Amount Just Paid', money(input.amountPaid, input.currency)],
    ['Total Paid', money(input.totalPaid, input.currency)],
    ['Remaining Balance', money(input.remainingBalance, input.currency)],
    ['Payment Status', input.paymentStatus],
  ];
  const intro = completed
    ? `<p>Thank you for completing your safari fee. Your Final Tour Fee of ${money(input.finalTourPrice, input.currency)} is fully paid.</p>`
    : `<p>Thank you. We received your partial payment. Your remaining balance is <strong>${money(input.remainingBalance, input.currency)}</strong> against the Final Tour Fee of ${money(input.finalTourPrice, input.currency)}.</p>`;
  const balanceCta =
    !completed && input.paymentLink
      ? `<p style="margin-top:16px"><a href="${input.paymentLink}" style="display:inline-block;background:#006400;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Pay remaining balance</a></p>`
      : '';
  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
      <h2 style="color:#006400;margin:0 0 16px">${completed ? 'Thank you — safari fee complete' : 'Partial payment received'}</h2>
      ${intro}
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="border:1px solid #e5e7eb;padding:8px 12px;font-weight:600;width:40%">${label}</td>
            <td style="border:1px solid #e5e7eb;padding:8px 12px">${value}</td>
          </tr>`
          )
          .join('')}
      </table>
      ${balanceCta}
      <p style="margin-top:16px">If you have questions, reply to this email or write to ${SITE.email}.</p>
    </div>
  `;
}

export async function GET(request: Request) {
  return handleIpn(request);
}

export async function POST(request: Request) {
  return handleIpn(request);
}

async function handleIpn(request: Request) {
  try {
    const url = new URL(request.url);
    let trackingId =
      url.searchParams.get('OrderTrackingId') ||
      url.searchParams.get('orderTrackingId') ||
      '';
    const merchantFromQuery = url.searchParams.get('OrderMerchantReference') || '';

    if (request.method === 'POST') {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        trackingId = String(body.OrderTrackingId || body.orderTrackingId || trackingId);
      } catch {
        // Pesapal IPN may be query-only
      }
    }

    if (!trackingId && !merchantFromQuery) {
      return NextResponse.json({ error: 'Missing OrderTrackingId' }, { status: 400 });
    }

    const status = trackingId
      ? await pesapalRequest(
          `/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`,
          { method: 'GET' }
        )
      : {};

    const paymentStatus = String(
      status.payment_status_description || status.status_description || 'Pending'
    );
    const reference = String(status.merchant_reference || status.merchantReference || merchantFromQuery || trackingId);
    const pesapalAmount = numberValue(status.amount, 0);
    const completed = isCompleted(paymentStatus);

    const supabase = createAdminClient();
    let paymentQuery = supabase.from('pesapal_payments').select('*');
    if (trackingId) {
      paymentQuery = paymentQuery.or(`order_tracking_id.eq.${trackingId},reference.eq.${reference}`);
    } else {
      paymentQuery = paymentQuery.eq('reference', reference);
    }
    const { data: payments } = await paymentQuery.limit(5);
    const payment = (payments || [])[0] as Record<string, unknown> | undefined;
    const alreadyCompleted = String(payment?.status || '').toLowerCase() === 'completed';

    const confirmedAmount = pesapalAmount || numberValue(payment?.amount, 0);
    const bookingId = String(payment?.booking_id || '');

    const paymentUpdate = {
      status: completed ? 'Completed' : paymentStatus,
      order_tracking_id: trackingId || payment?.order_tracking_id || null,
      pesapal_amount: confirmedAmount || null,
    };
    if (payment?.id) {
      const { error: updateError } = await saveWithColumnFallback('pesapal_payments', paymentUpdate, {
        id: payment.id as string | number,
        client: supabase,
      });
      if (updateError) {
        await saveWithColumnFallback(
          'pesapal_payments',
          { status: completed ? 'Completed' : paymentStatus },
          { eq: { column: 'reference', value: reference }, client: supabase }
        );
      }
    } else {
      await saveWithColumnFallback(
        'pesapal_payments',
        { status: completed ? 'Completed' : paymentStatus },
        { eq: { column: 'reference', value: reference }, client: supabase }
      );
    }

    if (!completed) {
      return NextResponse.json({
        ok: true,
        reference,
        payment_status: paymentStatus,
        orderTrackingId: trackingId,
        orderMerchantReference: reference,
        status: 200,
      });
    }

    let booking: Record<string, unknown> | null = null;
    if (bookingId) {
      const { data } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
      booking = (data as Record<string, unknown> | null) || null;
    }
    if (!booking && reference) {
      const { data } = await supabase.from('bookings').select('*').eq('booking_code', reference).maybeSingle();
      booking = (data as Record<string, unknown> | null) || null;
    }
    if (!booking && payment?.email) {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('email', String(payment.email))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      booking = (data as Record<string, unknown> | null) || null;
    }

    if (booking?.id) {
      const { data: related } = await supabase.from('pesapal_payments').select('*').eq('booking_id', booking.id);
      const paidFromRows = (related || [])
        .filter((row) => /completed/i.test(String(row.status || '')))
        .reduce((sum, row) => sum + numberValue(row.pesapal_amount || row.amount, 0), 0);
      const paid = paidFromRows || (alreadyCompleted ? numberValue(booking.amount_paid, 0) : numberValue(booking.amount_paid, 0) + confirmedAmount);
      // Always base remaining balance on the booking's Final Tour Fee (from quotation when accepted).
      const total =
        parseMoneyAmount(booking.final_tour_price) ||
        parseMoneyAmount(booking.total_price) ||
        paid;
      const remaining = Math.max(0, Number((total - paid).toFixed(2)));
      const paymentLabel = paymentStatusAfterAmount(total, paid);
      const bookingStatus = bookingStatusAfterPayment(
        total,
        paid,
        normalizeBookingStatus(String(booking.status || 'Pending'))
      );

      await saveWithColumnFallback(
        'bookings',
        {
          amount_paid: paid,
          remaining_balance: remaining,
          final_tour_price: total,
          payment_status: paymentLabel,
          status: bookingStatus,
        },
        { id: booking.id as string | number, client: supabase }
      );

      if (!alreadyCompleted) {
        const currency = String(payment?.currency || booking.currency || 'USD');
        const clientName = String(booking.guest_name || payment?.guest_name || payment?.email || 'Guest');
        const bookingReference = String(booking.booking_code || booking.id || reference);
        const guestEmail = String(booking.email || payment?.email || '');
        const tour = String(booking.tour || payment?.tour || 'a safari');
        const paymentLink = `${SITE.url}/payment?booking=${booking.id}`;
        const notice = guestPaymentNotice({
          guestName: clientName,
          tour,
          currency,
          finalTourFee: total,
          amountJustPaid: confirmedAmount,
          totalPaid: paid,
          remainingBalance: remaining,
          bookingCode: bookingReference,
          paymentLink,
          verifyUrl: `${SITE.url}/verify`,
          siteName: SITE.name,
        });
        await deliverIncomingAlert({
          title: notice.adminTitle,
          message: notice.adminMessage,
          category: 'booking',
          guestEmail,
          sendToGuest: guestEmail.includes('@'),
          guestTitle: notice.guestTitle,
          guestMessage: notice.guestMessage,
          html: paymentReceiptHtml({
            clientName,
            bookingReference,
            currency,
            finalTourPrice: total,
            amountPaid: confirmedAmount,
            totalPaid: paid,
            remainingBalance: remaining,
            paymentStatus: paymentLabel,
            tour,
            paymentLink,
          }),
        });
      }
    } else if (!alreadyCompleted) {
      const currency = String(payment?.currency || 'USD');
      const clientName = String(payment?.guest_name || payment?.email || 'Guest');
      const guestEmail = String(payment?.email || '');
      await deliverIncomingAlert({
        title: 'Safari payment completed',
        message: `${clientName} paid ${money(confirmedAmount, currency)}. Booking reference: ${reference}.`,
        category: 'booking',
        guestEmail,
        sendToGuest: guestEmail.includes('@'),
        html: paymentReceiptHtml({
          clientName,
          bookingReference: reference,
          currency,
          finalTourPrice: confirmedAmount,
          amountPaid: confirmedAmount,
          totalPaid: confirmedAmount,
          remainingBalance: 0,
          paymentStatus: 'Full Payment',
          tour: String(payment?.tour || ''),
        }),
      });
    }

    return NextResponse.json({
      ok: true,
      reference,
      payment_status: paymentStatus,
      orderNotificationId: url.searchParams.get('OrderNotificationId'),
      orderTrackingId: trackingId,
      orderMerchantReference: reference,
      status: 200,
    });
  } catch (error) {
    console.error('[Pesapal] IPN error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'IPN failed' },
      { status: 500 }
    );
  }
}
