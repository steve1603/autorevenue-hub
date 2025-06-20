'use client'

import { motion } from 'framer-motion'
import { LinkIcon, QrCodeIcon, PhotoIcon, DocumentIcon } from '@heroicons/react/24/outline'
import Navigation from '@/components/Navigation'

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12">
      <Navigation />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-400 bg-clip-text text-transparent">
              Free Tools
            </span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-purple-200">
            Professional tools for productivity and automation. Free to use, premium features available.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <ToolCard
            title="URL Shortener"
            description="Create short, trackable links with custom aliases and detailed analytics"
            icon={LinkIcon}
            href="/tools/url-shortener"
            color="from-blue-500 to-cyan-500"
          />
          <ToolCard
            title="QR Code Generator"
            description="Generate customizable QR codes for URLs, text, emails, and more"
            icon={QrCodeIcon}
            href="/tools/qr-generator"
            color="from-green-500 to-emerald-500"
          />
          <ToolCard
            title="Image Compressor"
            description="Compress images without losing quality. Support for JPEG, PNG, WebP"
            icon={PhotoIcon}
            href="/tools/image-compressor"
            color="from-purple-500 to-pink-500"
          />
          <ToolCard
            title="PDF Tools"
            description="Merge, split, compress, and convert PDF files with ease"
            icon={DocumentIcon}
            href="/tools/pdf-tools"
            color="from-orange-500 to-red-500"
          />
        </div>

        <div className="mt-20 text-center">
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 px-6 py-3 text-yellow-400 ring-1 ring-yellow-400/30">
            <span className="font-semibold">
              💡 Need unlimited usage? Upgrade to Pro for $9/month
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ToolCardProps {
  title: string
  description: string
  icon: React.ComponentType<React.ComponentProps<'svg'>>
  href: string
  color: string
}

function ToolCard({ title, description, icon: Icon, href, color }: ToolCardProps) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative rounded-3xl bg-white/5 p-8 ring-1 ring-white/20 hover:bg-white/10 transition-all"
    >
      <div className={`inline-flex rounded-lg bg-gradient-to-r ${color} p-3 ring-4 ring-white/10`}>
        <Icon className="h-6 w-6 text-white" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-xl font-semibold leading-7 text-white group-hover:text-yellow-400 transition-colors">
        {title}
      </h3>
      <p className="mt-2 text-base leading-7 text-purple-200">
        {description}
      </p>
      <div className="mt-4 flex items-center text-sm font-medium text-yellow-400">
        Use tool
        <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.a>
  )
}