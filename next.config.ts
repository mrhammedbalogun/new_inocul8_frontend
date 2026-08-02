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
  "img-src 'self' data: blob: https://api.inocul8.com.ng https://inocul8-website-s3.s3.eu-west-1.amazonaws.com",
  "font-src 'self' data:",
  // The S3 host in connect-src is for the studio's presigned direct uploads
  // (browser PUTs the file to S3, bypassing Vercel's 4.5MB body cap).
  "connect-src 'self' https://api.inocul8.com.ng https://inocul8-website-s3.s3.eu-west-1.amazonaws.com",
  "frame-src https://www.google.com https://maps.google.com", // contact-page map embed
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me",
  "frame-ancestors 'none'",
  // Dev-only exclusion: this directive tells the browser to silently rewrite
  // every same-origin http:// subresource request the page makes (including
  // the studio's own `fetch("/api/studio/...")` calls) to https://. The dev
  // server has no TLS listener, so in dev that turned every studio API call
  // into a failed https request to a closed port — discovered while
  // verifying this task's login+list flow end to end.
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Dev-only: never send HSTS over plain HTTP. Chrome pins it per-host once
  // seen, so a dev server on http://localhost that sent this would get the
  // browser to force https for localhost on every future visit — including
  // to other local projects — until manually cleared via
  // chrome://net-internals/#hsts. Discovered while verifying this task: the
  // studio's own API call broke because the *previous* response (the page
  // load) had already taught Chrome to upgrade localhost to https.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.inocul8.com.ng", pathname: "/media/**" },
      {
        protocol: "https",
        hostname: "inocul8-website-s3.s3.eu-west-1.amazonaws.com",
        pathname: "/media/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Migration redirects per docs/02-ranking-pages.md (toolkit repo). The
  // spam/WooCommerce 410s live in src/proxy.ts (redirects can't send 410).
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
      // Booking is handled externally by Cowva. Preserve the legacy /book-now
      // SEO URL with a permanent 301 to the external booking page.
      { source: "/book-now", destination: "https://booking.cowva.com/inocul8", permanent: true },
      { source: "/book", destination: "https://booking.cowva.com/inocul8", permanent: true },
    ];
  },
};

export default nextConfig;
