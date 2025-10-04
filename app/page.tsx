import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import About from '@/components/landing/About'
import Testimonials from '@/components/landing/Testimonials'
import Contact from '@/components/landing/Contact'
import AnimationController from '@/components/landing/AnimationController'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Expensio - Smart Expense Management System | Automate Your Business Expenses",
  description: "Transform your expense management with Expensio's intelligent automation, OCR receipt scanning, multi-currency support, and customizable approval workflows. Start your free 14-day trial today.",
  openGraph: {
    title: "Expensio - Smart Expense Management System",
    description: "Transform your expense management with intelligent automation, OCR receipt scanning, and customizable approval workflows.",
    images: ['/og-image.png'],
  },
  twitter: {
    title: "Expensio - Smart Expense Management System",
    description: "Transform your expense management with intelligent automation, OCR receipt scanning, and customizable approval workflows.",
    images: ['/og-image.png'],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Expensio",
  "description": "Smart expense management system with automated workflows, OCR receipt scanning, and multi-currency support",
  "url": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "description": "Free 14-day trial"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "150"
  },
  "featureList": [
    "OCR Receipt Scanning",
    "Multi-Currency Support",
    "Automated Approval Workflows",
    "Real-time Currency Conversion",
    "Role-based Access Control",
    "Mobile Responsive Design"
  ]
}

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="min-h-screen">
        <AnimationController />
        <Hero />
        <Features />
        <About />
        <Testimonials />
        <Contact />
      </main>
    </>
  )
}