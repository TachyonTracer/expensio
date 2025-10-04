'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { gsap } from 'gsap';

interface AnimationContextType {
  isReducedMotion: boolean;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  globalSpeed: number;
  setGlobalSpeed: (speed: number) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

interface AnimationProviderProps {
  children: ReactNode;
}

export function AnimationProvider({ children }: AnimationProviderProps) {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [globalSpeed, setGlobalSpeed] = useState(1);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update GSAP global settings based on preferences
  useEffect(() => {
    if (isReducedMotion || !animationsEnabled) {
      gsap.globalTimeline.timeScale(0.01); // Nearly instant animations
    } else {
      gsap.globalTimeline.timeScale(globalSpeed);
    }
  }, [isReducedMotion, animationsEnabled, globalSpeed]);

  // Disable animations if reduced motion is preferred
  useEffect(() => {
    if (isReducedMotion) {
      setAnimationsEnabled(false);
    }
  }, [isReducedMotion]);

  return (
    <AnimationContext.Provider
      value={{
        isReducedMotion,
        animationsEnabled,
        setAnimationsEnabled,
        globalSpeed,
        setGlobalSpeed,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimationContext() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimationContext must be used within an AnimationProvider');
  }
  return context;
}

// Hook for conditional animations
export function useConditionalAnimation() {
  const { animationsEnabled, isReducedMotion } = useAnimationContext();

  const shouldAnimate = animationsEnabled && !isReducedMotion;

  const conditionalAnimate = (
    element: HTMLElement | string,
    animation: any,
    fallback?: () => void
  ) => {
    if (shouldAnimate) {
      return gsap.to(element, animation);
    } else {
      fallback?.();
      return gsap.set(element, animation);
    }
  };

  return {
    shouldAnimate,
    conditionalAnimate,
  };
}

// Performance monitoring for animations
export function useAnimationPerformance() {
  const [fps, setFps] = useState(60);
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const currentFPS = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setFps(currentFPS);
        setIsLowPerformance(currentFPS < 30);
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Automatically reduce animation quality on low performance
  useEffect(() => {
    if (isLowPerformance) {
      gsap.globalTimeline.timeScale(0.5); // Slow down animations
    }
  }, [isLowPerformance]);

  return {
    fps,
    isLowPerformance,
  };
}