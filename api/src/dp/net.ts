export type RetryOptions = {
  retries?: number;
  timeoutMs?: number;
  backoffMs?: number;
  jitterMs?: number;
  retryOnStatuses?: number[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetriableStatus(status: number, retryOn: number[]): boolean {
  return retryOn.includes(status);
}

function isRetriableError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '');
  return (
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('EAI_AGAIN') ||
    msg.includes('socket hang up') ||
    msg.includes('fetch failed') ||
    msg.includes('The operation was aborted')
  );
}

export async function fetchWithRetry(url: string, init: RequestInit = {}, opts: RetryOptions = {}): Promise<Response> {
  const retries = opts.retries ?? 2;
  const timeoutMs = opts.timeoutMs ?? 12000;
  const backoffMs = opts.backoffMs ?? 450;
  const jitterMs = opts.jitterMs ?? 200;
  const retryOnStatuses = opts.retryOnStatuses ?? [429, 500, 502, 503, 504];

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: ac.signal });

      if (!res.ok && isRetriableStatus(res.status, retryOnStatuses) && attempt < retries) {
        const wait = backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * jitterMs);
        await sleep(wait);
        continue;
      }

      return res;
    } catch (err) {
      lastErr = err;

      if (attempt < retries && isRetriableError(err)) {
        const wait = backoffMs * Math.pow(2, attempt) + Math.floor(Math.random() * jitterMs);
        await sleep(wait);
        continue;
      }

      throw err;
    } finally {
      clearTimeout(t);
    }
  }

  throw lastErr ?? new Error('fetchWithRetry: unknown error');
}

export async function fetchBufferOrNull(
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {}
): Promise<Buffer | null> {
  try {
    const res = await fetchWithRetry(url, init, opts);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}
