import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Wrench } from 'lucide-react'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        const { supabase } = await import('@/lib/supabase')
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) {
          toast.error('Ошибка входа: ' + error.message)
          setIsLoading(false)
        } else {
          toast.success('Добро пожаловать!')
          setTimeout(() => {
            navigate('/')
          }, 500)
        }
      } else {
        if (!fullName.trim()) {
          toast.error('Введите ФИО')
          setIsLoading(false)
          return
        }
        
        const { error } = await signUp(email, password, fullName)
        if (error) {
          toast.error('Ошибка регистрации: ' + error.message)
        } else {
          toast.success('Регистрация успешна!')
          setIsLogin(true)
        }
        setIsLoading(false)
      }
    } catch (err) {
      console.error(err)
      toast.error('Произошла ошибка')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <Wrench className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CRM DANIK-SERVIS</h1>
          <p className="text-muted-foreground mt-1">Система управления заявками</p>
        </div>

        {/* Форма */}
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {isLogin ? 'Вход в систему' : 'Регистрация'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">ФИО</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? 'Вход...' : 'Регистрация...'}
                </>
              ) : (
                isLogin ? 'Войти' : 'Зарегистрироваться'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isLoading}
            >
              {isLogin
                ? 'Нет аккаунта? Зарегистрироваться'
                : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>

        {/* Копирайт */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2026 DANIK-SERVIS
        </p>
      </div>
    </div>
  )
}
