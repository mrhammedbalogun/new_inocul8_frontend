import {
  Syringe,
  HeartPulse,
  Plane,
  Building2,
  MapPin,
  Wallet,
  Clock,
  ShieldCheck,
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
} as const;

export type IconName = keyof typeof map;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = map[name];
  return <C {...props} />;
}
