export function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let index = 0; index < 6; index += 1) {
    body += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SAF-${body}`;
}
