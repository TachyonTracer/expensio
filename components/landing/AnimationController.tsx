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
    // Initialize global animations after all components are mounted
    const initializeAnimations = () => {
      // Initialize performance optimizations first
      initializeOptimizations()
      
      // Setup global animations
      setupParallax()
      setupButtonHovers()
      
      // Refresh ScrollTrigger to ensure all triggers are properly calculated
      setTimeout(() => {
        refreshScrollTrigger()
      }, 100)
    }

    // Wait for DOM to be fully loaded
    if (document.readyState === 'complete') {
      initializeAnimations()
    } else {
      window.addEventListener('load', initializeAnimations)
    }

    // Cleanup function
    return () => {
      window.removeEventListener('load', initializeAnimations)
      cleanupScrollTriggers()
    }
  }, [])

  // This component doesn't render anything visible
  return null
}