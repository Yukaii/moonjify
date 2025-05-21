"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Point {
  x: number
  y: number
}

interface CurveEditorProps {
  onChange: (points: Point[]) => void
  width?: number
  height?: number
  initialPoints?: Point[]
}

export default function CurveEditor({ onChange, width = 300, height = 200, initialPoints }: CurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [points, setPoints] = useState<Point[]>(
    initialPoints || [
      { x: 0, y: height }, // Bottom-left (black)
      { x: width, y: 0 }, // Top-right (white)
    ],
  )
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isInitialRender = useRef(true)
  const [canvasWidth, setCanvasWidth] = useState(width)
  const [canvasHeight, setCanvasHeight] = useState(height)

  // Resize canvas based on container size
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 16 // Subtract padding
        setCanvasWidth(containerWidth)

        // Scale points to new width
        if (points.length > 0 && !isInitialRender.current) {
          const scaleX = containerWidth / canvasWidth
          const newPoints = points.map((point) => ({
            x: point.x * scaleX,
            y: point.y,
          }))
          setPoints(newPoints)
        }
      }
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)
    return () => window.removeEventListener("resize", updateCanvasSize)
  }, [canvasWidth])

  // Draw the curve and points
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Draw grid
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 0.5

    // Vertical lines
    for (let x = 0; x <= canvasWidth; x += canvasWidth / 4) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasHeight)
      ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y <= canvasHeight; y += canvasHeight / 4) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasWidth, y)
      ctx.stroke()
    }

    // Sort points by x coordinate
    const sortedPoints = [...points].sort((a, b) => a.x - b.x)

    // Draw curve
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sortedPoints[0].x, sortedPoints[0].y)

    for (let i = 1; i < sortedPoints.length; i++) {
      ctx.lineTo(sortedPoints[i].x, sortedPoints[i].y)
    }
    ctx.stroke()

    // Draw points
    sortedPoints.forEach((point, index) => {
      ctx.fillStyle = index === activePointIndex ? "#3b82f6" : "#fff"
      ctx.beginPath()
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }, [points, activePointIndex, canvasWidth, canvasHeight])

  // Only notify parent when points actually change, not on every render
  useEffect(() => {
    // Skip the initial render to prevent the infinite loop
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    // Sort points by x coordinate before sending to parent
    const sortedPoints = [...points].sort((a, b) => a.x - b.x)
    onChange(sortedPoints)
  }, [points, onChange])

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking on an existing point
    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2))

      if (distance <= 10) {
        // Right click to remove point (except the first and last points)
        if (e.button === 2 && i !== 0 && i !== points.length - 1) {
          e.preventDefault()
          setPoints(points.filter((_, index) => index !== i))
          return
        }

        // Left click to select point
        setActivePointIndex(i)
        setIsDragging(true)
        return
      }
    }

    // Left click to add new point (if not on an existing point)
    if (e.button === 0) {
      // Don't add points outside the canvas
      if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) return

      const newPoint = { x, y }
      setPoints([...points, newPoint])
      setActivePointIndex(points.length)
      setIsDragging(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || activePointIndex === null) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    let x = e.clientX - rect.left
    let y = e.clientY - rect.top

    // Constrain to canvas boundaries
    x = Math.max(0, Math.min(canvasWidth, x))
    y = Math.max(0, Math.min(canvasHeight, y))

    // Don't allow first point to move horizontally or last point to move horizontally
    if (activePointIndex === 0) {
      x = 0
    } else if (activePointIndex === points.length - 1) {
      x = canvasWidth
    }

    const newPoints = [...points]
    newPoints[activePointIndex] = { x, y }
    setPoints(newPoints)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const resetCurve = () => {
    setPoints([
      { x: 0, y: canvasHeight }, // Bottom-left (black)
      { x: canvasWidth, y: 0 }, // Top-right (white)
    ])
    setActivePointIndex(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Brightness Curve</Label>
        <Button variant="secondary" size="sm" onClick={resetCurve} className="text-slate-900">
          Reset
        </Button>
      </div>
      <div ref={containerRef} className="bg-slate-900 rounded-lg p-2 border border-slate-700 w-full">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          className="cursor-crosshair w-full"
        />
        <div className="text-xs text-slate-400 mt-2 flex justify-between">
          <span>Dark</span>
          <span>Brightness</span>
          <span>Light</span>
        </div>
        <div className="text-xs text-slate-400 mt-1 text-center">
          Click to add points, right-click to remove, drag to adjust
        </div>
      </div>
    </div>
  )
}
