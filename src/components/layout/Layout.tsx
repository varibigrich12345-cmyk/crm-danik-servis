import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePendingRequestsCount, useRequests, useResolveRequest } from '@/hooks/useRequests'
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
  Check,
  XCircle,
  UserPlus,
  Edit3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false)
  const { profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Запросы (только для админа)
  const { data: pendingCount = 0 } = usePendingRequestsCount()
  const { data: pendingRequests = [] } = useRequests('pending')
  const resolveRequestMutation = useResolveRequest()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleResolve = (requestId: string, status: 'approved' | 'rejected') => {
    if (profile?.id) {
      resolveRequestMutation.mutate({
        requestId,
        status,
        resolvedBy: profile.id,
      })
    }
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
            {/* Уведомления/Запросы — только для админа */}
            {isAdmin && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setRequestsPanelOpen(!requestsPanelOpen)}
                >
                  <Bell className="h-5 w-5" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </Button>

                {/* Выпадающая панель запросов */}
                {requestsPanelOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setRequestsPanelOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
                      <div className="p-3 border-b font-medium">
                        Запросы ({pendingCount})
                      </div>
                      {pendingRequests.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Нет новых запросов
                        </div>
                      ) : (
                        <div className="divide-y">
                          {pendingRequests.map((request) => (
                            <div key={request.id} className="p-3">
                              <div className="flex items-start gap-2 mb-2">
                                {request.type === 'delegation' ? (
                                  <UserPlus className="h-4 w-4 text-blue-500 mt-0.5" />
                                ) : (
                                  <Edit3 className="h-4 w-4 text-orange-500 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {request.type === 'delegation' ? 'Делегирование' : 'Корректировка'}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    Заявка: {request.claim?.number || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    От: {request.requested_by_name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => handleResolve(request.id, 'rejected')}
                                  disabled={resolveRequestMutation.isPending}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Отклонить
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => handleResolve(request.id, 'approved')}
                                  disabled={resolveRequestMutation.isPending}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Одобрить
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

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
