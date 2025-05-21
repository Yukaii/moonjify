import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moon Emoji Art Generator',
  description: 'Transform your images and GIFs into moon emoji art',
  generator: 'v0.dev',
}

// Tell Next.js to dynamically render this layout
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
