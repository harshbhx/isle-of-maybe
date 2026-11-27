// Typed API errors and Redis quota detection, so routes answer with clear statuses (HUNT-6.2, UI-8.2).

export type ApiErrorCode =
  | 'bad_request'
  | 'not_logged_in'
  | 'not_found'
  | 'forbidden'
  | 'conflict'
  | 'rate_limited'
  | 'quota';

const STATUS: Record<ApiErrorCode, 400 | 401 | 403 | 404 | 409 | 429 | 507> = {
  bad_request: 400,
  not_logged_in: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  quota: 507,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 507;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
  }
}

/** Devvit surfaces storage-limit failures as errors mentioning quota or storage. */
export const isQuotaError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return /quota|storage/i.test(msg);
};

/** Turn any thrown value into an ApiError. */
export const toApiError = (e: unknown): ApiError => {
  if (e instanceof ApiError) return e;
  if (isQuotaError(e)) return new ApiError('quota', 'storage quota reached');
  return new ApiError(
    'bad_request',
    e instanceof Error ? e.message : 'unexpected error'
  );
};
