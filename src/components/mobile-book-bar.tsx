import { Phone, CalendarCheck } from "lucide-react";
import { site, phoneHref } from "@/lib/site";

/** Sticky bottom action bar on mobile to maximise booking conversions. */
export function MobileBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/10 bg-white/95 p-3 backdrop-blur lg:hidden">
      <div className="flex gap-2">
        <a
          href={phoneHref}
          className="flex h-12 w-14 shrink-0 items-center justify-center rounded-full border-2 border-brand-600 text-brand-700"
          aria-label={`Call ${site.phones[0]}`}
        >
          <Phone className="size-5" />
        </a>
        <a
          href={site.bookingUrl}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent-500 font-semibold text-white shadow-soft"
        >
          <CalendarCheck className="size-5" /> Book an Appointment
        </a>
      </div>
    </div>
  );
}
