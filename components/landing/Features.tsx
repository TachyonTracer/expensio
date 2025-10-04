'use client'

import { 
  Scan, 
  Globe, 
  CheckCircle, 
  Shield, 
  BarChart3, 
  Smartphone,
  Clock,
  Users,
  CreditCard
} from 'lucide-react'
import { useEffect } from 'react'
import { animateSection, animateCards, setupFeatureHovers } from '@/lib/gsap-utils'

const features = [
  {
    icon: Scan,
    title: 'OCR Receipt Scanning',
    description: 'Automatically extract expense data from receipts using advanced OCR technology. No more manual data entry.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description: 'Handle expenses in any currency with real-time exchange rates and automatic conversion to your base currency.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: CheckCircle,
    title: 'Smart Approval Workflows',
    description: 'Configure flexible approval rules with percentage-based, specific approver, or hybrid approval workflows.',
    color: 'from-purple-500 to-violet-500'
  },
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description: 'Secure multi-tenant architecture with granular permissions for employees, managers, and administrators.',
    color: 'from-red-500 to-pink-500'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Get insights into spending patterns, approval times, and expense trends with comprehensive dashboards.',
    color: 'from-orange-500 to-yellow-500'
  },
  {
    icon: Smartphone,
    title: 'Mobile Responsive',
    description: 'Submit and approve expenses on the go with our fully responsive design optimized for all devices.',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    icon: Clock,
    title: 'Automated Workflows',
    description: 'Streamline your expense process with automated notifications, reminders, and status updates.',
    color: 'from-teal-500 to-green-500'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Enable seamless collaboration between employees, managers, and finance teams with transparent processes.',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: CreditCard,
    title: 'Expense Categories',
    description: 'Organize expenses with customizable categories and automatic categorization suggestions.',
    color: 'from-cyan-500 to-blue-500'
  }
]

export default function Features() {
  useEffect(() => {
    animateSection('#features .section-header')
    animateCards('.features-grid', 0.1)
    setupFeatureHovers()
  }, [])

  return (
    <section id="features" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="section-header text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Modern Teams</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to manage expenses efficiently, from submission to reimbursement, 
            with enterprise-grade security and compliance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="feature-card group relative p-6 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1"
            >
              {/* Icon */}
              <div className={`feature-icon inline-flex p-3 rounded-lg bg-gradient-to-r ${feature.color} mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="feature-content">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors"></div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Ready to transform your expense management?
          </p>
          <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg">
            Start Your Free Trial
          </button>
        </div>
      </div>
    </section>
  )
}