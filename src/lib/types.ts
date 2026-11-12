export interface ProductOption {
  label: string
  price: number
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  image_url: string
  sort: number
  is_active: number
  product_count?: number
}

export interface Product {
  id: number
  category_id: number
  category_name?: string
  category_slug?: string
  name: string
  slug: string
  description: string
  image_url: string
  options: ProductOption[]
  availability: 'daily' | 'preorder'
  notice_days: number
  is_available: number
  featured: number
  badge: string
  customizable: number
  sort: number
  /** Extra photos and videos shown on the item's page (the main photo is image_url). */
  media: ProductMedia[]
}

export interface ProductMedia {
  url: string
  kind: 'image' | 'video'
}

export interface DeliveryZone {
  id: number
  name: string
  fee: number
  is_active: number
  sort: number
}

export interface AdminUser {
  id: number
  name: string
  email: string
  role: 'owner' | 'staff'
}

export interface MediaItem {
  id: number
  key: string
  filename: string
  content_type: string
  size: number
  created_at: string
  url: string
}

export interface GalleryItem {
  id: number
  image_url: string
  title: string
  occasion: string
  description: string
  featured: number
  sort: number
}

export interface QuoteRequest {
  id: number
  code: string
  name: string
  phone: string
  email: string
  occasion: string
  event_date: string
  items: string
  cake_shape: string
  cake_size: string
  flavour: string
  colours: string
  cake_message: string
  guests: number
  fulfilment: string
  area: string
  budget: string
  details: string
  status: 'new' | 'contacted' | 'quoted' | 'confirmed' | 'declined'
  admin_note: string
  created_at: string
}

export interface Client {
  id: number
  name: string
  phone: string
  email: string
  address: string
  area: string
  birthday: string
  notes: string
  source: string
  created_at: string
  receipt_count?: number
  total_spent?: number
}

export interface ReceiptItem {
  description: string
  qty: number
  price: number
}

export interface Receipt {
  id: number
  code: string
  token: string
  client_id: number | null
  client_name: string
  client_phone: string
  client_email: string
  client_address: string
  items: ReceiptItem[]
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  amount_paid: number
  payment_method: 'transfer' | 'cash' | 'pos' | 'paystack'
  status: 'paid' | 'part_paid' | 'unpaid'
  fulfilment: string
  event_date: string
  note: string
  issued_on: string
  created_at: string
}

export interface Job {
  id: number
  title: string
  job_type: string
  location: string
  pay: string
  summary: string
  duties: string
  requirements: string
  is_open: number
  sort: number
  created_at: string
  application_count?: number
}

export interface JobApplication {
  id: number
  code: string
  job_id: number | null
  job_title: string
  name: string
  phone: string
  email: string
  area: string
  experience: string
  availability: string
  about: string
  cv_key: string
  cv_name: string
  status: 'new' | 'shortlisted' | 'interview' | 'hired' | 'not_selected'
  admin_note: string
  created_at: string
}

export interface Review {
  id: number
  name: string
  occasion: string
  body: string
  rating: number
  photo_url: string
  is_visible: number
  sort: number
  created_at: string
  source?: 'owner' | 'customer'
  seen?: number
  order_id?: number | null
}
