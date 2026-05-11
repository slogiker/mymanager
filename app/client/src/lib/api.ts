export async function apiFetch<T = unknown>(path: string, options: RequestInit & { body?: unknown } = {}): Promise<T> {
  const { body, ...rest } = options;
  const isFormData = body instanceof FormData;

  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: isFormData ? undefined : { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestInit) => apiFetch<T>(path, { method: 'GET', ...opts }),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestInit) => apiFetch<T>(path, { method: 'POST', body, ...opts }),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestInit) => apiFetch<T>(path, { method: 'PUT', body, ...opts }),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestInit) => apiFetch<T>(path, { method: 'PATCH', body, ...opts }),
  delete: <T = unknown>(path: string, opts?: RequestInit) => apiFetch<T>(path, { method: 'DELETE', ...opts }),
};
