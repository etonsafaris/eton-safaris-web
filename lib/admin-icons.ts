import type { LucideIcon } from 'lucide-react';
import {
  BedDouble,
  Bell,
  CalendarCheck,
  Compass,
  CreditCard,
  Flag,
  Globe2,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  MapPin,
  MessageSquare,
  Newspaper,
  Settings,
  Shield,
  Star,
  Tag,
  TreePine,
  User,
  Users,
} from 'lucide-react';

export const COLLECTION_ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  compass: Globe2,
  newspaper: Newspaper,
  globe: Flag,
  tag: Tag,
  trees: TreePine,
  'building-2': BedDouble,
  'map-pin': Compass,
  'calendar-check': CalendarCheck,
  'message-square': MessageSquare,
  inbox: Inbox,
  'credit-card': CreditCard,
  star: Star,
  'key-round': KeyRound,
  users: Users,
  bell: Bell,
  mail: Mail,
  'map': MapPin,
  layout: LayoutTemplate,
  shield: Shield,
  user: User,
  settings: Settings,
};

export function collectionIcon(name?: string): LucideIcon {
  return COLLECTION_ICONS[name || ''] || LayoutDashboard;
}
