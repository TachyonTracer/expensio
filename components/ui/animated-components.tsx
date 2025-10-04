'use client';

import React, { useEffect, useRef, forwardRef } from 'react';
import { AnimationUtils, animationPresets } from '@/lib/utils/animations';
import { cn } from '@/lib/utils';

// Animated container that fades in children
interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  animation?: keyof typeof animationPresets;
  delay?: number;
  stagger?: boolean;
  staggerDelay?: number;
}

export function AnimatedContainer({
  children,
  className,
  animation = 'fadeInUp',
  delay = 0,
  stagger = false,
  staggerDelay = 0.1,
}: AnimatedContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const childElements = Array.from(containerRef.current.children) as HTMLElement[];
    
    if (stagger && childElements.length > 1) {
      AnimationUtils.staggerAnimation(childElements, animation, staggerDelay);
    } else {
      childElements.forEach((child, index) => {
        AnimationUtils.animate(child, animation, delay + (stagger ? index * staggerDelay : 0));
      });
    }
  }, [animation, delay, stagger, staggerDelay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Animated card with hover effects
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  clickEffect?: boolean;
  onClick?: () => void;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, hoverEffect = true, clickEffect = true, onClick }, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const element = cardRef.current;
      if (!element || !hoverEffect) return;

      const handleMouseEnter = () => AnimationUtils.cardHoverIn(element);
      const handleMouseLeave = () => AnimationUtils.cardHoverOut(element);

      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    }, [hoverEffect]);

    const handleClick = () => {
      if (clickEffect && cardRef.current) {
        AnimationUtils.buttonClick(cardRef.current);
      }
      onClick?.();
    };

    return (
      <div
        ref={ref || cardRef}
        className={cn(
          'bg-card rounded-lg border border-border shadow-sm p-6 cursor-pointer',
          className
        )}
        onClick={handleClick}
      >
        {children}
      </div>
    );
  }
);

AnimatedCard.displayName = 'AnimatedCard';

// Loading spinner with GSAP animation
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const spinnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!spinnerRef.current) return;

    const animation = AnimationUtils.createLoadingAnimation(spinnerRef.current);
    
    return () => {
      animation.kill();
    };
  }, []);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      ref={spinnerRef}
      className={cn(
        'border-2 border-primary border-t-transparent rounded-full',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Animated progress bar
interface AnimatedProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export function AnimatedProgressBar({
  progress,
  className,
  showLabel = false,
  animated = true,
}: AnimatedProgressBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const prevProgress = useRef(0);

  useEffect(() => {
    if (!progressRef.current || !animated) return;

    AnimationUtils.animateProgressBar(progressRef.current, progress);
    prevProgress.current = progress;
  }, [progress, animated]);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          ref={progressRef}
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: animated ? '0%' : `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Animated counter
interface AnimatedCounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedCounter({
  from = 0,
  to,
  duration = 1,
  className,
  formatter,
}: AnimatedCounterProps) {
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!counterRef.current) return;

    AnimationUtils.animateCounter(counterRef.current, from, to, duration, formatter);
  }, [from, to, duration, formatter]);

  return (
    <span ref={counterRef} className={className}>
      {formatter ? formatter(from) : from}
    </span>
  );
}

// Animated notification
interface AnimatedNotificationProps {
  children: React.ReactNode;
  isVisible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onAnimationComplete?: () => void;
}

export function AnimatedNotification({
  children,
  isVisible,
  position = 'top',
  className,
  onAnimationComplete,
}: AnimatedNotificationProps) {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notificationRef.current) return;

    if (isVisible) {
      const animation = AnimationUtils.notificationSlideIn(notificationRef.current, position);
      animation.then(() => onAnimationComplete?.());
    }
  }, [isVisible, position, onAnimationComplete]);

  if (!isVisible) return null;

  return (
    <div
      ref={notificationRef}
      className={cn(
        'fixed z-50 p-4 bg-card border border-border rounded-lg shadow-lg',
        position === 'top' && 'top-4 left-1/2 transform -translate-x-1/2',
        position === 'bottom' && 'bottom-4 left-1/2 transform -translate-x-1/2',
        position === 'left' && 'left-4 top-1/2 transform -translate-y-1/2',
        position === 'right' && 'right-4 top-1/2 transform -translate-y-1/2',
        className
      )}
    >
      {children}
    </div>
  );
}

// Animated modal backdrop
interface AnimatedModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function AnimatedModal({ children, isOpen, onClose, className }: AnimatedModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!backdropRef.current || !modalRef.current) return;

    if (isOpen) {
      AnimationUtils.modalIn(backdropRef.current, modalRef.current);
    }
  }, [isOpen]);

  const handleClose = async () => {
    if (!backdropRef.current || !modalRef.current) return;

    await AnimationUtils.modalOut(backdropRef.current, modalRef.current);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          ref={modalRef}
          className={cn(
            'bg-card rounded-lg border border-border shadow-xl max-w-md w-full p-6',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pageRef.current) return;

    AnimationUtils.pageTransitionIn(pageRef.current);
  }, []);

  return (
    <div ref={pageRef} className={className}>
      {children}
    </div>
  );
}