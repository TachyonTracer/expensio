'use client'

import { useEffect } from 'react'
import { 
  setupParallax, 
  setupButtonHovers, 
  refreshScrollTrigger,
  initializeOptimizations,
  cleanupScrollTriggers
} from '@/lib/gsap-utils'

export default function AnimationController() {
  useEffect(() => {
    // Initialize global animations with better performance
    const initializeAnimations = () => {
      // Initialize performance optimizations first
      initializeOptimizations()
      
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        setupParallax()
        setupButtonHovers()
        
        // Reduced delay for ScrollTrigger refresh
        setTimeout(() => {
          refreshScrollTrigger()
        }, 50)
      })
    }

    // Use requestIdleCallback if available for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initializeAnimations, { timeout: 1000 })
    } else {
      // Fallback for browsers without requestIdleCallback
      if (document.readyState === 'complete') {
        initializeAnimations()
      } else {
        window.addEventListener('load', initializeAnimations, { once: true })
      }
    }

    // Cleanup function
    return () => {
      cleanupScrollTriggers()
    }
  }, [])

  // This component doesn't render anything visible
  return null
}