'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import { Building2, Image as ImageIcon, Loader2, Save, ShieldCheck, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { Tenant } from '@/types/models'

interface GeneralSettingsClientProps {
  tenant: Tenant
}

export default function GeneralSettingsClient({ tenant }: GeneralSettingsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const initialSettings = (tenant.settings as Record<string, string | null>) || {}
  const [name, setName] = useState(tenant.name)
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || '')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/workspace/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setLogoUrl(data.url)
      toast.success('Logo uploaded successfully!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl }),
      })

      if (!res.ok) throw new Error('Failed to update settings')

      toast.success('Workspace settings updated successfully!')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-strong)] tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization&apos;s identity and branding</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base font-bold">General Information</CardTitle>
                <CardDescription className="text-xs">Update your workspace name and slug</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Workspace Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Immigration"
                  className="pl-3 h-10 border-gray-200 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <p className="text-[11px] text-gray-400">This name will appear in the sidebar and navigation headers.</p>
            </div>

            <div className="grid gap-2 opacity-60 cursor-not-allowed">
              <Label htmlFor="slug" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                Workspace Slug
                <span title="Protected field" className="inline-flex">
                  <ShieldCheck className="h-3 w-3 text-gray-400" />
                </span>
              </Label>
              <Input
                id="slug"
                value={tenant.slug}
                disabled
                className="h-10 bg-gray-50 border-gray-100"
              />
              <p className="text-[11px] text-gray-400">The slug is used in your unique URL and cannot be changed.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="border-b bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-500" />
              <div>
                <CardTitle className="text-base font-bold">Branding</CardTitle>
                <CardDescription className="text-xs">Customize how your workspace looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden group relative">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Preview" width={96} height={96} className="h-full w-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="h-10 w-10 text-gray-300" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Logo</span>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upload New Logo</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        className="h-10 px-4 border-gray-200 bg-white hover:bg-gray-50"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Choose File
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                      />
                      <span className="text-xs text-gray-500">Max 2MB. SVG, PNG or JPG.</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="logo" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Logo URL (Alternative)</Label>
                    <Input
                      id="logo"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="h-10 border-gray-200 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
            className="text-gray-500"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
