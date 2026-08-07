export interface JsonResponse<TBody> {
  readonly statusCode: number;
  readonly body: TBody;
}

export function parseJsonPayload<TBody>(payload: string): TBody {
  return JSON.parse(payload) as TBody;
}

export function createJsonResponse<TBody>(
  statusCode: number,
  payload: string,
): JsonResponse<TBody> {
  return {
    statusCode,
    body: parseJsonPayload<TBody>(payload),
  };
}
