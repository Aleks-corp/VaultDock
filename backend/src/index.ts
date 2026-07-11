import { app } from './app.js'
import { connectDb } from './db.js'
import { env } from './config/env.js'

async function main() {
  await connectDb()
  app.listen(env.port, () => {
    console.log(`[server] VaultDock backend listening on http://localhost:${env.port}`)
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
