'use client'

import { CheckCircle, Target, Users, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { animateSection, animateCards, animateStats, setupParallax } from '@/lib/gsap-utils'

const stats = [
  { number: '10,000+', label: 'Expenses Processed' },
  { number: '500+', label: 'Companies Trust Us' },
  { number: '99.9%', label: 'Uptime Guarantee' },
  { number: '24/7', label: 'Customer Support' }
]

const values = [
  {
    icon: Target,
    title: 'Accuracy First',
    description: 'Our OCR technology and validation systems ensure 99.5% accuracy in expense data extraction.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Process expenses 10x faster than traditional methods with automated workflows and smart routing.'
  },
  {
    icon: Users,
    title: 'Team Focused',
    description: 'Built for collaboration with transparent approval processes and real-time status updates.'
  },
  {
    icon: CheckCircle,
    title: 'Compliance Ready',
    description: 'Meet regulatory requirements with audit trails, data retention policies, and security controls.'
  }
]

export default function About() {
  useEffect(() => {
    animateSection('#about .about-content')
    animateSection('#about .about-image')
    animateStats()
    animateCards('.values-grid', 0.15)
    setupParallax()
  }, [])

  return (
    <section id="about" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Left Content */}
          <div className="about-content">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              About
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Expensio</span>
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Expensio was born from the frustration of dealing with outdated expense management systems. 
              We believe that managing expenses should be simple, transparent, and efficient for everyone involved.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Our platform combines cutting-edge technology with intuitive design to create an expense management 
              solution that actually works for modern businesses. From startups to enterprises, we help teams 
              focus on what matters most - growing their business.
            </p>

            {/* Key Benefits */}
            <div className="space-y-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Reduce expense processing time by 80%</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Eliminate manual data entry errors</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Improve compliance and audit readiness</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">Enhance employee satisfaction</span>
              </div>
            </div>
          </div>

          {/* Right Content - Image Placeholder */}
          <div className="about-image relative">
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Smart Automation</h3>
                <p className="text-gray-600 dark:text-gray-300">Powered by AI & Machine Learning</p>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="parallax-element absolute -top-4 -right-4 w-20 h-20 bg-blue-200 dark:bg-blue-700 rounded-full opacity-20"></div>
            <div className="parallax-element absolute -bottom-4 -left-4 w-16 h-16 bg-purple-200 dark:bg-purple-700 rounded-full opacity-20"></div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-grid grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="stat-number text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 dark:text-gray-300 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Values Section */}
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Our Core Values
          </h3>
          <div className="values-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center group">
                <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {value.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}