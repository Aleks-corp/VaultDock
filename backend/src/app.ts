import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { authRouter } from './routes/auth.js'

export const app = express()

app.use(cors({ origin: env.corsOrigin, credentials: true }))
app.use(express.json())

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }))
app.use('/api/auth', authRouter)

// 404 for unknown API routes
app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'Not found.' }))

// Central error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})
