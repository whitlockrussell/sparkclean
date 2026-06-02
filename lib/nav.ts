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

export const navItems = [
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
    label: 'Invoices',
    href: '/invoices',
    icon: FileText,
    mobileOrder: 4,
  },
  {
    label: 'Estimates',
    href: '/estimates',
    icon: Calculator,
    mobileOrder: 5,
  },
  {
    label: 'Expenses',
    href: '/expenses',
    icon: Receipt,
    mobileOrder: 6,
  },
  {
    label: 'Team',
    href: '/team',
    icon: UsersRound,
    mobileOrder: 7,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart2,
    mobileOrder: 8,
  },
  {
    label: 'Mileage',
    href: '/mileage',
    icon: Car,
    mobileOrder: 9,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    mobileOrder: 10,
  },
]
