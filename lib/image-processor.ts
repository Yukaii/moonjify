// Moon emojis in order of brightness (from darkest to brightest and back to darkest)
// This creates a better visual representation with the full moon (🌕) as brightest in the middle
const moonEmojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]

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

            // Map brightness to moon emoji index (0-7)
            let emojiIndex = Math.floor(normalizedBrightness * (moonEmojis.length - 1))

            // Clamp index to valid range
            emojiIndex = Math.max(0, Math.min(moonEmojis.length - 1, emojiIndex))

            // Invert if needed
            if (inverted) {
              emojiIndex = moonEmojis.length - 1 - emojiIndex
            }

            result += moonEmojis[emojiIndex]
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
