import { Plus_Jakarta_Sans } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import Header from "@/components/landing/header"

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn(jakarta.variable)}>
      <body style={{ fontFamily: 'var(--font-sans), sans-serif', background: '#FFFFFF', color: '#09090B', margin: 0 }}>
        <Header />
        <div style={{ paddingTop: '60px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
