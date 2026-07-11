import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { UserDocument } from '../models/User.js'

export interface TokenPayload {
  sub: string
}

export function signToken(user: UserDocument): string {
  return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions)
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload
}
