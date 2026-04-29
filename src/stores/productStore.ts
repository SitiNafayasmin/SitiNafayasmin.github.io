import { create } from 'zustand'
import type { Product, Category } from '../lib/types'
import { getItem, setItem } from '../lib/localStorage'
import {
  deleteCategoryRow,
  deleteProductRow,
  fetchCategories,
  fetchProducts,
  insertCategory,
  insertProduct,
  subscribeToTable,
  updateCategoryRow,
  updateProductRow,
} from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'

interface ProductState {
  products: Product[]
  categories: Category[]
  hydrated: boolean
  addProduct: (data: Omit<Product, 'id' | 'created_at'>) => Promise<Product | null>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>
  deleteProduct: (id: string) => Promise<boolean>
  toggleAvailability: (id: string) => Promise<boolean>
  addCategory: (name: string, color: string) => Promise<Category | null>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  initialize: () => Promise<void>
}

let productUnsub: (() => void) | null = null
let categoryUnsub: (() => void) | null = null

async function refresh(set: (partial: Partial<ProductState>) => void) {
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()])
  set({ products, categories })
  setItem('products', products)
  setItem('categories', categories)
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  hydrated: false,

  initialize: async () => {
    // First paint from localStorage cache.
    const cachedProducts = getItem<Product[]>('products', [])
    const cachedCategories = getItem<Category[]>('categories', [])
    if (cachedProducts.length || cachedCategories.length) {
      set({ products: cachedProducts, categories: cachedCategories })
    }
    if (!isSupabaseConfigured) {
      set({ hydrated: true })
      return
    }
    await refresh(set)
    set({ hydrated: true })

    if (!productUnsub) {
      productUnsub = subscribeToTable('products', () => refresh(set))
    }
    if (!categoryUnsub) {
      categoryUnsub = subscribeToTable('categories', () => refresh(set))
    }
  },

  addProduct: async (data) => {
    if (!isSupabaseConfigured) return null
    const row = await insertProduct(data)
    if (!row) return null
    const updated = [...get().products, row]
    set({ products: updated })
    setItem('products', updated)
    return row
  },

  updateProduct: async (id, updates) => {
    if (!isSupabaseConfigured) return false
    const row = await updateProductRow(id, updates)
    if (!row) return false
    const updated = get().products.map((p) => (p.id === id ? row : p))
    set({ products: updated })
    setItem('products', updated)
    return true
  },

  deleteProduct: async (id) => {
    if (!isSupabaseConfigured) return false
    const ok = await deleteProductRow(id)
    if (!ok) return false
    const updated = get().products.filter((p) => p.id !== id)
    set({ products: updated })
    setItem('products', updated)
    return true
  },

  toggleAvailability: async (id) => {
    const current = get().products.find((p) => p.id === id)
    if (!current) return false
    return get().updateProduct(id, { available: !current.available })
  },

  addCategory: async (name, color) => {
    if (!isSupabaseConfigured) return null
    const sort_order = get().categories.length + 1
    const row = await insertCategory({ name, color, sort_order })
    if (!row) return null
    const updated = [...get().categories, row]
    set({ categories: updated })
    setItem('categories', updated)
    return row
  },

  updateCategory: async (id, updates) => {
    if (!isSupabaseConfigured) return false
    const row = await updateCategoryRow(id, updates)
    if (!row) return false
    const updated = get().categories.map((c) => (c.id === id ? row : c))
    set({ categories: updated })
    setItem('categories', updated)
    return true
  },

  deleteCategory: async (id) => {
    if (!isSupabaseConfigured) return false
    const ok = await deleteCategoryRow(id)
    if (!ok) return false
    const updated = get().categories.filter((c) => c.id !== id)
    set({ categories: updated })
    setItem('categories', updated)
    return true
  },
}))
