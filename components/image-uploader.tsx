"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import useSWR from "swr"
import { Upload, Loader2, Copy, Check, RefreshCw, Info, Download, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { processImage, processGif, EMOJI_SETS, EmojiSet, MOON_EMOJI_SET, createCustomEmojiSet } from "@/lib/image-processor"
import * as htmlToImage from "html-to-image"
import CurveEditor from "./curve-editor"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"

interface Point {
  x: number
  y: number
}

// Custom hook for curve points synchronization
const useCurvePointsSync = (curvePoints: Point[]) => {
  const currentCurvePointsRef = useRef<Point[]>(curvePoints)
  
  useSWR(['curvePoints', curvePoints], () => {
    currentCurvePointsRef.current = curvePoints
    return curvePoints
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  })
  
  return currentCurvePointsRef
}

// Custom hook for animation management
const useAnimationControl = (
  frames: string[],
  isPlaying: boolean,
  animationSpeed: number,
  setIsPlaying: (playing: boolean) => void,
  setCurrentFrame: (frame: number | ((prev: number) => number)) => void,
  setEmojiArt: (art: string) => void
) => {
  const animationRef = useRef<number | null>(null)

  const playAnimation = useCallback(() => {
    if (!frames.length || frames.length <= 1) {
      setIsPlaying(false);
      return;
    }
    
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    
    setCurrentFrame(prevFrame => {
      const nextFrame = (prevFrame + 1) % frames.length;
      if (frames[nextFrame]) {
        setEmojiArt(frames[nextFrame]);
      }
      return nextFrame;
    });
    
    animationRef.current = window.setTimeout(() => {
      if (isPlaying) {
        playAnimation();
      }
    }, animationSpeed);
  }, [frames, animationSpeed, isPlaying, setIsPlaying, setCurrentFrame, setEmojiArt]);

  useSWR(['animation', isPlaying, frames.length], () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    
    if (isPlaying && frames.length > 1) {
      playAnimation();
    }
    
    return { isPlaying, frameCount: frames.length }
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    onSuccess: () => {
      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
          animationRef.current = null;
        }
      };
    }
  })

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [])

  return { animationRef, playAnimation }
}

// Custom hook for image processing
const useImageProcessor = (
  previewUrl: string | null,
  isGif: boolean,
  emojiWidth: number,
  inverted: boolean,
  selectedEmojiSet: EmojiSet,
  curveHeight: number,
  currentCurvePointsRef: React.RefObject<Point[]>,
  setFrames: (frames: string[]) => void,
  setEmojiArt: (art: string) => void,
  setIsPlaying: (playing: boolean) => void,
  setCurrentFrame: (frame: number) => void,
  animationRef: React.RefObject<number | null>
) => {
  const [reprocessKey, setReprocessKey] = useState(0)
  
  const imageProcessorFetcher = useCallback(async (key: string) => {
    if (!previewUrl) return null;

    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    setIsPlaying(false);
    setCurrentFrame(0);

    const response = await fetch(previewUrl);
    const blob = await response.blob();

    if (isGif) {
      const frames = await processGif(
        blob, 
        emojiWidth, 
        inverted, 
        currentCurvePointsRef.current || [], 
        curveHeight,
        selectedEmojiSet
      );
      
      if (frames && frames.length > 0) {
        return {
          frames,
          emojiArt: frames[0] || "",
          isGif: true
        };
      }
    } else {
      const result = await processImage(
        blob, 
        emojiWidth, 
        inverted, 
        currentCurvePointsRef.current || [], 
        curveHeight,
        selectedEmojiSet
      );
      return {
        frames: [result],
        emojiArt: result,
        isGif: false
      };
    }
    
    return null;
  }, [previewUrl, isGif, emojiWidth, inverted, curveHeight, selectedEmojiSet, currentCurvePointsRef, setIsPlaying, setCurrentFrame, animationRef]);

  const { isLoading: isProcessingSWR } = useSWR(
    previewUrl ? [`imageProcessing`, reprocessKey, emojiWidth, inverted, selectedEmojiSet.id] : null,
    imageProcessorFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: (data) => {
        if (data) {
          setFrames(data.frames);
          setEmojiArt(data.emojiArt);
          
          if (data.frames.length > 1) {
            setTimeout(() => {
              setIsPlaying(true);
            }, 100);
          }
        }
      }
    }
  );

  const triggerReprocess = useCallback(() => {
    setReprocessKey(prev => prev + 1);
  }, []);

  return { isProcessingSWR, triggerReprocess }
}

// Custom hook for clipboard operations
const useClipboard = (textareaRef: React.RefObject<HTMLTextAreaElement | null>) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.select()
      document.execCommand("copy")
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [textareaRef])

  return { copied, copyToClipboard }
}

// Custom hook for image export
const useImageExport = (
  emojiArtContainerRef: React.RefObject<HTMLDivElement | null>,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  emojiArt: string,
  isGif: boolean,
  frames: string[],
  currentFrame: number
) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const exportAsImage = useCallback(async () => {
    if (!emojiArtContainerRef.current || !textareaRef.current || !emojiArt) return;

    try {
      setIsExporting(true);
      
      let fileName;
      if (isGif && frames.length > 1) {
        fileName = `moonjify-frame-${currentFrame + 1}-of-${frames.length}-${Date.now()}.png`;
      } else {
        fileName = `moonjify-${Date.now()}.png`;
      }

      const container = emojiArtContainerRef.current;
      const textarea = textareaRef.current;
      
      const originalContainerStyles = {
        height: container.style.height,
        overflow: container.style.overflow,
        maxHeight: container.style.maxHeight,
        position: container.style.position,
        width: container.style.width,
        display: container.style.display
      };
      
      const originalTextareaStyles = {
        height: textarea.style.height,
        overflow: textarea.style.overflow,
        maxHeight: textarea.style.maxHeight,
        whiteSpace: textarea.style.whiteSpace,
        wordWrap: textarea.style.wordWrap,
        color: textarea.style.color,
        fontSize: textarea.style.fontSize,
        lineHeight: textarea.style.lineHeight,
        padding: textarea.style.padding,
        border: textarea.style.border,
        background: textarea.style.background,
        resize: textarea.style.resize
      };
      
      const scrollWidth = textarea.scrollWidth;
      const scrollHeight = textarea.scrollHeight;
      
      container.style.height = 'auto';
      container.style.maxHeight = 'none';
      container.style.overflow = 'hidden';
      container.style.width = `${scrollWidth + 32}px`;
      container.style.display = 'block';
      
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.maxHeight = 'none';
      textarea.style.overflow = 'hidden';
      textarea.style.whiteSpace = 'pre';
      textarea.style.wordWrap = 'normal';
      textarea.style.color = '#ffffff';
      textarea.style.fontSize = '14px';
      textarea.style.lineHeight = '20px';
      textarea.style.padding = '16px';
      textarea.style.border = 'none';
      textarea.style.background = 'transparent';
      textarea.style.resize = 'none';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await htmlToImage.toPng(container, { 
        backgroundColor: '#1e293b',
        pixelRatio: 2,
        width: scrollWidth + 32,
        height: scrollHeight + 32,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      Object.assign(container.style, originalContainerStyles);
      Object.assign(textarea.style, originalTextareaStyles);
      
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
      
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (error) {
      console.error('Error exporting image:', error);
    } finally {
      setIsExporting(false);
    }
  }, [emojiArt, isGif, frames.length, currentFrame, emojiArtContainerRef, textareaRef]);

  return { isExporting, exported, exportAsImage }
}

export default function ImageUploader() {
  // Basic state
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [emojiArt, setEmojiArt] = useState<string>("")
  const [isGif, setIsGif] = useState(false)
  const [emojiWidth, setEmojiWidth] = useState(50)
  const [inverted, setInverted] = useState(false)
  const [frames, setFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(100)
  const [selectedEmojiSet, setSelectedEmojiSet] = useState<EmojiSet>(MOON_EMOJI_SET)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [curvePoints, setCurvePoints] = useState<Point[]>([
    { x: 0, y: 200 },
    { x: 300, y: 0 },
  ])

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiArtContainerRef = useRef<HTMLDivElement>(null)
  const curveHeight = 200
  const curveWidth = 300

  // Custom hooks
  const currentCurvePointsRef = useCurvePointsSync(curvePoints)
  const { animationRef, playAnimation } = useAnimationControl(
    frames, 
    isPlaying, 
    animationSpeed, 
    setIsPlaying, 
    setCurrentFrame, 
    setEmojiArt
  )
  const { isProcessingSWR, triggerReprocess } = useImageProcessor(
    previewUrl,
    isGif,
    emojiWidth,
    inverted,
    selectedEmojiSet,
    curveHeight,
    currentCurvePointsRef,
    setFrames,
    setEmojiArt,
    setIsPlaying,
    setCurrentFrame,
    animationRef
  )
  const { copied, copyToClipboard } = useClipboard(textareaRef)
  const { isExporting, exported, exportAsImage } = useImageExport(
    emojiArtContainerRef,
    textareaRef,
    emojiArt,
    isGif,
    frames,
    currentFrame
  )

  // Handlers
  const handleCurveChange = useCallback((points: Point[]) => {
    setCurvePoints(points)
    currentCurvePointsRef.current = points
  }, [currentCurvePointsRef])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      setIsPlaying(false);

      const file = acceptedFiles[0];
      const isGifFile = file.type === "image/gif";
      setIsGif(isGifFile);

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setEmojiArt("");
      setFrames([]);
      setCurrentFrame(0);
      setIsProcessing(true);

      try {
        if (isGifFile) {
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
            setEmojiArt(frames[0] || "");
            
            if (frames.length > 1) {
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
    [emojiWidth, inverted, curveHeight, selectedEmojiSet, animationRef, currentCurvePointsRef],
  )

  const handleWidthChange = useCallback((value: number[]) => {
    setEmojiWidth(value[0])
    triggerReprocess()
  }, [triggerReprocess]);

  const handleAnimationSpeedChange = useCallback((value: number[]) => {
    const newSpeed = value[0];
    setAnimationSpeed(newSpeed);
    
    if (isPlaying && frames.length > 1) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      playAnimation();
    }
  }, [isPlaying, frames.length, playAnimation, animationRef]);

  const handleInvertedChange = useCallback((checked: boolean) => {
    setInverted(checked)
  }, []);

  const handleCreateCustomEmojiSet = useCallback(async (customEmojis: string) => {
    if (!customEmojis.trim()) return;
    
    setIsProcessing(true);
    try {
      const emojis = customEmojis.trim().split(/[\s,]+/).filter(emoji => emoji.length > 0);
      
      if (emojis.length < 2) {
        alert("Please provide at least 2 emojis for a custom set");
        return;
      }
      
      const id = `custom-${Date.now()}`;
      const customSet = await createCustomEmojiSet(id, "Custom Set", emojis, "Your custom emoji set");
      
      EMOJI_SETS.push(customSet);
      setSelectedEmojiSet(customSet);
      
      if (previewUrl) {
        triggerReprocess();
      }
    } catch (error) {
      console.error("Error creating custom emoji set:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [previewUrl, triggerReprocess]);

  const togglePlayback = useCallback(() => {
    if (frames.length <= 1) return;
    
    if (isPlaying) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      setIsPlaying(false);
    } else {
      if (currentFrame >= frames.length - 1) {
        setCurrentFrame(0);
        if (frames.length > 0) {
          setEmojiArt(frames[0]);
        }
      }
      setIsPlaying(true);
      playAnimation();
    }
  }, [isPlaying, currentFrame, frames, frames.length, playAnimation, animationRef]);

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
  })

  // Computed values
  const isProcessingCombined = isProcessing || isProcessingSWR;

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
              <Collapsible
                open={isAdvancedOpen}
                onOpenChange={setIsAdvancedOpen}
                className="space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="width" className="text-base">
                      Width (emojis)
                    </Label>
                    <span className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded">{emojiWidth} emojis</span>
                  </div>
                  <Slider id="width" min={10} max={150} step={5} value={[emojiWidth]} onValueChange={handleWidthChange} />
                </div>

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex w-full justify-between items-center">
                    <span>Advanced Settings</span>
                    {isAdvancedOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="emoji-set" className="text-base">
                      Emoji Set
                    </Label>
                    <Select 
                      value={selectedEmojiSet.id} 
                      onValueChange={(value) => {
                        const emojiSet = EMOJI_SETS.find(set => set.id === value) || MOON_EMOJI_SET;
                        setSelectedEmojiSet(emojiSet);
                        triggerReprocess();
                      }}
                    >
                      <SelectTrigger id="emoji-set" className="w-full text-white bg-slate-700 border-slate-600">
                        <SelectValue placeholder="Select Emoji Set" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMOJI_SETS.map((emojiSet) => (
                          <SelectItem key={emojiSet.id} value={emojiSet.id}>
                            <div className="flex items-center">
                              <span className="mr-2" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' }}>{emojiSet.emojis[0]}{emojiSet.emojis[Math.floor(emojiSet.emojis.length/2)]}{emojiSet.emojis[emojiSet.emojis.length-1]}</span>
                              {emojiSet.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-700 rounded">
                      {selectedEmojiSet.emojis.map((emoji, index) => (
                        <span key={index} className="text-2xl" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' }}>{emoji}</span>
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
                        style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' }}
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
                      <Switch 
                        id="inverted" 
                        checked={inverted} 
                        onCheckedChange={(checked) => {
                          handleInvertedChange(checked);
                          triggerReprocess();
                        }}
                      />
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
                </CollapsibleContent>
              </Collapsible>
              
              <Button onClick={triggerReprocess} className="w-full">
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
                  className="h-full text-xs md:text-sm bg-transparent border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0 whitespace-pre overflow-x-auto"
                  style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif' }}
                />
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
                    variant="secondary"
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
