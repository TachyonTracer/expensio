'use client'

import { Star, Quote } from 'lucide-react'
import { useEffect } from 'react'
import { animateSection, animateTestimonials, animateStats } from '@/lib/gsap-utils'

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Finance Director',
    company: 'TechCorp Inc.',
    image: '/api/placeholder/64/64',
    rating: 5,
    content: 'Expensio has transformed our expense management process. The OCR feature alone saves us hours every week, and the approval workflows are incredibly flexible.'
  },
  {
    name: 'Michael Chen',
    role: 'Operations Manager',
    company: 'Global Solutions Ltd.',
    image: '/api/placeholder/64/64',
    rating: 5,
    content: 'The multi-currency support is a game-changer for our international team. Real-time conversion rates and transparent approval processes have made everything so much smoother.'
  },
  {
    name: 'Emily Rodriguez',
    role: 'HR Manager',
    company: 'StartupXYZ',
    image: '/api/placeholder/64/64',
    rating: 5,
    content: 'Our employees love how easy it is to submit expenses now. The mobile interface is intuitive, and the automated notifications keep everyone in the loop.'
  },
  {
    name: 'David Thompson',
    role: 'CFO',
    company: 'Enterprise Corp',
    image: '/api/placeholder/64/64',
    rating: 5,
    content: 'The analytics and reporting features give us incredible insights into our spending patterns. The ROI was evident within the first month of implementation.'
  },
  {
    name: 'Lisa Wang',
    role: 'Project Manager',
    company: 'Creative Agency',
    image: '/api/placeholder/64/64',
    rating: 5,
    content: 'Setting up approval rules was so straightforward. We can now handle complex approval scenarios that used to require manual intervention.'
  },
  {
    name: 'James Miller',
    role: 'Sales Director',
    company: 'SalesForce Pro',
    image: '/api/placeholder/64/64',
    rating: 5,
    content: 'The transparency in the approval process has eliminated so many back-and-forth emails. Everyone knows exactly where their expense stands in the workflow.'
  }
]

export default function Testimonials() {
  useEffect(() => {
    animateSection('#testimonials .section-header')
    animateTestimonials()
    animateStats()
  }, [])

  return (
    <section id="testimonials" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="section-header text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            What Our
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Customers Say</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Join thousands of satisfied customers who have transformed their expense management with Expensio.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="testimonials-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="testimonial-card group relative p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote className="w-8 h-8 text-blue-600" />
              </div>

              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>

              {/* Hover Border */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors"></div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="stat-number text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                4.9/5
              </div>
              <div className="text-gray-600 dark:text-gray-300">Average Rating</div>
            </div>
            <div>
              <div className="stat-number text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                1,200+
              </div>
              <div className="text-gray-600 dark:text-gray-300">Happy Customers</div>
            </div>
            <div>
              <div className="stat-number text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                98%
              </div>
              <div className="text-gray-600 dark:text-gray-300">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}