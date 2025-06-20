'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

const plans = [
  {
    name: 'Starter',
    price: { monthly: 47, yearly: 470 },
    description: 'Perfect for beginners starting their first automated income stream',
    features: [
      'AI Content Engine (10 articles/month)',
      '2 SaaS Tools (URL shortener + QR generator)',
      'Basic affiliate marketing automation',
      'Email automation (1,000 subscribers)',
      'Revenue analytics dashboard',
      'Standard support'
    ],
    limitations: [
      'No data API access',
      'Limited to 2 revenue streams',
      'Basic customization only'
    ],
    cta: 'Start Earning',
    popular: false
  },
  {
    name: 'Professional',
    price: { monthly: 97, yearly: 970 },
    description: 'Complete automation suite for serious income generation',
    features: [
      'AI Content Engine (50 articles/month)',
      'Full SaaS Tool Suite (6 tools)',
      'Advanced affiliate marketing with product research',
      'Data API services (3 endpoints)',
      'Email automation (10,000 subscribers)',
      'Advanced analytics & optimization',
      'Priority support',
      'Custom branding',
      'SEO optimization tools'
    ],
    limitations: [],
    cta: 'Scale to $10K/month',
    popular: true
  },
  {
    name: 'Enterprise',
    price: { monthly: 197, yearly: 1970 },
    description: 'Maximum automation for building a digital empire',
    features: [
      'Unlimited AI content generation',
      'Complete SaaS Tool Suite + custom tools',
      'Advanced affiliate marketing with AI research',
      'Unlimited data API endpoints',
      'Email automation (unlimited subscribers)',
      'AI-powered optimization engine',
      'White-label solutions',
      'Dedicated account manager',
      'Custom integrations',
      'Revenue sharing opportunities'
    ],
    limitations: [],
    cta: 'Build Your Empire',
    popular: false
  }
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)

  return (
    <div id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-yellow-400">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Investment That Pays Itself Back
          </p>
          <p className="mt-6 text-lg leading-8 text-purple-200">
            Most users recover their investment in the first month. Choose the plan that matches your income goals.
          </p>
        </div>

        <div className="mt-16 flex justify-center">
          <div className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs font-semibold leading-5 ring-1 ring-inset ring-white/20">
            <button
              onClick={() => setYearly(false)}
              className={`cursor-pointer rounded-full px-2.5 py-1 ${
                !yearly ? 'bg-yellow-400 text-black' : 'text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`cursor-pointer rounded-full px-2.5 py-1 ${
                yearly ? 'bg-yellow-400 text-black' : 'text-white'
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`rounded-3xl p-8 xl:p-10 ${
                plan.popular
                  ? 'bg-gradient-to-b from-yellow-400/20 to-orange-500/20 ring-2 ring-yellow-400'
                  : 'bg-white/5 ring-1 ring-white/20'
              }`}
            >
              {plan.popular && (
                <div className="mb-4 text-center">
                  <span className="inline-flex items-center rounded-full bg-yellow-400 px-3 py-1 text-sm font-medium text-black">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-white">{plan.name}</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-purple-200">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-white">
                  ${yearly ? plan.price.yearly : plan.price.monthly}
                </span>
                <span className="text-sm font-semibold leading-6 text-purple-200">
                  /{yearly ? 'year' : 'month'}
                </span>
              </p>
              
              <button className={`mt-6 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 transition-all transform hover:scale-105 ${
                plan.popular
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:from-yellow-300 hover:to-orange-400'
                  : 'bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20'
              }`}>
                {plan.cta}
              </button>
              
              <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-purple-200 xl:mt-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon className="h-6 w-5 flex-none text-green-400" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
                {plan.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-x-3 opacity-60">
                    <XMarkIcon className="h-6 w-5 flex-none text-red-400" aria-hidden="true" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-yellow-400/10 to-orange-500/10 p-8 ring-1 ring-yellow-400/20">
            <h3 className="text-2xl font-bold text-white mb-4">
              🎯 Launch Special: First 100 Customers
            </h3>
            <p className="text-purple-200 text-lg mb-6">
              Get lifetime 50% off any plan + 1-on-1 setup call + bonus automation templates
            </p>
            <div className="flex justify-center gap-4">
              <span className="text-yellow-400 font-bold text-xl">
                67 spots remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}