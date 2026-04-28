import { startCleanupScheduler } from '../utils/cleanup'

export default defineNitroPlugin(() => {
  // runs every minute by default
  startCleanupScheduler()
})
