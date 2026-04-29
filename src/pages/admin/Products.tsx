import { useRef, useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Upload, X } from 'lucide-react'
import { useProductStore } from '../../stores/productStore'
import type { Product } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'
import { t } from '../../lib/i18n'
import { uploadMenuPhoto } from '../../lib/data'

export function AdminProducts() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    addCategory,
    deleteCategory,
  } = useProductStore()
  const [showProductForm, setShowProductForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')
  const [saveError, setSaveError] = useState<string | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t.admin.products.title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {t.admin.products.productsTab}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {t.admin.products.categoriesTab}
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
              <Plus size={16} /> {t.admin.products.addProduct}
            </button>
          </div>

          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}

          {showProductForm && (
            <ProductForm
              product={editingProduct}
              categories={categories}
              onSave={async (data) => {
                setSaveError(null)
                const ok = editingProduct
                  ? await updateProduct(editingProduct.id, data)
                  : (await addProduct(data as Omit<Product, 'id' | 'created_at'>)) !== null
                if (!ok) {
                  setSaveError(t.admin.products.saveFailed)
                  return
                }
                setShowProductForm(false)
                setEditingProduct(null)
              }}
              onCancel={() => { setSaveError(null); setShowProductForm(false); setEditingProduct(null) }}
            />
          )}

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {products.length === 0 ? (
              <p className="text-gray-400 text-center py-12">{t.admin.products.noProducts}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-6 py-3 font-medium">{t.admin.products.colName}</th>
                    <th className="px-6 py-3 font-medium">{t.admin.products.colCategory}</th>
                    <th className="px-6 py-3 font-medium">{t.admin.products.colPrice}</th>
                    <th className="px-6 py-3 font-medium">{t.admin.products.skuLabel}</th>
                    <th className="px-6 py-3 font-medium">{t.admin.products.colStock}</th>
                    <th className="px-6 py-3 font-medium">{t.admin.products.colStatus}</th>
                    <th className="px-6 py-3 font-medium">{t.admin.products.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const cat = categories.find((c) => c.id === product.category_id)
                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          <div className="flex items-center gap-3">
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt=""
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            )}
                            <span>{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {cat ? (
                            <span
                              className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{t.admin.products.uncategorized}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{product.sku ?? '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {product.stock === null || product.stock === undefined ? (
                            <span className="text-gray-400">{t.admin.products.unlimited}</span>
                          ) : product.stock <= 0 ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              {t.admin.products.soldOut}
                            </span>
                          ) : product.stock <= 5 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              {product.stock}
                            </span>
                          ) : (
                            <span>{product.stock}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => { void toggleAvailability(product.id) }}
                            title={t.admin.products.availableLabel}
                          >
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
                              aria-label={t.common.edit}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(t.admin.products.deleteConfirm)) {
                                  void deleteProduct(product.id)
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 rounded text-red-600"
                              aria-label={t.common.delete}
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
              <Plus size={16} /> {t.admin.products.addCategory}
            </button>
          </div>

          {showCategoryForm && (
            <CategoryForm
              onSave={async (name, color) => {
                await addCategory(name, color)
                setShowCategoryForm(false)
              }}
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
                  onClick={() => {
                    if (window.confirm(t.admin.products.categoryDeleteConfirm)) {
                      void deleteCategory(cat.id)
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded text-red-600"
                  aria-label={t.common.delete}
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
  onSave: (data: Partial<Product>) => void | Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product?.price?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [available, setAvailable] = useState(product?.available ?? true)
  const [stock, setStock] = useState<string>(
    product?.stock === null || product?.stock === undefined ? '' : String(product.stock),
  )
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t.admin.products.photoUploadFailed)
      return
    }
    setUploading(true)
    setUploadError(null)
    const url = await uploadMenuPhoto(file)
    setUploading(false)
    if (!url) {
      setUploadError(t.admin.products.photoUploadFailed)
      return
    }
    setImageUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedStock = stock.trim() === '' ? null : Math.max(0, parseInt(stock, 10) || 0)
    await onSave({
      name,
      price: parseFloat(price) || 0,
      category_id: categoryId,
      sku: sku || null,
      image_url: imageUrl,
      available,
      stock: parsedStock,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">
        {product ? t.admin.products.editProduct : t.admin.products.newProduct}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.products.nameLabel}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.products.priceLabel}</label>
          <input
            type="number"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.products.categoryLabel}</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.products.skuOptional}</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.products.stockLabel}</label>
          <input
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="∞"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">{t.admin.products.stockHint}</p>
        </div>
        <div className="flex items-center gap-2 md:mt-6">
          <input
            type="checkbox"
            id="available"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="available" className="text-sm text-gray-700">
            {t.admin.products.availableLabel}
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t.admin.products.photoLabel}
          </label>
          <div className="flex items-center gap-4">
            {imageUrl && (
              <div className="relative">
                <img src={imageUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow-sm ring-1 ring-gray-200 hover:bg-red-50"
                  aria-label={t.admin.products.photoRemove}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload size={16} />
              {uploading ? t.admin.products.photoUploading : t.common.add}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
          {uploadError ? (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">{t.admin.products.photoHelp}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          {t.common.save}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
          {t.common.cancel}
        </button>
      </div>
    </form>
  )
}

function CategoryForm({
  onSave,
  onCancel,
}: {
  onSave: (name: string, color: string) => void | Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">{t.admin.products.newCategory}</h3>
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.products.nameLabel}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warna</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
        </div>
        <button
          type="button"
          onClick={() => { if (name.trim()) void onSave(name.trim(), color) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {t.common.add}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  )
}
