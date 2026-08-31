'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, Clock, Check, Users, Shield, UserCheck, Mail, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiCall } from '@/lib/utils/api-handler'

type TeamRole = 'ADMIN' | 'PRO'

type TeamMember = {
  id: string
  name: string
  email: string
  role: TeamRole
  totalLeads: number
  activeLeads: number
  paidLeads: number
  status: 'active' | 'pending_invite'
  invitationId: string | null
  customRoleId?: string | null
}

const BRAND = '#0DA2E7'

function getInitials(name: string) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic soft color for avatar background, derived from the name/email
function avatarColor(seed: string) {
  const palette = [
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return palette[Math.abs(hash) % palette.length]
}

export default function TeamManagementClient({
  initialMembers,
  customRoles = [],
  isAdmin = true,
}: {
  initialMembers: TeamMember[]
  customRoles?: { id: string; name: string }[]
  isAdmin?: boolean
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('PRO')
  const [inviteCustomRoleId, setInviteCustomRoleId] = useState('none')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<TeamRole>('PRO')
  const [editCustomRoleId, setEditCustomRoleId] = useState('none')
  const [newPassword, setNewPassword] = useState('')

  const [resendOpen, setResendOpen] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendRole, setResendRole] = useState<TeamRole>('PRO')

  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeMemberData, setRemoveMemberData] = useState<{ id: string; name: string; activeLeadCount: number } | null>(null)

  const stats = useMemo(() => {
    const admins = members.filter((m) => m.role === 'ADMIN').length
    const pros = members.filter((m) => m.role === 'PRO').length
    const pending = members.filter((m) => m.status === 'pending_invite').length
    return { admins, pros, pending, total: members.length }
  }, [members])

  const { tenantSlug } = useParams<{ tenantSlug: string }>()

  async function inviteMember() {
    setBusyId('invite')
    const result = await apiCall(async () => {
      const res = await fetch(`/api/t/${tenantSlug}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          name: inviteName || undefined,
          customRoleId: inviteCustomRoleId === 'none' ? null : inviteCustomRoleId,
        }),
      })

      const data = await res.json()

      if (res.status === 409) {
        throw new Error('This user is already in your workspace')
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      return data
    }, {
      successMsg: 'Operation successful',
      errorMsg: 'Invite failed',
      onSuccess: (data) => {
        if (data.added) toast.success(`${inviteEmail} added to workspace`)
        else toast.success(`Invitation sent to ${inviteEmail}`)
      }
    })

    setBusyId(null)
    if (!result) return

    setInviteOpen(false)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('PRO')
    setInviteCustomRoleId('none')
    router.refresh()
  }

  function startEdit(member: TeamMember) {
    setEditId(member.id)
    setEditEmail(member.email)
    setEditRole(member.role)
    setEditCustomRoleId(member.customRoleId ?? 'none')
    setNewPassword('')
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editId) return
    setBusyId(editId)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/admin/team-members/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          email: editEmail.trim(),
          customRoleId: editCustomRoleId === 'none' ? null : editCustomRoleId,
        }),
      })
      return res.json()
    }, {
      successMsg: 'Member updated',
      errorMsg: 'Update failed',
    })
    setBusyId(null)
    if (!data) return

    setMembers((prev) =>
      prev.map((m) => (m.id === editId ? { ...m, role: editRole, customRoleId: editCustomRoleId === 'none' ? null : editCustomRoleId } : m)),
    )
    setEditOpen(false)
    router.refresh()
  }

  async function doResetPassword() {
    if (!editId || newPassword.length < 8) return
    setBusyId('resetPwd')
    const data = await apiCall(async () => {
      const res = await fetch(`/api/admin/team-members/${editId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reset password')
      }
      return res.json()
    }, {
      successMsg: 'Password reset and email sent',
      errorMsg: 'Reset failed',
    })
    setBusyId(null)
    if (!data) return
    setNewPassword('')
  }

  function startResend(member: TeamMember) {
    if (!member.email) return
    setResendEmail(member.email)
    setResendRole(member.role)
    setResendOpen(true)
  }

  async function resendInvite() {
    if (!resendEmail) return
    setBusyId('resend')
    const data = await apiCall(async () => {
      const res = await fetch('/api/admin/team-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail, role: resendRole }),
      })
      return res.json()
    }, {
      successMsg: 'Invite resent',
      errorMsg: 'Resend failed',
    })
    setBusyId(null)
    if (!data) return

    setResendOpen(false)
    router.refresh()
  }

  function startRemove(member: TeamMember) {
    setRemoveMemberData({ id: member.id, name: member.name, activeLeadCount: member.activeLeads ?? 0 })
    setRemoveOpen(true)
  }

  async function removeMember() {
    if (!removeMemberData) return

    setBusyId(removeMemberData.id)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/admin/team-members/${removeMemberData.id}`, {
        method: 'DELETE',
      })
      return res.json()
    }, {
      successMsg: 'Member removed',
      errorMsg: 'Remove failed',
    })
    setBusyId(null)
    if (!data) return

    setMembers((prev) => prev.filter((m) => m.id !== removeMemberData.id))
    setRemoveOpen(false)
    setRemoveMemberData(null)
    router.refresh()
  }

  return (
    <div className="w-full min-w-0 p-0 sm:p-2 lg:p-4">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#223955] dark:text-slate-100">
            Team
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage who has access to this workspace
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="text-white shadow-sm transition-colors"
          style={{ backgroundColor: BRAND }}
        >
          + Add member
        </Button>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="group rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-[#0f172a] dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total members</p>
            <Users className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#223955] dark:text-slate-100">{stats.total}</p>
        </div>

        <div className="group rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-[#0f172a] dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Admins</p>
            <Shield className="h-4 w-4" style={{ color: BRAND }} />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#223955] dark:text-slate-100">{stats.admins}</p>
        </div>

        <div className="group rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-[#0f172a] dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pros</p>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#223955] dark:text-slate-100">{stats.pros}</p>
        </div>

        <div className="group rounded-xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-[#0f172a] dark:border-slate-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pending</p>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-[#223955] dark:text-slate-100">{stats.pending}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white dark:bg-[#0f172a] dark:border-slate-700">
        <div className="crm-table-scroll">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          avatarColor(m.email || m.name)
                        )}
                      >
                        {getInitials(m.name)}
                      </div>
                      <span className="font-medium text-foreground">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 opacity-50" />
                      {m.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                        m.role === 'ADMIN'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      )}
                      style={
                        m.role === 'ADMIN'
                          ? { backgroundColor: `${BRAND}1A`, color: BRAND, borderColor: `${BRAND}40` }
                          : undefined
                      }
                    >
                      {m.role === 'ADMIN' ? 'Admin' : 'Pro'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.totalLeads}</td>
                  <td className="px-4 py-3">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                        m.status === 'pending_invite'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      )}
                    >
                      {m.status === 'pending_invite' ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      )}
                      {m.status === 'pending_invite' ? 'Pending invite' : 'Active'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {m.status === 'pending_invite' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === m.id || busyId === 'resend'}
                          onClick={() => startResend(m)}
                        >
                          {busyId === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend'}
                        </Button>
                      ) : (
                        <>
                          {(!isAdmin && m.role === 'ADMIN') ? null : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === m.id}
                              onClick={() => startEdit(m)}
                              className="hover:border-[#0DA2E7] hover:text-[#0DA2E7]"
                            >
                              {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Edit'}
                            </Button>
                          )}
                          {(!isAdmin && m.role === 'ADMIN') ? null : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busyId === m.id}
                              onClick={() => startRemove(m)}
                            >
                              {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-40" />
                      <p>No team members yet.</p>
                      <Button
                        size="sm"
                        className="mt-1 text-white"
                        style={{ backgroundColor: BRAND }}
                        onClick={() => setInviteOpen(true)}
                      >
                        Add your first member
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Send a workspace invite and assign a role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="user@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              required
            />
            <Input
              placeholder="Full Name (Optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />

            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRO">Pro</SelectItem>
                {isAdmin && <SelectItem value="ADMIN">Admin</SelectItem>}
              </SelectContent>
            </Select>
            {isAdmin && inviteRole === 'PRO' && (
              <Select value={inviteCustomRoleId} onValueChange={setInviteCustomRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Custom role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No custom role</SelectItem>
                  {customRoles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busyId === 'invite'}
              onClick={inviteMember}
              className="text-white"
              style={{ backgroundColor: BRAND }}
            >
              {busyId === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAdmin ? 'Edit member role' : 'Edit member'}</DialogTitle>
            <DialogDescription>
              {isAdmin ? "Update this user's workspace role." : 'Update this counselor\'s email address.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            {isAdmin && (
              <>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as TeamRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {editRole === 'PRO' && (
                  <Select value={editCustomRoleId} onValueChange={setEditCustomRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Custom role (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No custom role</SelectItem>
                      {customRoles.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="mt-6 border-t dark:border-slate-700 pt-4">
                  <h4 className="text-sm font-medium mb-1">Reset Password</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set a new temporary password for this user. They will receive an email with the new password.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      disabled={busyId === 'resetPwd' || newPassword.length < 8}
                      onClick={doResetPassword}
                    >
                      {busyId === 'resetPwd' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset & Email'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editId || busyId === editId}
              onClick={saveEdit}
              className="text-white"
              style={{ backgroundColor: BRAND }}
            >
              {busyId === editId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend dialog */}
      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend invitation</DialogTitle>
            <DialogDescription>
              Update role and resend the invite link to <strong>{resendEmail}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Select value={resendRole} onValueChange={(v) => setResendRole(v as TeamRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRO">Pro</SelectItem>
              {isAdmin && <SelectItem value="ADMIN">Admin</SelectItem>}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busyId === 'resend'}
              onClick={resendInvite}
              className="text-white"
              style={{ backgroundColor: BRAND }}
            >
              {busyId === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeMemberData?.name ?? 'member'}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will remove the member from the workspace. This action cannot be undone.</p>
                {(removeMemberData?.activeLeadCount ?? 0) > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>
                      This member has <strong>{removeMemberData?.activeLeadCount} active lead{(removeMemberData?.activeLeadCount ?? 0) > 1 ? 's' : ''}</strong> that will become unassigned.
                      You can <a
                        href={`/t/${tenantSlug}/admin/leads?assignedTo=unassigned`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-medium"
                      >view unassigned leads</a> after removal to reassign them.
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}