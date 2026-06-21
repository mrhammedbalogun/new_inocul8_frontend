"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

const services = [
  "Childhood Immunization",
  "Travel Health / Yellow Fever",
  "HPV / Sexual & Reproductive Health",
  "myHealth (Hepatitis B / Herpes)",
  "Corporate / Employee Wellness",
  "Other / Not sure",
];

const field =
  "w-full rounded-xl border border-ink-900/12 bg-white px-4 py-3 text-sm text-ink-900 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

/**
 * Lead capture form. Until the Django lead API is live (Stage 5), submission
 * composes a pre-filled WhatsApp message so enquiries still reach the team.
 */
export function ContactForm() {
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !phone || !message) {
      setError("Please fill in your name, phone and message.");
      return;
    }
    setError("");
    const lines = [
      `Hi Inocul8, I'd like to enquire.`,
      `Name: ${name}`,
      data.get("email") ? `Email: ${data.get("email")}` : "",
      `Phone: ${phone}`,
      data.get("service") ? `Service: ${data.get("service")}` : "",
      `Message: ${message}`,
    ].filter(Boolean);
    const url = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-ink-800">
          Full name *
          <input name="name" type="text" autoComplete="name" required className={field} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink-800">
          Phone *
          <input name="phone" type="tel" autoComplete="tel" required className={field} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-ink-800">
          Email
          <input name="email" type="email" autoComplete="email" className={field} />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink-800">
          Service of interest
          <select name="service" className={field} defaultValue="">
            <option value="" disabled>
              Select a service
            </option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-ink-800">
        Message *
        <textarea name="message" rows={5} required className={field} />
      </label>

      {error && <p className="text-sm font-medium text-accent-600">{error}</p>}

      <Button type="submit" variant="accent" size="lg" className="w-full sm:w-auto">
        <Send className="size-4" />
        Send enquiry
      </Button>
      <p className="text-xs text-muted">
        Submitting opens WhatsApp with your message pre-filled so our team can respond quickly.
      </p>
    </form>
  );
}
