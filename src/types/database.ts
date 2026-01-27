export type UserRole = 'admin' | 'master'
export type ClaimStatus = 'draft' | 'agreed' | 'in_progress' | 'completed'
export type RequestStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  telegram_chat_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  fio: string
  company: string | null
  phones: string[]
  inn: string | null
  created_at: string
  updated_at: string
}

export interface ClientVehicle {
  id: string
  client_id: string
  car_number: string
  car_brand: string
  vin: string | null
  created_at: string
  updated_at: string
}

export interface Complaint {
  name: string
  side: string | null
  position: string | null
  quantity: number
}

export interface Work {
  name: string
  side: string | null
  position: string | null
  quantity: number
  price: number
  complaintIndex: number | null
}

export interface Part {
  article: string | null
  name: string
  side: string | null
  position: string | null
  quantity: number
  price: number
}

export interface Claim {
  id: string
  number: string
  created_by: string
  assigned_master_id: string
  client_id: string | null
  client_fio: string
  client_company: string | null
  phone: string
  phones: string[]
  vehicle_id: string | null
  car_number: string
  car_brand: string
  vin: string | null
  mileage: number
  complaints: Complaint[]
  works: Work[]
  parts: Part[]
  status: ClaimStatus
  edit_request_status: RequestStatus
  edit_requested_by: string | null
  edit_request_comment: string | null
  responsible_request_status: RequestStatus
  responsible_requested_by: string | null
  responsible_request_to: string | null
  responsible_request_comment: string | null
  is_exported: boolean
  exported_at: string | null
  csv_data: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface ClaimHistory {
  id: string
  claim_id: string
  user_id: string
  action: string
  changes: Record<string, unknown> | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  claim_id: string | null
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface DictionaryItem {
  id: string
  name: string
  usage_count?: number
  default_price?: number
  article?: string
  created_at: string
}

// Supabase Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
      }
      client_vehicles: {
        Row: ClientVehicle
        Insert: Omit<ClientVehicle, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ClientVehicle, 'id' | 'created_at' | 'updated_at'>>
      }
      claims: {
        Row: Claim
        Insert: Partial<Claim>
        Update: Partial<Claim>
      }
      claim_history: {
        Row: ClaimHistory
        Insert: Omit<ClaimHistory, 'id' | 'created_at'>
        Update: never
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Pick<Notification, 'is_read'>>
      }
      complaint_dictionary: {
        Row: DictionaryItem
        Insert: Pick<DictionaryItem, 'name'>
        Update: Partial<Pick<DictionaryItem, 'name' | 'usage_count'>>
      }
      work_dictionary: {
        Row: DictionaryItem & { default_price: number | null }
        Insert: Pick<DictionaryItem, 'name'> & { default_price?: number }
        Update: Partial<Pick<DictionaryItem, 'name' | 'usage_count' | 'default_price'>>
      }
      part_dictionary: {
        Row: DictionaryItem & { article: string | null; default_price: number | null }
        Insert: Pick<DictionaryItem, 'name'> & { article?: string; default_price?: number }
        Update: Partial<Pick<DictionaryItem, 'name' | 'usage_count' | 'article' | 'default_price'>>
      }
      car_brand_dictionary: {
        Row: DictionaryItem
        Insert: Pick<DictionaryItem, 'name'>
        Update: Partial<Pick<DictionaryItem, 'usage_count'>>
      }
      position_dictionary: {
        Row: DictionaryItem
        Insert: Pick<DictionaryItem, 'name'>
        Update: never
      }
      side_dictionary: {
        Row: DictionaryItem
        Insert: Pick<DictionaryItem, 'name'>
        Update: never
      }
    }
  }
}
