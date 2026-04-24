'use client'

import { useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
}

export default function TeamManagementClient({
  initialMembers,
}: {
  initialMembers: TeamMember[]
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('PRO')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<TeamRole>('PRO')
  
  const [resendOpen, setResendOpen] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resendRole, setResendRole] = useState<TeamRole>('PRO')

  const stats = useMemo(() => {
    const admins = members.filter((m) => m.role === 'ADMIN').length
    const pros = members.filter((m) => m.role === 'PRO').length
    return { admins, pros }
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
          name: inviteName || undefined // Add name field to state if not exists
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
    router.refresh()
  }


  function startEdit(member: TeamMember) {
    setEditId(member.id)
    setEditRole(member.role)
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editId) return
    setBusyId(editId)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/admin/team-members/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editRole }),
      })
      return res.json()
    }, {
      successMsg: 'Member updated',
      errorMsg: 'Update failed',
    })
    setBusyId(null)
    if (!data) return

    setMembers((prev) =>
      prev.map((m) => (m.id === editId ? { ...m, role: editRole } : m)),
    )
    setEditOpen(false)
    router.refresh()
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

  async function removeMember(memberId: string) {
    const ok = window.confirm('Remove this member from the workspace?')
    if (!ok) return

    setBusyId(memberId)
    const data = await apiCall(async () => {
      const res = await fetch(`/api/admin/team-members/${memberId}`, {
        method: 'DELETE',
      })
      return res.json()
    }, {
      successMsg: 'Member removed',
      errorMsg: 'Remove failed',
    })
    setBusyId(null)
    if (!data) return

    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#223955]">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} total member{members.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>Add member</Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:max-w-md">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Admins</p>
          <p className="mt-1 text-2xl font-semibold">{stats.admins}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-muted-foreground">Pros</p>
          <p className="mt-1 text-2xl font-semibold">{stats.pros}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-muted px-2 py-1 text-xs">
                    {m.role === 'ADMIN' ? 'Admin' : 'Pro'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.totalLeads} total / {m.paidLeads} paid
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs ${
                      m.status === 'pending_invite'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {m.status === 'pending_invite' ? 'Pending invite' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
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
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === m.id}
                        onClick={() => startEdit(m)}
                      >
                        {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Edit'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === m.id}
                      onClick={() => removeMember(m.id)}
                    >
                      {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Send a workspace invite and assign role.
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
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busyId === 'invite'} onClick={inviteMember}>
              {busyId === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member role</DialogTitle>
            <DialogDescription>Update this user&apos;s workspace role.</DialogDescription>
          </DialogHeader>
          <Select value={editRole} onValueChange={(v) => setEditRole(v as TeamRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!editId || busyId === editId} onClick={saveEdit}>
              {busyId === editId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resend Invitation</DialogTitle>
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
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busyId === 'resend'} onClick={resendInvite}>
              {busyId === 'resend' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
