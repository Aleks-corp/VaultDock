import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // Render sets this automatically for every web service; falls back to a manual
  // override (SELF_URL) for other hosts. Used to keep a free-tier instance awake.
  selfUrl: process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || '',
}
