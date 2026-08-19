export function parseModules(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function collectionIdFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return 'overview';
  return parts[1] || 'overview';
}

export function canAccessModule(id: string, role: string, allowedModules: string[]) {
  if (/admin|full access|super/i.test(role)) return true;
  if (['profile', 'settings', 'overview', ''].includes(id)) return true;
  if (!role && allowedModules.length === 0) return true;
  if (id === 'inquiries' || id === 'quotations_inquiries') {
    return allowedModules.includes('quotations_inquiries') || allowedModules.includes('inquiries');
  }
  return allowedModules.includes(id);
}
