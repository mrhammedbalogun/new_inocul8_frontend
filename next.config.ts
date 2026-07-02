import type { NextConfig } from "next";

// Security headers (Stage 6 hardening). CSP uses 'unsafe-inline' for scripts
// because Next.js hydration + inline JSON-LD need it without a nonce pipeline;
// external script sources are still locked to 'self'.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // React dev mode needs eval() for source maps; never allowed in production.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://api.inocul8.com.ng",
  "font-src 'self' data:",
  "connect-src 'self' https://api.inocul8.com.ng",
  "frame-src https://www.google.com https://maps.google.com", // contact-page map embed
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.inocul8.com.ng", pathname: "/media/**" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Migration redirects per docs/02-ranking-pages.md (toolkit repo). The
  // spam/WooCommerce 410s live in src/middleware.ts (redirects can't send 410).
  async redirects() {
    return [
      // Legacy slug normalization
      { source: "/hepatitisb", destination: "/hepatitis-b", permanent: true },
      // Duplicate-post canonicalization (GSC: both rank; keep the original)
      {
        source: "/yellow-fever-card-how-to-know-if-its-original-or-fake-2",
        destination: "/yellow-fever-card-how-to-know-if-its-original-or-fake",
        permanent: true,
      },
      // WP category archives → new blog category paths
      { source: "/category/uncategorized", destination: "/blog/category/talk-vaccines", permanent: true },
      { source: "/category/travel-health-blog", destination: "/blog/category/travel-health", permanent: true },
      { source: "/category/travel-vaccine", destination: "/blog/category/travel-health", permanent: true },
      { source: "/category/:slug", destination: "/blog/category/:slug", permanent: true },
      // WooCommerce dropped: shop → services hub
      { source: "/shop", destination: "/what-we-do", permanent: true },
      { source: "/shop/:path*", destination: "/what-we-do", permanent: true },
      // Booking app pending (Stage 5) — temporary redirect until it ships,
      // then flip to a 301 → https://booking.inocul8.com.ng/
      { source: "/book-now", destination: "/contact", permanent: false },
      // Site-wide Book CTAs point at /book (future booking app route)
      { source: "/book", destination: "/contact", permanent: false },
    ];
  },
};

export default nextConfig;
