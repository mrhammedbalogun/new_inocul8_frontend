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
