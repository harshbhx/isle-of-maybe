// Typed calls to the game server (/api/*). Errors become ApiFailure with the server's code, so
// screens can show err.network / err.quota and resume from the server's state (UI-8.1, UI-8.2).
import type { ApiErrorBody } from '../../shared/api.ts';

export class ApiFailure extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const isErrorBody = (v: unknown): v is ApiErrorBody =>
  typeof v === 'object' &&
  v !== null &&
  'error' in v &&
  typeof v.error === 'string';

const call = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiFailure('network', 0, 'offline');
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    if (isErrorBody(body))
      throw new ApiFailure(body.error, res.status, body.message);
    throw new ApiFailure('network', res.status, `HTTP ${res.status}`);
  }
  // Response shapes are shared with the server (src/shared/api.ts).
  const data: T = JSON.parse(text);
  return data;
};

export const get = <T>(path: string): Promise<T> => call<T>(path);

export const post = <T>(path: string, body: unknown = {}): Promise<T> =>
  call<T>(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
