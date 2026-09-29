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
  sort: number
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
