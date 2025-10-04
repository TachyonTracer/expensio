# GSAP Animation Implementation

This document describes the GSAP (GreenSock Animation Platform) integration implemented for the Expensio landing page.

## Overview

The implementation includes advanced motion effects, scroll-triggered animations, staggered animations, parallax effects, and performance optimizations for both desktop and mobile devices with full dark mode compatibility.

## Features Implemented

### 1. Hero Section Animations
- **Fade-in and slide-up animations** for hero text and CTA buttons
- **Staggered animations** for multiple elements (badge → headline → subtext → CTAs → trust indicators)
- **Continuous floating animations** for background decorative elements
- **Scale and rotation effects** on interactive elements

### 2. Scroll-Triggered Animations
- **ScrollTrigger integration** for all sections
- **Fade-in animations** triggered when sections enter viewport
- **Staggered card animations** for feature cards and testimonials
- **Stats counter animations** with number counting effects

### 3. Interactive Hover Effects
- **Feature card hover animations** with icon scaling and content lifting
- **Button hover effects** with scale transformations
- **Testimonial card interactions** with subtle 3D rotations

### 4. Parallax Effects
- **Background element parallax** for depth perception
- **Floating decorative elements** with continuous motion
- **Performance-optimized parallax** using GSAP's scrub feature

### 5. Form Animations
- **Staggered form field animations** on scroll
- **Input focus effects** with smooth transitions
- **Submit button animations** with loading states

## File Structure

```
expensio/
├── lib/
│   └── gsap-utils.ts          # Core GSAP animation utilities
├── hooks/
│   └── useGSAP.ts             # React hooks for GSAP integration
├── components/landing/
│   ├── AnimationController.tsx # Global animation initialization
│   ├── Hero.tsx               # Hero section with animations
│   ├── Features.tsx           # Feature cards with stagger effects
│   ├── About.tsx              # About section with stats animation
│   ├── Testimonials.tsx       # Testimonial cards with 3D effects
│   └── Contact.tsx            # Contact form with staggered inputs
├── app/
│   ├── globals.css            # Animation-specific CSS optimizations
│   └── page.tsx               # Main landing page with AnimationController
└── docs/
    └── GSAP_ANIMATIONS.md     # This documentation file
```

## Key Animation Functions

### Core Animations (`lib/gsap-utils.ts`)

#### `animateHero()`
- Orchestrates the hero section entrance animation
- Uses timeline for sequential animation control
- Includes continuous floating animations for background elements

#### `animateSection(selector)`
- Generic section fade-in animation
- Uses ScrollTrigger for viewport-based triggering
- Configurable timing and easing

#### `animateCards(selector, staggerAmount)`
- Staggered card animations with scale and fade effects
- Customizable stagger timing
- 3D transform effects for depth

#### `animateStats()`
- Animated number counting for statistics
- Supports different number formats (percentages, thousands, etc.)
- ScrollTrigger-based activation

#### `setupParallax()`
- Parallax effects for background elements
- Performance-optimized with GSAP's scrub feature
- Responsive to scroll position

### Performance Optimizations

#### Mobile Optimizations
- Reduced animation complexity on mobile devices
- Faster animation speeds for better performance
- Conditional heavy animation disabling

#### Dark Mode Support
- Smooth transitions between light and dark themes
- Adjusted opacity and brightness for dark mode elements
- CSS custom properties for theme-aware animations

#### Accessibility
- Respects `prefers-reduced-motion` setting
- High contrast mode support
- Focus-visible states for keyboard navigation

## Usage Examples

### Basic Section Animation
```typescript
import { animateSection } from '@/lib/gsap-utils'

useEffect(() => {
  animateSection('#my-section')
}, [])
```

### Staggered Card Animation
```typescript
import { animateCards } from '@/lib/gsap-utils'

useEffect(() => {
  animateCards('.card-container', 0.1)
}, [])
```

### Custom Hook Usage
```typescript
import { useGSAP } from '@/hooks/useGSAP'

const MyComponent = () => {
  useGSAP(() => {
    gsap.from('.my-element', {
      opacity: 0,
      y: 50,
      duration: 0.8
    })
  }, [])
}
```

## CSS Classes for Animation

### Animation State Classes
- `.gsap-element` - Base class for animated elements
- `.fade-in` - Initial state for fade-in animations
- `.slide-up` - Initial state for slide-up animations
- `.scale-in` - Initial state for scale animations
- `.rotate-in` - Initial state for rotation animations

### Performance Classes
- `.parallax-element` - Elements with parallax effects
- `.animated-button` - Interactive buttons with hover effects
- `.mobile-optimized` - Mobile-specific optimizations

### Component-Specific Classes
- `.hero-badge`, `.hero-headline`, `.hero-subtext`, `.hero-cta`, `.hero-trust` - Hero section elements
- `.feature-card`, `.feature-icon`, `.feature-content` - Feature card components
- `.testimonial-card` - Testimonial components
- `.form-element` - Form input elements
- `.stat-number` - Animated statistics

## Browser Support

- **Modern browsers** with ES6+ support
- **Chrome 60+**, **Firefox 55+**, **Safari 12+**, **Edge 79+**
- **Mobile browsers** with optimized performance
- **Fallback support** for older browsers (animations disabled gracefully)

## Performance Considerations

### Optimization Techniques
1. **Hardware acceleration** using `transform3d()` and `will-change`
2. **Intersection Observer** for efficient scroll detection
3. **Animation preloading** to prevent layout shifts
4. **Responsive adjustments** based on screen size
5. **Memory cleanup** with proper GSAP context management

### Best Practices Implemented
- Use of GSAP Context for automatic cleanup
- ScrollTrigger refresh for dynamic content
- Reduced motion support for accessibility
- Efficient DOM querying with `gsap.utils.toArray()`
- Timeline-based animations for better control

## Customization

### Animation Timing
Modify `animationConfig` in `gsap-utils.ts`:
```typescript
export const animationConfig = {
  duration: 0.8,        // Animation duration
  ease: 'power2.out',   // Easing function
  stagger: 0.1,         // Stagger delay
  scrollTrigger: {      // ScrollTrigger settings
    start: 'top 80%',
    end: 'bottom 20%',
    toggleActions: 'play none none reverse'
  }
}
```

### Adding New Animations
1. Create animation function in `gsap-utils.ts`
2. Add CSS classes if needed in `globals.css`
3. Import and use in component with `useEffect`
4. Add cleanup in component unmount

## Troubleshooting

### Common Issues
1. **Animations not triggering**: Check ScrollTrigger refresh timing
2. **Performance issues**: Verify mobile optimizations are active
3. **Dark mode glitches**: Ensure CSS transitions are properly set
4. **Memory leaks**: Confirm GSAP context cleanup in useEffect

### Debug Mode
Enable animation debugging by adding the `debug-animations` class to the body element.

## Future Enhancements

### Planned Features
- **Magnetic cursor effects** for interactive elements
- **Page transition animations** between routes
- **Loading screen animations** with progress indicators
- **Advanced particle systems** for background effects
- **Gesture-based animations** for mobile interactions

### Performance Improvements
- **Web Workers** for complex calculations
- **Canvas-based animations** for heavy effects
- **Intersection Observer v2** for better performance
- **Animation frame optimization** for 120fps displays