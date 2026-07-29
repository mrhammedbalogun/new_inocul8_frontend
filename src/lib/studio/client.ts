import type { MediaAssetT } from "./types";

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

// The media endpoints return `url` as a path relative to the API host's own MEDIA_URL (e.g.
// "/media/blog/xyz.webp"), not an absolute URL. That's fine for server-side API_URL-relative
// fetches, but every place that actually renders it — the studio picker, the figure node view,
// and (critically) the stored post HTML once published, which is served from a completely
// different origin than the API — needs an absolute URL. Resolve it once here, at the boundary
// where a MediaAssetT enters the frontend, so nothing downstream has to know the difference.
// Host matches next.config.js's `images.remotePatterns` and the CSP `img-src` allowlist.
const MEDIA_ORIGIN = "https://api.inocul8.com.ng";

export function resolveMediaUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${MEDIA_ORIGIN}${url}`;
}

function resolveAsset(asset: MediaAssetT): MediaAssetT {
  return { ...asset, url: resolveMediaUrl(asset.url) };
}

// The backend does all the heavy lifting: sniffs the real content type, accepts HEIC, strips
// EXIF/GPS, downscales, and returns the final width/height that get stamped onto the <img> for
// zero-CLS. On rejection (not an image, >15MB, over-length text) it returns 400 with a
// human-readable message — studioFetch surfaces that via StudioError.message, so callers should
// not replace it with a generic string.
export async function uploadImage(file: File, altText = ""): Promise<MediaAssetT> {
  const form = new FormData();
  form.append("file", file);
  if (altText) form.append("alt_text", altText);
  // No Content-Type header here — fetch sets its own multipart boundary for FormData bodies.
  const asset = await studioFetch<MediaAssetT>("media/", { method: "POST", body: form });
  return resolveAsset(asset);
}

/** GET the media library page, with every asset's `url` resolved to absolute (see uploadImage). */
export async function listMedia(pageSize = 60): Promise<MediaAssetT[]> {
  const { results } = await studioFetch<{ results: MediaAssetT[] }>(`media/?page_size=${pageSize}`);
  return results.map(resolveAsset);
}
