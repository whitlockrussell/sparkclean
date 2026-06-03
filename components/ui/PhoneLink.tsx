'use client'

/** Formats a Canadian phone number into a tel: href by stripping non-digits
 *  and prepending +1 if needed (e.g. "613-555-0142" → "+16135550142"). */
function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

interface PhoneLinkProps {
  phone: string
  className?: string
}

export function PhoneLink({ phone, className = '' }: PhoneLinkProps) {
  const href = toTelHref(phone)
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <a
        href={`tel:${href}`}
        onClick={e => e.stopPropagation()}
        className="text-teal-600 hover:text-teal-700 hover:underline transition-colors"
      >
        {phone}
      </a>
      <a
        href={`sms:${href}`}
        onClick={e => e.stopPropagation()}
        className="text-teal-600 hover:text-teal-700 hover:underline transition-colors"
      >
        Text
      </a>
    </span>
  )
}
