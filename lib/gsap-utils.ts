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

// Hero animations
export const animateHero = () => {
  const tl = gsap.timeline()
  
  // Animate badge
  tl.fromTo('.hero-badge', 
    { opacity: 0, y: 30, scale: 0.9 },
    { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
  )
  
  // Animate headline with stagger
  tl.fromTo('.hero-headline', 
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
    '-=0.3'
  )
  
  // Animate subtext
  tl.fromTo('.hero-subtext', 
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    '-=0.4'
  )
  
  // Animate CTA buttons with stagger
  tl.fromTo('.hero-cta', 
    { opacity: 0, y: 30, scale: 0.9 },
    { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      duration: 0.6, 
      ease: 'back.out(1.7)',
      stagger: 0.1
    },
    '-=0.3'
  )
  
  // Animate trust indicators
  tl.fromTo('.hero-trust', 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    '-=0.2'
  )
  
  // Animate floating elements with continuous motion
  gsap.to('.hero-float-1', {
    y: -20,
    duration: 3,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1
  })
  
  gsap.to('.hero-float-2', {
    y: -15,
    x: 10,
    duration: 4,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
    delay: 1
  })
  
  gsap.to('.hero-float-3', {
    y: -25,
    x: -5,
    duration: 3.5,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
    delay: 2
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

// Parallax effect for background elements
export const setupParallax = () => {
  gsap.utils.toArray('.parallax-element').forEach((element: any) => {
    gsap.to(element, {
      yPercent: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    })
  })
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

// Button hover animations
export const setupButtonHovers = () => {
  const buttons = document.querySelectorAll('.animated-button')
  
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      gsap.to(button, { scale: 1.05, duration: 0.3, ease: 'power2.out' })
    })
    
    button.addEventListener('mouseleave', () => {
      gsap.to(button, { scale: 1, duration: 0.3, ease: 'power2.out' })
    })
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

// Performance optimization for mobile devices
export const optimizeForMobile = () => {
  const isMobile = window.innerWidth < 768
  
  if (isMobile) {
    // Reduce animation complexity on mobile
    gsap.globalTimeline.timeScale(1.5) // Speed up animations
    
    // Disable some heavy animations on mobile
    const heavyAnimations = document.querySelectorAll('.parallax-element')
    heavyAnimations.forEach(el => {
      el.classList.add('mobile-optimized')
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
  
  // Listen for resize events
  window.addEventListener('resize', adjustForScreenSize)
  
  // Setup intersection observer for performance
  setupIntersectionObserver()
}