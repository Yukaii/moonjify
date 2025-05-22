// Define interface for emoji sets
export interface EmojiSet {
  id: string;
  name: string;
  emojis: string[];  // Emojis in order of brightness (from darkest to brightest)
  neutralEmojis?: string[];  // Emojis for neutral brightness (typically darkest and brightest)
  rightLitEmojis?: string[];  // Emojis for right-lit areas (waxing)
  leftLitEmojis?: string[];  // Emojis for left-lit areas (waning)
  description?: string;
}

// Moon emojis in order of brightness (from darkest to brightest and back to darkest)
// This creates a better visual representation with the full moon (🌕) as brightest in the middle
export const MOON_EMOJI_SET: EmojiSet = {
  id: 'moon',
  name: 'Moon Phases',
  emojis: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  neutralEmojis: ["🌑", "🌕"], // Darkest and brightest
  rightLitEmojis: ["🌒", "🌓", "🌔"], // Light on right, dark on left (waxing)
  leftLitEmojis: ["🌘", "🌗", "🌖"], // Light on left, dark on right (waning)
  description: 'Moon emojis following the lunar cycle from new moon to full moon'
}

// For backward compatibility
const moonEmojis = MOON_EMOJI_SET.emojis;
const neutralMoons = MOON_EMOJI_SET.neutralEmojis || [MOON_EMOJI_SET.emojis[0], MOON_EMOJI_SET.emojis[4]];
const rightLitMoons = MOON_EMOJI_SET.rightLitEmojis || [MOON_EMOJI_SET.emojis[1], MOON_EMOJI_SET.emojis[2], MOON_EMOJI_SET.emojis[3]];
const leftLitMoons = MOON_EMOJI_SET.leftLitEmojis || [MOON_EMOJI_SET.emojis[7], MOON_EMOJI_SET.emojis[6], MOON_EMOJI_SET.emojis[5]];

// Add weather emoji set as an example of an alternative set
export const WEATHER_EMOJI_SET: EmojiSet = {
  id: 'weather',
  name: 'Weather',
  emojis: ["⚫", "🌧️", "⛅", "🌤️", "☀️"],
  neutralEmojis: ["⚫", "☀️"],
  description: 'Weather emojis from darkness to brightness'
}

// Heart emoji set
export const HEART_EMOJI_SET: EmojiSet = {
  id: 'hearts',
  name: 'Hearts',
  emojis: ["🖤", "❤️", "💗", "💕", "💖", "💝"],
  neutralEmojis: ["🖤", "💝"],
  description: 'Heart emojis from dark to bright'
}

// Face emoji set
export const FACE_EMOJI_SET: EmojiSet = {
  id: 'faces',
  name: 'Faces',
  emojis: ["😶", "🙁", "😐", "🙂", "😊", "😄"],
  neutralEmojis: ["😶", "😄"],
  description: 'Face emojis from neutral to happy'
}

// Circle emoji set
export const CIRCLE_EMOJI_SET: EmojiSet = {
  id: 'circles',
  name: 'Circles',
  emojis: ["⚫", "🔵", "🟣", "🟡", "⚪"],
  neutralEmojis: ["⚫", "⚪"],
  description: 'Circle emojis from dark to bright'
}

// Collection of available emoji sets
export const EMOJI_SETS: EmojiSet[] = [
  MOON_EMOJI_SET,
  WEATHER_EMOJI_SET,
  HEART_EMOJI_SET,
  FACE_EMOJI_SET,
  CIRCLE_EMOJI_SET
];

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
  emojiSet: EmojiSet = MOON_EMOJI_SET,
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
              // Very dark, use darkest emoji regardless of gradient
              result += (emojiSet.neutralEmojis || [emojiSet.emojis[0], emojiSet.emojis[emojiSet.emojis.length - 1]])[0]
            } else if (normalizedBrightness > 0.85) {
              // Very bright, use brightest emoji regardless of gradient
              result += (emojiSet.neutralEmojis || [emojiSet.emojis[0], emojiSet.emojis[emojiSet.emojis.length - 1]])[1]
            } else if (normalizedRightBrightness !== -1 && 
                     Math.abs(normalizedBrightness - normalizedRightBrightness) > brightnessThreshold) {
              // There's a significant brightness difference with the right pixel
              
              if (normalizedRightBrightness > normalizedBrightness) {
                // Right pixel is brighter, use right-lit emojis (waxing) if available
                // This creates a smooth transition with light on the right side
                if (emojiSet.rightLitEmojis && emojiSet.rightLitEmojis.length > 0) {
                  const index = Math.min(emojiSet.rightLitEmojis.length - 1, Math.floor(normalizedBrightness * emojiSet.rightLitEmojis.length))
                  result += emojiSet.rightLitEmojis[index]
                } else {
                  // Fallback to regular brightness mapping
                  const emojiIndex = Math.floor(normalizedBrightness * (emojiSet.emojis.length - 1))
                  const clampedIndex = Math.max(0, Math.min(emojiSet.emojis.length - 1, emojiIndex))
                  result += emojiSet.emojis[clampedIndex]
                }
              } else {
                // Right pixel is darker, use left-lit emojis (waning) if available
                // This creates a smooth transition with light on the left side
                if (emojiSet.leftLitEmojis && emojiSet.leftLitEmojis.length > 0) {
                  const index = Math.min(emojiSet.leftLitEmojis.length - 1, Math.floor(normalizedBrightness * emojiSet.leftLitEmojis.length))
                  result += emojiSet.leftLitEmojis[index]
                } else {
                  // Fallback to regular brightness mapping
                  const emojiIndex = Math.floor(normalizedBrightness * (emojiSet.emojis.length - 1))
                  const clampedIndex = Math.max(0, Math.min(emojiSet.emojis.length - 1, emojiIndex))
                  result += emojiSet.emojis[clampedIndex]
                }
              }
            } else {
              // No significant gradient or edge pixel, use traditional brightness mapping
              const emojiIndex = Math.floor(normalizedBrightness * (emojiSet.emojis.length - 1))
              // Clamp index to valid range
              const clampedIndex = Math.max(0, Math.min(emojiSet.emojis.length - 1, emojiIndex))
              result += emojiSet.emojis[clampedIndex]
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
  emojiSet: EmojiSet = MOON_EMOJI_SET,
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
    const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight, emojiSet);
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
        const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight, emojiSet);
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
      console.log(`Processing ${maxFrames} frames from GIF`);
      
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
        try {
          const frameResult = await processCanvasToEmojis(
            canvas, 
            emojiWidth, 
            emojiHeight, 
            inverted, 
            curvePoints, 
            curveHeight,
            emojiSet
          );
          
          processedFrames.push(frameResult);
          console.log(`Processed frame ${i+1}/${maxFrames}`);
        } catch (frameError) {
          console.error(`Error processing frame ${i}:`, frameError);
        }
      }
      
      console.log(`Completed processing ${processedFrames.length} frames`);
      if (processedFrames.length === 0) {
        // Fallback to at least one frame
        try {
          const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight);
          processedFrames.push(result);
        } catch (fallbackError) {
          console.error("Fallback processing error:", fallbackError);
        }
      }
      
      resolve(processedFrames);
    } catch (error) {
      console.error("Error processing GIF:", error);
      // Fallback to processing as static image
      try {
        const result = await processImage(file, emojiWidth, inverted, curvePoints, curveHeight, emojiSet);
        resolve([result]);
      } catch (fallbackError) {
        reject(fallbackError);
      }
    }
  });
}

// Function to analyze emoji brightness to properly order emojis
export async function analyzeEmojiBrightness(
  emojiArray: string[],
  size = 32
): Promise<{ emoji: string; brightness: number }[]> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return emojiArray.map((emoji, index) => ({
      emoji,
      brightness: index / (emojiArray.length - 1) // Fallback linear distribution
    }));
  }

  return new Promise((resolve) => {
    // Create a canvas element to render the emojis
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      // If can't get context, return a linear distribution as fallback
      resolve(emojiArray.map((emoji, index) => ({
        emoji,
        brightness: index / (emojiArray.length - 1)
      })));
      return;
    }
    
    // Array to store brightness values
    const brightnessValues: { emoji: string; brightness: number }[] = [];
    
    // Function to process the next emoji in the array
    const processNextEmoji = (index: number) => {
      if (index >= emojiArray.length) {
        // Sort emojis by brightness
        brightnessValues.sort((a, b) => a.brightness - b.brightness);
        resolve(brightnessValues);
        return;
      }
      
      const emoji = emojiArray[index];
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the emoji
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
      
      // Get the image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      
      // Calculate the average brightness
      let totalBrightness = 0;
      let pixelCount = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Only consider pixels that aren't transparent
        if (a > 0) {
          totalBrightness += (r + g + b) / 3;
          pixelCount++;
        }
      }
      
      // If no non-transparent pixels, set brightness to 0
      const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount / 255 : 0;
      
      brightnessValues.push({
        emoji,
        brightness: avgBrightness
      });
      
      // Process the next emoji
      processNextEmoji(index + 1);
    };
    
    // Start processing from the first emoji
    processNextEmoji(0);
  });
}

// Creates a new emoji set from a custom array of emojis
export async function createCustomEmojiSet(
  id: string,
  name: string,
  emojis: string[],
  description?: string
): Promise<EmojiSet> {
  // Analyze brightness of emojis
  const analyzedEmojis = await analyzeEmojiBrightness(emojis);
  
  // Sort emojis by brightness
  const sortedEmojis = analyzedEmojis.map(item => item.emoji);
  
  return {
    id,
    name,
    emojis: sortedEmojis,
    description
  };
}

// Helper function to process a canvas to emoji art
async function processCanvasToEmojis(
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  inverted: boolean,
  curvePoints: Point[],
  curveHeight: number,
  emojiSet: EmojiSet = MOON_EMOJI_SET
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
      
      // Map brightness to emoji index
      let emojiIndex = Math.floor(normalizedBrightness * (emojiSet.emojis.length - 1))
      
      // Clamp index to valid range
      emojiIndex = Math.max(0, Math.min(emojiSet.emojis.length - 1, emojiIndex))
      
      // Invert if needed
      if (inverted) {
        emojiIndex = emojiSet.emojis.length - 1 - emojiIndex
      }
      
      result += emojiSet.emojis[emojiIndex]
    }
    result += "\n"
  }
  
  return result
}

// Function to render a frame from GIF decompression to canvas
function renderFrame(ctx: CanvasRenderingContext2D, frame: any, imageData: ImageData) {
  const { width, height, left, top } = frame.dims;
  const { pixels } = frame;
  
  // Get the existing image data from the canvas
  if (frame.disposalType !== 1) {
    // For all disposal methods except "combine", we need to copy pixel data
    for (let i = 0; i < pixels.length; i++) {
      const row = Math.floor(i / width);
      const col = i % width;
      const frameIndex = i * 4;
      const canvasIndex = ((top + row) * ctx.canvas.width + (left + col)) * 4;
      
      // Only overwrite non-transparent pixels
      if (pixels[frameIndex + 3] !== 0) {
        imageData.data[canvasIndex] = pixels[frameIndex];
        imageData.data[canvasIndex + 1] = pixels[frameIndex + 1];
        imageData.data[canvasIndex + 2] = pixels[frameIndex + 2];
        imageData.data[canvasIndex + 3] = pixels[frameIndex + 3];
      }
    }
  }
  
  // Put the image data onto the canvas
  ctx.putImageData(imageData, 0, 0);
}
