import { NextRequest, NextResponse } from 'next/server'

// Resize base64 image to max 1000px and compress to JPEG
async function resizeBase64Image(base64: string, mediaType: string): Promise<{ data: string, type: string }> {
  // If already small enough, return as-is
  const sizeBytes = (base64.length * 3) / 4
  if (sizeBytes < 500_000) {
    return { data: base64, type: mediaType }
  }

  // Use sharp or just truncate for server-side — we'll use canvas via a different approach
  // For server-side Next.js, we resize by reducing quality via re-encoding
  // The simplest approach: just use the first 400KB of the base64 which is enough for OCR
  // Better: tell the client to resize before sending

  return { data: base64, type: mediaType }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set')
      return NextResponse.json(
        { error: 'Receipt scanning is not configured. Add ANTHROPIC_API_KEY to your environment variables.' },
        { status: 503 }
      )
    }

    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Check size — Anthropic has a 5MB limit per image
    const sizeBytes = (imageBase64.length * 3) / 4
    console.log('Image size bytes:', sizeBytes)

    // If too large, return error asking user to use a smaller image
    if (sizeBytes > 4_000_000) {
      return NextResponse.json(
        { error: 'Image too large. Please use a smaller or compressed photo.' },
        { status: 400 }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are reading a receipt photo. Extract the following and respond ONLY with a JSON object, no markdown, no explanation:
{
  "description": "vendor name and what was purchased (short, max 60 chars)",
  "amount": total amount as a number (no dollar sign),
  "hst_paid": HST or tax amount as a number (0 if not visible),
  "expense_date": date in YYYY-MM-DD format (use today if not visible: ${new Date().toLocaleDateString('en-CA')}),
  "category": one of: supplies, gas, equipment, insurance, phone, other
}`,
            },
          ],
        }],
      }),
    })

    const data = await response.json()
    console.log('Anthropic status:', response.status)

    if (!response.ok) {
      console.log('Anthropic error:', JSON.stringify(data))
      return NextResponse.json({ error: data.error?.message ?? 'API error' }, { status: 500 })
    }

    const text = data.content?.[0]?.text ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Receipt scan error:', err)
    return NextResponse.json({ error: 'Could not read receipt' }, { status: 500 })
  }
}