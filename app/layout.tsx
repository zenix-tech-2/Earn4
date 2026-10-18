import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'EARNIZI — Your digital needs, our priority',
  description: 'Digital products, everyday essentials, virtual numbers and video rewards in one place.',
  applicationName: 'EARNIZI',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/earnizi.svg',
    apple: '/icons/earnizi.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2354f4',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
