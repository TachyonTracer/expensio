import { gsap } from 'gsap';

// Animation presets
export const animationPresets = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 0.5, ease: 'power2.out' },
  },
  fadeInUp: {
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  },
  fadeInDown: {
    from: { opacity: 0, y: -30 },
    to: { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  },
  fadeInLeft: {
    from: { opacity: 0, x: -30 },
    to: { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
  },
  fadeInRight: {
    from: { opacity: 0, x: 30 },
    to: { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
  },

  // Scale animations
  scaleIn: {
    from: { opacity: 0, scale: 0.8 },
    to: { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' },
  },
  scaleOut: {
    from: { opacity: 1, scale: 1 },
    to: { opacity: 0, scale: 0.8, duration: 0.3, ease: 'power2.in' },
  },

  // Slide animations
  slideInLeft: {
    from: { x: '-100%' },
    to: { x: '0%', duration: 0.5, ease: 'power2.out' },
  },
  slideInRight: {
    from: { x: '100%' },
    to: { x: '0%', duration: 0.5, ease: 'power2.out' },
  },
  slideOutLeft: {
    from: { x: '0%' },
    to: { x: '-100%', duration: 0.3, ease: 'power2.in' },
  },
  slideOutRight: {
    from: { x: '0%' },
    to: { x: '100%', duration: 0.3, ease: 'power2.in' },
  },

  // Bounce animation
  bounce: {
    from: {},
    to: { y: -10, duration: 0.5, ease: 'power2.out', yoyo: true, repeat: 1 },
  },

  // Pulse animation
  pulse: {
    from: {},
    to: { scale: 1.05, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1 },
  },

  // Shake animation
  shake: {
    from: {},
    to: { x: -5, duration: 0.1, ease: 'power2.out', yoyo: true, repeat: 5 },
  },
};

// Animation utility functions
export class AnimationUtils {
  // Animate element with preset
  static animate(element: HTMLElement | string, preset: keyof typeof animationPresets, delay = 0) {
    const animation = animationPresets[preset];
    gsap.set(element, animation.from);
    return gsap.to(element, { ...animation.to, delay });
  }

  // Stagger animation for multiple elements
  static staggerAnimation(
    elements: HTMLElement[] | string,
    preset: keyof typeof animationPresets,
    stagger = 0.1
  ) {
    const animation = animationPresets[preset];
    gsap.set(elements, animation.from);
    return gsap.to(elements, { ...animation.to, stagger });
  }

  // Loading animation
  static createLoadingAnimation(element: HTMLElement | string) {
    return gsap.to(element, {
      rotation: 360,
      duration: 1,
      ease: 'none',
      repeat: -1,
    });
  }

  // Progress bar animation
  static animateProgressBar(element: HTMLElement | string, progress: number) {
    return gsap.to(element, {
      width: `${progress}%`,
      duration: 0.8,
      ease: 'power2.out',
    });
  }

  // Number counter animation
  static animateCounter(
    element: HTMLElement,
    from: number,
    to: number,
    duration = 1,
    formatter?: (value: number) => string
  ) {
    const obj = { value: from };
    return gsap.to(obj, {
      value: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        const value = Math.round(obj.value);
        element.textContent = formatter ? formatter(value) : value.toString();
      },
    });
  }

  // Page transition animations
  static pageTransitionIn(element: HTMLElement | string) {
    gsap.set(element, { opacity: 0, y: 20 });
    return gsap.to(element, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
    });
  }

  static pageTransitionOut(element: HTMLElement | string) {
    return gsap.to(element, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in',
    });
  }

  // Modal animations
  static modalIn(backdrop: HTMLElement | string, modal: HTMLElement | string) {
    const tl = gsap.timeline();
    
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(modal, { opacity: 0, scale: 0.8, y: 50 });
    
    tl.to(backdrop, { opacity: 1, duration: 0.3 })
      .to(modal, { 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        duration: 0.4, 
        ease: 'back.out(1.7)' 
      }, '-=0.1');
    
    return tl;
  }

  static modalOut(backdrop: HTMLElement | string, modal: HTMLElement | string) {
    const tl = gsap.timeline();
    
    tl.to(modal, { 
        opacity: 0, 
        scale: 0.8, 
        y: 50, 
        duration: 0.3, 
        ease: 'power2.in' 
      })
      .to(backdrop, { opacity: 0, duration: 0.2 }, '-=0.1');
    
    return tl;
  }

  // Card hover animations
  static cardHoverIn(element: HTMLElement | string) {
    return gsap.to(element, {
      y: -5,
      scale: 1.02,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  static cardHoverOut(element: HTMLElement | string) {
    return gsap.to(element, {
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  // Button click animation
  static buttonClick(element: HTMLElement | string) {
    return gsap.to(element, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    });
  }

  // Notification animations
  static notificationSlideIn(element: HTMLElement | string, from: 'top' | 'bottom' | 'left' | 'right' = 'top') {
    const fromProps: Record<string, any> = {
      top: { y: -100, opacity: 0 },
      bottom: { y: 100, opacity: 0 },
      left: { x: -100, opacity: 0 },
      right: { x: 100, opacity: 0 },
    };

    gsap.set(element, fromProps[from]);
    return gsap.to(element, {
      x: 0,
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'back.out(1.7)',
    });
  }

  // Kill all animations on element
  static killAnimations(element: HTMLElement | string) {
    gsap.killTweensOf(element);
  }

  // Create timeline
  static createTimeline(options?: gsap.TimelineVars) {
    return gsap.timeline(options);
  }
}

// React hook for animations
export function useGSAP() {
  return {
    animate: AnimationUtils.animate,
    stagger: AnimationUtils.staggerAnimation,
    timeline: AnimationUtils.createTimeline,
    kill: AnimationUtils.killAnimations,
    presets: animationPresets,
  };
}