import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Bell,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  CirclePlay,
  Coins,
  ClipboardList,
  Compass,
  Download,
  FileText,
  Flag,
  Gift,
  Handshake,
  HeartPulse,
  Home,
  Image,
  KeyRound,
  Landmark,
  Lock,
  Mail,
  Package,
  Pencil,
  PiggyBank,
  Pin,
  Plus,
  Printer,
  Receipt,
  Repeat,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Wallet,
  Wand2,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

/** The line icons of the app, by name. */
const ICONS: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  bank: Landmark,
  bell: Bell,
  book: BookOpen,
  briefcase: Briefcase,
  calendar: Calendar,
  camera: Camera,
  chart: BarChart3,
  check: Check,
  checkCircle: CheckCircle2,
  clipboard: ClipboardList,
  close: X,
  coins: Coins,
  compass: Compass,
  download: Download,
  edit: Pencil,
  exchange: ArrowLeftRight,
  file: FileText,
  flag: Flag,
  gift: Gift,
  handshake: Handshake,
  heart: HeartPulse,
  home: Home,
  image: Image,
  key: KeyRound,
  lock: Lock,
  mail: Mail,
  package: Package,
  piggy: PiggyBank,
  pin: Pin,
  plus: Plus,
  print: Printer,
  receipt: Receipt,
  repeat: Repeat,
  rocket: Rocket,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  trash: Trash2,
  trend: TrendingUp,
  upload: Upload,
  user: User,
  video: CirclePlay,
  wallet: Wallet,
  wand: Wand2,
  wrench: Wrench,
};

/** Brand glyphs (not in lucide), drawn with the same 24×24 grid and stroke. */
const BRANDS: Record<string, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </>
  ),
  tiktok: (
    <path d="M15 3c.4 2.6 2.1 4.3 5 4.6v3.3a8.6 8.6 0 0 1-5-1.6V15a6 6 0 1 1-6-6v3.3a2.7 2.7 0 1 0 2.7 2.7V3z" />
  ),
  youtube: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="m10 9 5 3-5 3z" fill="currentColor" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

/**
 * A line icon that takes the colour of the text around it. A name that is not in the set
 * (an emoji a user picked for a category or an account) is shown as the text it is.
 */
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const brand = BRANDS[name];
  if (brand) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="icon"
        focusable="false"
      >
        {brand}
      </svg>
    );
  }
  const Component = ICONS[name];
  if (!Component) return <span aria-hidden="true">{name}</span>;
  return (
    <Component
      size={size}
      strokeWidth={1.9}
      aria-hidden="true"
      className="icon"
      focusable="false"
    />
  );
}
