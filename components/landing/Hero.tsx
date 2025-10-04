'use client'

import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { useEffect } from 'react'
import { animateHero } from '@/lib/gsap-utils'

export default function Hero() {
  useEffect(() => {
    animateHero()
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5 parallax-element"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Smart Expense Management Platform
          </div>

          {/* Main Headline */}
          <h1 className="hero-headline text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Streamline Your
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Expense Management</span>
            <br />
            with AI-Powered Automation
          </h1>

          {/* Subtext */}
          <p className="hero-subtext text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Transform your expense reporting with OCR receipt scanning, multi-level approvals, 
            real-time currency conversion, and intelligent workflow automation. 
            Built for modern teams who value efficiency and transparency.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link 
              href="/auth/signup"
              className="hero-cta animated-button group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <button className="hero-cta animated-button group inline-flex items-center px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300">
              <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              Watch Demo
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="hero-trust flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              No credit card required
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              14-day free trial
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Setup in 5 minutes
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="hero-float-1 absolute top-20 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800 rounded-full opacity-20"></div>
      <div className="hero-float-2 absolute bottom-20 right-10 w-16 h-16 bg-purple-200 dark:bg-purple-800 rounded-full opacity-20"></div>
      <div className="hero-float-3 absolute top-1/2 left-20 w-12 h-12 bg-green-200 dark:bg-green-800 rounded-full opacity-20"></div>
    </section>
  )
}