// 410 Gone (Next.js proxy) for retired WooCommerce URLs and the hack-era spam sitemaps
// (docs/02-ranking-pages.md §6–7 in the toolkit repo). These must never 301
// to real pages — Google should drop them from the index.
import { NextRequest, NextResponse } from "next/server";

const STUDIO_SESSION_MARKER = "i8_studio_session";

/** Cheap presence check against a valueless marker cookie — the proxy never
 *  sees a token. This is UX only; the real boundary is Django rejecting the
 *  JWT on every proxied call. */
function hasStudioSession(req: NextRequest) {
  return Boolean(req.cookies.get(STUDIO_SESSION_MARKER)?.value);
}

const GONE_EXACT = new Set([
  "/cart",
  "/checkout",
  "/payment-confirmation",
  "/payment-failed",
  "/my-account",
]);

const GONE_PATTERNS = [
  /^\/outlet(\/|$)/, // old WooCommerce product tree
  /^\/collection-library[^/]*\.xml$/, // spam sitemaps from wpcore-content-manager
  /^\/library-registry[^/]*\.xml$/,
];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/studio")) {
    const isLogin = pathname === "/studio/login";
    if (!isLogin && !hasStudioSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/studio/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  if (GONE_EXACT.has(pathname) || GONE_PATTERNS.some((re) => re.test(pathname))) {
    return new NextResponse("Gone", { status: 410 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/cart",
    "/checkout",
    "/payment-confirmation",
    "/payment-failed",
    "/my-account",
    "/outlet",
    "/outlet/:path*",
    "/:xml(collection-library[^/]*\\.xml|library-registry[^/]*\\.xml)",
    "/studio",
    "/studio/:path*",
  ],
};
