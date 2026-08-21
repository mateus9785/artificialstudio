export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export interface ApiError extends Error {
  status?: number
}

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string | null
}

async function request(path: string, { method = 'GET', body, token }: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      // resposta sem corpo JSON
    }
    const error: ApiError = new Error(message)
    error.status = res.status
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path: string, token?: string | null) => request(path, { token }),
  post: (path: string, body?: unknown, token?: string | null) => request(path, { method: 'POST', body, token }),
  put: (path: string, body?: unknown, token?: string | null) => request(path, { method: 'PUT', body, token }),
  patch: (path: string, body?: unknown, token?: string | null) => request(path, { method: 'PATCH', body, token }),
  del: (path: string, token?: string | null) => request(path, { method: 'DELETE', token }),
}

export async function uploadFile(
  path: string,
  file: File,
  fieldName: string,
  token?: string | null,
  extraFields: Record<string, string> = {},
): Promise<unknown> {
  const formData = new FormData()
  formData.append(fieldName, file)
  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value)
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      // resposta sem corpo JSON
    }
    const error: ApiError = new Error(message)
    error.status = res.status
    throw error
  }

  return res.json()
}
