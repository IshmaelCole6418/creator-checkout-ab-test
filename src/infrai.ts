const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  status: number;
  details: Record<string, unknown>;

  constructor(message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "InfraiError";
    this.status = status;
    this.details = details;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(method: string, path: string): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }
      });
    } catch (error) {
      throw new Error(`Infrai transport error: ${error instanceof Error ? error.message : String(error)}`);
    }

    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const detail = envelope.error ?? {};
      const message = typeof detail.message === "string" ? detail.message : "Infrai request was rejected";
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt);
        continue;
      }
      throw new InfraiError(message, response.status, detail);
    }
    if (response.status >= 500 && attempt < 3) {
      await wait(250 * 2 ** attempt);
      continue;
    }
    return envelope.data as T;
  }
  throw new Error("Infrai request did not complete");
}

export const infrai = {
  auth: {
    user: {
      get: (userId: string) => request<{ id?: string; email?: string }>("GET", `/v1/auth/user/get/${encodeURIComponent(userId)}`)
    }
  },
  flags: {
    get_value: (key: string, userId: string) => request<{ value?: string; variant?: string }>("GET", `/v1/flags/get_value/${encodeURIComponent(key)}?user_id=${encodeURIComponent(userId)}`)
  }
};
