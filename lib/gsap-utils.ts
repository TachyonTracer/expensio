'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Animation configurations
export const animationConfig = {
  duration: 0.8,
  ease: 'power2.out',
  stagger: 0.1,
  scrollTrigger: {
    start: 'top 80%',
    end: 'bottom 20%',
    toggleActions: 'play none none reverse'
  }
}

// Optimized hero animations
export const animateHero = () => {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  if (prefersReducedMotion) {
    // Just fade in elements without complex animations
    gsap.set(['.hero-badge', '.hero-headline', '.hero-subtext', '.hero-cta', '.hero-trust'], { opacity: 1 })
    return
  }

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  
  // Faster, simpler animations
  tl.fromTo('.hero-badge', 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4 }
  )
  .fromTo('.hero-headline', 
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.5 },
    '-=0.2'
  )
  .fromTo('.hero-subtext', 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4 },
    '-=0.3'
  )
  .fromTo('.hero-cta', 
    { opacity: 0, y: 20 },
    { 
      opacity: 1, 
      y: 0, 
      duration: 0.4,
      stagger: 0.05
    },
    '-=0.2'
  )
  .fromTo('.hero-trust', 
    { opacity: 0 },
    { opacity: 1, duration: 0.3 },
    '-=0.1'
  )
  
  // Add CSS-based floating animations
  const floatingElements = document.querySelectorAll('[class*="hero-float"]')
  floatingElements.forEach((element, index) => {
    element.classList.add('floating-animation')
    element.style.animationDelay = `${index * 0.5}s`
  })
}

// Section fade-in animations
export const animateSection = (selector: string) => {
  gsap.fromTo(selector, 
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      y: 0,
      duration: animationConfig.duration,
      ease: animationConfig.ease,
      scrollTrigger: {
        trigger: selector,
        ...animationConfig.scrollTrigger
      }
    }
  )
}

// Staggered card animations
export const animateCards = (selector: string, staggerAmount = 0.1) => {
  gsap.fromTo(`${selector} > *`, 
    { opacity: 0, y: 50, scale: 0.9 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      ease: 'back.out(1.7)',
      stagger: staggerAmount,
      scrollTrigger: {
        trigger: selector,
        ...animationConfig.scrollTrigger
      }
    }
  )
}

// Feature cards with hover animations
export const setupFeatureHovers = () => {
  const featureCards = document.querySelectorAll('.feature-card')
  
  featureCards.forEach(card => {
    const icon = card.querySelector('.feature-icon')
    const content = card.querySelector('.feature-content')
    
    card.addEventListener('mouseenter', () => {
      gsap.to(icon, { scale: 1.1, rotation: 5, duration: 0.3, ease: 'power2.out' })
      gsap.to(content, { y: -5, duration: 0.3, ease: 'power2.out' })
    })
    
    card.addEventListener('mouseleave', () => {
      gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' })
      gsap.to(content, { y: 0, duration: 0.3, ease: 'power2.out' })
    })
  })
}

// Testimonial cards animation
export const animateTestimonials = () => {
  gsap.fromTo('.testimonial-card', 
    { opacity: 0, y: 50, rotationY: 15 },
    {
      opacity: 1,
      y: 0,
      rotationY: 0,
      duration: 0.8,
      ease: 'power2.out',
      stagger: 0.15,
      scrollTrigger: {
        trigger: '.testimonials-grid',
        ...animationConfig.scrollTrigger
      }
    }
  )
}

// Stats counter animation
export const animateStats = () => {
  const stats = document.querySelectorAll('.stat-number')
  
  stats.forEach(stat => {
    const finalValue = stat.textContent || '0'
    const numericValue = parseInt(finalValue.replace(/[^\d]/g, '')) || 0
    
    gsap.fromTo(stat, 
      { textContent: 0 },
      {
        textContent: numericValue,
        duration: 2,
        ease: 'power2.out',
        snap: { textContent: 1 },
        scrollTrigger: {
          trigger: stat,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        onUpdate: function() {
          const current = Math.round(this.targets()[0].textContent)
          if (finalValue.includes('+')) {
            stat.textContent = current.toLocaleString() + '+'
          } else if (finalValue.includes('%')) {
            stat.textContent = current + '%'
          } else if (finalValue.includes('/')) {
            stat.textContent = current + '/5'
          } else {
            stat.textContent = current.toLocaleString()
          }
        }
      }
    )
  })
}

// Optimized parallax effect for background elements
export const setupParallax = () => {
  // Only enable parallax on desktop for better performance
  if (window.innerWidth > 1024) {
    gsap.utils.toArray('.parallax-element').forEach((element: any) => {
      gsap.to(element, {
        yPercent: -30, // Reduced movement for better performance
        ease: 'none',
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1, // Add slight delay for smoother animation
          invalidateOnRefresh: true
        }
      })
    })
  }
}

// Form animation
export const animateForm = () => {
  const formElements = document.querySelectorAll('.form-element')
  
  gsap.fromTo(formElements, 
    { opacity: 0, x: -30 },
    {
      opacity: 1,
      x: 0,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.1,
      scrollTrigger: {
        trigger: '.contact-form',
        ...animationConfig.scrollTrigger
      }
    }
  )
}

// Optimized button hover animations using CSS
export const setupButtonHovers = () => {
  const buttons = document.querySelectorAll('.animated-button')
  
  buttons.forEach(button => {
    // Add CSS class for hover effects instead of GSAP
    button.classList.add('optimized-hover')
  })
}

// Cleanup function for ScrollTrigger
export const cleanupScrollTriggers = () => {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill())
}

// Refresh ScrollTrigger (useful for dynamic content)
export const refreshScrollTrigger = () => {
  ScrollTrigger.refresh()
}

// Dark mode transition animation
export const animateDarkModeTransition = () => {
  gsap.to('body', {
    duration: 0.3,
    ease: 'power2.inOut'
  })
}

// Enhanced performance optimization for mobile devices
export const optimizeForMobile = () => {
  const isMobile = window.innerWidth < 768
  const isTablet = window.innerWidth < 1024
  
  if (isMobile) {
    // Significantly reduce animation complexity on mobile
    gsap.globalTimeline.timeScale(2) // Speed up animations more
    
    // Disable heavy animations on mobile
    const heavyAnimations = document.querySelectorAll('.parallax-element, .hero-float-1, .hero-float-2, .hero-float-3')
    heavyAnimations.forEach(el => {
      el.style.display = 'none' // Hide floating elements on mobile
    })
    
    // Disable ScrollTrigger scrub animations on mobile
    ScrollTrigger.getAll().forEach(trigger => {
      if (trigger.vars.scrub) {
        trigger.kill()
      }
    })
  } else if (isTablet) {
    // Moderate optimization for tablets
    gsap.globalTimeline.timeScale(1.3)
    
    // Reduce floating elements on tablet
    const floatingElements = document.querySelectorAll('.hero-float-2, .hero-float-3')
    floatingElements.forEach(el => {
      el.style.opacity = '0.1'
    })
  }
}

// Intersection Observer for better performance
export const setupIntersectionObserver = () => {
  const observerOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view')
      } else {
        entry.target.classList.remove('in-view')
      }
    })
  }, observerOptions)
  
  // Observe all animated elements
  const animatedElements = document.querySelectorAll('.gsap-element')
  animatedElements.forEach(el => observer.observe(el))
  
  return observer
}

// Preload animations for better performance
export const preloadAnimations = () => {
  // Create a timeline to preload all animations
  const preloadTl = gsap.timeline({ paused: true })
  
  // Add all major animations to the timeline
  preloadTl
    .set('.hero-badge', { opacity: 0, y: 30, scale: 0.9 })
    .set('.hero-headline', { opacity: 0, y: 50 })
    .set('.hero-subtext', { opacity: 0, y: 30 })
    .set('.hero-cta', { opacity: 0, y: 30, scale: 0.9 })
    .set('.feature-card', { opacity: 0, y: 50, scale: 0.9 })
    .set('.testimonial-card', { opacity: 0, y: 50, rotationY: 15 })
  
  return preloadTl
}

// Responsive animation adjustments
export const adjustForScreenSize = () => {
  const screenWidth = window.innerWidth
  
  if (screenWidth < 640) {
    // Mobile adjustments
    animationConfig.duration = 0.5
    animationConfig.stagger = 0.05
  } else if (screenWidth < 1024) {
    // Tablet adjustments
    animationConfig.duration = 0.6
    animationConfig.stagger = 0.08
  } else {
    // Desktop - full animations
    animationConfig.duration = 0.8
    animationConfig.stagger = 0.1
  }
}

// Initialize all optimizations
export const initializeOptimizations = () => {
  adjustForScreenSize()
  optimizeForMobile()
  preloadAnimations()
  
  // Throttled resize listener for better performance
  let resizeTimeout: NodeJS.Timeout
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(adjustForScreenSize, 150)
  })
  
  // Setup intersection observer for performance
  setupIntersectionObserver()
  
  // Configure ScrollTrigger for better performance
  ScrollTrigger.config({
    autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
    ignoreMobileResize: true
  })
}