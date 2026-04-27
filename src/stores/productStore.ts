import { create } from 'zustand'
import type { Product, Category } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import { generateId } from '../lib/utils'

interface ProductState {
  products: Product[]
  categories: Category[]
  addProduct: (data: Omit<Product, 'id' | 'created_at'>) => Product
  updateProduct: (id: string, updates: Partial<Product>) => void
  deleteProduct: (id: string) => void
  toggleAvailability: (id: string) => void
  addCategory: (name: string, color: string) => Category
  updateCategory: (id: string, updates: Partial<Category>) => void
  deleteCategory: (id: string) => void
  initialize: () => void
}

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'created_at'>[] = [
  { name: 'Main Course', sort_order: 1, color: '#ef4444' },
  { name: 'Beverages', sort_order: 2, color: '#3b82f6' },
  { name: 'Desserts', sort_order: 3, color: '#f59e0b' },
  { name: 'Appetizers', sort_order: 4, color: '#10b981' },
]

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],

  initialize: () => {
    let categories = getItem<Category[]>('categories', [])
    if (categories.length === 0) {
      categories = DEFAULT_CATEGORIES.map((c) => ({
        ...c,
        id: generateId(),
        created_at: new Date().toISOString(),
      }))
      setItem('categories', categories)
    }
    const products = getItem<Product[]>('products', [])
    set({ categories, products })
  },

  addProduct: (data) => {
    const product: Product = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    }
    const updated = [...get().products, product]
    set({ products: updated })
    setItem('products', updated)
    return product
  },

  updateProduct: (id, updates) => {
    const updated = get().products.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    )
    set({ products: updated })
    setItem('products', updated)
  },

  deleteProduct: (id) => {
    const updated = get().products.filter((p) => p.id !== id)
    set({ products: updated })
    setItem('products', updated)
  },

  toggleAvailability: (id) => {
    const updated = get().products.map((p) =>
      p.id === id ? { ...p, available: !p.available } : p,
    )
    set({ products: updated })
    setItem('products', updated)
  },

  addCategory: (name, color) => {
    const cats = get().categories
    const category: Category = {
      id: generateId(),
      name,
      color,
      sort_order: cats.length + 1,
      created_at: new Date().toISOString(),
    }
    const updated = [...cats, category]
    set({ categories: updated })
    setItem('categories', updated)
    return category
  },

  updateCategory: (id, updates) => {
    const updated = get().categories.map((c) =>
      c.id === id ? { ...c, ...updates } : c,
    )
    set({ categories: updated })
    setItem('categories', updated)
  },

  deleteCategory: (id) => {
    const updated = get().categories.filter((c) => c.id !== id)
    set({ categories: updated })
    setItem('categories', updated)
  },
}))
