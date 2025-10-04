import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
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
  title: "Expensio - Expense Management System",
  description: "Modern expense management and approval system for businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
