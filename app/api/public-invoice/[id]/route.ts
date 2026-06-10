import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: invoice, error } = await adminClient
    .from('invoices')
    .select('*, clients(first_name, last_name, email, phone, address, city, province, postal_code)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [{ data: items }, { data: business }] = await Promise.all([
    adminClient
      .from('invoice_items')
      .select('id, description, quantity, unit_price, amount, sort_order')
      .eq('invoice_id', id)
      .order('sort_order'),
    adminClient
      .from('businesses')
      .select('business_name, hst_number, tax_label, tax_number_label, address, city, province, postal_code, phone, email, invoice_notes, logo_url')
      .eq('user_id', invoice.user_id)
      .single(),
  ])

  return NextResponse.json({
    invoice,
    items: items ?? [],
    business: business ?? null,
  })
}
