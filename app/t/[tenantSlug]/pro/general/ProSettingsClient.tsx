'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Bell, Loader2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function ProSettingsClient() {
  // ── Change Password ──
  const [cpLoading, setCpLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ── Notification Prefs (UI only — stored in localStorage for formality) ──
  const [emailNotif, setEmailNotif] = useState(true)
  const [leadAssignedNotif, setLeadAssignedNotif] = useState(true)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setCpLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setCpLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">My Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Manage your account preferences</p>
      </div>

      {/* Change Password */}
      <Card className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0f172a] dark:border-slate-700">
        <CardHeader className=" border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-base font-bold dark:text-slate-100">Change Password</CardTitle>
              <CardDescription className="text-xs dark:text-slate-400">Keep your account secure</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <Label className="text-sm font-medium text-slate-700 pt-2 dark:text-slate-300">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="h-9 border-slate-200 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="h-9 border-slate-200 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="h-9 border-slate-200 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleChangePassword}
              disabled={cpLoading}
              className="h-9 px-4 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              {cpLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
              ) : (
                <><KeyRound className="mr-2 h-4 w-4" />Update Password</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0f172a] dark:border-slate-700">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-base font-bold dark:text-slate-100">Notification Preferences</CardTitle>
              <CardDescription className="text-xs dark:text-slate-400">Choose what alerts you receive</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <p className="text-sm font-medium text-slate-700 pt-2 dark:text-slate-300">Email Notifications</p>
              <p className="text-xs text-slate-400">Receive updates via email</p>
            </div>
            <button
              onClick={() => setEmailNotif(!emailNotif)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                emailNotif ? 'bg-brand' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  emailNotif ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead Assignment Alerts</p>
              <p className="text-xs text-slate-400">Get notified when a lead is assigned to you</p>
            </div>
            <button
              onClick={() => setLeadAssignedNotif(!leadAssignedNotif)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                leadAssignedNotif ? 'bg-brand' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  leadAssignedNotif ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info (read-only formality) */}
      <Card className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0f172a] dark:border-slate-700">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-6 py-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-sky-500" />
            <div>
              <CardTitle className="text-base font-bold dark:text-slate-100">Account Info</CardTitle>
              <CardDescription className="text-xs dark:text-slate-400">Your profile details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2 opacity-60 cursor-not-allowed">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-4">Full Name</Label>
              <Input disabled placeholder="Loaded from session" className="h-9 bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400" />
            </div>
            <div className="grid gap-2 opacity-60 cursor-not-allowed">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-4">Email Address</Label>
              <Input disabled placeholder="Loaded from session" className="h-9 bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Contact your admin to update your name or email.</p>
        </CardContent>
      </Card>
    </div>
  )
}