const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  hasPassword: boolean
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Could not reach the VaultDock server. Is the backend running?')
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? 'Something went wrong. Please try again.'
    throw new ApiError(res.status, message)
  }
  return body as T
}

export function register(email: string, password: string, name: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function googleSignIn(credential: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
}

export function me(token: string): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/auth/me', { method: 'GET' }, token)
}
