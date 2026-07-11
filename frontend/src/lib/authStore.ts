import { create } from 'zustand'
import * as api from './api'
import type { AuthUser } from './api'

const TOKEN_KEY = 'vaultdock_token'

interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  user: AuthUser | null
  token: string | null
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
}

let initPromise: Promise<void> | null = null

function persistToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  token: null,

  init: () => {
    if (initPromise) return initPromise
    initPromise = (async () => {
      set({ status: 'loading' })
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        set({ status: 'unauthenticated' })
        return
      }
      try {
        const { user } = await api.me(token)
        set({ status: 'authenticated', token, user })
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        set({ status: 'unauthenticated', token: null, user: null })
      }
    })()
    return initPromise
  },

  login: async (email, password) => {
    const { token, user } = await api.login(email, password)
    persistToken(token)
    set({ status: 'authenticated', token, user })
  },

  register: async (email, password, name) => {
    const { token, user } = await api.register(email, password, name)
    persistToken(token)
    set({ status: 'authenticated', token, user })
  },

  loginWithGoogle: async (credential) => {
    const { token, user } = await api.googleSignIn(credential)
    persistToken(token)
    set({ status: 'authenticated', token, user })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    initPromise = null
    set({ status: 'unauthenticated', token: null, user: null })
  },
}))
