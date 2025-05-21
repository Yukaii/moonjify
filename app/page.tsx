import type { Metadata } from "next"
import ClientPageWrapper from "@/components/client-page-wrapper"
import { Github } from "lucide-react"

export const metadata: Metadata = {
  title: "Moon Emoji Image Converter",
  description: "Transform your images and GIFs into moon emoji art",
}

// Tell Next.js to render this page dynamically
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' 
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <ClientPageWrapper />
      <footer className="mt-8 w-full text-center">
        <a 
          href="https://github.com/Yukaii/moonjify" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <Github className="w-4 h-4 mr-2" />
          <span>GitHub Repository</span>
        </a>
      </footer>
    </main>
  )
}
