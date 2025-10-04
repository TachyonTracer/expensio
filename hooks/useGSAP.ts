'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export function useGSAP(
  callback: () => void,
  dependencies: any[] = []
) {
  const contextRef = useRef<gsap.Context | null>(null)

  useEffect(() => {
    // Create GSAP context for automatic cleanup
    contextRef.current = gsap.context(() => {
      callback()
    })

    return () => {
      // Cleanup GSAP context and ScrollTriggers
      contextRef.current?.revert()
    }
  }, dependencies)

  return contextRef.current
}

export function useScrollTrigger(
  element: string | Element,
  animation: gsap.TweenVars,
  trigger?: ScrollTrigger.Vars
) {
  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
        ...trigger
      }
    })

    tl.to(element, animation)

    return () => {
      tl.kill()
    }
  }, [element, animation, trigger])
}

export function useHoverAnimation(
  element: string,
  hoverIn: gsap.TweenVars,
  hoverOut: gsap.TweenVars
) {
  useEffect(() => {
    const elements = gsap.utils.toArray(element)
    
    elements.forEach((el: any) => {
      const handleMouseEnter = () => gsap.to(el, hoverIn)
      const handleMouseLeave = () => gsap.to(el, hoverOut)
      
      el.addEventListener('mouseenter', handleMouseEnter)
      el.addEventListener('mouseleave', handleMouseLeave)
      
      return () => {
        el.removeEventListener('mouseenter', handleMouseEnter)
        el.removeEventListener('mouseleave', handleMouseLeave)
      }
    })
  }, [element, hoverIn, hoverOut])
}

export function useParallax(element: string, speed: number = 0.5) {
  useEffect(() => {
    const elements = gsap.utils.toArray(element)
    
    elements.forEach((el: any) => {
      gsap.to(el, {
        yPercent: -50 * speed,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      })
    })
  }, [element, speed])
}

export function useStaggerAnimation(
  elements: string,
  animation: gsap.TweenVars,
  stagger: number = 0.1
) {
  useEffect(() => {
    gsap.fromTo(elements, 
      { opacity: 0, y: 50 },
      {
        ...animation,
        stagger,
        scrollTrigger: {
          trigger: elements,
          start: 'top 80%',
          toggleActions: 'play none none reverse'
        }
      }
    )
  }, [elements, animation, stagger])
}