import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { openDb } from './db.js'

let config
try {
  config = loadConfig()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuration could not be loaded.')
  process.exit(1)
}

try {
  const db = openDb(config.DATABASE_PATH)
  const server = createApp(config, db, { log: console.log }).listen(config.PORT, '0.0.0.0')
  server.on('listening', () => console.log(`RecallRelay listening on port ${config.PORT}`))
  server.on('error', () => {
    console.error('RecallRelay could not listen on the configured port.')
    db.close()
    process.exitCode = 1
  })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => server.close(() => db.close()))
  }
} catch {
  console.error('RecallRelay could not open its SQLite database.')
  process.exitCode = 1
}
