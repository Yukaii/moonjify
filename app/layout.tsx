import type { Metadata, Viewport } from 'next'
import './globals.css'
import Script from 'next/script'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'Moon Emoji Art Generator | Transform Images to Moon Emoji Art',
  description: 'Convert your images and GIFs into beautiful moon emoji art. Upload and instantly transform pictures into creative text-based emoji masterpieces.',
  generator: 'Next.js',
  applicationName: 'Moon Emoji Art Generator',
  keywords: ['moon emoji', 'emoji art', 'image converter', 'emoji generator', 'text art', 'ascii art', 'image to emoji'],
  authors: [{ name: 'Moonjify' }],
  creator: 'Moonjify',
  publisher: 'Moonjify',
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL('https://moonjify.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Moon Emoji Art Generator | Transform Images to Moon Emoji Art',
    description: 'Convert your images and GIFs into beautiful moon emoji art. Upload and instantly transform pictures into creative text-based emoji masterpieces.',
    url: 'https://moonjify.vercel.app',
    siteName: 'Moon Emoji Art Generator',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/icon.png',
        width: 72,
        height: 72,
        alt: 'Moon Emoji Icon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Moon Emoji Art Generator',
    description: 'Convert your images and GIFs into beautiful moon emoji art',
    creator: '@moonjify',
    images: ['/icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
    other: {
      rel: 'apple-touch-icon',
      url: '/apple-icon.png',
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body>
        {children}
        <Script id="schema-structured-data" type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Moon Emoji Art Generator",
              "description": "Convert your images and GIFs into beautiful moon emoji art. Upload and instantly transform pictures into creative text-based emoji masterpieces.",
              "url": "https://moonjify.vercel.app",
              "applicationCategory": "MultimediaApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "operatingSystem": "Web"
            }
          `}
        </Script>
      </body>
    </html>
  )
}
