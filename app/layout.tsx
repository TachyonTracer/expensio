import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import Analytics from "@/components/Analytics";
import ResponsiveTest from "@/components/ResponsiveTest";
import { BreadcrumbProvider } from "@/lib/hooks/use-breadcrumb";
import { AnimationProvider } from "@/lib/hooks/use-animation-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expensio - Smart Expense Management System",
  description: "Streamline your expense management with automated workflows, OCR receipt scanning, multi-currency support, and intelligent approval systems. Transform your business expense processes today.",
  keywords: "expense management, receipt scanning, OCR, multi-currency, approval workflow, business expenses, reimbursement, financial management",
  authors: [{ name: "Expensio Team" }],
  creator: "Expensio",
  publisher: "Expensio",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Expensio - Smart Expense Management System",
    description: "Streamline your expense management with automated workflows, OCR receipt scanning, multi-currency support, and intelligent approval systems.",
    url: '/',
    siteName: 'Expensio',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Expensio - Smart Expense Management System',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Expensio - Smart Expense Management System",
    description: "Streamline your expense management with automated workflows, OCR receipt scanning, multi-currency support, and intelligent approval systems.",
    images: ['/og-image.png'],
    creator: '@expensio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.exchangerate-api.com" />
        <link rel="dns-prefetch" href="https://restcountries.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Analytics />
        <PerformanceMonitor />
        <ThemeProvider
          defaultTheme="system"
          storageKey="expensio-theme"
        >
          <AnimationProvider>
            <BreadcrumbProvider>
              {children}
            </BreadcrumbProvider>
          </AnimationProvider>
        </ThemeProvider>
        <ResponsiveTest />
      </body>
    </html>
  );
}
