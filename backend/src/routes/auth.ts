import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { User } from '../models/User.js'
import { signToken } from '../utils/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { validateEmail, validatePassword, toPublicUser } from '../utils/validation.js'
import { env } from '../config/env.js'

export const authRouter = Router()

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body ?? {}

  if (!validateEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' })
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' })
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter your name.' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ email: normalizedEmail, name: name.trim(), passwordHash })

  const token = signToken(user)
  res.status(201).json({ token, user: toPublicUser(user) })
})

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {}
  if (!validateEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Please enter a valid email and password.' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const user = await User.findOne({ email: normalizedEmail })
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Incorrect email or password.' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Incorrect email or password.' })

  const token = signToken(user)
  res.json({ token, user: toPublicUser(user) })
})

authRouter.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body ?? {}
  if (!googleClient) {
    return res.status(501).json({
      error: 'Google sign-in is not configured on the server yet (missing GOOGLE_CLIENT_ID).',
    })
  }
  if (typeof credential !== 'string' || !credential) {
    return res.status(400).json({ error: 'Missing Google credential.' })
  }

  let payload
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId })
    payload = ticket.getPayload()
  } catch {
    return res.status(401).json({ error: 'Could not verify Google sign-in. Please try again.' })
  }
  if (!payload?.email) return res.status(401).json({ error: 'Google account has no email.' })

  const normalizedEmail = payload.email.toLowerCase()
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: normalizedEmail }] })

  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      name: payload.name || normalizedEmail.split('@')[0],
      googleId: payload.sub,
      avatarUrl: payload.picture || null,
    })
  } else if (!user.googleId) {
    user.googleId = payload.sub
    user.avatarUrl = user.avatarUrl || payload.picture || null
    await user.save()
  }

  const token = signToken(user)
  res.json({ token, user: toPublicUser(user) })
})

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({ user: toPublicUser(req.user!) })
})
