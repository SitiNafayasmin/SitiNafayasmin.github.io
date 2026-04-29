import { useState } from 'react'
import { Save, Download, Upload } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { t } from '../../lib/i18n'

export function AdminSettings() {
  const { settings, updateSettings } = useSettingsStore()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError(null)
    const ok = await updateSettings(form)
    if (!ok) {
      setSaveError(t.admin.settings.saveFailed)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleExport = () => {
    const data: Record<string, string | null> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('xevora_pos_')) {
        data[key] = localStorage.getItem(key)
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xevora-pos-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert(t.admin.settings.importTooLarge)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          throw new Error('Expected an object at top level')
        }
        // Only accept our own keys, and only string values. Never let an
        // imported backup clobber unrelated localStorage entries.
        const entries = Object.entries(data as Record<string, unknown>)
        if (!entries.every(([k, v]) => k.startsWith('xevora_pos_') && typeof v === 'string')) {
          throw new Error('Backup contains unexpected keys or non-string values')
        }
        // Clear existing xevora_pos_* keys before import, then apply.
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key?.startsWith('xevora_pos_')) localStorage.removeItem(key)
        }
        entries.forEach(([key, value]) => {
          localStorage.setItem(key, value as string)
        })
        window.location.reload()
      } catch {
        alert(t.admin.settings.importInvalid)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{t.admin.settings.title}</h2>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{t.admin.settings.subtitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.settings.businessName}</label>
            <input
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.settings.currency}</label>
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.settings.address}</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.settings.taxRate}</label>
            <input
              type="number"
              step="0.1"
              value={form.tax_rate}
              onChange={(e) => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">{t.admin.settings.taxRateHint}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.admin.settings.receiptFooter}</label>
            <input
              value={form.receipt_footer}
              onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.admin.settings.defaultWait}
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={form.default_wait_minutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_wait_minutes: Math.max(1, Math.min(120, parseInt(e.target.value) || 15)),
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t.admin.settings.defaultWaitHint}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Save size={16} />
            {saved ? t.admin.settings.savedSettings : t.admin.settings.saveSettings}
          </button>
          {saveError && <span className="text-sm text-red-600">{saveError}</span>}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">{t.admin.settings.backup}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {t.admin.settings.backupDesc}
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <Download size={16} /> {t.admin.settings.export}
          </button>
          <label className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 cursor-pointer">
            <Upload size={16} /> {t.admin.settings.import}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  )
}
