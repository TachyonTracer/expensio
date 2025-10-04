'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimationUtils } from '@/lib/utils/animations';
import { cn } from '@/lib/utils';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
  className?: string;
  transitionType?: 'fade' | 'slide' | 'scale' | 'none';
}

export function PageTransitionWrapper({
  children,
  className,
  transitionType = 'fade',
}: PageTransitionWrapperProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (!containerRef.current || transitionType === 'none') return;

    // Only animate if pathname actually changed
    if (prevPathname.current !== pathname) {
      setIsTransitioning(true);

      // Animate in
      const animateIn = () => {
        switch (transitionType) {
          case 'slide':
            return AnimationUtils.animate(containerRef.current!, 'fadeInRight');
          case 'scale':
            return AnimationUtils.animate(containerRef.current!, 'scaleIn');
          default:
            return AnimationUtils.animate(containerRef.current!, 'fadeIn');
        }
      };

      const animation = animateIn();
      animation.then(() => {
        setIsTransitioning(false);
      });

      prevPathname.current = pathname;
    }
  }, [pathname, transitionType]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'transition-container',
        isTransitioning && 'pointer-events-none',
        className
      )}
    >
      {children}
    </div>
  );
}

// Route transition overlay
interface RouteTransitionOverlayProps {
  isTransitioning: boolean;
  type?: 'slide' | 'fade' | 'curtain';
}

export function RouteTransitionOverlay({
  isTransitioning,
  type = 'fade',
}: RouteTransitionOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overlayRef.current) return;

    if (isTransitioning) {
      switch (type) {
        case 'slide':
          AnimationUtils.animate(overlayRef.current, 'slideInRight');
          break;
        case 'curtain':
          AnimationUtils.animate(overlayRef.current, 'scaleIn');
          break;
        default:
          AnimationUtils.animate(overlayRef.current, 'fadeIn');
      }
    } else {
      AnimationUtils.animate(overlayRef.current, 'fadeOut');
    }
  }, [isTransitioning, type]);

  if (!isTransitioning) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 bg-background',
        type === 'curtain' && 'bg-gradient-to-br from-primary/20 to-secondary/20'
      )}
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  );
}

// Micro-interactions for buttons and cards
export function useMicroInteractions() {
  const addHoverEffect = (element: HTMLElement) => {
    const handleMouseEnter = () => {
      AnimationUtils.animate(element, 'pulse');
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    return () => element.removeEventListener('mouseenter', handleMouseEnter);
  };

  const addClickEffect = (element: HTMLElement) => {
    const handleClick = () => {
      AnimationUtils.buttonClick(element);
    };

    element.addEventListener('click', handleClick);
    return () => element.removeEventListener('click', handleClick);
  };

  const addFocusEffect = (element: HTMLElement) => {
    const handleFocus = () => {
      AnimationUtils.animate(element, 'scaleIn');
    };

    const handleBlur = () => {
      AnimationUtils.animate(element, 'scaleOut');
    };

    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);
    
    return () => {
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  };

  return {
    addHoverEffect,
    addClickEffect,
    addFocusEffect,
  };
}

// Scroll-triggered animations
interface ScrollAnimationProps {
  children: React.ReactNode;
  animation?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn';
  threshold?: number;
  className?: string;
}

export function ScrollAnimation({
  children,
  animation = 'fadeInUp',
  threshold = 0.1,
  className,
}: ScrollAnimationProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            AnimationUtils.animate(element, animation);
            setHasAnimated(true);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [animation, threshold, hasAnimated]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}

// Staggered list animation
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  animation?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight';
  className?: string;
}

export function StaggeredList({
  children,
  staggerDelay = 0.1,
  animation = 'fadeInUp',
  className,
}: StaggeredListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;

    const childElements = Array.from(listRef.current.children) as HTMLElement[];
    AnimationUtils.staggerAnimation(childElements, animation, staggerDelay);
  }, [animation, staggerDelay]);

  return (
    <div ref={listRef} className={className}>
      {children}
    </div>
  );
}

// Loading state with skeleton animation
interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  showAvatar?: boolean;
}

export function SkeletonLoader({
  lines = 3,
  className,
  showAvatar = false,
}: SkeletonLoaderProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-muted rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-1/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-4 bg-muted rounded',
              index === lines - 1 ? 'w-2/3' : 'w-full'
            )}
          />
        ))}
      </div>
    </div>
  );
}