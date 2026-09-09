/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
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
        'util/types': false,
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['pg', 'resend', '@react-email/render'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
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
        source: '/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon.png|apple-icon.png|eton-safaris-gorilla.png).*)',
        headers: [{ key: 'Cache-Control', value: 'private, no-cache, no-store, max-age=0, must-revalidate' }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/icon-192.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/apple-icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/eton-safaris-gorilla.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/robots.txt',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=3600' }],
      },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, s-maxage=1800' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:all*(ico|svg|jpg|jpeg|png|webp|avif|woff|woff2|mp4|webm|mov)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/eton-safaris-logo.png', destination: '/eton-safaris-gorilla.png', permanent: false },
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
      ].flatMap((slug) => [
        { source: `/country/${slug}`, destination: `/destinations/${slug}`, permanent: true },
        { source: `/${slug}`, destination: `/destinations/${slug}`, permanent: true },
      ]),
      { source: '/terms', destination: '/terms-of-services', permanent: true },
      { source: '/privacy', destination: '/privacy-policies', permanent: true },
      { source: '/about', destination: '/about-us', permanent: true },
      { source: '/request-quote', destination: '/request-a-quote', permanent: true },
      { source: '/quote-request', destination: '/request-a-quote', permanent: true },
      { source: '/get-a-quote', destination: '/request-a-quote', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/tour/:slug', destination: '/tours/:slug' },
      { source: '/national-park/:slug', destination: '/parks/:slug' },
      { source: '/safari-update/:slug', destination: '/safari-updates/:slug' },
      { source: '/contact-us', destination: '/contact' },
      { source: '/community-support', destination: '/community' },
    ];
  },
};

module.exports = nextConfig;
