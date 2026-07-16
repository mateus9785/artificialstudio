export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
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
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path, token) => request(path, { token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  put: (path, body, token) => request(path, { method: 'PUT', body, token }),
  del: (path, token) => request(path, { method: 'DELETE', token }),
}
