import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Wrench,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  FileText,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card safe-top">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Левая часть */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 -ml-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold hidden sm:inline">CRM DANIK-SERVIS</span>
            </div>
          </div>

          {/* Правая часть */}
          <div className="flex items-center gap-2">
            {/* Уведомления */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {/* Бейдж с количеством */}
              {/* <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">3</span> */}
            </Button>

            {/* Профиль */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'Администратор' : 'Мастер'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Мобильное меню */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <nav className="absolute left-0 top-14 bottom-0 w-64 bg-card border-r p-4">
            <div className="space-y-2">
              <NavItem
                icon={<FileText className="h-5 w-5" />}
                label="Заявки"
                active={location.pathname === '/'}
                onClick={() => {
                  navigate('/')
                  setSidebarOpen(false)
                }}
              />
              <NavItem
                icon={<Users className="h-5 w-5" />}
                label="Клиенты"
                active={location.pathname === '/clients'}
                onClick={() => {
                  navigate('/clients')
                  setSidebarOpen(false)
                }}
              />
              {isAdmin && (
                <NavItem
                  icon={<Settings className="h-5 w-5" />}
                  label="Настройки"
                  onClick={() => {
                    setSidebarOpen(false)
                  }}
                />
              )}
            </div>

            {/* Профиль в мобильном меню */}
            <div className="absolute bottom-4 left-4 right-4 border-t pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {isAdmin ? 'Администратор' : 'Мастер'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </div>
          </nav>
        </div>
      )}

      {/* Основной контент */}
      <main className="pb-20 md:pb-6 safe-bottom">
        {children}
      </main>
    </div>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      className={cn(
        'flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent'
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
