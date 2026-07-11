import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/authStore'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Renders the "Sign in with Google" button using Google Identity Services.
 * Hidden entirely when VITE_GOOGLE_CLIENT_ID isn't configured, so local dev
 * without Google credentials still works via email/password.
 */
export function GoogleSignInButton() {
  const navigate = useNavigate()
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) return
    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: GoogleCredentialResponse) => {
            loginWithGoogle(response.credential)
              .then(() => navigate('/', { replace: true }))
              .catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : 'Google sign-in failed.')
              })
          },
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 328,
          text: 'continue_with',
        })
      })
      .catch(() => {
        toast.error('Could not load Google sign-in.')
      })

    return () => {
      cancelled = true
    }
  }, [loginWithGoogle, navigate])

  if (!GOOGLE_CLIENT_ID) return null

  return <div ref={buttonRef} className="flex w-full justify-center" />
}
