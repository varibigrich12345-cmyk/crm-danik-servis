import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  X,
  Save,
  Loader2,
  Car,
  User,
  Phone,
  FileText,
  Wrench,
  Package,
  Plus,
} from 'lucide-react'
import { cn, normalizeCarNumber, statusLabels } from '@/lib/utils'
import type { Claim, ClaimStatus, Complaint, Work, Part } from '@/types/database'

const claimSchema = z.object({
  client_fio: z.string().min(1, 'Введите ФИО клиента'),
  client_company: z.string().optional(),
  phone: z.string().min(1, 'Введите телефон'),
  car_number: z.string().min(1, 'Введите госномер'),
  car_brand: z.string().min(1, 'Введите марку авто'),
  vin: z.string().optional().refine((val) => !val || val.length === 17, 'VIN должен содержать 17 символов'),
  mileage: z.number({ required_error: 'Введите пробег' }).min(0, 'Пробег не может быть отрицательным'),
})

type ClaimFormData = z.infer<typeof claimSchema>

interface ClaimFormDialogProps {
  claim: Claim | null
  onClose: () => void
  onSaved: () => void
}

export function ClaimFormDialog({ claim, onClose, onSaved }: ClaimFormDialogProps) {
  const { profile, user, isAdmin } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'complaints' | 'works' | 'parts'>('info')
  const [complaints, setComplaints] = useState<Complaint[]>(claim?.complaints || [])
  const [works, setWorks] = useState<Work[]>(claim?.works || [])
  const [parts, setParts] = useState<Part[]>(claim?.parts || [])
  const [status, setStatus] = useState<ClaimStatus>(claim?.status || 'draft')

  const isEditing = !!claim
  const canEdit = !claim || claim.status !== 'completed' || isAdmin

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      client_fio: claim?.client_fio || '',
      client_company: claim?.client_company || '',
      phone: claim?.phone || '',
      car_number: claim?.car_number || '',
      car_brand: claim?.car_brand || '',
      vin: claim?.vin || '',
      mileage: claim?.mileage || 0,
    },
  })

  const carNumber = watch('car_number')
  useEffect(() => {
    if (carNumber) {
      const normalized = normalizeCarNumber(carNumber)
      if (normalized !== carNumber) setValue('car_number', normalized)
    }
  }, [carNumber, setValue])

  const onSubmit = async (data: ClaimFormData) => {
    console.log('Profile:', profile, 'User:', user)
    if (!profile && !user) { toast.error('Не удалось определить пользователя'); return }
    const userId = profile?.id || user?.id
    setIsLoading(true)
    try {
      if (isEditing && claim) {
        const updatePayload = {
          client_fio: data.client_fio,
          client_company: data.client_company || null,
          phone: data.phone,
          car_number: data.car_number,
          car_brand: data.car_brand,
          vin: data.vin || null,
          mileage: data.mileage,
          complaints: complaints as any,
          works: works as any,
          parts: parts as any,
          status: status,
          completed_at: status === 'completed' && !claim.completed_at ? new Date().toISOString() : claim.completed_at,
        }

        const { error } = await (supabase
          .from('claims') as any)
          .update(updatePayload)
          .eq('id', claim.id)
        if (error) throw error
        toast.success('Заявка обновлена')
      } else {
        const insertPayload = {
          number: `CLAIM-${Date.now()}`,
          created_by: userId!,
          assigned_master_id: userId!,
          client_fio: data.client_fio,
          client_company: data.client_company || null,
          phone: data.phone,
          phones: [],
          car_number: data.car_number,
          car_brand: data.car_brand,
          vin: data.vin || null,
          mileage: data.mileage,
          complaints: complaints as any,
          works: works as any,
          parts: parts as any,
          status: status,
        }

        const { error } = await (supabase
          .from('claims') as any)
          .insert(insertPayload)
        if (error) throw error
        toast.success('Заявка создана')
      }
      onSaved()
    } catch (error: any) {
      console.error('Error saving claim:', error)
      toast.error('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'))
    } finally { setIsLoading(false) }
  }

  const addComplaint = () => setComplaints([...complaints, { name: '', side: null, position: null, quantity: 1 }])
  const addWork = () => setWorks([...works, { name: '', side: null, position: null, quantity: 1, price: 0, complaintIndex: null }])
  const addPart = () => setParts([...parts, { article: null, name: '', side: null, position: null, quantity: 1, price: 0 }])

  return (
    <div className="fixed inset-0 z-50 bg-background md:bg-black/50 md:flex md:items-center md:justify-center">
      <div className="h-full md:h-auto md:max-h-[90vh] w-full md:max-w-3xl md:rounded-lg bg-background overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
          <h2 className="text-lg font-semibold">{isEditing ? `Заявка ${claim?.number}` : 'Новая заявка'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="flex border-b bg-card shrink-0 overflow-x-auto">
          {[{ id: 'info', label: 'Информация', icon: FileText }, { id: 'complaints', label: 'Жалобы', icon: FileText }, { id: 'works', label: 'Работы', icon: Wrench }, { id: 'parts', label: 'Запчасти', icon: Package }].map((tab) => (
            <button key={tab.id} className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap', activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')} onClick={() => setActiveTab(tab.id as typeof activeTab)}>
              <tab.icon className="h-4 w-4" /><span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'complaints' && complaints.length > 0 && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{complaints.length}</span>}
              {tab.id === 'works' && works.length > 0 && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{works.length}</span>}
              {tab.id === 'parts' && parts.length > 0 && <span className="ml-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{parts.length}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-6">
              <section>
                <h3 className="font-medium mb-3 flex items-center gap-2"><User className="h-4 w-4" />Клиент</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="client_fio">ФИО *</Label><Input id="client_fio" {...register('client_fio')} placeholder="Иванов Иван Иванович" disabled={!canEdit} />{errors.client_fio && <p className="text-sm text-destructive">{errors.client_fio.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="client_company">Компания</Label><Input id="client_company" {...register('client_company')} placeholder="ООО Название" disabled={!canEdit} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="phone">Телефон *</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="phone" {...register('phone')} placeholder="+7 (900) 123-45-67" className="pl-9" disabled={!canEdit} /></div>{errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}</div>
                </div>
              </section>
              <section>
                <h3 className="font-medium mb-3 flex items-center gap-2"><Car className="h-4 w-4" />Автомобиль</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="car_brand">Марка *</Label><Input id="car_brand" {...register('car_brand')} placeholder="Ford Transit" list="car-brands" disabled={!canEdit} /><datalist id="car-brands"><option value="ГАЗель" /><option value="ГАЗель NEXT" /><option value="Ford Transit" /><option value="Hyundai HD78" /><option value="Peugeot Boxer" /><option value="MAN" /><option value="Mercedes-Benz Sprinter" /><option value="Volkswagen Transporter" /><option value="Volkswagen Crafter" /><option value="Renault Master" /><option value="IVECO Daily" /><option value="Fiat Ducato" /><option value="Citroën Jumper" /></datalist>{errors.car_brand && <p className="text-sm text-destructive">{errors.car_brand.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="car_number">Госномер *</Label><Input id="car_number" {...register('car_number')} placeholder="А123БВ777" className="uppercase font-mono" disabled={!canEdit} />{errors.car_number && <p className="text-sm text-destructive">{errors.car_number.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="vin">VIN код</Label><Input id="vin" {...register('vin')} placeholder="WF0XXXGCDX1234567" maxLength={17} className="uppercase font-mono" disabled={!canEdit} />{errors.vin && <p className="text-sm text-destructive">{errors.vin.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="mileage">Пробег (км) *</Label><Input id="mileage" type="number" {...register('mileage', { valueAsNumber: true })} placeholder="150000" disabled={!canEdit} />{errors.mileage && <p className="text-sm text-destructive">{errors.mileage.message}</p>}</div>
                </div>
              </section>
              <section><h3 className="font-medium mb-3">Статус</h3><select className="w-full h-10 px-3 rounded-md border bg-background text-sm min-h-[44px]" value={status} onChange={(e) => setStatus(e.target.value as ClaimStatus)} disabled={!canEdit}><option value="draft">{statusLabels.draft}</option><option value="agreed">{statusLabels.agreed}</option><option value="in_progress">{statusLabels.in_progress}</option><option value="completed">{statusLabels.completed}</option></select></section>
            </div>
          )}
          {activeTab === 'complaints' && (<div className="space-y-4">{complaints.map((complaint, index) => (<div key={index} className="p-4 border rounded-lg space-y-3"><div className="flex items-center justify-between"><span className="font-medium">Жалоба #{index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => setComplaints(complaints.filter((_, i) => i !== index))} disabled={!canEdit}><X className="h-4 w-4" /></Button></div><Input placeholder="Описание жалобы" value={complaint.name} onChange={(e) => { const updated = [...complaints]; updated[index].name = e.target.value; setComplaints(updated) }} disabled={!canEdit} /><div className="grid grid-cols-3 gap-2"><select className="h-10 px-3 rounded-md border bg-background text-sm" value={complaint.side || ''} onChange={(e) => { const updated = [...complaints]; updated[index].side = e.target.value || null; setComplaints(updated) }} disabled={!canEdit}><option value="">Сторона</option><option value="Левый">Левый</option><option value="Правый">Правый</option><option value="Центральный">Центральный</option></select><select className="h-10 px-3 rounded-md border bg-background text-sm" value={complaint.position || ''} onChange={(e) => { const updated = [...complaints]; updated[index].position = e.target.value || null; setComplaints(updated) }} disabled={!canEdit}><option value="">Позиция</option><option value="Передний">Передний</option><option value="Задний">Задний</option><option value="Верхний">Верхний</option><option value="Нижний">Нижний</option><option value="Средний">Средний</option></select><Input type="number" min="1" value={complaint.quantity} onChange={(e) => { const updated = [...complaints]; updated[index].quantity = parseInt(e.target.value) || 1; setComplaints(updated) }} disabled={!canEdit} /></div></div>))}<Button type="button" variant="outline" onClick={addComplaint} disabled={!canEdit}><Plus className="h-4 w-4 mr-2" />Добавить жалобу</Button></div>)}
          {activeTab === 'works' && (<div className="space-y-4">{works.map((work, index) => (<div key={index} className="p-4 border rounded-lg space-y-3"><div className="flex items-center justify-between"><span className="font-medium">Работа #{index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => setWorks(works.filter((_, i) => i !== index))} disabled={!canEdit}><X className="h-4 w-4" /></Button></div><Input placeholder="Название работы" value={work.name} onChange={(e) => { const updated = [...works]; updated[index].name = e.target.value; setWorks(updated) }} disabled={!canEdit} /><div className="grid grid-cols-2 gap-2"><Input type="number" min="1" placeholder="Кол-во" value={work.quantity} onChange={(e) => { const updated = [...works]; updated[index].quantity = parseInt(e.target.value) || 1; setWorks(updated) }} disabled={!canEdit} /><Input type="number" min="0" step="0.01" placeholder="Цена" value={work.price} onChange={(e) => { const updated = [...works]; updated[index].price = parseFloat(e.target.value) || 0; setWorks(updated) }} disabled={!canEdit} /></div></div>))}<Button type="button" variant="outline" onClick={addWork} disabled={!canEdit}><Plus className="h-4 w-4 mr-2" />Добавить работу</Button></div>)}
          {activeTab === 'parts' && (<div className="space-y-4">{parts.map((part, index) => (<div key={index} className="p-4 border rounded-lg space-y-3"><div className="flex items-center justify-between"><span className="font-medium">Запчасть #{index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => setParts(parts.filter((_, i) => i !== index))} disabled={!canEdit}><X className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2"><Input placeholder="Артикул" value={part.article || ''} onChange={(e) => { const updated = [...parts]; updated[index].article = e.target.value || null; setParts(updated) }} disabled={!canEdit} /><Input placeholder="Название" value={part.name} onChange={(e) => { const updated = [...parts]; updated[index].name = e.target.value; setParts(updated) }} disabled={!canEdit} /></div><div className="grid grid-cols-2 gap-2"><Input type="number" min="1" placeholder="Кол-во" value={part.quantity} onChange={(e) => { const updated = [...parts]; updated[index].quantity = parseInt(e.target.value) || 1; setParts(updated) }} disabled={!canEdit} /><Input type="number" min="0" step="0.01" placeholder="Цена" value={part.price} onChange={(e) => { const updated = [...parts]; updated[index].price = parseFloat(e.target.value) || 0; setParts(updated) }} disabled={!canEdit} /></div></div>))}<Button type="button" variant="outline" onClick={addPart} disabled={!canEdit}><Plus className="h-4 w-4 mr-2" />Добавить запчасть</Button></div>)}
        </form>
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-card shrink-0"><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button onClick={handleSubmit(onSubmit)} disabled={isLoading || !canEdit}>{isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</>) : (<><Save className="h-4 w-4 mr-2" />Сохранить</>)}</Button></div>
      </div>
    </div>
  )
}