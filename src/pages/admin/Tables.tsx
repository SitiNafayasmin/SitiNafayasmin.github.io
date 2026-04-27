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
      for (const t of tables) {
        if (qrCache[t.id]) {
          next[t.id] = qrCache[t.id]
          continue
        }
        try {
          next[t.id] = await renderTableQR(t.label)
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
      setError('Invalid or duplicate table label (use letters/numbers only).')
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
        title="Tables & QR Codes"
        description="Generate a unique QR code for each table. Customers scan to open the menu on their phone."
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              New table label
            </label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. 1, 2, Patio-A"
              maxLength={32}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>
          <Button onClick={handleAdd}>
            <Plus size={16} /> Add Table
          </Button>
        </div>
      </Card>

      {tables.length === 0 ? (
        <EmptyState
          icon={<QrCode size={40} />}
          title="No tables yet"
          description="Add a table above to generate its QR code."
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
                      Table {table.label}
                    </h3>
                    <Badge tone={table.active ? 'green' : 'slate'}>
                      {table.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                    title="Delete table"
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
                    Generating...
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
                    <Download size={14} /> Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateTable(table.id, { active: !table.active })
                    }
                  >
                    {table.active ? 'Disable' : 'Enable'}
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
