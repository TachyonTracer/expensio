'use client'

import { useEffect, useState } from 'react'

interface ViewportInfo {
  width: number
  height: number
  deviceType: 'mobile' | 'tablet' | 'desktop'
  orientation: 'portrait' | 'landscape'
}

export default function ResponsiveTest() {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: 0,
    height: 0,
    deviceType: 'desktop',
    orientation: 'landscape'
  })
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      let deviceType: ViewportInfo['deviceType'] = 'desktop'
      if (width < 768) deviceType = 'mobile'
      else if (width < 1024) deviceType = 'tablet'
      
      const orientation: ViewportInfo['orientation'] = width > height ? 'landscape' : 'portrait'
      
      setViewport({ width, height, deviceType, orientation })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    
    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
          setShowDebugInfo(!showDebugInfo)
        }
      }
      window.addEventListener('keydown', handleKeyPress)
      
      return () => {
        window.removeEventListener('resize', updateViewport)
        window.removeEventListener('keydown', handleKeyPress)
      }
    }

    return () => {
      window.removeEventListener('resize', updateViewport)
    }
  }, [showDebugInfo])

  // Test responsive breakpoints
  const testBreakpoints = () => {
    const breakpoints = [
      { name: 'Mobile', width: 375 },
      { name: 'Mobile Large', width: 414 },
      { name: 'Tablet', width: 768 },
      { name: 'Tablet Large', width: 1024 },
      { name: 'Desktop', width: 1280 },
      { name: 'Desktop Large', width: 1920 },
    ]

    return breakpoints.map(bp => ({
      ...bp,
      isCurrent: viewport.width >= bp.width && 
                 (breakpoints.find(b => b.width > bp.width)?.width || Infinity) > viewport.width
    }))
  }

  if (!showDebugInfo && process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg text-sm font-mono max-w-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">Responsive Debug</span>
        <button 
          onClick={() => setShowDebugInfo(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div>Size: {viewport.width} × {viewport.height}</div>
        <div>Device: {viewport.deviceType}</div>
        <div>Orientation: {viewport.orientation}</div>
        
        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Breakpoints:</div>
          {testBreakpoints().map(bp => (
            <div 
              key={bp.name} 
              className={`text-xs ${bp.isCurrent ? 'text-green-400' : 'text-gray-500'}`}
            >
              {bp.name}: {bp.width}px {bp.isCurrent ? '✓' : ''}
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-xs text-gray-400">
          Press Ctrl+Shift+R to toggle
        </div>
      </div>
    </div>
  )
}