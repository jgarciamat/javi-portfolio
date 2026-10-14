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
  wallet: Wallet,
  wand: Wand2,
  wrench: Wrench,
};

export type IconName = keyof typeof ICONS;

/**
 * A line icon that takes the colour of the text around it. A name that is not in the set
 * (an emoji a user picked for a category or an account) is shown as the text it is.
 */
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
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
