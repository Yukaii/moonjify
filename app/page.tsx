import type { Metadata } from "next"
import ClientPageWrapper from "@/components/client-page-wrapper"

export const metadata: Metadata = {
  title: "Moon Emoji Image Converter",
  description: "Transform your images and GIFs into moon emoji art",
}

// Tell Next.js to render this page dynamically
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' 
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <ClientPageWrapper />
    </main>
  )
}
