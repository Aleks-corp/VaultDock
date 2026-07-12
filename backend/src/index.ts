import { app } from './app.js'
import { connectDb } from './db.js'
import { env } from './config/env.js'
import { startSelfPing } from './selfPing.js'

async function main() {
  await connectDb()
  app.listen(env.port, () => {
    console.log(`[server] VaultDock backend listening on http://localhost:${env.port}`)
    startSelfPing()
  })
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
