/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },



  // Experimental features
  experimental: {
    // Future experimental features can be added here
  },

  // Production optimizations
  ...(isProduction && {
    compress: true,
    poweredByHeader: false,
    generateEtags: true,
  }),

  // Image domains for external images
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'linkedclone.onrender.com',
        pathname: '/uploads/**',
      },
      // Add production image domains
      ...(isProduction ? [
        {
          protocol: 'https',
          hostname: '*.railway.app',
          pathname: '/uploads/**',
        },
        {
          protocol: 'https',
          hostname: '*.render.com',
          pathname: '/uploads/**',
        },
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
          pathname: '/**',
        }
      ] : [])
    ],
    ...(isProduction && {
      formats: ['image/webp', 'image/avif'],
      minimumCacheTTL: 60,
    })
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          ...(isProduction ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
            {
              key: 'Content-Security-Policy',
              value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://linkedclone.onrender.com; font-src 'self' data:; connect-src 'self' https: https://linkedclone.onrender.com;",
            }
          ] : [])
        ],
      },
    ];
  },

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://linkedclone.onrender.com/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;