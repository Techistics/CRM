'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Bell, Loader2, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function ProSettingsClient() {
  // ── Visibility States ──
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ── Notification Prefs (UI only — stored in localStorage for formality) ──
  const [emailNotif, setEmailNotif] = useState(true)
  const [leadAssignedNotif, setLeadAssignedNotif] = useState(true)

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">My Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Manage your account preferences</p>
      </div>

      {/* Change Password removed per requirements */}

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

      {/* Account Info */}
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