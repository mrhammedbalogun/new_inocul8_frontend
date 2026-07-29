# Blog Studio — Frontend Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/studio` authoring UI — TipTap editor, media handling, autosave, SEO panel, workflow dialogs and real-renderer preview — plus the public-rendering changes that surface author and medical-review data, and the two cross-repo closing tasks that can only run once the studio is proven.

**Architecture:** A `/studio` route group inside this Next.js app, gated in `src/proxy.ts`. Browser JS never holds a token: `/api/studio/*` route handlers act as a thin BFF, reading httpOnly cookies and forwarding `Authorization: Bearer` to Django. The editor imports `EDITOR_EXTENSIONS` from `src/lib/editor/schema.ts` (built in Plan 1 Task 0), so the schema the editor writes is exactly the schema that was round-trip verified and that the backend sanitizer allowlists.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2, Tailwind v4, TypeScript, Tiptap 3.29.2, lucide-react.

**Prerequisites:** Plan 1 deployed and verified. Plan 1 Task 0 complete (`src/lib/editor/schema.ts` exists).

**Spec:** `docs/superpowers/specs/2026-07-28-blog-studio-design.md`

## Global Constraints

- **This Next.js version renames `middleware.ts` to `src/proxy.ts`.** The file already exists and handles 410s — extend it, do not create `middleware.ts`.
- **Read `node_modules/next/dist/docs/` before writing App Router code.** Per this repo's `AGENTS.md`, this Next version has breaking changes versus training data.
- **Browser JS never touches a JWT.** No token in `localStorage`, `sessionStorage` or a non-httpOnly cookie. Every studio API call goes through a `/api/studio/*` route handler.
- **Never set studio cookies at `Path=/`** — the studio shares a hostname with the public marketing site.
- **`/studio` must never be indexed:** `X-Robots-Tag: noindex` from `proxy.ts`, excluded from `sitemap.ts`, disallowed in `robots.ts`.
- **Do not import Tiptap into any public route.** It must code-split into the studio chunk only; Task 12 verifies this against the build output.
- **The public post page's rendered output must not regress.** 70 ranked URLs render through it.
- Commit style: conventional commits. Branch: `feat/blog-studio` (already created, holds the spec, plans and Task 0).

## Known state of the code being modified

- `src/app/[slug]/page.tsx` hardcodes a **"Medically reviewed"** badge and an "The Inocul8 Clinical Team" byline block on every post.
- `src/lib/schema.ts` → `articleSchema()` **already hardcodes** `author` and `reviewedBy` as the Organization "The Inocul8 Clinical Team". Task 11 parameterises both.
- `.service-prose` in `src/app/globals.css` styles `ul` with `list-style: none` and a `✓` pseudo-element. **Ordered lists, figures, captions and callouts have no styles yet** — Task 11 adds them, and must scope the `✓` treatment to `ul` so `ol` renders as numbers.
- `src/lib/blog.ts` maps the API into a `BlogPost` type. New fields must be added there before the page can use them.

---

## Task 1: Studio route group, gate and noindex

**Files:**
- Create: `src/app/studio/layout.tsx`, `src/app/studio/page.tsx`
- Modify: `src/proxy.ts`
- Modify: `src/app/robots.ts` (create if absent), `src/app/sitemap.ts`

**Interfaces:**
- Produces: the `/studio` route group and the `hasStudioSession(req)` cookie check reused by Task 2.

- [ ] **Step 1: Extend the proxy gate**

In `src/proxy.ts`, add above the existing handler:

```ts
const STUDIO_SESSION_MARKER = "i8_studio_session";

/** Cheap presence check against a valueless marker cookie — the proxy never
 *  sees a token. This is UX only; the real boundary is Django rejecting the
 *  JWT on every proxied call. */
function hasStudioSession(req: NextRequest) {
  return Boolean(req.cookies.get(STUDIO_SESSION_MARKER)?.value);
}
```

Inside `proxy()`, before the existing 410 logic:

```ts
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
```

Add `"/studio/:path*"` to the exported `config.matcher` array.

- [ ] **Step 2: Create the studio layout**

`src/app/studio/layout.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inocul8 Blog Studio",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50 text-ink-900">{children}</div>;
}
```

- [ ] **Step 3: Placeholder page so the route resolves**

`src/app/studio/page.tsx`:

```tsx
export default function StudioHome() {
  return <p className="p-8">Studio</p>;
}
```

- [ ] **Step 4: Exclude from robots and sitemap**

In `src/app/robots.ts`, add `disallow: ["/studio", "/api/studio"]` to the rules. If the file doesn't exist, create it:

```ts
import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/api/studio"] },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
```

In `src/app/sitemap.ts`, confirm nothing enumerates `/studio` (it shouldn't — the sitemap is built from CMS content).

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Visit `http://localhost:3000/studio` → expect a redirect to `/studio/login`.
Check headers: `curl -sI http://localhost:3000/studio/login | grep -i x-robots-tag` → `noindex, nofollow`.

- [ ] **Step 6: Commit**

```bash
git add src/proxy.ts src/app/studio src/app/robots.ts
git commit -m "feat: studio route group with auth gate and noindex"
```

---

## Task 2: BFF route handlers and cookie session

**Files:**
- Create: `src/lib/studio/session.ts`, `src/app/api/studio/login/route.ts`, `src/app/api/studio/logout/route.ts`, `src/app/api/studio/[...path]/route.ts`
- Create: `src/lib/studio/client.ts`

**Interfaces:**
- Produces: `studioFetch<T>(path, init?): Promise<T>` (browser-side, used by every later task) and the cookie helpers `setSessionCookies`, `clearSessionCookies`, `readAccess`, `refreshAccess`.

- [ ] **Step 1: Write the cookie/session helpers**

`src/lib/studio/session.ts`:

```ts
// Token custody for the studio. Browser JS never sees a JWT: tokens live in
// httpOnly cookies and are attached to Django calls server-side.
//
// Cookie paths are deliberately narrow — the studio shares a hostname with the
// public marketing site, so nothing is ever set at Path=/.
import { cookies } from "next/headers";

const API = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";

export const ACCESS_COOKIE = "i8_studio_access";
export const REFRESH_COOKIE = "i8_studio_refresh";
/** Valueless presence marker so proxy.ts can tell "signed in" without ever
 *  seeing a token. It MUST have a different NAME from the refresh cookie:
 *  Next's cookie jar is keyed by name, so setting the same name twice with
 *  different paths overwrites rather than producing two Set-Cookie headers. */
export const SESSION_MARKER = "i8_studio_session";

const ACCESS_PATH = "/api/studio";
const REFRESH_PATH = "/api/studio/refresh";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export async function setSessionCookies(access: string, refresh: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, access, { ...base, path: ACCESS_PATH, maxAge: 60 * 15 });
  jar.set(REFRESH_COOKIE, refresh, { ...base, path: REFRESH_PATH, maxAge: 60 * 60 * 24 * 14 });
  jar.set(SESSION_MARKER, "1", { ...base, path: "/studio", maxAge: 60 * 60 * 24 * 14 });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete({ name: ACCESS_COOKIE, path: ACCESS_PATH });
  jar.delete({ name: REFRESH_COOKIE, path: REFRESH_PATH });
  jar.delete({ name: SESSION_MARKER, path: "/studio" });
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { access, refresh } = await res.json();
  await setSessionCookies(access, refresh);
  return access as string;
}

// Single-flight: the autosave loop plus a second tab can otherwise fire
// concurrent refreshes, and with rotation the loser gets logged out mid-post.
let inFlight: Promise<string | null> | null = null;

export async function refreshAccess(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const jar = await cookies();
    const refresh = jar.get(REFRESH_COOKIE)?.value;
    if (!refresh) return null;
    const res = await fetch(`${API}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    await setSessionCookies(data.access, data.refresh ?? refresh);
    return data.access as string;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
```

- [ ] **Step 2: Write the login and logout handlers**

`src/app/api/studio/login/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/studio/session";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const access = await login(username, password);
  if (!access) {
    return NextResponse.json({ detail: "Incorrect username or password." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
```

`src/app/api/studio/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/studio/session";

export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Write the catch-all proxy**

`src/app/api/studio/[...path]/route.ts`. Keep it dumb — forward, don't transform — so it never becomes a second API to maintain.

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, refreshAccess } from "@/lib/studio/session";

const API = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";

/** Cookie auth reopens CSRF; SameSite=Lax plus these two checks close it. */
function rejectsCrossSite(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return false;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return true;
  if (req.headers.get("x-studio-request") !== "1") return true;
  return false;
}

async function forward(req: NextRequest, path: string[], token: string) {
  const url = `${API}/studio/${path.join("/")}/${req.nextUrl.search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = req.headers.get("content-type");
  // Let fetch set its own boundary for multipart uploads.
  if (contentType && !contentType.startsWith("multipart/form-data")) {
    headers.set("Content-Type", contentType);
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  return fetch(url, { method: req.method, headers, body, cache: "no-store" });
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (rejectsCrossSite(req)) {
    return NextResponse.json({ detail: "Cross-site request blocked." }, { status: 403 });
  }
  const { path } = await ctx.params;
  const jar = await cookies();
  let token = jar.get(ACCESS_COOKIE)?.value;

  if (!token) {
    token = (await refreshAccess()) ?? undefined;
    if (!token) return NextResponse.json({ detail: "Session expired." }, { status: 401 });
  }

  let res = await forward(req, path, token);
  if (res.status === 401) {
    const fresh = await refreshAccess();
    if (!fresh) return NextResponse.json({ detail: "Session expired." }, { status: 401 });
    res = await forward(req, path, fresh);
  }

  const payload = await res.arrayBuffer();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
```

**Note:** a `POST` body is buffered with `arrayBuffer()` so multipart uploads pass through untouched.

- [ ] **Step 4: Write the browser client**

`src/lib/studio/client.ts`:

```ts
// Every studio call from the browser goes through the same-origin BFF.
export class StudioError extends Error {
  constructor(message: string, readonly status: number, readonly data: unknown) {
    super(message);
  }
}

export async function studioFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const res = await fetch(`/api/studio/${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      "X-Studio-Request": "1",
      ...init.headers,
    },
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data as { detail?: string })?.detail ??
      (data ? Object.values(data).flat().join(" ") : "Something went wrong.");
    throw new StudioError(message, res.status, data);
  }
  return data as T;
}
```

- [ ] **Step 5: Verify manually**

Start the dev server. With no session, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/studio/posts` → `401`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/studio src/app/api/studio
git commit -m "feat: studio BFF with httpOnly cookie session and single-flight refresh"
```

---

## Task 3: Login page

**Files:**
- Create: `src/app/studio/login/page.tsx`

- [ ] **Step 1: Build the page**

```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function StudioLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/studio/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Studio-Request": "1" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Incorrect username or password.");
      return;
    }
    router.replace(params.get("next") ?? "/studio");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-ink-900/8 bg-white p-8 shadow-soft">
        <h1 className="font-display text-2xl font-semibold">Blog Studio</h1>
        <p className="mt-1 text-sm text-muted">Sign in to write and publish.</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required
               className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2" />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
               className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2" />

        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy}
                className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify end to end**

With Plan 1 deployed, sign in using a `Blog Author` account created in Django admin. Expect a redirect to `/studio`.

- [ ] **Step 3: Commit**

```bash
git add src/app/studio/login
git commit -m "feat: studio login page"
```

---

## Task 4: Post list

**Files:**
- Create: `src/lib/studio/types.ts`, `src/app/studio/posts-table.tsx`
- Modify: `src/app/studio/page.tsx`

**Interfaces:**
- Produces: types `StudioPostRow`, `StudioPostDetail`, `StudioMe`, `MediaAssetT` — used by every later task.

- [ ] **Step 1: Define the shared types**

`src/lib/studio/types.ts`:

```ts
export type PostStatus =
  | "draft" | "pending_review" | "changes_requested" | "scheduled" | "published";

export type MediaAssetT = {
  id: number; url: string; alt_text: string; caption: string; title: string;
  width: number; height: number; mime: string; created_at: string;
};

export type StudioAuthorT = {
  id: number; name: string; slug: string; credentials: string;
  title: string; is_clinician: boolean; can_medically_review: boolean;
};

export type StudioPostRow = {
  id: number; title: string; slug: string; status: PostStatus;
  published_at: string | null; updated_at: string;
  author_name: string; featured_image: MediaAssetT | null; is_featured: boolean;
};

export type StudioPostDetail = StudioPostRow & {
  excerpt: string; body: string; draft_body: string;
  categories: { id: number; name: string; slug: string }[];
  tags: string[]; author: number | null;
  first_published_at: string | null;
  medically_reviewed_by: StudioAuthorT | null;
  medically_reviewed_at: string | null;
  legacy_team_reviewed: boolean;
  review_note: string; has_pending_changes: boolean;
  meta_title: string; meta_description: string; focus_keyword: string;
  canonical_url: string; og_title: string; og_description: string; noindex: boolean;
};

export type StudioMe = {
  id: number; username: string; name: string;
  can_publish: boolean; can_review: boolean;
  can_medically_review: boolean; credentials: string;
};

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  scheduled: "Scheduled",
  published: "Published",
};

export const STATUS_CLASS: Record<PostStatus, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  pending_review: "bg-amber-100 text-amber-800",
  changes_requested: "bg-red-100 text-red-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
};
```

- [ ] **Step 2: Build the list**

`src/app/studio/posts-table.tsx` — a client component that loads via `studioFetch`, renders status chips, a search box, a status filter, and a "New post" button that POSTs an empty draft then routes to it.

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { studioFetch } from "@/lib/studio/client";
import { STATUS_CLASS, STATUS_LABEL, type PostStatus, type StudioPostRow } from "@/lib/studio/types";

export function PostsTable() {
  const router = useRouter();
  const [rows, setRows] = useState<StudioPostRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PostStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studioFetch<{ results: StudioPostRow[] }>("posts/?page_size=100")
      .then((d) => setRows(d.results))
      .finally(() => setLoading(false));
  }, []);

  async function createPost() {
    const post = await studioFetch<StudioPostRow>("posts/", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled post", slug: `untitled-${Date.now()}` }),
    });
    router.push(`/studio/posts/${post.id}`);
  }

  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Blog posts</h1>
        <button onClick={createPost} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">
          New post
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts…"
               className="flex-1 rounded-lg border border-ink-900/12 px-3 py-2" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as PostStatus | "all")}
                className="rounded-lg border border-ink-900/12 px-3 py-2">
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-10 text-muted">Loading…</p>
      ) : (
        <ul className="mt-6 divide-y divide-ink-900/8 rounded-2xl border border-ink-900/8 bg-white">
          {visible.map((row) => (
            <li key={row.id}>
              <Link href={`/studio/posts/${row.id}`} className="flex items-center gap-4 p-4 hover:bg-neutral-50">
                <span className="flex-1 font-medium">{row.title}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
                <time className="w-32 text-right text-sm text-muted">
                  {new Date(row.updated_at).toLocaleDateString("en-NG")}
                </time>
              </Link>
            </li>
          ))}
          {visible.length === 0 && <li className="p-6 text-muted">No posts match.</li>}
        </ul>
      )}
    </div>
  );
}
```

Replace `src/app/studio/page.tsx` with `import { PostsTable } from "./posts-table"; export default function StudioHome() { return <PostsTable />; }`.

- [ ] **Step 3: Verify** — the list shows all 70 posts with "Published" chips.

- [ ] **Step 4: Commit**

```bash
git add src/lib/studio/types.ts src/app/studio
git commit -m "feat: studio post list"
```

---

## Task 5: Editor shell and TipTap toolbar

**Files:**
- Create: `src/app/studio/posts/[id]/page.tsx`, `src/app/studio/posts/[id]/editor.tsx`, `src/components/studio/toolbar.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `EDITOR_EXTENSIONS` from `src/lib/editor/schema.ts` (Plan 1 Task 0).
- Produces: `<Toolbar editor={editor} onInsertImage={() => void} />`.

- [ ] **Step 1: Install the React binding**

```bash
npm install @tiptap/react@3.29.2 @tiptap/extension-drag-handle-react@3.29.2 @tiptap/extension-file-handler@3.29.2
```

(`@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extensions`, `@tiptap/extension-image` and `@tiptap/html` were installed in Plan 1 Task 0. **No table extension** — tables are cut from v1, see the spec §5.)

- [ ] **Step 2: Build the toolbar**

`src/components/studio/toolbar.tsx`:

```tsx
"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote,
  Minus, Link2, Image as ImageIcon, Info, Code,
} from "lucide-react";

type Props = { editor: Editor | null; onInsertImage: () => void };

export function Toolbar({ editor, onInsertImage }: Props) {
  if (!editor) return null;

  const btn = (active: boolean) =>
    `grid size-9 place-items-center rounded-md transition-colors ${
      active ? "bg-brand-100 text-brand-700" : "text-ink-700 hover:bg-neutral-100"
    }`;

  function setLink() {
    const previous = editor!.getAttributes("link").href ?? "";
    const url = window.prompt("Link URL", previous);
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-ink-900/8 bg-white/95 px-3 py-2 backdrop-blur">
      {[2, 3, 4].map((level) => (
        <button key={level} type="button" title={`Heading ${level}`}
                onClick={() => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()}
                className={btn(editor.isActive("heading", { level }))}>
          <span className="text-sm font-semibold">H{level}</span>
        </button>
      ))}
      <span className="mx-1 h-6 w-px bg-ink-900/10" />

      <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}
              className={btn(editor.isActive("bold"))}><Bold className="size-4" /></button>
      <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}
              className={btn(editor.isActive("italic"))}><Italic className="size-4" /></button>
      <button type="button" title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={btn(editor.isActive("underline"))}><Underline className="size-4" /></button>
      <button type="button" title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}
              className={btn(editor.isActive("strike"))}><Strikethrough className="size-4" /></button>
      <span className="mx-1 h-6 w-px bg-ink-900/10" />

      <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={btn(editor.isActive("bulletList"))}><List className="size-4" /></button>
      <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={btn(editor.isActive("orderedList"))}><ListOrdered className="size-4" /></button>
      <button type="button" title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={btn(editor.isActive("blockquote"))}><Quote className="size-4" /></button>
      <button type="button" title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className={btn(false)}><Minus className="size-4" /></button>
      <span className="mx-1 h-6 w-px bg-ink-900/10" />

      <button type="button" title="Link" onClick={setLink} className={btn(editor.isActive("link"))}>
        <Link2 className="size-4" />
      </button>
      <button type="button" title="Insert image" onClick={onInsertImage} className={btn(false)}>
        <ImageIcon className="size-4" />
      </button>
      <button type="button" title="Callout"
              onClick={() => editor.chain().focus().toggleWrap("callout", { variant: "info" }).run()}
              className={btn(editor.isActive("callout"))}><Info className="size-4" /></button>
      <button type="button" title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={btn(editor.isActive("codeBlock"))}><Code className="size-4" /></button>
    </div>
  );
}
```

- [ ] **Step 3: Build the editor shell**

`src/app/studio/posts/[id]/editor.tsx` — the client component holding editor state. It loads the post, mounts TipTap on `draft_body`, and renders the toolbar. Autosave arrives in Task 7; the sidebar in Task 8.

```tsx
"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { EDITOR_EXTENSIONS } from "@/lib/editor/schema";
import { studioFetch } from "@/lib/studio/client";
import type { StudioPostDetail } from "@/lib/studio/types";
import { Toolbar } from "@/components/studio/toolbar";

export function PostEditor({ id }: { id: string }) {
  const [post, setPost] = useState<StudioPostDetail | null>(null);

  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: "",
    immediatelyRender: false, // required in the App Router: avoids SSR hydration mismatch
    editorProps: { attributes: { class: "service-prose focus:outline-none min-h-[60vh]" } },
  });

  useEffect(() => {
    studioFetch<StudioPostDetail>(`posts/${id}/`).then((data) => {
      setPost(data);
      editor?.commands.setContent(data.draft_body || data.body || "<p></p>");
    });
  }, [id, editor]);

  if (!post) return <p className="p-8 text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <input
        value={post.title}
        onChange={(e) => setPost({ ...post, title: e.target.value })}
        placeholder="Post title"
        className="w-full border-0 font-display text-3xl font-semibold outline-none placeholder:text-neutral-300"
      />
      <div className="mt-6 rounded-2xl border border-ink-900/8 bg-white">
        <Toolbar editor={editor} onInsertImage={() => {}} />
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
```

`src/app/studio/posts/[id]/page.tsx`:

```tsx
import { PostEditor } from "./editor";

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostEditor id={id} />;
}
```

- [ ] **Step 4: Verify**

Open an existing post. Its content loads, formatting buttons work, and the `.service-prose` class means it already looks close to the published article.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/studio/posts src/components/studio
git commit -m "feat: tiptap editor shell and formatting toolbar"
```

---

## Task 6: Images — media picker, upload, drag/paste, and the figure node UI

**Files:**
- Create: `src/components/studio/media-picker.tsx`, `src/components/studio/figure-view.tsx`
- Modify: `src/lib/editor/schema.ts`, `src/app/studio/posts/[id]/editor.tsx`

**Interfaces:**
- Consumes: `POST /api/studio/media/` (Plan 1 Task 9), returning `MediaAssetT`.
- Produces: `<MediaPicker open onClose onSelect />`; `uploadImage(file): Promise<MediaAssetT>`.

- [ ] **Step 1: Add the upload helper**

Append to `src/lib/studio/client.ts`:

```ts
import type { MediaAssetT } from "./types";

export async function uploadImage(file: File, altText = ""): Promise<MediaAssetT> {
  const form = new FormData();
  form.append("file", file);
  if (altText) form.append("alt_text", altText);
  return studioFetch<MediaAssetT>("media/", { method: "POST", body: form });
}
```

- [ ] **Step 2: Build the media picker**

`src/components/studio/media-picker.tsx` — a modal with two tabs: "Upload" (file input + drop zone) and "Library" (grid of existing assets from `GET media/`). Selecting an asset calls `onSelect(asset)`.

```tsx
"use client";

import { useEffect, useState } from "react";
import { studioFetch, uploadImage } from "@/lib/studio/client";
import type { MediaAssetT } from "@/lib/studio/types";

type Props = { open: boolean; onClose: () => void; onSelect: (asset: MediaAssetT) => void };

export function MediaPicker({ open, onClose, onSelect }: Props) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [assets, setAssets] = useState<MediaAssetT[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<MediaAssetT | null>(null);
  const [alt, setAlt] = useState("");

  useEffect(() => {
    if (open && tab === "library") {
      studioFetch<{ results: MediaAssetT[] }>("media/?page_size=60").then((d) => setAssets(d.results));
    }
  }, [open, tab]);

  if (!open) return null;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const asset = await uploadImage(file);
      setPending(asset);
      setAlt(asset.alt_text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(asset: MediaAssetT) {
    if (alt && alt !== asset.alt_text) {
      await studioFetch(`media/${asset.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ alt_text: alt }),
      });
      asset = { ...asset, alt_text: alt };
    }
    onSelect(asset);
    setPending(null);
    setAlt("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 border-b border-ink-900/8 pb-3">
          <button onClick={() => setTab("upload")}
                  className={tab === "upload" ? "font-semibold text-brand-700" : "text-muted"}>Upload</button>
          <button onClick={() => setTab("library")}
                  className={tab === "library" ? "font-semibold text-brand-700" : "text-muted"}>Library</button>
        </div>

        {pending ? (
          <div className="mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending.url} alt="" className="max-h-64 rounded-lg" />
            <label className="mt-4 block text-sm font-medium" htmlFor="alt">Alt text</label>
            <input id="alt" value={alt} onChange={(e) => setAlt(e.target.value)}
                   placeholder="Describe what's in the photo, e.g. 'Nurse administering yellow fever vaccine'"
                   className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2" />
            <p className="mt-1 text-xs text-muted">
              Needed before the post can be published — you can add it later, but publishing will ask for it.
            </p>
            <button onClick={() => confirm(pending)}
                    className="mt-4 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">
              Insert image
            </button>
          </div>
        ) : tab === "upload" ? (
          <div className="mt-4">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              className="grid h-40 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-900/15 text-muted"
            >
              {busy ? "Uploading…" : "Drop an image here, or click to choose"}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic"
                     className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="mt-4 grid max-h-96 grid-cols-4 gap-3 overflow-y-auto">
            {assets.map((asset) => (
              <button key={asset.id} onClick={() => { setPending(asset); setAlt(asset.alt_text); }}
                      className="overflow-hidden rounded-lg border border-ink-900/8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.alt_text} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the FileHandler extension for drag/paste**

In `src/lib/editor/schema.ts`, the schema module stays framework-agnostic — so add FileHandler in the **editor component** instead, where the upload callback lives. In `editor.tsx`:

```tsx
import FileHandler from "@tiptap/extension-file-handler";
import { uploadImage } from "@/lib/studio/client";

// …inside useEditor:
    extensions: [
      ...EDITOR_EXTENSIONS,
      FileHandler.configure({
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
        onDrop: (currentEditor, files, pos) => {
          files.forEach(async (file) => {
            const asset = await uploadImage(file);
            currentEditor.chain().insertContentAt(pos, figureNode(asset)).focus().run();
          });
        },
        onPaste: (currentEditor, files) => {
          files.forEach(async (file) => {
            const asset = await uploadImage(file);
            currentEditor.chain().focus().insertContent(figureNode(asset)).run();
          });
        },
      }),
    ],
```

And a helper in the same file:

```tsx
import type { MediaAssetT } from "@/lib/studio/types";

function figureNode(asset: MediaAssetT) {
  return {
    type: "figure",
    attrs: {
      src: asset.url, alt: asset.alt_text,
      width: asset.width, height: asset.height,
      align: "center", size: "large",
    },
    content: asset.caption ? [{ type: "text", text: asset.caption }] : [],
  };
}
```

**Width/height come from the MediaAsset record and serialize into the stored HTML — that is what makes CLS zero with no author involvement.**

- [ ] **Step 4: Wire the picker to the toolbar button**

In `editor.tsx`, add `const [pickerOpen, setPickerOpen] = useState(false);`, pass `onInsertImage={() => setPickerOpen(true)}` to `<Toolbar>`, and render:

```tsx
<MediaPicker
  open={pickerOpen}
  onClose={() => setPickerOpen(false)}
  onSelect={(asset) => editor?.chain().focus().insertContent(figureNode(asset)).run()}
/>
```

- [ ] **Step 5: Add the figure controls (alignment and size)**

Create `src/components/studio/figure-view.tsx`: a `NodeViewWrapper` rendering the image plus a small floating control bar shown when the node is selected — four alignment options and four size options, each calling `updateAttributes({ align })` / `updateAttributes({ size })`, plus Replace (reopens the picker) and Remove (`deleteNode`). The caption renders as a `NodeViewContent` inside a `<figcaption>` so it stays editable.

**`schema.ts` must stay free of node views** — the Node.js round-trip script imports the same module and cannot load React components. Instead, extend the imported node in `editor.tsx`:

```tsx
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FigureView } from "@/components/studio/figure-view";
import { Figure } from "@/lib/editor/schema";

const FigureWithView = Figure.extend({
  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});
```

then use `EDITOR_EXTENSIONS.map(e => e.name === "figure" ? FigureWithView : e)`. This keeps the Node.js round-trip script working unchanged.

- [ ] **Step 6: Verify**

Drag a photo in from the desktop — it uploads, appears with a caption slot, and the alignment/size controls change the classes. Paste a screenshot — same. Confirm on the network tab that the request went to `/api/studio/media/` (same-origin), not to Django directly.

- [ ] **Step 7: Commit**

```bash
git add src/components/studio src/lib/editor src/lib/studio src/app/studio
git commit -m "feat: image upload, media picker and figure controls"
```

---

## Task 7: Autosave

**Files:**
- Create: `src/lib/studio/use-autosave.ts`, `src/components/studio/save-status.tsx`
- Modify: `src/app/studio/posts/[id]/editor.tsx`

**Interfaces:**
- Produces: `useAutosave({ id, payload, enabled })` returning `{ state, lastSavedAt, error, saveNow }`.

- [ ] **Step 1: Write the hook**

`src/lib/studio/use-autosave.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioError, studioFetch } from "./client";

export type SaveState = "idle" | "saving" | "saved" | "error" | "stale" | "unauthorized";

const DEBOUNCE_MS = 2000;

export function useAutosave<T extends Record<string, unknown>>(opts: {
  id: string;
  payload: T;
  enabled: boolean;
  expectedUpdatedAt: string | null;
  onSaved: (updatedAt: string) => void;
}) {
  const { id, payload, enabled, expectedUpdatedAt, onSaved } = opts;
  const [state, setState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(payload);
  latest.current = payload;

  const saveNow = useCallback(async () => {
    setState("saving");
    try {
      const res = await studioFetch<{ updated_at: string }>(`posts/${id}/autosave/`, {
        method: "PATCH",
        body: JSON.stringify({ ...latest.current, expected_updated_at: expectedUpdatedAt }),
      });
      setState("saved");
      setLastSavedAt(new Date());
      onSaved(res.updated_at);
    } catch (err) {
      const e = err as StudioError;
      // A 401 must never destroy work: pause and let the shell show a re-login
      // modal without navigating away.
      if (e.status === 401) setState("unauthorized");
      else if (e.status === 400 && String(e.data).includes("changed somewhere else")) setState("stale");
      else setState("error");
      setError(e.message);
    }
  }, [id, expectedUpdatedAt, onSaved]);

  useEffect(() => {
    if (!enabled || state === "unauthorized" || state === "stale") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(saveNow, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payload), enabled]);

  // Warn before losing unsaved work on close.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (state === "saving" || (timer.current && state !== "saved")) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state]);

  return { state, lastSavedAt, error, saveNow };
}
```

- [ ] **Step 2: Write the status chip**

`src/components/studio/save-status.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { SaveState } from "@/lib/studio/use-autosave";

function ago(from: Date) {
  const mins = Math.floor((Date.now() - from.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  return `${mins} minutes ago`;
}

export function SaveStatus({ state, lastSavedAt, error }: {
  state: SaveState; lastSavedAt: Date | null; error: string;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (state === "saving") return <span className="text-sm text-muted">Saving…</span>;
  if (state === "unauthorized")
    return <span className="text-sm font-medium text-amber-700">Signed out — your work is safe, sign in to save</span>;
  if (state === "stale")
    return <span className="text-sm font-medium text-red-600">Changed elsewhere — reload before saving</span>;
  if (state === "error") return <span className="text-sm text-red-600" role="alert">{error}</span>;
  if (state === "saved" && lastSavedAt)
    return <span className="text-sm text-muted">Last saved {ago(lastSavedAt)}</span>;
  return null;
}
```

- [ ] **Step 3: Wire it into the editor**

In `editor.tsx`, build the payload from title + editor HTML and pass it in:

```tsx
const [html, setHtml] = useState("");
// in useEditor: onUpdate: ({ editor }) => setHtml(editor.getHTML()),

const autosave = useAutosave({
  id,
  enabled: Boolean(post) && post?.status !== "pending_review",
  expectedUpdatedAt: post?.updated_at ?? null,
  payload: { title: post?.title ?? "", draft_body: html, excerpt: post?.excerpt ?? "" },
  onSaved: (updatedAt) => setPost((p) => (p ? { ...p, updated_at: updatedAt } : p)),
});
```

Render `<SaveStatus {...autosave} />` in a sticky header bar.

- [ ] **Step 4: Verify**

Type, wait two seconds — "Saving…" then "Saved". Reload — content persists. **Then confirm the invariant:** in Django admin, check the post's `body` field is *unchanged* while `draft_body` holds the new text.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio/use-autosave.ts src/components/studio/save-status.tsx src/app/studio
git commit -m "feat: debounced autosave with save-status indicator"
```

---

## Task 8: Sidebar — publish box, featured image, taxonomy and SEO

**Files:**
- Create: `src/components/studio/sidebar.tsx`, `src/components/studio/seo-panel.tsx`, `src/components/studio/featured-image.tsx`
- Modify: `src/app/studio/posts/[id]/editor.tsx`

- [ ] **Step 1: Build the SEO panel with counters**

`src/components/studio/seo-panel.tsx`. Counters colour green inside the recommended range, amber outside.

```tsx
"use client";

import type { StudioPostDetail } from "@/lib/studio/types";

function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  const ok = n >= min && n <= max;
  return (
    <span className={`text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
      {n} / {min}–{max} recommended
    </span>
  );
}

export function SeoPanel({ post, onChange }: {
  post: StudioPostDetail;
  onChange: (patch: Partial<StudioPostDetail>) => void;
}) {
  const field = "mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2 text-sm";

  return (
    <section className="rounded-xl border border-ink-900/8 bg-white p-4">
      <h2 className="font-semibold">SEO</h2>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="meta_title" className="text-sm font-medium">Meta title</label>
          <Counter value={post.meta_title} min={50} max={60} />
        </div>
        <input id="meta_title" value={post.meta_title} className={field}
               onChange={(e) => onChange({ meta_title: e.target.value })} />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <label htmlFor="meta_description" className="text-sm font-medium">Meta description</label>
          <Counter value={post.meta_description} min={150} max={160} />
        </div>
        <textarea id="meta_description" rows={3} value={post.meta_description} className={field}
                  onChange={(e) => onChange({ meta_description: e.target.value })} />
      </div>

      <div className="mt-3">
        <label htmlFor="focus_keyword" className="text-sm font-medium">Focus keyword</label>
        <input id="focus_keyword" value={post.focus_keyword} className={field}
               onChange={(e) => onChange({ focus_keyword: e.target.value })} />
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium">Social sharing</summary>
        <div className="mt-3">
          <label htmlFor="og_title" className="text-sm font-medium">Open Graph title</label>
          <input id="og_title" value={post.og_title} className={field}
                 onChange={(e) => onChange({ og_title: e.target.value })} />
          <p className="mt-1 text-xs text-muted">Falls back to the meta title.</p>
        </div>
        <div className="mt-3">
          <label htmlFor="og_description" className="text-sm font-medium">Open Graph description</label>
          <textarea id="og_description" rows={2} value={post.og_description} className={field}
                    onChange={(e) => onChange({ og_description: e.target.value })} />
        </div>
      </details>
    </section>
  );
}
```

- [ ] **Step 2: Build the featured-image panel**

`src/components/studio/featured-image.tsx` — preview, Upload/Replace (opens `MediaPicker`), Remove. On select, PATCH `posts/{id}/` with `featured_image_id`.

- [ ] **Step 3: Build the sidebar shell**

`src/components/studio/sidebar.tsx` composes: publish box (status chip, slug display with lock note once `first_published_at` is set, publish date, action buttons — wired in Task 10), featured image, category multi-select + tag input, author select, then `<SeoPanel>`.

The slug row must show the **full final URL** and, when locked:

```tsx
{post.first_published_at ? (
  <p className="mt-1 text-xs text-muted">
    inocul8.com.ng/<strong>{post.slug}</strong> — locked because this post has been
    published. Ask the site maintainer if the URL genuinely needs to change.
  </p>
) : (
  <>
    <input value={post.slug} onChange={(e) => onChange({ slug: e.target.value })} className={field} />
    <p className="mt-1 text-xs text-muted">
      This post will live at inocul8.com.ng/<strong>{post.slug}</strong> — this cannot be changed later.
    </p>
  </>
)}
```

- [ ] **Step 4: Switch the editor to a two-column layout** — canvas left, sidebar right, collapsing to a single column below `lg`.

- [ ] **Step 5: Verify** — all fields save via autosave; the slug field is read-only on a published post.

- [ ] **Step 6: Commit**

```bash
git add src/components/studio src/app/studio
git commit -m "feat: studio sidebar with SEO counters, featured image and taxonomy"
```

---

## Task 9: Preview

**Files:**
- Create: `src/components/studio/preview.tsx`
- Modify: `src/app/studio/posts/[id]/editor.tsx`

- [ ] **Step 1: Build the preview**

It renders the *actual* `ServiceProse` component, which is the entire reason the studio lives in Next — the preview cannot drift from the published article, because it is the same component and the same stylesheet.

```tsx
"use client";

import { ServiceProse } from "@/components/service/service-prose";
import type { StudioPostDetail } from "@/lib/studio/types";

export function Preview({ post, html }: { post: StudioPostDetail; html: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      {post.featured_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.featured_image.url} alt={post.featured_image.alt_text}
             width={post.featured_image.width} height={post.featured_image.height}
             className="mb-8 w-full rounded-2xl" />
      )}
      <h1 className="font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
        {post.title}
      </h1>
      <div className="mt-8">
        <ServiceProse html={html} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add an Edit / Preview tab switch** in the editor header. Preview receives the live editor HTML, so it reflects unsaved work.

- [ ] **Step 3: Commit**

```bash
git add src/components/studio/preview.tsx src/app/studio
git commit -m "feat: preview tab rendering through the real article renderer"
```

---

## Task 10: Workflow dialogs

**Files:**
- Create: `src/components/studio/publish-dialog.tsx`, `src/components/studio/review-banner.tsx`
- Modify: `src/components/studio/sidebar.tsx`

- [ ] **Step 1: Build the publish dialog**

It must show title, **the full final URL**, featured image, category, SEO completeness and the medical-review line, and must surface the backend's `missing_alt` rejection as plain language.

```tsx
"use client";

import { useState } from "react";
import { StudioError, studioFetch } from "@/lib/studio/client";
import type { StudioMe, StudioPostDetail } from "@/lib/studio/types";

export function PublishDialog({ post, me, open, onClose, onPublished }: {
  post: StudioPostDetail; me: StudioMe; open: boolean;
  onClose: () => void; onPublished: (p: StudioPostDetail) => void;
}) {
  const [when, setWhen] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function publish() {
    setBusy(true);
    setError("");
    try {
      const updated = await studioFetch<StudioPostDetail>(`posts/${post.id}/publish/`, {
        method: "POST",
        body: JSON.stringify({
          publish_at: when || undefined,
          expected_updated_at: post.updated_at,
        }),
      });
      onPublished(updated);
      onClose();
    } catch (err) {
      setError((err as StudioError).message);
    } finally {
      setBusy(false);
    }
  }

  const check = (ok: boolean, label: string) => (
    <li className={ok ? "text-emerald-700" : "text-amber-700"}>
      {ok ? "✓" : "!"} {label}
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Publish “{post.title}”</h2>

        <ul className="mt-4 space-y-1 text-sm">
          {check(Boolean(post.featured_image), "Featured image")}
          {check(post.categories.length > 0, "Category")}
          {check(post.meta_description.length >= 150 && post.meta_description.length <= 160,
                 "Meta description length")}
        </ul>

        <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm">
          This post will live at <strong>inocul8.com.ng/{post.slug}</strong>
          {!post.first_published_at && " — this URL cannot be changed later."}
        </p>

        <p className={`mt-3 rounded-lg p-3 text-sm ${me.can_medically_review ? "bg-emerald-50" : "bg-amber-50"}`}>
          {me.can_medically_review ? (
            <>Publishing will mark this post as <strong>medically reviewed by you</strong> ({me.name}
            {me.credentials ? `, ${me.credentials}` : ""}).</>
          ) : (
            <><strong>No medical review.</strong> This post will publish without the “Medically reviewed”
            badge. To publish with medical review, ask a clinician editor to approve it instead.</>
          )}
        </p>

        <label className="mt-4 block text-sm font-medium" htmlFor="when">Schedule for later (optional)</label>
        <input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
               className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2" />

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
          <button onClick={publish} disabled={busy}
                  className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
            {busy ? "Publishing…" : when ? "Schedule" : "Publish now"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the review banner**

Shown above the editor when `status === "changes_requested"` (amber, displaying `review_note`) or `status === "pending_review"` (blue, read-only notice plus a **Withdraw from review** button).

- [ ] **Step 3: Wire the action buttons in the sidebar**

Conditional on `me.can_publish`:
- Author (`!can_publish`): **Save draft** · **Submit for review** (`POST posts/{id}/submit/`) · **Withdraw** when pending.
- Editor (`can_publish`): **Save draft** · **Publish…** (opens the dialog) · **Request changes** (prompts for a note, `POST posts/{id}/request-changes/`) · **Unpublish**.
- On a published post with `has_pending_changes`: show **"Published — you have unsaved-to-live edits"** with **Update live post** (same publish endpoint) and **Discard my edits** (PATCH `draft_body` back to `body`).

- [ ] **Step 4: Verify each transition** against the live backend, checking the resulting status in Django admin each time.

- [ ] **Step 5: Commit**

```bash
git add src/components/studio src/app/studio
git commit -m "feat: publish, review and scheduling dialogs"
```

---

## Task 11: Public rendering — byline, medical review and prose styles

**Files:**
- Modify: `src/lib/blog.ts`, `src/lib/schema.ts`, `src/app/[slug]/page.tsx`, `src/app/globals.css`

**This task touches the 70 ranked pages. Verify carefully.**

- [ ] **Step 1: Extend the blog type and mapper**

In `src/lib/blog.ts`, add to `BlogPost`:

```ts
  featuredImage: { url: string; alt: string; width: number; height: number } | null;
  author: { name: string; credentials: string; title: string; photoUrl: string | null } | null;
  reviewedBy: { name: string; credentials: string; title: string } | null;
  legacyTeamReviewed: boolean;
  ogTitle: string;
  ogDescription: string;
```

Extend `ApiPost` with the matching snake_case fields and map them in `mapPost`. **In the static-fallback path, default `legacyTeamReviewed` to `true`** — the fallback holds exactly the 70 imported posts, which is precisely the set that carries the team badge.

- [ ] **Step 2: Parameterise `articleSchema`**

`src/lib/schema.ts` currently hardcodes `author` and `reviewedBy` as the Organization "The Inocul8 Clinical Team", so **every post already makes a blanket review claim**. Change the signature to accept optional people and emit a `Person` only when one genuinely exists:

```ts
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  author?: { name: string; credentials: string } | null;
  reviewedBy?: { name: string; credentials: string } | null;
  legacyTeamReviewed?: boolean;
}) {
  const org = { "@type": "Organization", name: "The Inocul8 Clinical Team", url: `${site.url}/about-us` };
  const person = (p: { name: string; credentials: string }) => ({
    "@type": "Person",
    name: p.name,
    ...(p.credentials ? { honorificSuffix: p.credentials } : {}),
  });

  // A reviewedBy claim is only emitted where a credentialed clinician actually
  // attested (spec §6.4). Legacy imported posts keep the team-level claim they
  // already shipped with; anything else emits no claim at all.
  const reviewed = opts.reviewedBy
    ? person(opts.reviewedBy)
    : opts.legacyTeamReviewed
      ? org
      : null;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    datePublished: new Date(opts.datePublished.replace(" ", "T")).toISOString(),
    dateModified: new Date((opts.dateModified || opts.datePublished).replace(" ", "T")).toISOString(),
    author: opts.author ? person(opts.author) : org,
    ...(reviewed ? { reviewedBy: reviewed, lastReviewed: new Date((opts.dateModified || opts.datePublished).replace(" ", "T")).toISOString() } : {}),
    publisher: { "@id": `${site.url}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}${opts.path}` },
  };
}
```

**Check every other caller of `articleSchema`** (`grep -rn "articleSchema" src/`) — the new params are optional, so existing callers keep working, but confirm none relied on `reviewedBy` always being present.

- [ ] **Step 3: Make the badge and byline conditional**

In `src/app/[slug]/page.tsx`, replace the hardcoded badge:

```tsx
{(post.reviewedBy || post.legacyTeamReviewed) && (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
    <ShieldCheck className="size-4" />
    {post.reviewedBy
      ? `Medically reviewed by ${post.reviewedBy.name}${post.reviewedBy.credentials ? `, ${post.reviewedBy.credentials}` : ""}`
      : "Medically reviewed"}
  </span>
)}
```

And the byline block at the foot: show `post.author` when set (name, credentials, title), otherwise keep the existing "The Inocul8 Clinical Team" copy verbatim so legacy posts are unchanged.

Add the featured image above the article body when `post.featuredImage` is set, using `next/image` with the stored width/height.

Pass the new fields into `articleSchema(...)`.

- [ ] **Step 4: Add the missing prose styles**

In `src/app/globals.css`, inside the same layer as `.service-prose`:

```css
  /* Blog additions: ordered lists, figures and callouts. The existing ul rule
     replaces markers with a ✓, which is right for service pages but wrong for
     numbered steps — so scope numbering explicitly. */
  .service-prose ol {
    margin-top: 0.75rem;
    padding-left: 1.5rem;
    list-style: decimal;
    display: grid;
    gap: 0.5rem;
  }
  .service-prose ol > li {
    padding-left: 0.25rem;
  }
  .service-prose ol > li::before {
    content: none;
  }

  /* Tiptap wraps list-item content in <p> (stock ProseMirror ListItem schema).
     This pins the invariant that it renders identically to bare li text — today
     that holds only because no .service-prose p margin rule exists, which is an
     accident a future styling pass would silently break. */
  .service-prose li > p {
    margin: 0;
  }

  .service-prose figure {
    margin-top: 1.75rem;
  }
  .service-prose figure img {
    height: auto;          /* with width/height attributes present, reserves space — no CLS */
    max-width: 100%;
    border-radius: 0.75rem;
  }
  .service-prose figcaption {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-muted);
    text-align: center;
  }
  .service-prose figure.align-left  { float: left;  margin-right: 1.5rem; max-width: 50%; }
  .service-prose figure.align-right { float: right; margin-left: 1.5rem;  max-width: 50%; }
  .service-prose figure.align-center { margin-inline: auto; }
  .service-prose figure.size-small  { max-width: 20rem; }
  .service-prose figure.size-medium { max-width: 32rem; }
  .service-prose figure.size-large  { max-width: 100%; }

  @media (max-width: 640px) {
    /* Floats are unreadable on a phone — this site is mobile-first. */
    .service-prose figure.align-left,
    .service-prose figure.align-right {
      float: none;
      max-width: 100%;
      margin-inline: 0;
    }
  }

  .service-prose .callout {
    margin-top: 1.5rem;
    border-left: 3px solid var(--color-brand-600);
    background: var(--color-brand-50);
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
  }
  .service-prose .callout > * + * { margin-top: 0.75rem; }
  .service-prose .callout-warning { border-color: #d97706; background: #fffbeb; }
  .service-prose .callout-tip     { border-color: #059669; background: #ecfdf5; }
```

- [ ] **Step 5: Verify the ranked pages did not regress**

```bash
npm run build
```

Then diff a legacy post before/after: run the dev server, open three legacy posts, and confirm the badge still reads "Medically reviewed", the byline block is unchanged, and no layout shifted. Validate the JSON-LD of one legacy post in Google's Rich Results Test — it should still show an Article with `reviewedBy`.

- [ ] **Step 6: Commit**

```bash
git add src/lib src/app
git commit -m "feat: conditional medical-review badge, author byline and blog prose styles"
```

---

## Task 12: Deploy and verify

- [ ] **Step 1: Confirm Tiptap is not in the public bundle**

```bash
npm run build
```

Inspect the route summary: `/studio/posts/[id]` should carry the large chunk; `/[slug]` and `/` must be unchanged from before this branch. If Tiptap appears in a public route, find the accidental import and remove it.

- [ ] **Step 2: Check the CSP still fits**

The existing CSP already allows `img-src ... data: blob: https://api.inocul8.com.ng` and `connect-src 'self' https://api.inocul8.com.ng`. Studio calls are same-origin, so no CSP change should be needed. If the browser console shows a CSP violation, fix it in `next.config.ts` **without loosening the public site's policy** — scope any addition as narrowly as possible.

- [ ] **Step 3: Deploy the preview and smoke-test**

Push the branch; Vercel builds a preview URL. On it: sign in, create a post, upload an image, autosave, preview, publish. Confirm the post appears on the public site.

- [ ] **Step 4: Verify all 70 legacy URLs still resolve**

```bash
cd "C:/Users/Hammed/Desktop/Inocul8_Webuzo" && node scripts/verify-urls.mjs
```

- [ ] **Step 5: Merge to main and deploy production**

```bash
git checkout main && git merge --no-ff feat/blog-studio && git push
```

- [ ] **Step 6: Re-run the URL verifier against production.**

---

## Task 13: Cross-repo closing tasks

**These run in the backend repo, and only after the studio is verified working in production.** Doing either earlier leaves the site with no supported way to edit content, or with no rollback path.

- [ ] **Step 1: Make `body` read-only in Django admin**

Only now that the studio's edit→publish flow is proven. In `apps/blog/admin.py`:

```python
    readonly_fields = (
        "body", "draft_body",  # content is edited in the studio; admin must not
                               # write body directly or draft_body goes stale
        "medically_reviewed_by", "medically_reviewed_at", "approved_by", "first_published_at",
    )
```

Add a note to the fieldset description: `"Content is edited in the Blog Studio."`

- [ ] **Step 2: Deploy and verify** the admin change form loads and other fields still save.

- [ ] **Step 3: Drop `is_published`**

Only after the new `status` filter has served production traffic for several days without incident.

```bash
docker compose exec -T web python manage.py makemigrations blog --name drop_is_published
```

Confirm the generated migration contains only `RemoveField(model_name="blogpost", name="is_published")`, then deploy.

- [ ] **Step 4: Final verification**

```bash
curl -s "https://api.inocul8.com.ng/api/v1/posts/" | \
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log('count:',JSON.parse(d).count))"
cd "C:/Users/Hammed/Desktop/Inocul8_Webuzo" && node scripts/verify-urls.mjs
```

Expected: **count: 70**, all URLs 200.

- [ ] **Step 5: Commit**

```bash
git add apps/blog && git commit -m "chore: lock post body to the studio and drop is_published"
```

---

## Definition of done

- [ ] A non-technical user can sign in, write a post with formatted text and inline images, add a featured image, fill SEO fields with counters, preview it, and publish it — without seeing HTML.
- [ ] Autosave shows Saving/Saved and never writes `body`.
- [ ] An author's submission freezes on review; an editor can request changes with a note; both emails arrive.
- [ ] A clinician's publish stamps the named badge; a non-clinician's publish does not.
- [ ] All 70 legacy URLs return 200 with their badge and byline unchanged.
- [ ] Tiptap does not appear in any public route's bundle.
- [ ] `/studio` returns `X-Robots-Tag: noindex` and is disallowed in robots.txt.
