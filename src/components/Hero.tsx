'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, CogIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function Hero() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Add email to waiting list
    alert('Thanks! We\'ll notify you when AutoRevenue Hub launches!')
    setEmail('')
  }

  return (
    <div className="relative px-6 lg:px-8">
      <div className="mx-auto max-w-3xl pt-20 pb-32 sm:pt-48 sm:pb-40">
        <div>
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-purple-200 ring-1 ring-purple-300/20 hover:ring-purple-300/30">
              🚀 Launch Special: First 100 users get lifetime 50% off{' '}
              <a href="#pricing" className="font-semibold text-white">
                <span className="absolute inset-0" aria-hidden="true" />
                View pricing <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl font-bold tracking-tight text-white sm:text-6xl"
            >
              <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-400 bg-clip-text text-transparent">
                AutoRevenue Hub
              </span>
              <br />
              Make Money While You Sleep
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-6 text-lg leading-8 text-purple-200"
            >
              The only platform you need to build multiple automated income streams. 
              Generate revenue from content, SaaS tools, affiliate marketing, and data APIs - all on autopilot.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-10 flex items-center justify-center gap-x-6"
            >
              <form onSubmit={handleSubmit} className="flex gap-4 w-full max-w-md">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all transform hover:scale-105"
                >
                  Get Early Access
                </button>
              </form>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3"
            >
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-yellow-400">
                  <CurrencyDollarIcon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Multiple Revenue Streams</h3>
                <p className="mt-2 text-purple-200">Content, SaaS, affiliates, and data APIs</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-yellow-400">
                  <CogIcon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">100% Automated</h3>
                <p className="mt-2 text-purple-200">Set it up once, earn forever</p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-yellow-400">
                  <ChartBarIcon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">Scale Infinitely</h3>
                <p className="mt-2 text-purple-200">AI-powered optimization and growth</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}