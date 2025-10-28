import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Set turbopack root to silence workspace warnings
  turbopack: {
    root: process.cwd(),
  },
  
  // Enable experimental features
  experimental: {
    optimizePackageImports: ['@linkedin-clone/shared'],
    externalDir: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Production optimizations
  ...(isProduction && {
    output: 'standalone',
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
      // Add production image domains
      ...(isProduction ? [
        {
          protocol: 'https' as const,
          hostname: '*.railway.app',
          pathname: '/uploads/**',
        },
        {
          protocol: 'https' as const,
          hostname: '*.render.com',
          pathname: '/uploads/**',
        },
        {
          protocol: 'https' as const,
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
              value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
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
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
