import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.researchorg.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/explore',
          '/features',
          '/pricing',
          '/about',
          '/blog',
          '/careers',
          '/privacy',
          '/terms',
          '/cookies',
          '/company/',
        ],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/login',
          '/signup',
          '/logout',
          '/reset-password',
          '/forgot-password',
          '/profile',
          '/settings',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
