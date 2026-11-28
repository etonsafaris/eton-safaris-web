const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Standard Next.js output for Vercel (`vercel.json`).
  // Keep SSG workers from hanging on Aiven during `next build`.
  staticPageGenerationTimeout: 45,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        crypto: false,
        stream: false,
        'util/types': false,
        pg: false,
        'pg-native': false,
        postgres: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        pg: false,
        'pg-native': false,
        postgres: false,
      };
      // The public site imports record helpers from lib/data. That file also
      // re-exports the database loader. Keep the database module off the browser
      // bundle so the homepage does not evaluate server-only webpack modules.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /(?:^|[\\/])data-server(?:\.tsx?)?$/,
          path.join(__dirname, 'lib', 'data-server-browser.ts')
        )
      );
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['pg', 'postgres', 'resend', '@react-email/render'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'plus.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
      { protocol: 'https', hostname: 'etonsafaris.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.etonsafaris.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.aiven.co', pathname: '/**' },
      { protocol: 'https', hostname: '*.aivencloud.com', pathname: '/**' },
    ],
    // Enable image optimization for better performance
    dangerouslyAllowSVG: true,
  },
  // Allow build to continue despite some page errors
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, must-revalidate' }],
      },
      {
        source: '/login',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, must-revalidate' }],
      },
      {
        source: '/api/media/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/api/data/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=120' }],
      },
      {
        source: '/api/public/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=900, stale-while-revalidate=3600' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, must-revalidate' }],
      },
      {
        source: '/((?!_next/static|_next/image|admin|login|api|eton-safaris-gorilla.png).*)',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=900, stale-while-revalidate=3600' }],
      },
      {
        source: '/eton-safaris-gorilla.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/4fb8b965eb174c3bb8b142a8c2dc4096.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=600' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/heroes/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:all*(ico|svg|jpg|jpeg|png|webp|avif|woff|woff2|mp4|webm|mov)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/404', destination: '/', permanent: false },
      { source: '/community-support', destination: '/community', permanent: true },
      { source: '/home', destination: '/', permanent: false },
      { source: '/index', destination: '/', permanent: false },
      { source: '/pages/terms', destination: '/terms-of-services', permanent: true },
      { source: '/pages/privacy', destination: '/privacy-policies', permanent: true },
      { source: '/pages/about', destination: '/about-us', permanent: true },
      { source: '/pages/agency', destination: '/tours-and-travel-agency', permanent: true },
      { source: '/pages/contact', destination: '/contact-us', permanent: true },
      { source: '/pages/community', destination: '/community-support', permanent: true },
      { source: '/pages/:slug', destination: '/:slug', permanent: true },
      ...[
        'uganda',
        'kenya',
        'tanzania',
        'rwanda',
        'botswana',
        'egypt',
        'namibia',
        'south-africa',
        'dr-congo',
        'ethiopia',
        'malawi',
        'zambia',
        'morocco',
        'seychelles',
        'mozambique',
        'madagascar',
        'zimbabwe',
      ].flatMap((slug) => [
        { source: `/country/${slug}`, destination: `/destinations/${slug}`, permanent: true },
        { source: `/${slug}`, destination: `/destinations/${slug}`, permanent: true },
        { source: `/${slug}-safaris`, destination: `/destinations/${slug}`, permanent: true },
      ]),
      { source: '/terms', destination: '/terms-of-services', permanent: true },
      { source: '/privacy', destination: '/privacy-policies', permanent: true },
      { source: '/about', destination: '/about-us', permanent: true },
      { source: '/request-quote', destination: '/request-a-quote', permanent: true },
      { source: '/quote-request', destination: '/request-a-quote', permanent: true },
      { source: '/get-a-quote', destination: '/request-a-quote', permanent: true },
      { source: '/tour/:slug', destination: '/tours/:slug', permanent: true },
      { source: '/national-park/:slug', destination: '/parks/:slug', permanent: true },
      { source: '/safari-update/:slug', destination: '/safari-updates/:slug', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // /api/health must not be handled by app/[slug]/[category] on Vercel.
      { source: '/api/health', destination: '/api/system/health' },
      { source: '/cms-media/:id', destination: '/api/media/:id' },
      { source: '/contact-us', destination: '/contact' },
      { source: '/community-support', destination: '/community' },
    ];
  },
};

module.exports = nextConfig;
