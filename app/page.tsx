import ImageUploader from "@/components/image-uploader"
import { Github } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="w-full max-w-6xl flex flex-col items-center pt-12 md:pt-0">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center">Moon Emoji Art Generator</h1>
        <p className="text-lg text-slate-300 mb-8 text-center max-w-2xl">
          Transform your images and GIFs into beautiful moon emoji art. Upload an image and watch it become a textual
          masterpiece.
        </p>
        <ImageUploader />
      </div>
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
