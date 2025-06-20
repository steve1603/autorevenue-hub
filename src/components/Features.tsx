'use client'

import { motion } from 'framer-motion'
import { 
  DocumentTextIcon, 
  WrenchScrewdriverIcon, 
  ShoppingBagIcon, 
  ServerIcon,
  ChartBarIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    name: 'AI Content Engine',
    description: 'Automatically generate high-quality blog posts, articles, and social media content that ranks well in search engines and generates ad revenue.',
    icon: DocumentTextIcon,
    revenue: '$500-2000/month',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'SaaS Tool Suite',
    description: 'Offer popular micro-tools like URL shorteners, QR generators, image compressors, and PDF utilities with subscription-based pricing.',
    icon: WrenchScrewdriverIcon,
    revenue: '$1000-5000/month',
    color: 'from-green-500 to-emerald-500'
  },
  {
    name: 'Affiliate Marketing',
    description: 'Automated product research, review generation, and affiliate link placement across multiple platforms and niches.',
    icon: ShoppingBagIcon,
    revenue: '$300-3000/month',
    color: 'from-purple-500 to-pink-500'
  },
  {
    name: 'Data API Services',
    description: 'Aggregate and resell valuable data feeds like stock prices, real estate info, weather data, and business intelligence.',
    icon: ServerIcon,
    revenue: '$500-4000/month',
    color: 'from-orange-500 to-red-500'
  },
  {
    name: 'Email Automation',
    description: 'Capture leads with valuable content, then nurture them with automated email sequences that convert to sales.',
    icon: EnvelopeIcon,
    revenue: '+50% conversion',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    name: 'Analytics & Optimization',
    description: 'Real-time performance tracking with AI-powered optimization suggestions to maximize revenue across all streams.',
    icon: ChartBarIcon,
    revenue: '+25% growth',
    color: 'from-yellow-500 to-orange-500'
  }
]

export default function Features() {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-yellow-400">Complete Automation</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            6 Revenue Streams, 1 Platform
          </p>
          <p className="mt-6 text-lg leading-8 text-purple-200">
            Each revenue stream is fully automated and optimized for maximum profitability. 
            Start with one, scale to all six.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div 
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col"
              >
                <dt className="text-base font-semibold leading-7 text-white">
                  <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-r ${feature.color}`}>
                    <feature.icon className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex items-center justify-between">
                    {feature.name}
                    <span className="text-sm font-medium text-yellow-400">
                      {feature.revenue}
                    </span>
                  </div>
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-purple-200">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>

        <div className="mt-20 text-center">
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-500/20 px-6 py-3 text-yellow-400 ring-1 ring-yellow-400/30">
            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
            <span className="font-semibold">Total Potential: $2,300-14,000+ per month</span>
          </div>
        </div>
      </div>
    </div>
  )
}


function CurrencyDollarIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}