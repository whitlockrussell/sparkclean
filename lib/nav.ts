import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  BarChart2,
  Settings,
  UsersRound,
  Car,
  Calculator,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  mobileOrder: number
  proOnly?: boolean
}

export const navItems: NavItem[] = [
  {
    label: 'Today',
    href: '/today',
    icon: LayoutDashboard,
    mobileOrder: 1,
  },
  {
    label: 'Schedule',
    href: '/schedule',
    icon: CalendarDays,
    mobileOrder: 2,
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
    mobileOrder: 3,
  },
  {
    label: 'Estimates',
    href: '/estimates',
    icon: Calculator,
    mobileOrder: 4,
    proOnly: true,
  },
  {
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    mobileOrder: 5,
  },
  {
    label: 'Expenses',
    href: '/expenses',
    icon: Receipt,
    mobileOrder: 6,
  },
  {
    label: 'Mileage',
    href: '/mileage',
    icon: Car,
    mobileOrder: 7,
    proOnly: true,
  },
  {
    label: 'Team',
    href: '/team',
    icon: UsersRound,
    mobileOrder: 8,
    proOnly: true,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart2,
    mobileOrder: 9,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    mobileOrder: 10,
  },
]
