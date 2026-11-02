import type { CapacitorConfig } from '@capacitor/cli'

// Wraps the static export (out/) as the iOS and Android app. Everything ships inside
// the app, so it works fully offline. Add platforms with `npx cap add android` / `ios`.
const config: CapacitorConfig = {
  appId: 'app.freelybible',
  appName: 'Freely Bible',
  webDir: 'out',
}

export default config
