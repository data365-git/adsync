type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
};

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as { status?: unknown; statusCode?: unknown }).status;
  if (typeof status === "number") return status;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : undefined;
}

export function isRetryableError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code === "ECONNRESET" || code === "ETIMEDOUT") return true;

  const status = getHttpStatus(error);
  return status !== undefined && status >= 500 && status <= 599;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableError(error)) {
        throw error;
      }
      await delay(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}
