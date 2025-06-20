'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { LinkIcon, ClipboardIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export default function URLShortenerPage() {
  const [url, setUrl] = useState('')
  const [customAlias, setCustomAlias] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, customAlias })
      })

      const data = await response.json()
      if (data.success) {
        setShortUrl(data.shortUrl)
      } else {
        alert(data.error || 'Failed to shorten URL')
      }
    } catch {
      alert('Error shortening URL')
    }

    setLoading(false)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 p-3 ring-4 ring-white/10 mb-6"
          >
            <LinkIcon className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            URL Shortener
          </h1>
          <p className="mt-4 text-lg text-purple-200">
            Create short, trackable links with detailed analytics
          </p>
        </div>

        {/* Main Tool */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 ring-1 ring-white/20"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-white mb-2">
                Enter your long URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/very-long-url"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="alias" className="block text-sm font-medium text-white mb-2">
                Custom alias (optional)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-white/20 bg-white/5 text-purple-200 text-sm">
                  yoursite.com/s/
                </span>
                <input
                  type="text"
                  id="alias"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  placeholder="my-custom-link"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-r-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !url}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-400 hover:to-cyan-400 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Shortening...' : 'Shorten URL'}
            </button>
          </form>

          {/* Result */}
          {shortUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Your shortened URL:</h3>
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={shortUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-3 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <ClipboardIcon className="h-5 w-5" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-purple-200">
                <span className="flex items-center gap-2">
                  <ChartBarIcon className="h-4 w-4" />
                  Click tracking enabled
                </span>
                <span>•</span>
                <span>Analytics available in dashboard</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-400 mb-4">
              <ChartBarIcon />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Detailed Analytics</h3>
            <p className="text-purple-200">Track clicks, locations, devices, and referrers</p>
          </div>
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-400 mb-4">
              <LinkIcon />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Custom Aliases</h3>
            <p className="text-purple-200">Create branded short links with custom names</p>
          </div>
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-400 mb-4">
              <ClipboardIcon />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">API Access</h3>
            <p className="text-purple-200">Integrate with your apps and automate link creation</p>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 px-6 py-3 text-yellow-400 ring-1 ring-yellow-400/30">
            <span className="font-semibold">
              💡 Upgrade to Pro for unlimited links, custom domains, and advanced analytics
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}