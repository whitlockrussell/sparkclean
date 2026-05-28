import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  BarChart2,
  Settings,
  UsersRound,
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
    label: 'Expenses',
    href: '/expenses',
    icon: Receipt,
    mobileOrder: 5,
  },
  {
    label: 'Team',
    href: '/team',
    icon: UsersRound,
    mobileOrder: 6,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart2,
    mobileOrder: 7,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    mobileOrder: 8,
  },
]
