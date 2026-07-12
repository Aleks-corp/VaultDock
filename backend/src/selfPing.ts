import { env } from './config/env.js'

const PING_INTERVAL_MS = 13 * 60 * 1000 // 13 minutes — comfortably under Render's 15-minute idle sleep timer

/**
 * Free-tier hosts like Render spin down a web service after ~15 minutes of no inbound
 * traffic, which means the next real request pays a cold start (and a cold Mongo
 * connection) of 30-50s. Pinging our own /api/health endpoint on a shorter interval
 * keeps the instance warm. Only runs when we know our own public URL (set via
 * RENDER_EXTERNAL_URL on Render, or SELF_URL to override elsewhere) — never in local dev.
 */
export function startSelfPing(): void {
  if (!env.selfUrl) return

  const url = `${env.selfUrl.replace(/\/$/, '')}/api/health`

  setInterval(() => {
    fetch(url).catch((err) => {
      console.error('[self-ping] failed:', err instanceof Error ? err.message : err)
    })
  }, PING_INTERVAL_MS).unref()

  console.log(`[self-ping] enabled, pinging ${url} every ${PING_INTERVAL_MS / 60000} min`)
}
