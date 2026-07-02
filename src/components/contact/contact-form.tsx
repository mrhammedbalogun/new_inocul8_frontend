"use client";

import { useState } from "react";
import { Send, CheckCircle2, MessageCircle } from "lucide-react";
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
 * Lead-capture form. Submits to /api/contact (which forwards to Django →
 * Mailgun) so enquiries land in the team inbox and the CMS. A WhatsApp link is
 * offered as an instant fallback if the send fails.
 */
export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");

  function whatsappFallback(data: FormData) {
    const lines = [
      `Hi Inocul8, I'd like to enquire.`,
      `Name: ${data.get("name")}`,
      data.get("email") ? `Email: ${data.get("email")}` : "",
      `Phone: ${data.get("phone")}`,
      data.get("service") ? `Service: ${data.get("service")}` : "",
      `Message: ${data.get("message")}`,
    ].filter(Boolean);
    return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !phone || !message) {
      setError("Please fill in your name, phone and message.");
      return;
    }
    setError("");
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          message,
          email: String(data.get("email") || "").trim(),
          service: String(data.get("service") || ""),
          website: String(data.get("website") || ""), // honeypot
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.detail || "Send failed.");
      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
      setWhatsappUrl(whatsappFallback(data));
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-8 text-center">
        <CheckCircle2 className="size-10 text-brand-600" />
        <p className="font-display text-lg font-semibold text-ink-900">Message sent</p>
        <p className="text-sm text-muted">
          Thanks for reaching out — our team will get back to you shortly. For anything urgent,
          call {site.phones[0]} or chat with us on WhatsApp.
        </p>
        <Button variant="outline" size="md" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    );
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

      {/* Honeypot — hidden from users, catches bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Do not fill this in
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {error && <p className="text-sm font-medium text-accent-600">{error}</p>}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full sm:w-auto"
        disabled={status === "sending"}
      >
        <Send className="size-4" />
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </Button>

      {status === "error" && whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <MessageCircle className="size-4" />
          Send via WhatsApp instead
        </a>
      )}

      <p className="text-xs text-muted">
        We&apos;ll only use your details to respond to your enquiry.
      </p>
    </form>
  );
}
