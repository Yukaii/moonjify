"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Loader2, Copy, Check, RefreshCw, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { processImage, processGif } from "@/lib/image-processor"
import CurveEditor from "./curve-editor"

interface Point {
  x: number
  y: number
}

export default function ImageUploader() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [emojiArt, setEmojiArt] = useState<string>("")
  const [isGif, setIsGif] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emojiWidth, setEmojiWidth] = useState(50)
  const [inverted, setInverted] = useState(false)
  const [frames, setFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(100) // Default 100ms (10fps)
  const [curvePoints, setCurvePoints] = useState<Point[]>([
    { x: 0, y: 200 }, // Bottom-left (black)
    { x: 300, y: 0 }, // Top-right (white)
  ])
  const animationRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const curveHeight = 200
  const curveWidth = 300

  // Store the current curve points in a ref to prevent them from being reset
  const currentCurvePointsRef = useRef<Point[]>(curvePoints)

  // Define playAnimation function separately to avoid circular dependencies
  const playAnimation = useCallback(() => {
    if (!frames.length || frames.length <= 1) {
      setIsPlaying(false);
      return;
    }
    
    // Clear any existing animation timer
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    
    // Use functional update to ensure we're using the latest state
    setCurrentFrame(prevFrame => {
      const nextFrame = (prevFrame + 1) % frames.length;
      setEmojiArt(frames[nextFrame]);
      return nextFrame;
    });
    
    // Schedule the next frame using only setTimeout for consistent timing
    animationRef.current = window.setTimeout(() => {
      // Only continue the animation if still playing
      if (isPlaying) {
        playAnimation();
      }
    }, animationSpeed);
  }, [frames, animationSpeed]);

  // Update the ref when curvePoints change
  useEffect(() => {
    currentCurvePointsRef.current = curvePoints
  }, [curvePoints])

  // Start animation when isPlaying becomes true
  useEffect(() => {
    // Only start animation if isPlaying is true and we have frames
    if (isPlaying && frames.length > 1) {
      // Start the animation immediately
      playAnimation();
    }
    
    // Cleanup function to ensure we cancel animations when component unmounts or isPlaying changes
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, frames.length, playAnimation]);

  const handleCurveChange = useCallback((points: Point[]) => {
    setCurvePoints(points)
    currentCurvePointsRef.current = points
  }, [])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Stop any current animation
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      setIsPlaying(false);

      const file = acceptedFiles[0];
      const isGifFile = file.type === "image/gif";
      setIsGif(isGifFile);

      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setEmojiArt("");
      setFrames([]);
      setCurrentFrame(0);
      setIsProcessing(true);

      try {
        if (isGifFile) {
          // Process GIFs with animation support
          const frames = await processGif(file, emojiWidth, inverted, currentCurvePointsRef.current, curveHeight);
          
          if (frames && frames.length > 0) {
            setFrames(frames);
            // Set the first frame as the initial display
            setEmojiArt(frames[0] || "");
            
            // If we have multiple frames, automatically start playback after a short delay
            if (frames.length > 1) {
              // Short delay to ensure state is updated
              setTimeout(() => {
                setIsPlaying(true);
              }, 100);
            }
          }
        } else {
          const result = await processImage(file, emojiWidth, inverted, currentCurvePointsRef.current, curveHeight);
          setEmojiArt(result);
          setFrames([result]);
        }
      } catch (error) {
        console.error("Error processing image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [emojiWidth, inverted, curveHeight],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
  })

  const copyToClipboard = () => {
    if (textareaRef.current) {
      textareaRef.current.select()
      document.execCommand("copy")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWidthChange = useCallback((value: number[]) => {
    setEmojiWidth(value[0])
  }, []);

  const handleAnimationSpeedChange = useCallback((value: number[]) => {
    const newSpeed = value[0];
    setAnimationSpeed(newSpeed);
    
    // If animation is currently playing, restart it with the new speed
    if (isPlaying && frames.length > 1) {
      // Clear current animation
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      
      // Start the animation immediately with the new speed
      // Use setTimeout to ensure state update has completed
      setTimeout(() => playAnimation(), 0);
    }
  }, [isPlaying, frames.length, playAnimation]);

  const handleInvertedChange = useCallback((checked: boolean) => {
    setInverted(checked)
  }, []);

  const reprocessImage = useCallback(async () => {
    if (!previewUrl) return;

    // Stop any current animation
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setCurrentFrame(0);
    setIsProcessing(true);

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();

      // Use the current curve points from the ref to ensure we're using the latest values
      if (isGif) {
        // Process GIFs with animation support
        const frames = await processGif(blob, emojiWidth, inverted, currentCurvePointsRef.current, curveHeight);
        
        if (frames && frames.length > 0) {
          setFrames(frames);
          setEmojiArt(frames[0] || "");
          
          // If we have multiple frames, automatically start playback after a short delay
          if (frames.length > 1) {
            // Short delay to ensure state is updated
            setTimeout(() => {
              setIsPlaying(true);
            }, 100);
          }
        }
      } else {
        const result = await processImage(blob, emojiWidth, inverted, currentCurvePointsRef.current, curveHeight);
        setEmojiArt(result);
        setFrames([result]);
      }
    } catch (error) {
      console.error("Error reprocessing image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [previewUrl, isGif, emojiWidth, inverted, curveHeight]);

  const togglePlayback = useCallback(() => {
    if (frames.length <= 1) return;
    
    if (isPlaying) {
      // Stop the animation
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Reset to first frame if we've reached the end
      if (currentFrame >= frames.length - 1) {
        setCurrentFrame(0);
        if (frames.length > 0) {
          setEmojiArt(frames[0]);
        }
      }
      // Start the animation
      setIsPlaying(true);
      // Note: The animation will start in the useEffect hook when isPlaying becomes true
    }
  }, [isPlaying, currentFrame, frames, frames.length]);

  return (
    <div className="w-full space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-slate-600 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-700 rounded-full">
            <Upload className="h-8 w-8 text-slate-300" />
          </div>
          <div>
            <p className="text-lg font-medium">Drag & drop your image or GIF here</p>
            <p className="text-sm text-slate-400 mt-1">
              Adjust the width and brightness curve to customize your moon emoji art
            </p>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Processing your image...</span>
        </div>
      )}

      {previewUrl && !isProcessing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold mb-3">Original Image</h2>
              <div className="bg-slate-800 rounded-lg p-2 flex justify-center">
                {isGif ? (
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Uploaded GIF"
                    className="max-h-[300px] object-contain rounded"
                  />
                ) : (
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Uploaded image"
                    className="max-h-[300px] object-contain rounded"
                  />
                )}
              </div>
            </div>

            <div className="space-y-5 bg-slate-800 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label htmlFor="width" className="text-base">
                    Width (emojis)
                  </Label>
                  <span className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded">{emojiWidth} emojis</span>
                </div>
                <Slider id="width" min={10} max={150} step={5} value={[emojiWidth]} onValueChange={handleWidthChange} />
              </div>

              <CurveEditor
                width={curveWidth}
                height={curveHeight}
                onChange={handleCurveChange}
                initialPoints={curvePoints}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="inverted" checked={inverted} onCheckedChange={handleInvertedChange} />
                  <Label htmlFor="inverted" className="text-base">
                    Invert colors
                  </Label>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">Info</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Inverts the brightness mapping, making dark areas light and light areas dark
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <Button onClick={reprocessImage} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reprocess with new settings
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Moon Emoji Art</h2>
                {isGif && frames.length > 1 && (
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={togglePlayback}>
                      {isPlaying ? "Pause" : "Play"} Animation
                    </Button>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Speed:</span>
                      <Slider 
                        min={50} 
                        max={500} 
                        step={50} 
                        value={[animationSpeed]} 
                        onValueChange={handleAnimationSpeedChange}
                        className="w-24"
                      />
                      <span>{animationSpeed}ms</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-slate-800 rounded-lg p-4 h-[300px] overflow-auto">
                <Textarea
                  ref={textareaRef}
                  value={emojiArt}
                  readOnly
                  className="h-full font-mono text-xs md:text-sm bg-transparent border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre overflow-x-auto"
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-sm font-medium text-slate-200 mb-3">Moon Emoji Cycle (Lunar Phases):</div>
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌑</span>
                  <span className="text-xs text-slate-400">Darkest</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌒</span>
                  <span className="text-xs text-slate-400">Waxing</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌓</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌔</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌕</span>
                  <span className="text-xs text-slate-400">Brightest</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌖</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌗</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl mb-1">🌘</span>
                  <span className="text-xs text-slate-400">Waning</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3 text-center">
                The moon emojis follow the lunar cycle with 🌕 (Full Moon) as brightest and 🌑 (New Moon) as darkest
              </div>
            </div>

            <Button onClick={copyToClipboard} className="w-full" variant="secondary">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to clipboard
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
