import { useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useProductStore } from '../../stores/productStore'
import type { Product } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'

export function AdminProducts() {
  const { products, categories, addProduct, updateProduct, deleteProduct, toggleAvailability, addCategory, deleteCategory } = useProductStore()
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Products & Categories</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Categories
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <>
          <div className="mb-4">
            <button
              onClick={() => { setEditingProduct(null); setShowProductForm(true) }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>

          {showProductForm && (
            <ProductForm
              product={editingProduct}
              categories={categories}
              onSave={(data) => {
                if (editingProduct) {
                  updateProduct(editingProduct.id, data)
                } else {
                  addProduct({ ...data, created_at: '' } as Omit<Product, 'id' | 'created_at'>)
                }
                setShowProductForm(false)
                setEditingProduct(null)
              }}
              onCancel={() => { setShowProductForm(false); setEditingProduct(null) }}
            />
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-12">No products yet. Add your first product above.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">SKU</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const cat = categories.find((c) => c.id === product.category_id)
                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{product.name}</td>
                        <td className="px-6 py-4">
                          {cat && (
                            <span
                              className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{product.sku ?? '-'}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => toggleAvailability(product.id)} title="Toggle availability">
                            {product.available ? (
                              <ToggleRight size={24} className="text-green-600" />
                            ) : (
                              <ToggleLeft size={24} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingProduct(product); setShowProductForm(true) }}
                              className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mb-4">
            <button
              onClick={() => setShowCategoryForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Plus size={16} /> Add Category
            </button>
          </div>

          {showCategoryForm && (
            <CategoryForm
              onSave={(name, color) => { addCategory(name, color); setShowCategoryForm(false) }}
              onCancel={() => setShowCategoryForm(false)}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-gray-800">{cat.name}</span>
                </div>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product: Product | null
  categories: { id: string; name: string }[]
  onSave: (data: Partial<Product>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product?.price?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [available, setAvailable] = useState(product?.available ?? true)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      price: parseFloat(price) || 0,
      category_id: categoryId,
      sku: sku || null,
      image_url: null,
      available,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">{product ? 'Edit Product' : 'New Product'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU (optional)</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="available"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="available" className="text-sm text-gray-700">Available</label>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          {product ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </form>
  )
}

function CategoryForm({ onSave, onCancel }: { onSave: (name: string, color: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">New Category</h3>
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
        </div>
        <button
          onClick={() => { if (name.trim()) onSave(name.trim(), color) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Add
        </button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}
