import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { User, type UserDocument } from '../models/User.js'

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing authentication token.' })

  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)
    if (!user) return res.status(401).json({ error: 'User no longer exists.' })
    req.user = user as UserDocument
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}
