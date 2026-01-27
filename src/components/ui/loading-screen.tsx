import { Loader2, Wrench } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
        <Wrench className="w-8 h-8 text-white" />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Загрузка...</span>
      </div>
    </div>
  )
}
