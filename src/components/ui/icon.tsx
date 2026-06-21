import {
  Syringe,
  HeartPulse,
  Plane,
  Building2,
  MapPin,
  Wallet,
  Clock,
  ShieldCheck,
  Baby,
  Stethoscope,
  Briefcase,
  Globe,
  type LucideProps,
} from "lucide-react";

const map = {
  syringe: Syringe,
  "heart-pulse": HeartPulse,
  plane: Plane,
  building: Building2,
  "map-pin": MapPin,
  wallet: Wallet,
  clock: Clock,
  "shield-check": ShieldCheck,
  baby: Baby,
  stethoscope: Stethoscope,
  briefcase: Briefcase,
  globe: Globe,
} as const;

export type IconName = keyof typeof map;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = map[name];
  return <C {...props} />;
}
