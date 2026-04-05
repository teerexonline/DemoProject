/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@supabase/ssr',
    ],
  },
  images: {
    remotePatterns: [
      // Supabase Storage (logos bucket)
      {
        protocol: 'https',
        hostname: 'cznnhdeahfnowfimqbrg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Clearbit Logo API (fallback remote URL before upload)
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      // Wikipedia thumbnails
      {
        protocol: 'https',
        hostname: '*.wikipedia.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      // Google Favicon S2
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons**',
      },
      // Allow any HTTPS domain for scraped logos (company CDNs vary widely)
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
