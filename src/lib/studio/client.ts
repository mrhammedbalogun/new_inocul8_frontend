import type { MediaAssetT } from "./types";

// Every studio call from the browser goes through the same-origin BFF.
export class StudioError extends Error {
  constructor(message: string, readonly status: number, readonly data: unknown) {
    super(message);
  }
}

// Single-flight session refresh. The refresh cookie is deliberately scoped to
// Path=/api/studio/refresh (see session.ts), so the BFF proxy can never
// refresh inline on an ordinary studio call — the browser doesn't send the
// cookie there. Instead the CLIENT calls the dedicated refresh route on a 401
// and retries the original request once. Single-flight so the autosave loop
// plus a workflow click hitting 401 together produce ONE rotation, not two.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/studio/refresh/", {
    method: "POST",
    headers: { "X-Studio-Request": "1" },
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function rawStudioFetch(path: string, init: RequestInit): Promise<Response> {
  const isForm = init.body instanceof FormData;
  return fetch(`/api/studio/${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      "X-Studio-Request": "1",
      ...init.headers,
    },
  });
}

export async function studioFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawStudioFetch(path, init);

  if (res.status === 401) {
    // Retry the original request once REGARDLESS of whether our own refresh
    // call reported success: with two tabs racing a rotation, this tab's
    // refresh can lose while the other tab has already updated the shared
    // access cookie — the retry below carries whatever cookie the browser
    // holds NOW. A session that is genuinely dead just 401s again and falls
    // through to the error path (autosave's re-login affordance, unchanged).
    await refreshSession();
    res = await rawStudioFetch(path, init);
  }

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

// Must match the backend's imaging.MAX_UPLOAD_BYTES. Checked client-side only to
// fail fast with a readable message — the backend re-enforces it regardless.
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// The backend does all the heavy lifting: sniffs the real content type, accepts HEIC, strips
// EXIF/GPS, downscales, and returns the final width/height that get stamped onto the <img> for
// zero-CLS. On rejection (not an image, >15MB, over-length text) it returns 400 with a
// human-readable message — studioFetch surfaces that via StudioError.message, so callers should
// not replace it with a generic string.
//
// Upload route: presigned direct-to-S3 first. The multipart path proxies the file
// through the Vercel BFF, and Vercel hard-caps request bodies at 4.5MB with a
// plain-text 413 the client can't even parse — every larger image died as
// "Something went wrong." Direct PUT to S3 has no such cap. The multipart path
// remains as the fallback for environments without S3 (local dev).
export async function uploadImage(file: File, altText = ""): Promise<MediaAssetT> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new StudioError("Image is larger than 15 MB. Please resize and try again.", 400, null);
  }

  const contentType = file.type || "application/octet-stream";
  let presign: { key: string; url: string };
  try {
    presign = await studioFetch<{ key: string; url: string }>("media/presign/", {
      method: "POST",
      body: JSON.stringify({ size: file.size, content_type: contentType }),
    });
  } catch (err) {
    if (err instanceof StudioError && (err.data as { code?: string })?.code === "s3_disabled") {
      return uploadImageViaProxy(file, altText);
    }
    throw err;
  }

  // The presigned signature covers Content-Type, so this header must be exactly
  // the value declared to presign above.
  const put = await fetch(presign.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  }).catch(() => null);
  if (!put?.ok) {
    throw new StudioError("Uploading to storage failed. Check your connection and try again.", put?.status ?? 0, null);
  }

  const asset = await studioFetch<MediaAssetT>("media/", {
    method: "POST",
    body: JSON.stringify({ s3_key: presign.key, alt_text: altText }),
  });
  return resolveAsset(asset);
}

async function uploadImageViaProxy(file: File, altText = ""): Promise<MediaAssetT> {
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
