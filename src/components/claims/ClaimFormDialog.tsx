import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { validatePhone, validateRequired, validateVIN } from '@/utils/validation'
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
  Printer,
} from 'lucide-react'
import { cn, normalizeCarNumber, statusLabels } from '@/lib/utils'
import { PDFPreviewModal } from './PDFPreviewModal'
import type { Claim, ClaimStatus, Complaint, Work, Part, WorksDictionaryItem, DictionaryItem, ClientReference } from '@/types/database'
import { useSearchClients, useCreateClient } from '@/hooks/useClients'

const claimSchema = z.object({
  client_fio: z.string().refine(
    (val) => !validateRequired(val, 'ФИО клиента'),
    (val) => ({ message: validateRequired(val, 'ФИО клиента') }),
  ),
  client_company: z.string().optional(),
  phone: z.string().refine(
    (val) => !validatePhone(val),
    (val) => ({ message: validatePhone(val) }),
  ),
  car_number: z.string().refine(
    (val) => !validateRequired(val, 'Госномер'),
    (val) => ({ message: validateRequired(val, 'Госномер') }),
  ),
  car_brand: z.string().refine(
    (val) => !validateRequired(val, 'Марка авто'),
    (val) => ({ message: validateRequired(val, 'Марка авто') }),
  ),
  vin: z.string().optional().refine(
    (val) => !val || !validateVIN(val),
    (val) => ({ message: val ? validateVIN(val) : '' }),
  ),
  mileage: z.number({
    required_error: 'Пробег обязательно для заполнения',
    invalid_type_error: 'Пробег обязательно для заполнения',
  }).min(0, 'Пробег не может быть отрицательным'),
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
  const [worksDictionary, setWorksDictionary] = useState<WorksDictionaryItem[]>([])
  const [carBrandDictionary, setCarBrandDictionary] = useState<DictionaryItem[]>([])
  const [suggestions, setSuggestions] = useState<{ [key: string]: (WorksDictionaryItem | DictionaryItem)[] }>({})
  const [showSuggestions, setShowSuggestions] = useState<{ [key: string]: boolean }>({})
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<{ [key: string]: number }>({})
  const suggestionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  
  // Поиск клиентов
  const { data: clientSuggestions = [], isLoading: isSearchingClients } = useSearchClients(clientSearchQuery)
  const createClientMutation = useCreateClient()

  const isEditing = !!claim
  const canEdit = !claim || claim.status !== 'completed' || isAdmin

  const { register, handleSubmit, formState: { errors, isValid }, setValue, watch } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    mode: 'onChange',
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

  // Загрузка справочника работ
  useEffect(() => {
    const loadWorksDictionary = async () => {
      try {
        const { data, error } = await supabase
          .from('works_dictionary')
          .select('*')
          .order('name', { ascending: true })
        
        if (error) throw error
        if (data) setWorksDictionary(data)
      } catch (error) {
        console.error('Ошибка загрузки справочника работ:', error)
      }
    }
    loadWorksDictionary()
  }, [])

  // Загрузка справочника марок автомобилей
  useEffect(() => {
    const loadCarBrandDictionary = async () => {
      try {
        const { data, error } = await supabase
          .from('car_brand_dictionary')
          .select('*')
          .order('name', { ascending: true })
        
        if (error) throw error
        if (data) setCarBrandDictionary(data)
      } catch (error) {
        console.error('Ошибка загрузки справочника марок:', error)
      }
    }
    loadCarBrandDictionary()
  }, [])

  // Поиск подсказок для жалоб
  const handleComplaintInput = (index: number, value: string) => {
    const updated = [...complaints]
    updated[index].name = value
    setComplaints(updated)

    const key = `complaint-${index}`
    if (value.length >= 3) {
      const filtered = worksDictionary.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10)
      setSuggestions({ ...suggestions, [key]: filtered })
      setShowSuggestions({ ...showSuggestions, [key]: true })
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: -1 })
    } else {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Обработка клавиатуры для жалоб
  const handleComplaintKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = `complaint-${index}`
    const fieldSuggestions = suggestions[key] || []
    if (!showSuggestions[key] || fieldSuggestions.length === 0) return

    const currentIndex = activeSuggestionIndex[key] ?? -1

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < fieldSuggestions.length - 1 ? currentIndex + 1 : 0
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: nextIndex })
      suggestionRefs.current[`complaint-${index}-${nextIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : fieldSuggestions.length - 1
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: prevIndex })
      suggestionRefs.current[`complaint-${index}-${prevIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && currentIndex >= 0 && currentIndex < fieldSuggestions.length) {
      e.preventDefault()
      selectComplaintSuggestion(index, fieldSuggestions[currentIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Выбор подсказки для жалобы
  const selectComplaintSuggestion = (complaintIndex: number, suggestion: WorksDictionaryItem) => {
    const updated = [...complaints]
    updated[complaintIndex].name = suggestion.name
    setComplaints(updated)
    const key = `complaint-${complaintIndex}`
    setShowSuggestions({ ...showSuggestions, [key]: false })

    // Автоматически добавляем такую же запись во вкладку Работы
    const newWork: Work = {
      name: suggestion.name,
      side: null,
      position: null,
      quantity: 1,
      price: 0,
      complaintIndex: complaintIndex,
    }
    setWorks([...works, newWork])
    toast.success('Работа добавлена автоматически')
  }

  // Поиск подсказок для работ
  const handleWorkInput = (index: number, value: string) => {
    const updated = [...works]
    updated[index].name = value
    setWorks(updated)

    const key = `work-${index}`
    if (value.length >= 3) {
      const filtered = worksDictionary.filter(item =>
        item.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10)
      setSuggestions({ ...suggestions, [key]: filtered })
      setShowSuggestions({ ...showSuggestions, [key]: true })
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: -1 })
    } else {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Обработка клавиатуры для работ
  const handleWorkKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = `work-${index}`
    const fieldSuggestions = suggestions[key] || []
    if (!showSuggestions[key] || fieldSuggestions.length === 0) return

    const currentIndex = activeSuggestionIndex[key] ?? -1

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < fieldSuggestions.length - 1 ? currentIndex + 1 : 0
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: nextIndex })
      suggestionRefs.current[`work-${index}-${nextIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : fieldSuggestions.length - 1
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: prevIndex })
      suggestionRefs.current[`work-${index}-${prevIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && currentIndex >= 0 && currentIndex < fieldSuggestions.length) {
      e.preventDefault()
      selectWorkSuggestion(index, fieldSuggestions[currentIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Выбор подсказки для работы
  const selectWorkSuggestion = (workIndex: number, suggestion: WorksDictionaryItem) => {
    const updated = [...works]
    updated[workIndex].name = suggestion.name
    setWorks(updated)
    const key = `work-${workIndex}`
    setShowSuggestions({ ...showSuggestions, [key]: false })
  }

  // Поиск подсказок для марки автомобиля
  const handleCarBrandInput = (value: string) => {
    setValue('car_brand', value)

    const key = 'car-brand'
    if (value.length >= 3) {
      const filtered = carBrandDictionary
        .filter(item => item.name.toLowerCase().includes(value.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 50)
      setSuggestions({ ...suggestions, [key]: filtered })
      setShowSuggestions({ ...showSuggestions, [key]: true })
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: -1 })
    } else {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Обработка клавиатуры для марки автомобиля
  const handleCarBrandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = 'car-brand'
    const fieldSuggestions = (suggestions[key] || []) as DictionaryItem[]
    if (!showSuggestions[key] || fieldSuggestions.length === 0) return

    const currentIndex = activeSuggestionIndex[key] ?? -1

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < fieldSuggestions.length - 1 ? currentIndex + 1 : 0
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: nextIndex })
      suggestionRefs.current[`${key}-${nextIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : fieldSuggestions.length - 1
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: prevIndex })
      suggestionRefs.current[`${key}-${prevIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && currentIndex >= 0 && currentIndex < fieldSuggestions.length) {
      e.preventDefault()
      selectCarBrandSuggestion(fieldSuggestions[currentIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Выбор подсказки для марки автомобиля
  const selectCarBrandSuggestion = (suggestion: DictionaryItem) => {
    setValue('car_brand', suggestion.name)
    const key = 'car-brand'
    setShowSuggestions({ ...showSuggestions, [key]: false })
  }

  // Обработка ввода в поле ФИО или Телефон для поиска клиентов
  const handleClientInput = (value: string, field: 'fio' | 'phone') => {
    if (field === 'fio') {
      setValue('client_fio', value)
    } else {
      setValue('phone', value)
    }
    
    // Если клиент был выбран из списка, сбрасываем выбор при изменении
    if (selectedClientId) {
      setSelectedClientId(null)
    }
    
    // Обновляем поисковый запрос
    if (value.length >= 3) {
      setClientSearchQuery(value)
      setShowSuggestions({ ...showSuggestions, 'client': true })
      setActiveSuggestionIndex({ ...activeSuggestionIndex, 'client': -1 })
    } else {
      setClientSearchQuery('')
      setShowSuggestions({ ...showSuggestions, 'client': false })
    }
  }

  // Обработка клавиатуры для автокомплита клиентов
  const handleClientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = 'client'
    if (!showSuggestions[key] || clientSuggestions.length === 0) return

    const currentIndex = activeSuggestionIndex[key] ?? -1

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = currentIndex < clientSuggestions.length - 1 ? currentIndex + 1 : 0
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: nextIndex })
      suggestionRefs.current[`client-${nextIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : clientSuggestions.length - 1
      setActiveSuggestionIndex({ ...activeSuggestionIndex, [key]: prevIndex })
      suggestionRefs.current[`client-${prevIndex}`]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && currentIndex >= 0 && currentIndex < clientSuggestions.length) {
      e.preventDefault()
      selectClient(clientSuggestions[currentIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions({ ...showSuggestions, [key]: false })
    }
  }

  // Выбор клиента из списка
  const selectClient = (client: ClientReference) => {
    setValue('client_fio', client.name)
    setValue('phone', client.phone || '')
    setValue('client_company', client.company || '')
    setSelectedClientId(client.id)
    setShowSuggestions({ ...showSuggestions, 'client': false })
    setClientSearchQuery('')
  }

  const onSubmit = async (data: ClaimFormData) => {
    console.log('Profile:', profile, 'User:', user)
    if (!profile) {
      toast.error('Профиль не загружен. Попробуйте перезайти в систему.')
      return
    }
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
        // Если клиент новый (не выбран из списка), добавляем в справочник
        if (!selectedClientId && data.client_fio) {
          try {
            await createClientMutation.mutateAsync({
              name: data.client_fio,
              phone: data.phone || null,
              company: data.client_company || null,
              email: null,
            })
          } catch (error) {
            // Игнорируем ошибку создания клиента, продолжаем создание заявки
            console.warn('Не удалось добавить клиента в справочник:', error)
          }
        }

        const insertPayload = {
          number: `CLAIM-${Date.now()}`,
          created_by: profile.id,
          assigned_master_id: profile.id,
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

  // Обработчик для предпросмотра PDF
  const handlePreview = () => {
    if (!claim) {
      toast.error('Сначала сохраните заявку')
      return
    }
    setShowPDFPreview(true)
  }

  // Получить полную заявку с актуальными данными
  const getFullClaim = (): Claim | null => {
    if (!claim) return null
    return {
      ...claim,
      complaints,
      works,
      parts,
      status,
    }
  }

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
                  <div className="space-y-2 relative">
                    <Label htmlFor="client_fio">ФИО *</Label>
                    <Input
                      id="client_fio"
                      {...register('client_fio')}
                      placeholder="Иванов Иван Иванович (начните вводить для автоподсказки)"
                      value={watch('client_fio')}
                      onChange={(e) => handleClientInput(e.target.value, 'fio')}
                      onKeyDown={handleClientKeyDown}
                      onFocus={() => {
                        const value = watch('client_fio')
                        if (value && value.length >= 3) {
                          setClientSearchQuery(value)
                          setShowSuggestions({ ...showSuggestions, 'client': true })
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSuggestions({ ...showSuggestions, 'client': false })
                        }, 200)
                      }}
                      disabled={!canEdit}
                    />
                    {showSuggestions['client'] && (clientSuggestions.length > 0 || isSearchingClients) && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {isSearchingClients ? (
                          <div className="px-4 py-2 text-sm text-muted-foreground">Поиск...</div>
                        ) : clientSuggestions.length > 0 ? (
                          <>
                            {clientSuggestions.map((client, index) => (
                              <div
                                key={client.id}
                                ref={(el) => {
                                  suggestionRefs.current[`client-${index}`] = el
                                }}
                                className={cn(
                                  "px-4 py-2 cursor-pointer hover:bg-accent",
                                  activeSuggestionIndex['client'] === index && "bg-accent"
                                )}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  selectClient(client)
                                }}
                                onMouseEnter={() => {
                                  setActiveSuggestionIndex({ ...activeSuggestionIndex, 'client': index })
                                }}
                              >
                                <div className="font-medium">{client.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {client.phone && <span>{client.phone}</span>}
                                  {client.phone && client.company && <span> — </span>}
                                  {client.company && <span>{client.company}</span>}
                                </div>
                              </div>
                            ))}
                            <div
                              className="px-4 py-2 cursor-pointer hover:bg-accent border-t text-sm text-primary font-medium"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setShowSuggestions({ ...showSuggestions, 'client': false })
                                setClientSearchQuery('')
                              }}
                            >
                              <Plus className="h-4 w-4 inline mr-2" />
                              Добавить нового клиента
                            </div>
                          </>
                        ) : (
                          <div
                            className="px-4 py-2 cursor-pointer hover:bg-accent text-sm text-primary font-medium"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setShowSuggestions({ ...showSuggestions, 'client': false })
                              setClientSearchQuery('')
                            }}
                          >
                            <Plus className="h-4 w-4 inline mr-2" />
                            Добавить нового клиента
                          </div>
                        )}
                      </div>
                    )}
                    {errors.client_fio && <p className="text-sm text-destructive">{errors.client_fio.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_company">Компания</Label>
                    <Input id="client_company" {...register('client_company')} placeholder="ООО Название" disabled={!canEdit} />
                  </div>
                  <div className="space-y-2 sm:col-span-2 relative">
                    <Label htmlFor="phone">Телефон *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        {...register('phone')}
                        placeholder="+7 (900) 123-45-67 (начните вводить для автоподсказки)"
                        className="pl-9"
                        value={watch('phone')}
                        onChange={(e) => handleClientInput(e.target.value, 'phone')}
                        onKeyDown={handleClientKeyDown}
                        onFocus={() => {
                          const value = watch('phone')
                          if (value && value.length >= 3) {
                            setClientSearchQuery(value)
                            setShowSuggestions({ ...showSuggestions, 'client': true })
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowSuggestions({ ...showSuggestions, 'client': false })
                          }, 200)
                        }}
                        disabled={!canEdit}
                      />
                    </div>
                    {showSuggestions['client'] && (clientSuggestions.length > 0 || isSearchingClients) && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {isSearchingClients ? (
                          <div className="px-4 py-2 text-sm text-muted-foreground">Поиск...</div>
                        ) : clientSuggestions.length > 0 ? (
                          <>
                            {clientSuggestions.map((client, index) => (
                              <div
                                key={client.id}
                                ref={(el) => {
                                  suggestionRefs.current[`client-${index}`] = el
                                }}
                                className={cn(
                                  "px-4 py-2 cursor-pointer hover:bg-accent",
                                  activeSuggestionIndex['client'] === index && "bg-accent"
                                )}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  selectClient(client)
                                }}
                                onMouseEnter={() => {
                                  setActiveSuggestionIndex({ ...activeSuggestionIndex, 'client': index })
                                }}
                              >
                                <div className="font-medium">{client.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {client.phone && <span>{client.phone}</span>}
                                  {client.phone && client.company && <span> — </span>}
                                  {client.company && <span>{client.company}</span>}
                                </div>
                              </div>
                            ))}
                            <div
                              className="px-4 py-2 cursor-pointer hover:bg-accent border-t text-sm text-primary font-medium"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                setShowSuggestions({ ...showSuggestions, 'client': false })
                                setClientSearchQuery('')
                              }}
                            >
                              <Plus className="h-4 w-4 inline mr-2" />
                              Добавить нового клиента
                            </div>
                          </>
                        ) : (
                          <div
                            className="px-4 py-2 cursor-pointer hover:bg-accent text-sm text-primary font-medium"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setShowSuggestions({ ...showSuggestions, 'client': false })
                              setClientSearchQuery('')
                            }}
                          >
                            <Plus className="h-4 w-4 inline mr-2" />
                            Добавить нового клиента
                          </div>
                        )}
                      </div>
                    )}
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                  </div>
                </div>
              </section>
              <section>
                <h3 className="font-medium mb-3 flex items-center gap-2"><Car className="h-4 w-4" />Автомобиль</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 relative">
                    <Label htmlFor="car_brand">Марка *</Label>
                    <Input
                      id="car_brand"
                      {...register('car_brand')}
                      placeholder="Ford Transit (начните вводить для автоподсказки)"
                      value={watch('car_brand')}
                      onChange={(e) => handleCarBrandInput(e.target.value)}
                      onKeyDown={handleCarBrandKeyDown}
                      onFocus={() => {
                        const value = watch('car_brand')
                        if (value && value.length >= 3) {
                          handleCarBrandInput(value)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSuggestions({ ...showSuggestions, 'car-brand': false })
                        }, 200)
                      }}
                      disabled={!canEdit}
                    />
                    {showSuggestions['car-brand'] && (suggestions['car-brand'] || []).length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {(suggestions['car-brand'] as DictionaryItem[]).map((item, suggestionIndex) => (
                          <div
                            key={item.id}
                            ref={(el) => {
                              suggestionRefs.current[`car-brand-${suggestionIndex}`] = el
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer hover:bg-accent",
                              activeSuggestionIndex['car-brand'] === suggestionIndex && "bg-accent"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectCarBrandSuggestion(item)
                            }}
                            onMouseEnter={() => {
                              setActiveSuggestionIndex({ ...activeSuggestionIndex, 'car-brand': suggestionIndex })
                            }}
                          >
                            <div className="font-medium">{item.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.car_brand && <p className="text-sm text-destructive">{errors.car_brand.message}</p>}
                  </div>
                  <div className="space-y-2"><Label htmlFor="car_number">Госномер *</Label><Input id="car_number" {...register('car_number')} placeholder="А123БВ777" className="uppercase font-mono" disabled={!canEdit} />{errors.car_number && <p className="text-sm text-destructive">{errors.car_number.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="vin">VIN код</Label><Input id="vin" {...register('vin')} placeholder="WF0XXXGCDX1234567" maxLength={17} className="uppercase font-mono" disabled={!canEdit} />{errors.vin && <p className="text-sm text-destructive">{errors.vin.message}</p>}</div>
                  <div className="space-y-2"><Label htmlFor="mileage">Пробег (км) *</Label><Input id="mileage" type="number" {...register('mileage', { valueAsNumber: true })} placeholder="150000" disabled={!canEdit} />{errors.mileage && <p className="text-sm text-destructive">{errors.mileage.message}</p>}</div>
                </div>
              </section>
              <section><h3 className="font-medium mb-3">Статус</h3><select className="w-full h-10 px-3 rounded-md border bg-background text-sm min-h-[44px]" value={status} onChange={(e) => setStatus(e.target.value as ClaimStatus)} disabled={!canEdit}><option value="draft">{statusLabels.draft}</option><option value="agreed">{statusLabels.agreed}</option><option value="in_progress">{statusLabels.in_progress}</option><option value="completed">{statusLabels.completed}</option></select></section>
            </div>
          )}
          {activeTab === 'complaints' && (
            <div className="space-y-4">
              {complaints.map((complaint, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Жалоба #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setComplaints(complaints.filter((_, i) => i !== index))}
                      disabled={!canEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Описание жалобы (начните вводить для автоподсказки)"
                      value={complaint.name}
                      onChange={(e) => handleComplaintInput(index, e.target.value)}
                      onKeyDown={(e) => handleComplaintKeyDown(index, e)}
                      onFocus={() => {
                        if (complaint.name.length >= 3) {
                          handleComplaintInput(index, complaint.name)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSuggestions({ ...showSuggestions, [index]: false })
                        }, 200)
                      }}
                      disabled={!canEdit}
                    />
                    {showSuggestions[`complaint-${index}`] && (suggestions[`complaint-${index}`] || []).length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {(suggestions[`complaint-${index}`] || []).map((item, suggestionIndex) => (
                          <div
                            key={item.id}
                            ref={(el) => {
                              suggestionRefs.current[`complaint-${index}-${suggestionIndex}`] = el
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer hover:bg-accent",
                              activeSuggestionIndex[`complaint-${index}`] === suggestionIndex && "bg-accent"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectComplaintSuggestion(index, item)
                            }}
                            onMouseEnter={() => {
                              setActiveSuggestionIndex({ ...activeSuggestionIndex, [`complaint-${index}`]: suggestionIndex })
                            }}
                          >
                            <div className="font-medium">{item.name}</div>
                            {item.category && (
                              <div className="text-xs text-muted-foreground">{item.category}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      className="h-10 px-3 rounded-md border bg-background text-sm"
                      value={complaint.side || ''}
                      onChange={(e) => {
                        const updated = [...complaints]
                        updated[index].side = e.target.value || null
                        setComplaints(updated)
                      }}
                      disabled={!canEdit}
                    >
                      <option value="">Сторона</option>
                      <option value="Левый">Левый</option>
                      <option value="Правый">Правый</option>
                      <option value="Центральный">Центральный</option>
                    </select>
                    <select
                      className="h-10 px-3 rounded-md border bg-background text-sm"
                      value={complaint.position || ''}
                      onChange={(e) => {
                        const updated = [...complaints]
                        updated[index].position = e.target.value || null
                        setComplaints(updated)
                      }}
                      disabled={!canEdit}
                    >
                      <option value="">Позиция</option>
                      <option value="Передний">Передний</option>
                      <option value="Задний">Задний</option>
                      <option value="Верхний">Верхний</option>
                      <option value="Нижний">Нижний</option>
                      <option value="Средний">Средний</option>
                    </select>
                    <Input
                      type="number"
                      min="1"
                      value={complaint.quantity}
                      onChange={(e) => {
                        const updated = [...complaints]
                        updated[index].quantity = parseInt(e.target.value) || 1
                        setComplaints(updated)
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addComplaint} disabled={!canEdit}>
                <Plus className="h-4 w-4 mr-2" />Добавить жалобу
              </Button>
            </div>
          )}
          {activeTab === 'works' && (
            <div className="space-y-4">
              {works.map((work, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Работа #{index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setWorks(works.filter((_, i) => i !== index))}
                      disabled={!canEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Название работы (начните вводить для автоподсказки)"
                      value={work.name}
                      onChange={(e) => handleWorkInput(index, e.target.value)}
                      onKeyDown={(e) => handleWorkKeyDown(index, e)}
                      onFocus={() => {
                        if (work.name.length >= 3) {
                          handleWorkInput(index, work.name)
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowSuggestions({ ...showSuggestions, [`work-${index}`]: false })
                        }, 200)
                      }}
                      disabled={!canEdit}
                    />
                    {showSuggestions[`work-${index}`] && suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                        {suggestions.map((item, suggestionIndex) => (
                          <div
                            key={item.id}
                            ref={(el) => {
                              suggestionRefs.current[`work-${index}-${suggestionIndex}`] = el
                            }}
                            className={cn(
                              "px-4 py-2 cursor-pointer hover:bg-accent",
                              activeSuggestionIndex[`work-${index}`] === suggestionIndex && "bg-accent"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              selectWorkSuggestion(index, item)
                            }}
                            onMouseEnter={() => {
                              setActiveSuggestionIndex({ ...activeSuggestionIndex, [`work-${index}`]: suggestionIndex })
                            }}
                          >
                            <div className="font-medium">{item.name}</div>
                            {item.category && (
                              <div className="text-xs text-muted-foreground">{item.category}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Кол-во"
                      value={work.quantity}
                      onChange={(e) => {
                        const updated = [...works]
                        updated[index].quantity = parseInt(e.target.value) || 1
                        setWorks(updated)
                      }}
                      disabled={!canEdit}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Цена"
                      value={work.price}
                      onChange={(e) => {
                        const updated = [...works]
                        updated[index].price = parseFloat(e.target.value) || 0
                        setWorks(updated)
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addWork} disabled={!canEdit}>
                <Plus className="h-4 w-4 mr-2" />Добавить работу
              </Button>
            </div>
          )}
          {activeTab === 'parts' && (<div className="space-y-4">{parts.map((part, index) => (<div key={index} className="p-4 border rounded-lg space-y-3"><div className="flex items-center justify-between"><span className="font-medium">Запчасть #{index + 1}</span><Button type="button" variant="ghost" size="sm" onClick={() => setParts(parts.filter((_, i) => i !== index))} disabled={!canEdit}><X className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2"><Input placeholder="Артикул" value={part.article || ''} onChange={(e) => { const updated = [...parts]; updated[index].article = e.target.value || null; setParts(updated) }} disabled={!canEdit} /><Input placeholder="Название" value={part.name} onChange={(e) => { const updated = [...parts]; updated[index].name = e.target.value; setParts(updated) }} disabled={!canEdit} /></div><div className="grid grid-cols-2 gap-2"><Input type="number" min="1" placeholder="Кол-во" value={part.quantity} onChange={(e) => { const updated = [...parts]; updated[index].quantity = parseInt(e.target.value) || 1; setParts(updated) }} disabled={!canEdit} /><Input type="number" min="0" step="0.01" placeholder="Цена" value={part.price} onChange={(e) => { const updated = [...parts]; updated[index].price = parseFloat(e.target.value) || 0; setParts(updated) }} disabled={!canEdit} /></div></div>))}<Button type="button" variant="outline" onClick={addPart} disabled={!canEdit}><Plus className="h-4 w-4 mr-2" />Добавить запчасть</Button></div>)}
        </form>
        <div className="flex items-center justify-between gap-3 p-4 border-t bg-card shrink-0">
          <div className="flex items-center gap-2">
            {isEditing && claim && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
                title="Предпросмотр PDF"
              >
                <Printer className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Предпросмотр</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isLoading || !canEdit || !isValid}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      {isEditing && claim && showPDFPreview && (
        <PDFPreviewModal
          claim={getFullClaim()!}
          isOpen={showPDFPreview}
          onClose={() => setShowPDFPreview(false)}
        />
      )}
    </div>
  )
}