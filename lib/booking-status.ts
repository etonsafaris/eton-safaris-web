import { pickNumber, pickString } from '@/lib/data';
import type { RecordRow } from '@/lib/types';

/** Canonical booking lifecycle statuses (admin + verify page). */
export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Canonical payment statuses (Pesapal + admin panel). */
export const PAYMENT_STATUSES = [
  'Pending Booking',
  'Down Payment Received',
  'Partial Payment',
  'Full Payment',
  'Fully Paid',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function normalizeBookingStatus(raw: string): BookingStatus {
  const value = raw.trim().toLowerCase();
  if (!value || value === 'pending' || value === 'pending booking' || value === 'new') return 'Pending';
  if (/cancel/.test(value)) return 'Cancelled';
  if (/complete/.test(value)) return 'Completed';
  if (/confirm|active|partial payment|down payment/.test(value)) return 'Confirmed';
  return 'Pending';
}

export function normalizePaymentStatus(raw: string): PaymentStatus {
  const value = raw.trim().toLowerCase();
  if (!value || value === 'pending' || value === 'pending booking') return 'Pending Booking';
  if (/fully paid|full payment/.test(value)) return 'Full Payment';
  if (/down payment/.test(value)) return 'Down Payment Received';
  if (/partial/.test(value)) return 'Partial Payment';
  return 'Pending Booking';
}

export function bookingTabFor(record: RecordRow): 'pending' | 'confirmed' | 'completed' | 'cancelled' {
  const status = normalizeBookingStatus(pickString(record, ['status']));
  if (status === 'Cancelled') return 'cancelled';
  if (status === 'Completed') return 'completed';
  if (status === 'Confirmed') return 'confirmed';
  return 'pending';
}

export function isPendingBooking(record: RecordRow) {
  return bookingTabFor(record) === 'pending';
}

export function paymentSummary(record: RecordRow) {
  const total = pickNumber(record, ['final_tour_price', 'total_price', 'amount'], 0);
  const paid = pickNumber(record, ['amount_paid'], 0);
  const storedBalance = pickNumber(record, ['remaining_balance'], NaN);
  const balance = Number.isFinite(storedBalance) ? storedBalance : Math.max(0, total - paid);
  const paymentStatus = normalizePaymentStatus(
    pickString(record, ['payment_status']) || pickString(record, ['status'])
  );
  const bookingStatus = normalizeBookingStatus(pickString(record, ['status']));
  const currency = pickString(record, ['currency']) || 'USD';
  return { total, paid, balance, paymentStatus, bookingStatus, currency };
}

export function paymentStatusAfterAmount(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'Pending Booking';
  if (total > 0 && paid >= total - 0.009) return 'Full Payment';
  if (total > 0 && paid >= total * 0.25) return 'Down Payment Received';
  return 'Partial Payment';
}

export function bookingStatusAfterPayment(total: number, paid: number, current: BookingStatus): BookingStatus {
  if (current === 'Cancelled' || current === 'Completed') return current;
  if (paid > 0) return 'Confirmed';
  return current;
}

export function verifyStatusLabel(record: RecordRow) {
  const { bookingStatus, paymentStatus } = paymentSummary(record);
  if (bookingStatus === 'Cancelled') return 'BOOKING CANCELLED';
  if (bookingStatus === 'Completed') return 'SAFARI COMPLETED';
  if (paymentStatus === 'Full Payment' || paymentStatus === 'Fully Paid') return 'BOOKING CONFIRMED — FULLY PAID';
  if (paymentStatus === 'Down Payment Received' || paymentStatus === 'Partial Payment') {
    return 'BOOKING CONFIRMED — BALANCE DUE';
  }
  if (bookingStatus === 'Confirmed') return 'BOOKING CONFIRMED';
  return 'BOOKING PENDING CONFIRMATION';
}

export function verifyStatusClass(record: RecordRow) {
  const { bookingStatus, paymentStatus } = paymentSummary(record);
  if (bookingStatus === 'Cancelled') return 'bg-red-700';
  if (bookingStatus === 'Completed') return 'bg-[#006400]';
  if (bookingStatus === 'Confirmed' || paymentStatus !== 'Pending Booking') return 'bg-[#006400]';
  return 'bg-amber-600';
}
