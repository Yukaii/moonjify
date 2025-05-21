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
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve('Server Side Rendering - Image processing not available');
  }
  
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
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(['Server Side Rendering - GIF processing not available']);
  }

  // Import the gifuct-js library dynamically to avoid SSR issues
  let parseGIF, decompressFrames;
  try {
    // Import in a way that prevents variable hoisting issues
    const gifuctModule = await import('gifuct-js');
    parseGIF = gifuctModule.parseGIF;
    decompressFrames = gifuctModule.decompressFrames;
  } catch (error) {
    console.error("Error importing gifuct-js:", error);
    // Fallback to processing as static image
    const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight);
    return [result];
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      // Read the file as an ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Parse the GIF file
      const gif = parseGIF(buffer);
      const frames = decompressFrames(gif, true);
      
      if (!frames || frames.length === 0) {
        // If no frames, fall back to processing as a static image
        const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight);
        resolve([result]);
        return;
      }
      
      // Create a canvas to render the frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Set canvas dimensions based on the first frame
      canvas.width = frames[0].dims.width;
      canvas.height = frames[0].dims.height;
      
      // Create an off-screen canvas for compositing frames
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        reject(new Error("Could not get temporary canvas context"));
        return;
      }
      
      // Create ImageData object once and reuse
      const imageData = tempCtx.createImageData(canvas.width, canvas.height);
      
      // Process each frame
      const processedFrames: string[] = [];
      let lastImageData: ImageData | null = null;
      
      // Limit frames to prevent memory issues (max 50 frames)
      const maxFrames = Math.min(frames.length, 50);
      
      for (let i = 0; i < maxFrames; i++) {
        const frame = frames[i];
        
        // Get the frame's dimensions and position
        const { width, height } = frame.dims;
        
        // GIF disposal method determines how to handle the previous frame
        if (frame.disposalType === 2) {
          // Restore to background color (clear the canvas)
          tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        } else if (lastImageData && frame.disposalType !== 3) {
          // Keep the previous content if not "restore to previous"
          tempCtx.putImageData(lastImageData, 0, 0);
        }
        
        // Render the frame onto our canvas
        renderFrame(tempCtx, frame, imageData);
        
        // Save current state for next frame if needed
        lastImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the current state to the main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        
        // Scale the canvas to the desired emoji width
        const aspectRatio = width / height;
        const emojiHeight = Math.round(emojiWidth / aspectRatio);
        
        // Process the current state of the canvas
        const frameResult = await processCanvasToEmojis(
          canvas, 
          emojiWidth, 
          emojiHeight, 
          inverted, 
          curvePoints, 
          curveHeight
        );
        
        processedFrames.push(frameResult);
      }
      
      resolve(processedFrames);
    } catch (error) {
      console.error("Error processing GIF:", error);
      // Fallback to processing as static image
      try {
        const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight);
        resolve([result]);
      } catch (fallbackError) {
        reject(fallbackError);
      }
    }
  });
}

// Helper function to render a GIF frame to a canvas context
function renderFrame(ctx: CanvasRenderingContext2D, frame: any, imageData: ImageData) {
  const { width, height, left, top } = frame.dims
  
  // Copy the patch data to the image data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const patchIdx = (y * width + x) * 4
      const destIdx = ((y + top) * ctx.canvas.width + (x + left)) * 4
      
      // Skip transparent pixels based on the indicator in the frame
      if (frame.patch[patchIdx + 3]) {
        imageData.data[destIdx] = frame.patch[patchIdx]         // R
        imageData.data[destIdx + 1] = frame.patch[patchIdx + 1] // G
        imageData.data[destIdx + 2] = frame.patch[patchIdx + 2] // B
        imageData.data[destIdx + 3] = frame.patch[patchIdx + 3] // A
      }
    }
  }
  
  // Draw the patch onto the canvas
  ctx.putImageData(imageData, 0, 0, left, top, width, height)
}

// Helper function to process a canvas to emoji art
async function processCanvasToEmojis(
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  inverted: boolean,
  curvePoints: Point[],
  curveHeight: number
): Promise<string> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve('Server Side Rendering - Canvas processing not available');
  }
  
  // Create a scaled canvas for the emoji dimensions
  const scaledCanvas = document.createElement('canvas')
  scaledCanvas.width = targetWidth
  scaledCanvas.height = targetHeight
  const scaledCtx = scaledCanvas.getContext('2d')
  
  if (!scaledCtx) {
    throw new Error("Could not get scaled canvas context")
  }
  
  // Draw the original canvas onto the scaled canvas
  scaledCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight)
  
  // Get image data from the scaled canvas
  const imageData = scaledCtx.getImageData(0, 0, targetWidth, targetHeight)
  const data = imageData.data
  
  // Convert to moon emojis
  let result = ""
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4
      
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
  
  return result
}
