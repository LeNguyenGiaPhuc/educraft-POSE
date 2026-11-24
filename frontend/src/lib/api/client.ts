export type ApiEnvelope<T> = {
  data: T
  meta?: unknown
}

export type ApiDownload = {
  blob: Blob
  fileName: string | null
}

export type ApiErrorPayload = {
  code?: string
  message?: string
  requestId?: string
  fieldErrors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly fieldErrors?: Record<string, string[]>

  constructor(status: number, payload: ApiErrorPayload = {}) {
    super(payload.message || 'Không thể hoàn tất yêu cầu.')
    this.name = 'ApiError'
    this.status = status
    this.code = payload.code || 'API_ERROR'
    this.requestId = payload.requestId
    this.fieldErrors = payload.fieldErrors
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

function getSafeFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null

  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i)
  if (!match?.[1]) return null

  let fileName = match[1].trim()
  try {
    fileName = decodeURIComponent(fileName)
  } catch {
    // Keep the original header value when it is not valid URI encoding.
  }

  const safeFileName = fileName
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.\./g, '_')
    .trim()

  return safeFileName || null
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers)
  const isFormData = options.body instanceof FormData

  if (options.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
      body: options.body === undefined || isFormData ? options.body as BodyInit | undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra backend rồi thử lại.',
    })
  }

  const payload = await readPayload(response)
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {}
    throw new ApiError(response.status, {
      code: typeof error.code === 'string' ? error.code : undefined,
      message: typeof error.message === 'string' ? error.message : undefined,
      requestId: typeof error.requestId === 'string' ? error.requestId : undefined,
      fieldErrors: isRecord(error.fieldErrors) ? error.fieldErrors as Record<string, string[]> : undefined,
    })
  }

  if (!isRecord(payload) || !('data' in payload)) {
    return { data: payload as T }
  }

  return payload as ApiEnvelope<T>
}

export async function apiDownload(path: string, options: RequestOptions = {}): Promise<ApiDownload> {
  const headers = new Headers(options.headers)
  const isFormData = options.body instanceof FormData

  if (options.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
      body: options.body === undefined || isFormData ? options.body as BodyInit | undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Không thể kết nối tới máy chủ. Hãy kiểm tra backend rồi thử lại.',
    })
  }

  if (!response.ok) {
    const payload = await readPayload(response)
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {}
    throw new ApiError(response.status, {
      code: typeof error.code === 'string' ? error.code : undefined,
      message: typeof error.message === 'string' ? error.message : undefined,
      requestId: typeof error.requestId === 'string' ? error.requestId : undefined,
      fieldErrors: isRecord(error.fieldErrors) ? error.fieldErrors as Record<string, string[]> : undefined,
    })
  }

  return {
    blob: await response.blob(),
    fileName: getSafeFileName(response.headers.get('content-disposition')),
  }
}
