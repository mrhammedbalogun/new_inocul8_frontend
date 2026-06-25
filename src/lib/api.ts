// API client for the Django/DRF backend (https://api.inocul8.com.ng).
//
// Content is fetched in server components with ISR (revalidate), so pages stay
// statically generated but refresh from the CMS. Every call takes a static
// fallback (the JSON reconstructed from the legacy DB) so a build never fails —
// and the live site never breaks — if the API is briefly unavailable.

const API_BASE = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";
const REVALIDATE = Number(process.env.API_REVALIDATE ?? 300); // seconds

export const apiConfigured = Boolean(process.env.API_URL) || true;

type FetchOpts = { revalidate?: number };

/** GET <API_BASE><path>, returning `fallback` on any error/non-2xx. */
export async function apiGet<T>(path: string, fallback: T, opts: FetchOpts = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: opts.revalidate ?? REVALIDATE },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[api] falling back for ${path}:`, (err as Error).message);
    }
    return fallback;
  }
}

/** Walk DRF pagination and return all results. */
export async function apiGetAll<T>(path: string, fallback: T[]): Promise<T[]> {
  try {
    const out: T[] = [];
    let next: string | null = `${API_BASE}${path}`;
    let guard = 0;
    while (next && guard < 50) {
      const res: Response = await fetch(next, {
        next: { revalidate: REVALIDATE },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`${path} -> ${res.status}`);
      const data: { results?: T[]; next?: string | null } = await res.json();
      out.push(...(data.results ?? []));
      next = data.next ?? null;
      guard += 1;
    }
    return out;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[api] falling back (paged) for ${path}:`, (err as Error).message);
    }
    return fallback;
  }
}
