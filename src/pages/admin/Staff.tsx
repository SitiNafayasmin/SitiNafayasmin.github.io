import { useEffect, useState } from 'react'
import { Plus, Trash2, UserCheck, UserX, Mail } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { isValidEmail } from '../../lib/security'
import type { StaffRole } from '../../lib/types'
import { t } from '../../lib/i18n'
import { Button, Card, PageHeader, Badge, Input, EmptyState } from '../../components/ui/primitives'
import { formatDateTime } from '../../lib/utils'

export function AdminStaff() {
  const staffList = useAuthStore((s) => s.staffList)
  const currentUser = useAuthStore((s) => s.currentUser)
  const inviteStaff = useAuthStore((s) => s.inviteStaff)
  const updateStaff = useAuthStore((s) => s.updateStaff)
  const deleteStaff = useAuthStore((s) => s.deleteStaff)
  const refreshStaffList = useAuthStore((s) => s.refreshStaffList)

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<StaffRole>('cashier')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refreshStaffList()
  }, [refreshStaffList])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!name.trim()) {
      setError(t.common.required + ': ' + t.common.name)
      return
    }
    if (!isValidEmail(email)) {
      setError('Email tidak valid.')
      return
    }
    setSubmitting(true)
    const result = await inviteStaff(email, name, role)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.message || t.admin.staff.inviteFailed)
      return
    }
    setInfo(`${t.admin.staff.inviteSent} ${email}`)
    setEmail('')
    setName('')
    setShowForm(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t.admin.staff.deleteConfirm)) return
    await deleteStaff(id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.admin.staff.title}
        description={t.admin.staff.subtitle}
        actions={
          <Button
            onClick={() => {
              setInfo('')
              setError('')
              setShowForm((v) => !v)
            }}
          >
            <Plus size={16} />
            {t.admin.staff.invite}
          </Button>
        }
      />

      {info && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {info}
        </div>
      )}

      {showForm && (
        <Card>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">
            {t.admin.staff.inviteTitle}
          </h3>
          <p className="mb-4 text-sm text-slate-500">{t.admin.staff.inviteDesc}</p>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.admin.staff.nameLabel}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.admin.staff.emailLabel}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t.admin.staff.roleLabel}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="cashier">{t.admin.staff.roleCashier}</option>
                  <option value="admin">{t.admin.staff.roleAdmin}</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={submitting}>
                <Mail size={16} />
                {t.admin.staff.invite}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                {t.common.cancel}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {staffList.length === 0 ? (
        <EmptyState
          title={t.admin.staff.emptyTitle}
          description={t.admin.staff.emptyDesc}
        />
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500">
                  <th className="px-6 py-3 font-medium">{t.admin.staff.nameLabel}</th>
                  <th className="px-6 py-3 font-medium">{t.admin.staff.emailLabel}</th>
                  <th className="px-6 py-3 font-medium">{t.admin.staff.roleLabel}</th>
                  <th className="px-6 py-3 font-medium">{t.common.status}</th>
                  <th className="px-6 py-3 font-medium text-right">{t.common.name}</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => {
                  const isSelf = currentUser?.id === staff.id
                  return (
                    <tr key={staff.id} className="border-t last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {staff.name}{' '}
                        {isSelf && (
                          <span className="ml-1 text-xs text-slate-400">
                            ({t.admin.staff.you})
                          </span>
                        )}
                        <div className="text-xs text-slate-400">
                          {formatDateTime(staff.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{staff.email}</td>
                      <td className="px-6 py-4">
                        <Badge color={staff.role === 'admin' ? 'indigo' : 'blue'}>
                          {staff.role === 'admin' ? t.admin.staff.roleAdmin : t.admin.staff.roleCashier}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {staff.user_id ? (
                          <Badge color={staff.active ? 'green' : 'red'}>
                            {staff.active ? t.common.active : t.common.inactive}
                          </Badge>
                        ) : (
                          <Badge color="amber">{t.admin.staff.pendingInvite}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateStaff(staff.id, { active: !staff.active })}
                            disabled={isSelf}
                            title={staff.active ? t.admin.staff.deactivate : t.admin.staff.activate}
                          >
                            {staff.active ? <UserX size={14} /> : <UserCheck size={14} />}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(staff.id)}
                            disabled={isSelf}
                            title={t.admin.staff.delete}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
