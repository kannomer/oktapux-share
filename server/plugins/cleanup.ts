import { startCleanupScheduler } from '../utils/cleanup'

export default defineNitroPlugin(() => {
  // runs every 15 minutes by default
  startCleanupScheduler()
})
