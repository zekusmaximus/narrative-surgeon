import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Narrative Surgeon - Chapter Reordering Editor',
  description: 'Professional manuscript editor for chapter reordering and consistency checking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-background text-foreground">
          {children}
        </div>
      </body>
    </html>
  )
}