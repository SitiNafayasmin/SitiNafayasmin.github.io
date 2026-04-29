import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, QrCode, Trash2 } from 'lucide-react'
import { useTableStore } from '../../stores/tableStore'
import { buildTableOrderUrl, renderTableQR } from '../../lib/qr'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from '../../components/ui/primitives'
import { t } from '../../lib/i18n'

export function AdminTables() {
  const { tables, addTable, deleteTable, updateTable, initialize } = useTableStore()
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState('')
  const [qrCache, setQrCache] = useState<Record<string, string>>({})

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next: Record<string, string> = {}
      for (const table of tables) {
        if (qrCache[table.id]) {
          next[table.id] = qrCache[table.id]
          continue
        }
        try {
          next[table.id] = await renderTableQR(table.label)
        } catch {
          // ignore invalid
        }
      }
      if (!cancelled) setQrCache(next)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables])

  const handleAdd = () => {
    setError('')
    const added = addTable(newLabel)
    if (!added) {
      setError(t.admin.tables.duplicateError)
      return
    }
    setNewLabel('')
  }

  const origin = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    [],
  )

  const handleDownload = (label: string, dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `table-${label}-qr.png`
    a.click()
  }

  return (
    <div>
      <PageHeader
        title={t.admin.tables.title}
        description={t.admin.tables.subtitle}
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t.admin.tables.newLabel}
            </label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t.admin.tables.newLabelPlaceholder}
              maxLength={32}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>
          <Button onClick={handleAdd}>
            <Plus size={16} /> {t.admin.tables.addTable}
          </Button>
        </div>
      </Card>

      {tables.length === 0 ? (
        <EmptyState
          icon={<QrCode size={40} />}
          title={t.admin.tables.emptyTitle}
          description={t.admin.tables.emptyDesc}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const qrDataUrl = qrCache[table.id]
            const url = (() => {
              try {
                return buildTableOrderUrl(table.label, origin)
              } catch {
                return ''
              }
            })()
            return (
              <Card key={table.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {t.admin.tables.tableLabel} {table.label}
                    </h3>
                    <Badge tone={table.active ? 'green' : 'slate'}>
                      {table.active ? t.common.active : t.common.disabled}
                    </Badge>
                  </div>
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                    title={t.common.delete}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for table ${table.label}`}
                    className="mx-auto h-48 w-48 rounded-lg ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    {t.common.loading}
                  </div>
                )}
                <p className="break-all text-xs text-slate-500">{url}</p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={!qrDataUrl}
                    onClick={() => qrDataUrl && handleDownload(table.label, qrDataUrl)}
                  >
                    <Download size={14} /> {t.common.download}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateTable(table.id, { active: !table.active })
                    }
                  >
                    {table.active ? t.common.disable : t.common.enable}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
