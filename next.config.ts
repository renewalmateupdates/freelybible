import type { NextConfig } from 'next'

// Static export: the whole app is plain files, so it can be hosted for free
// and bundled into the iOS/Android app with Capacitor (webDir: out).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
