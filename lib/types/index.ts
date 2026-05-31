export type Client = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string
  postal_code: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type NewClient = Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export type Appointment = {
  id: string
  user_id: string
  client_id: string
  scheduled_date: string
  start_time: string | null
  duration_hours: number | null
  price: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'payment_received'
  is_recurring: boolean
  recurrence_rule: 'weekly' | 'biweekly' | 'monthly' | null
  recurrence_end: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: Pick<Client, 'first_name' | 'last_name' | 'address' | 'city' | 'notes'>
}

export type NewAppointment = Omit<Appointment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'clients'>

export type Invoice = {
  id: string
  user_id: string
  client_id: string
  appointment_id: string | null
  invoice_number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string | null
  subtotal: number
  hst_amount: number
  total: number
  notes: string | null
  payment_method: 'cash' | 'e_transfer' | 'cheque' | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  clients?: Pick<Client, 'first_name' | 'last_name' | 'email'>
}

export type Expense = {
  id: string
  user_id: string
  description: string
  amount: number
  hst_paid: number
  category: 'supplies' | 'gas' | 'equipment' | 'insurance' | 'phone' | 'other'
  receipt_url: string | null
  expense_date: string
  created_at: string
  updated_at: string
}

export type NewExpense = Omit<Expense, 'id' | 'user_id' | 'created_at' | 'updated_at'>

export type MileageLog = {
  id: string
  user_id: string
  trip_date: string
  start_location: string | null
  end_location: string | null
  km: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type NewMileageLog = Omit<MileageLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>
