'use client'

import { Phone, MessageSquare, MapPin } from 'lucide-react'

function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

interface PhoneLinkProps {
  phone?: string | null
  address?: string | null
  className?: string
}

export function PhoneLink({ phone, address, className = '' }: PhoneLinkProps) {
  const telHref = phone ? toTelHref(phone) : null
  const mapsHref = address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null

  if (!telHref && !mapsHref) return null

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {telHref && (
        <a href={`tel:${telHref}`} onClick={e => e.stopPropagation()} aria-label="Call"
          className="text-teal-600 hover:text-teal-700 transition-colors">
          <Phone className="w-3.5 h-3.5" strokeWidth={1.8} />
        </a>
      )}
      {telHref && (
        <a href={`sms:${telHref}`} onClick={e => e.stopPropagation()} aria-label="Text"
          className="text-teal-600 hover:text-teal-700 transition-colors">
          <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.8} />
        </a>
      )}
      {mapsHref && (
        <a href={mapsHref} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} aria-label="Map"
          className="text-teal-600 hover:text-teal-700 transition-colors">
          <MapPin className="w-3.5 h-3.5" strokeWidth={1.8} />
        </a>
      )}
    </span>
  )
}
