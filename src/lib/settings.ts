// Live site rating from the CMS (/settings/) — updated daily by the backend's
// Google-reviews sync. Falls back to the static design values.
import { apiGet } from "@/lib/api";
import { site } from "@/lib/site";

export type SiteRating = { value: number; count: number };

type ApiSettings = { rating_value?: string | number; rating_count?: number };

export async function getSiteRating(): Promise<SiteRating> {
  const s = await apiGet<ApiSettings | null>("/settings/", null);
  if (s?.rating_value && s?.rating_count) {
    return { value: Number(s.rating_value), count: s.rating_count };
  }
  return { ...site.rating };
}
