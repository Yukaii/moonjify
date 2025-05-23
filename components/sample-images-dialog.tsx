"use client"

import { useState } from "react"
import Image from "next/image"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"

interface SampleImage {
  name: string
  path: string
  description: string
  type: 'static' | 'animated'
}

const SAMPLE_IMAGES: SampleImage[] = [
  {
    name: "Circle",
    path: "/samples/circle.png",
    description: "High contrast circle with gradient",
    type: "static"
  },
  {
    name: "Gradient",
    path: "/samples/gradient.png",
    description: "Horizontal gradient from black to white",
    type: "static"
  },
  {
    name: "Grid",
    path: "/samples/grid.png",
    description: "Checkerboard pattern",
    type: "static"
  },
  {
    name: "Portrait",
    path: "/samples/portrait.png",
    description: "Simple portrait with high contrast",
    type: "static"
  },
  {
    name: "Text",
    path: "/samples/text.png",
    description: "Text sample with the app name",
    type: "static"
  },
  {
    name: "Animated",
    path: "/samples/animated.gif",
    description: "Animated circle moving in a circle",
    type: "animated"
  }
]

interface SampleImagesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectSample: (image: SampleImage) => void
}

export default function SampleImagesDialog({ 
  open, 
  onOpenChange,
  onSelectSample
}: SampleImagesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Choose a Sample Image</DialogTitle>
          <DialogDescription>
            Select one of these high-contrast sample images to try out the app.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          {SAMPLE_IMAGES.map((image) => (
            <div 
              key={image.name}
              className="flex flex-col items-center p-2 border rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => {
                onSelectSample(image)
                onOpenChange(false)
              }}
            >
              <div className="relative w-full aspect-square mb-2 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                <Image
                  src={image.path}
                  alt={image.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="font-medium">{image.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{image.type === 'animated' ? '(GIF)' : '(Static)'}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { SAMPLE_IMAGES, type SampleImage }