import type { UserDocument } from '../models/User.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_RE.test(email.trim())
}

export function validatePassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8
}

export interface PublicUser {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  hasPassword: boolean
  createdAt: Date
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    hasPassword: !!user.passwordHash,
    createdAt: user.createdAt,
  }
}
