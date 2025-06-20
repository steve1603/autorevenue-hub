import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// In-memory storage for demo (use database in production)
const urlDatabase = new Map<string, { originalUrl: string, clicks: number, createdAt: Date }>()

export async function POST(request: NextRequest) {
  try {
    const { url, customAlias } = await request.json()
    
    // Validate URL
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 })
    }

    // Generate short code
    const shortCode = customAlias || generateShortCode(url)
    
    // Check if custom alias already exists
    if (customAlias && urlDatabase.has(customAlias)) {
      return NextResponse.json({ error: 'Custom alias already exists' }, { status: 409 })
    }

    // Store in database
    urlDatabase.set(shortCode, {
      originalUrl: url,
      clicks: 0,
      createdAt: new Date()
    })

    const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/s/${shortCode}`

    return NextResponse.json({
      success: true,
      shortUrl,
      shortCode,
      originalUrl: url,
      clicks: 0
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Short code required' }, { status: 400 })
  }

  const urlData = urlDatabase.get(code)
  if (!urlData) {
    return NextResponse.json({ error: 'URL not found' }, { status: 404 })
  }

  return NextResponse.json({
    shortCode: code,
    originalUrl: urlData.originalUrl,
    clicks: urlData.clicks,
    createdAt: urlData.createdAt
  })
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

function generateShortCode(url: string): string {
  const hash = createHash('md5').update(url + Date.now()).digest('hex')
  return hash.substring(0, 6)
}