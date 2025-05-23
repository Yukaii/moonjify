"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, Loader2, Copy, Check, RefreshCw, Info, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { processImage, processGif, EMOJI_SETS, EmojiSet, MOON_EMOJI_SET, createCustomEmojiSet } from "@/lib/image-processor"
import CurveEditor from "./curve-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as htmlToImage from 'html-to-image'

interface Point {
  x: number
  y: number
}

export default function ImageUploader() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [emojiArt, setEmojiArt] = useState<string>("")
  const [isGif, setIsGif] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)
  const [emojiWidth, setEmojiWidth] = useState(50)
  const [inverted, setInverted] = useState(false)
  const [frames, setFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(100) // Default 100ms (10fps)
  const [selectedEmojiSet, setSelectedEmojiSet] = useState<EmojiSet>(MOON_EMOJI_SET)
  const [curvePoints, setCurvePoints] = useState<Point[]>([
    { x: 0, y: 200 }, // Bottom-left (black)
    { x: 300, y: 0 }, // Top-right (white)
  ])
  const animationRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiArtContainerRef = useRef<HTMLDivElement>(null)
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
      // Make sure to update emoji art with the next frame
      if (frames[nextFrame]) {
        setEmojiArt(frames[nextFrame]);
      }
      return nextFrame;
    });
    
    // Schedule the next frame using only setTimeout for consistent timing
    animationRef.current = window.setTimeout(() => {
      // Only continue the animation if still playing
      if (isPlaying) {
        playAnimation();
      }
    }, animationSpeed);
  }, [frames, animationSpeed, isPlaying]);

  // Update the ref when curvePoints change
  useEffect(() => {
    currentCurvePointsRef.current = curvePoints
  }, [curvePoints])

  // Start animation when isPlaying becomes true
  useEffect(() => {
    // Cleanup previous animation timeout if exists
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    
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
          const frames = await processGif(
            file, 
            emojiWidth, 
            inverted, 
            currentCurvePointsRef.current, 
            curveHeight,
            selectedEmojiSet
          );
          
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
          const result = await processImage(
            file, 
            emojiWidth, 
            inverted, 
            currentCurvePointsRef.current, 
            curveHeight,
            selectedEmojiSet
          );
          setEmojiArt(result);
          setFrames([result]);
        }
      } catch (error) {
        console.error("Error processing image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [emojiWidth, inverted, curveHeight, selectedEmojiSet],
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

  const exportAsImage = useCallback(async () => {
    if (!emojiArtContainerRef.current || !emojiArt) return;

    try {
      setIsExporting(true);
      
      // Generate a filename based on whether it's a GIF or static image
      let fileName;
      if (isGif && frames.length > 1) {
        // For animated GIFs, include frame information in the filename
        fileName = `moonjify-frame-${currentFrame + 1}-of-${frames.length}-${Date.now()}.png`;
      } else {
        fileName = `moonjify-${Date.now()}.png`;
      }
      
      // Convert the emoji art container to a PNG image
      const dataUrl = await htmlToImage.toPng(emojiArtContainerRef.current, { 
        backgroundColor: '#1e293b', // Match the bg-slate-800 color
        pixelRatio: 2 // Higher quality
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      
      // Show success indicator
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (error) {
      console.error('Error exporting image:', error);
    } finally {
      setIsExporting(false);
    }
  }, [emojiArt, isGif, frames.length, currentFrame]);

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
      playAnimation();
    }
  }, [isPlaying, frames.length, playAnimation]);

  const handleInvertedChange = useCallback((checked: boolean) => {
    setInverted(checked)
  }, []);

  // Define reprocessImage function first to avoid circular dependency
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
        const frames = await processGif(
          blob, 
          emojiWidth, 
          inverted, 
          currentCurvePointsRef.current, 
          curveHeight,
          selectedEmojiSet
        );
        
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
        const result = await processImage(
          blob, 
          emojiWidth, 
          inverted, 
          currentCurvePointsRef.current, 
          curveHeight,
          selectedEmojiSet
        );
        setEmojiArt(result);
        setFrames([result]);
      }
    } catch (error) {
      console.error("Error reprocessing image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [previewUrl, isGif, emojiWidth, inverted, curveHeight, selectedEmojiSet]);

  // Function to handle creating a custom emoji set
  const handleCreateCustomEmojiSet = useCallback(async (customEmojis: string) => {
    if (!customEmojis.trim()) return;
    
    setIsProcessing(true);
    try {
      // Split the input by any whitespace or commas
      const emojis = customEmojis.trim().split(/[\s,]+/).filter(emoji => emoji.length > 0);
      
      if (emojis.length < 2) {
        alert("Please provide at least 2 emojis for a custom set");
        return;
      }
      
      // Create a unique ID for this custom set
      const id = `custom-${Date.now()}`;
      
      // Create the custom emoji set and analyze brightness
      const customSet = await createCustomEmojiSet(id, "Custom Set", emojis, "Your custom emoji set");
      
      // Add to the emoji sets (this is temporary and won't persist after refresh)
      EMOJI_SETS.push(customSet);
      
      // Select the new custom set
      setSelectedEmojiSet(customSet);
      
      // Reprocess the image with the new set if an image is loaded
      if (previewUrl) {
        reprocessImage();
      }
    } catch (error) {
      console.error("Error creating custom emoji set:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [previewUrl, reprocessImage]);

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
      // Start the animation by setting isPlaying to true
      // The animation will start via the useEffect hook
      setIsPlaying(true);
      // Also trigger playAnimation directly to start immediately
      playAnimation();
    }
  }, [isPlaying, currentFrame, frames, frames.length, playAnimation]);

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

              <div className="space-y-3">
                <Label htmlFor="emoji-set" className="text-base">
                  Emoji Set
                </Label>
                <Select 
                  value={selectedEmojiSet.id} 
                  onValueChange={(value) => {
                    const emojiSet = EMOJI_SETS.find(set => set.id === value) || MOON_EMOJI_SET;
                    setSelectedEmojiSet(emojiSet);
                  }}
                >
                  <SelectTrigger id="emoji-set" className="w-full text-white bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select Emoji Set" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOJI_SETS.map((emojiSet) => (
                      <SelectItem key={emojiSet.id} value={emojiSet.id}>
                        <div className="flex items-center">
                          <span className="mr-2">{emojiSet.emojis[0]}{emojiSet.emojis[Math.floor(emojiSet.emojis.length/2)]}{emojiSet.emojis[emojiSet.emojis.length-1]}</span>
                          {emojiSet.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-700 rounded">
                  {selectedEmojiSet.emojis.map((emoji, index) => (
                    <span key={index} className="text-2xl">{emoji}</span>
                  ))}
                </div>
                {selectedEmojiSet.description && (
                  <p className="text-xs text-slate-400">{selectedEmojiSet.description}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="custom-emojis" className="text-base">
                  Add Custom Emoji Set
                </Label>
                <div className="flex space-x-2">
                  <Textarea
                    id="custom-emojis"
                    placeholder="Enter your custom emojis separated by spaces (e.g. 🔴 🟠 🟡 🟢 🔵)"
                    className="min-h-[40px] resize-none text-white bg-slate-700 border-slate-600"
                  />
                  <Button 
                    className="shrink-0" 
                    variant="secondary"
                    onClick={() => {
                      const input = document.getElementById('custom-emojis') as HTMLTextAreaElement;
                      if (input && input.value) {
                        handleCreateCustomEmojiSet(input.value);
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Custom emojis will be analyzed and arranged by brightness from darkest to lightest.
                </p>
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
              <div 
                ref={emojiArtContainerRef} 
                className="bg-slate-800 rounded-lg p-4 h-[300px] overflow-auto"
              >
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
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={exportAsImage} 
                    className="w-full" 
                    variant="outline"
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : exported ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Exported!
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export as image
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    {isGif && frames.length > 1 
                      ? `Exports the current frame (${currentFrame + 1}/${frames.length}) as a PNG image`
                      : "Exports the emoji art as a PNG image"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  )
}
