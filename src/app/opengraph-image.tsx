import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Default social / AI link-card image, inherited by every route that doesn't
// set its own openGraph.images (e.g. blog posts). Service pages override with
// their featured image. 1200×630 is the standard OG/Twitter large-card size.
export const alt = "Inocul8 — Vaccination & preventive health at your doorstep, Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0b7a71 0%, #075e57 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>
          {site.name}
          <span style={{ color: "#ffd15c", marginLeft: 6 }}>.</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 920 }}>
            Vaccination &amp; preventive health, at your doorstep
          </div>
          <div style={{ fontSize: 30, marginTop: 24, color: "rgba(255,255,255,0.82)" }}>
            Childhood immunization · Travel health &amp; yellow fever cards · Adult vaccines · Lagos
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 26, color: "rgba(255,255,255,0.9)" }}>
          <span style={{ color: "#ffd15c", fontWeight: 700 }}>Rated {site.rating.value}/5</span>
          <span>from {site.rating.count}+ patients</span>
          <span style={{ marginLeft: "auto", fontWeight: 600 }}>inocul8.com.ng</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
