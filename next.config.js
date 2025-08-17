/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export for Tauri
  distDir: 'dist',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  eslint: {
    // Disable ESLint during builds for now
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds for testing
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  },
  experimental: {
    optimizePackageImports: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js'
        }
      }
    }
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all'
            },
            dndkit: {
              test: /[\\/]node_modules[\\/]@dnd-kit[\\/]/,
              name: 'dnd-kit',
              priority: 10,
              chunks: 'all'
            },
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              priority: 10,
              chunks: 'all'
            }
          }
        }
      }
    }
    
    return config
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  }
}

export default nextConfig