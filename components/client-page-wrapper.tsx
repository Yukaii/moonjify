"use client"

import ImageUploader from "@/components/image-uploader"

export default function ClientPageWrapper() {
  return (
    <div className="w-full max-w-6xl flex flex-col items-center pt-12 md:pt-0">
      <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center">Moon Emoji Art Generator</h1>
      <p className="text-lg text-slate-300 mb-8 text-center max-w-2xl">
        Transform your images and GIFs into beautiful moon emoji art. Upload an image and watch it become a textual
        masterpiece.
      </p>
      <ImageUploader />
    </div>
  )
}