import type { Metadata } from "next"
import ImageUploader from "@/components/image-uploader"

export const metadata: Metadata = {
  title: "Moon Emoji Image Converter",
  description: "Transform your images and GIFs into moon emoji art",
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center">Moon Emoji Art Generator</h1>
        <p className="text-lg text-slate-300 mb-8 text-center max-w-2xl">
          Transform your images and GIFs into beautiful moon emoji art. Upload an image and watch it become a textual
          masterpiece.
        </p>
        <ImageUploader />
      </div>
    </main>
  )
}
