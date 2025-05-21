// Moon emojis in order of brightness (from darkest to brightest and back to darkest)
// This creates a better visual representation with the full moon (🌕) as brightest in the middle
const moonEmojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]

// Moon emojis categorized by orientation for improved edge detection
const neutralMoons = ["🌑", "🌕"] // Darkest and brightest
const rightLitMoons = ["🌒", "🌓", "🌔"] // Light on right, dark on left (waxing)
const leftLitMoons = ["🌘", "🌗", "🌖"] // Light on left, dark on right (waning)

interface Point {
  x: number
  y: number
}

// Function to map brightness using curve points
function mapBrightnessThroughCurve(brightness: number, curvePoints: Point[], canvasHeight: number): number {
  // Normalize brightness to 0-1 range
  const normalizedBrightness = brightness / 255

  // Sort points by x coordinate
  const sortedPoints = [...curvePoints].sort((a, b) => a.x - b.x)

  // Find the two points that surround the current brightness
  let p1 = sortedPoints[0]
  let p2 = sortedPoints[sortedPoints.length - 1]

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    if (
      normalizedBrightness * sortedPoints[sortedPoints.length - 1].x >= sortedPoints[i].x &&
      normalizedBrightness * sortedPoints[sortedPoints.length - 1].x <= sortedPoints[i + 1].x
    ) {
      p1 = sortedPoints[i]
      p2 = sortedPoints[i + 1]
      break
    }
  }

  // Linear interpolation between the two points
  const t = (normalizedBrightness * sortedPoints[sortedPoints.length - 1].x - p1.x) / (p2.x - p1.x || 1)
  const mappedY = p1.y + t * (p2.y - p1.y)

  // Convert from canvas coordinates (where y=0 is top) to brightness (where 0 is dark)
  // and normalize to 0-1 range
  return 1 - mappedY / canvasHeight
}

export async function processImage(
  file: File | Blob,
  emojiWidth = 50,
  inverted = false,
  curvePoints: Point[] = [],
  curveHeight = 200,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a URL for the image
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        // Calculate height based on aspect ratio and desired emoji width
        const aspectRatio = img.width / img.height
        const width = emojiWidth // Use the exact width specified

        // Use a more accurate ratio for emojis (they're approximately square in most fonts)
        // No division by 2 anymore to fix the aspect ratio issue
        const height = Math.round(width / aspectRatio)

        // Create canvas and draw image
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        // Convert to moon emojis
        let result = ""
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4

            // Calculate brightness (0-255)
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]
            const brightness = (r + g + b) / 3

            // Apply curve adjustment if curve points are provided
            let normalizedBrightness
            if (curvePoints.length >= 2) {
              normalizedBrightness = mapBrightnessThroughCurve(brightness, curvePoints, curveHeight)
            } else {
              normalizedBrightness = brightness / 255
            }

            // Check brightness of adjacent pixel to determine gradient direction
            // This improves the continuity of outlines by using orientation-appropriate moon emojis
            const rightIdx = x < width - 1 ? (y * width + (x + 1)) * 4 : -1
            let rightBrightness = -1
            if (rightIdx !== -1) {
              const rRight = data[rightIdx]
              const gRight = data[rightIdx + 1]
              const bRight = data[rightIdx + 2]
              rightBrightness = (rRight + gRight + bRight) / 3
            }

            // Apply curve adjustment to adjacent pixel brightness if needed
            let normalizedRightBrightness = -1
            if (rightIdx !== -1) {
              if (curvePoints.length >= 2) {
                normalizedRightBrightness = mapBrightnessThroughCurve(rightBrightness, curvePoints, curveHeight)
              } else {
                normalizedRightBrightness = rightBrightness / 255
              }
            }

            // Invert if needed
            if (inverted) {
              normalizedBrightness = 1 - normalizedBrightness
              if (normalizedRightBrightness !== -1) {
                normalizedRightBrightness = 1 - normalizedRightBrightness
              }
            }

            // Threshold for significant brightness difference between adjacent pixels
            const brightnessThreshold = 0.2

            // Choose emoji based on brightness and gradient direction
            if (normalizedBrightness < 0.15) {
              // Very dark, use darkest moon regardless of gradient
              result += neutralMoons[0] // 🌑
            } else if (normalizedBrightness > 0.85) {
              // Very bright, use brightest moon regardless of gradient
              result += neutralMoons[1] // 🌕
            } else if (normalizedRightBrightness !== -1 && 
                     Math.abs(normalizedBrightness - normalizedRightBrightness) > brightnessThreshold) {
              // There's a significant brightness difference with the right pixel
              
              if (normalizedRightBrightness > normalizedBrightness) {
                // Right pixel is brighter, use right-lit moons (waxing)
                // This creates a smooth transition with light on the right side
                const index = Math.min(2, Math.floor(normalizedBrightness * 3))
                result += rightLitMoons[index]
              } else {
                // Right pixel is darker, use left-lit moons (waning)
                // This creates a smooth transition with light on the left side
                const index = Math.min(2, Math.floor(normalizedBrightness * 3))
                result += leftLitMoons[index]
              }
            } else {
              // No significant gradient or edge pixel, use traditional brightness mapping
              const emojiIndex = Math.floor(normalizedBrightness * (moonEmojis.length - 1))
              // Clamp index to valid range
              const clampedIndex = Math.max(0, Math.min(moonEmojis.length - 1, emojiIndex))
              result += moonEmojis[clampedIndex]
            }
          }
          result += "\n"
        }

        // Clean up
        URL.revokeObjectURL(url)
        resolve(result)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load image"))
      }

      img.src = url
    } catch (error) {
      reject(error)
    }
  })
}

export async function processGif(
  file: File | Blob,
  emojiWidth = 50,
  inverted = false,
  curvePoints: Point[] = [],
  curveHeight = 200,
): Promise<string[]> {
  // For GIFs, we'll use a simpler approach in the browser
  // We'll just process it as a static image for now
  const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight)
  return [result]
}
