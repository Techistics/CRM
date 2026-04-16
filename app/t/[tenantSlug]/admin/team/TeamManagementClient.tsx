'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
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

type TeamRole = 'tenant_admin' | 'agent'

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
  const [error, setError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TeamRole>('agent')

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<TeamRole>('agent')

  const stats = useMemo(() => {
    const admins = members.filter((m) => m.role === 'tenant_admin').length
    const pros = members.filter((m) => m.role === 'agent').length
    return { admins, pros }
  }, [members])

  async function inviteMember() {
    setError(null)
    setBusyId('invite')
    const res = await fetch('/api/admin/team-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    setBusyId(null)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'Invite failed')
      return
    }

    const data = await res.json().catch(() => ({}))
    setMembers((prev) => [
      ...prev.filter((m) => m.email.toLowerCase() !== inviteEmail.toLowerCase()),
      {
        id: data.invitationId ? `invite:${data.invitationId}` : `invite:${inviteEmail}`,
        name: inviteEmail.split('@')[0] || 'Invited user',
        email: inviteEmail,
        role: inviteRole,
        totalLeads: 0,
        activeLeads: 0,
        paidLeads: 0,
        status: 'pending_invite',
        invitationId: data.invitationId ?? null,
      },
    ])

    setInviteOpen(false)
    setInviteEmail('')
    setInviteRole('agent')
    router.refresh()
  }

  function startEdit(member: TeamMember) {
    setError(null)
    setEditId(member.id)
    setEditRole(member.role)
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editId) return
    setError(null)
    setBusyId(editId)

    const res = await fetch(`/api/admin/team-members/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editRole }),
    })

    setBusyId(null)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'Update failed')
      return
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === editId ? { ...m, role: editRole } : m)),
    )
    setEditOpen(false)
    router.refresh()
  }

  async function removeMember(memberId: string) {
    const ok = window.confirm('Remove this member from the workspace?')
    if (!ok) return

    setError(null)
    setBusyId(memberId)
    const res = await fetch(`/api/admin/team-members/${memberId}`, {
      method: 'DELETE',
    })
    setBusyId(null)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(typeof data.error === 'string' ? data.error : 'Remove failed')
      return
    }

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

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

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
                    {m.role === 'tenant_admin' ? 'Admin' : 'Pro'}
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
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === m.id || m.status === 'pending_invite'}
                      onClick={() => startEdit(m)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === m.id}
                      onClick={() => removeMember(m.id)}
                    >
                      Remove
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
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Pro</SelectItem>
                <SelectItem value="tenant_admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busyId === 'invite'} onClick={inviteMember}>
              {busyId === 'invite' ? 'Sending…' : 'Send invite'}
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
              <SelectItem value="agent">Pro</SelectItem>
              <SelectItem value="tenant_admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!editId || busyId === editId} onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
