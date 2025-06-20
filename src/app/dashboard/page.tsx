'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CurrencyDollarIcon, 
  DocumentTextIcon,
  WrenchScrewdriverIcon,
  ShoppingBagIcon,
  ServerIcon
} from '@heroicons/react/24/outline'

interface RevenueData {
  stream: string
  amount: number
  change: number
  icon: React.ComponentType<React.ComponentProps<'svg'>>
  color: string
}

export default function Dashboard() {
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])

  useEffect(() => {
    // Simulate real-time revenue data
    const simulateRevenue = () => {
      const baseData: RevenueData[] = [
        {
          stream: 'Content Monetization',
          amount: Math.floor(Math.random() * 1000) + 800,
          change: Math.floor(Math.random() * 20) - 10,
          icon: DocumentTextIcon,
          color: 'from-blue-500 to-cyan-500'
        },
        {
          stream: 'SaaS Tools',
          amount: Math.floor(Math.random() * 2000) + 1500,
          change: Math.floor(Math.random() * 25) - 5,
          icon: WrenchScrewdriverIcon,
          color: 'from-green-500 to-emerald-500'
        },
        {
          stream: 'Affiliate Marketing',
          amount: Math.floor(Math.random() * 800) + 400,
          change: Math.floor(Math.random() * 30) - 10,
          icon: ShoppingBagIcon,
          color: 'from-purple-500 to-pink-500'
        },
        {
          stream: 'Data APIs',
          amount: Math.floor(Math.random() * 1200) + 600,
          change: Math.floor(Math.random() * 20) - 5,
          icon: ServerIcon,
          color: 'from-orange-500 to-red-500'
        }
      ]
      
      setRevenueData(baseData)
      setTotalRevenue(baseData.reduce((sum, item) => sum + item.amount, 0))
    }

    simulateRevenue()
    const interval = setInterval(simulateRevenue, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Revenue Dashboard</h1>
          <p className="mt-2 text-purple-200">Real-time monitoring of all automated income streams</p>
        </div>

        {/* Total Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-3xl bg-gradient-to-r from-yellow-400/20 to-orange-500/20 p-8 ring-1 ring-yellow-400/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">Total Monthly Revenue</h2>
              <p className="text-4xl font-bold text-yellow-400">{formatCurrency(totalRevenue)}</p>
              <p className="mt-1 text-sm text-purple-200">+12.5% from last month</p>
            </div>
            <div className="text-yellow-400">
              <CurrencyDollarIcon className="h-16 w-16" />
            </div>
          </div>
        </motion.div>

        {/* Revenue Streams Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {revenueData.map((stream, index) => (
            <motion.div
              key={stream.stream}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/20 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`rounded-lg bg-gradient-to-r ${stream.color} p-2`}>
                  <stream.icon className="h-6 w-6 text-white" />
                </div>
                <span className={`text-sm font-medium ${
                  stream.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stream.change >= 0 ? '+' : ''}{stream.change}%
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{stream.stream}</h3>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stream.amount)}</p>
              <p className="text-sm text-purple-200">This month</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8"
        >
          <QuickActionCard
            title="Generate Content"
            description="Create new blog posts and articles"
            action="Generate Now"
            color="from-blue-500 to-cyan-500"
          />
          <QuickActionCard
            title="Check Analytics"
            description="View detailed performance metrics"
            action="View Analytics"
            color="from-green-500 to-emerald-500"
          />
          <QuickActionCard
            title="Optimize Campaigns"
            description="AI-powered optimization suggestions"
            action="Optimize"
            color="from-purple-500 to-pink-500"
          />
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/20 backdrop-blur-sm"
        >
          <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            <ActivityItem
              action="Content published"
              description="'5 Ways to Boost Productivity' went live"
              time="2 minutes ago"
              revenue="+$23"
            />
            <ActivityItem
              action="URL shortened"
              description="New short link created and shared"
              time="5 minutes ago"
              revenue="+$2"
            />
            <ActivityItem
              action="Affiliate commission"
              description="Product review generated sale"
              time="12 minutes ago"
              revenue="+$45"
            />
            <ActivityItem
              action="API call"
              description="Data service request processed"
              time="18 minutes ago"
              revenue="+$8"
            />
          </div>
        </motion.div>

        {/* Live Revenue Counter */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-green-400/20 to-emerald-500/20 px-6 py-3 text-green-400 ring-1 ring-green-400/30">
            <div className="mr-2 h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="font-semibold">
              Revenue updating in real-time • Next update in 5s
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  action: string
  color: string
}

function QuickActionCard({ title, description, action, color }: QuickActionCardProps) {
  return (
    <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/20 backdrop-blur-sm">
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-purple-200 text-sm mb-4">{description}</p>
      <button className={`w-full py-2 px-4 bg-gradient-to-r ${color} text-white font-medium rounded-lg hover:opacity-90 transition-opacity`}>
        {action}
      </button>
    </div>
  )
}

interface ActivityItemProps {
  action: string
  description: string
  time: string
  revenue: string
}

function ActivityItem({ action, description, time, revenue }: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
      <div>
        <p className="text-white font-medium">{action}</p>
        <p className="text-purple-200 text-sm">{description}</p>
      </div>
      <div className="text-right">
        <p className="text-green-400 font-medium">{revenue}</p>
        <p className="text-purple-300 text-sm">{time}</p>
      </div>
    </div>
  )
}