'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import { Building2, Image as ImageIcon, Loader2, Save, ShieldCheck, Upload, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { Tenant } from '@/types/models'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useRef, useCallback } from 'react'


interface GeneralSettingsClientProps {
  tenant: Tenant
}

export default function GeneralSettingsClient({ tenant }: GeneralSettingsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [cpLoading, setCpLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const initialSettings = (tenant.settings as Record<string, string | null>) || {}
  const [name, setName] = useState(tenant.name)
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl || '')

  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState('')
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds the 2MB limit. Please choose a smaller image.')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImgSrc(reader.result as string)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width,
      height
    )
    setCrop(initialCrop)
  }

  const handleCropAndUpload = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) return

    const image = imgRef.current
    const canvas = canvasRef.current
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob(async (blob) => {
      if (!blob) return
      setCropModalOpen(false)
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', blob, 'logo.png')
        const res = await fetch('/api/admin/workspace/upload', {
          method: 'POST',
          body: formData,
        })
        
        let data: any = {}
        try {
          data = await res.json()
        } catch {
          // If server returns 500 HTML instead of JSON
        }

        if (!res.ok) {
          if (res.status === 413) throw new Error('File is too large to upload (Max 2MB).')
          throw new Error(data.error || 'Upload failed. The image might be too large or in an unsupported format.')
        }

        setLogoUrl(data.url)
        await fetch('/api/admin/workspace', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, logoUrl: data.url }),
        })
        toast.success('Logo uploaded successfully!')
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    }, 'image/png')
  }, [completedCrop])

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
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Workspace Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">Manage your organization&apos;s identity and branding</p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0f172a] dark:border-slate-700">
          <CardHeader className=" border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base font-bold dark:text-slate-100 ">General Information</CardTitle>
                <CardDescription className="text-xs dark:text-slate-400">Update your workspace name and slug</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm font-medium text-slate-700 pt-2 dark:text-slate-300">Workspace Name</Label>
              <div className="relative">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Immigration"
                  className="h-9 border-slate-200 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
              <p className="text-xs text-slate-400">This name will appear in the sidebar and navigation headers.</p>
            </div>

            <div className="grid gap-2 opacity-60 cursor-not-allowed">
              <Label htmlFor="slug" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Workspace Slug
                <span title="Protected field" className="inline-flex">
                  <ShieldCheck className="h-3 w-3 text-gray-400" />
                </span>
              </Label>
              <Input
                id="slug"
                value={tenant.slug}
                disabled
                className="h-10 bg-gray-50 border-gray-100 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400"
              />
              <p className="text-xs text-slate-400">The slug is used in your unique URL and cannot be changed.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0f172a] dark:border-slate-700">
          <CardHeader className=" border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-500" />
              <div>
                <CardTitle className="text-base font-bold dark:text-slate-100">Branding</CardTitle>
                <CardDescription className="text-xs dark:text-slate-400">Customize how your workspace looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="shrink-0 flex flex-col items-center gap-2 mt-2">
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
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-4">Upload New Logo</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        className="h-10 px-4 border-gray-200 bg-white hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                    <Label htmlFor="logo" className="text-sm font-medium text-slate-700 dark:text-slate-300">Logo URL (Alternative)</Label>
                    <Input
                      id="logo"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="h-9 border-slate-200 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-200 rounded-xl shadow-crm-sm overflow-hidden dark:bg-[#0f172a] dark:border-slate-700">
          <CardHeader className=" border-slate-200 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-500" />
              <div>
                <CardTitle className="text-base font-bold dark:text-slate-100">Change Password</CardTitle>
                <CardDescription className="text-xs dark:text-slate-400">Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 pt-4 ">Current Password</Label>
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
                  <><KeyRound className="mr-2 h-4 w-4 text-black " /><span className='dark:text-black '> Update Password</span></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
            className="text-gray-500 dark:text-slate-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="min-w-[120px] bg-brand hover:bg-brand-hover text-white transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <><Save className="mr-2 h-4 w-4 text-black " /><span className='dark:text-black '> Save Changes</span></>
            )}
          </Button>
        </div>
      </div>
      {cropModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Crop Logo</h3>
            <div className="flex justify-center mb-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop={false}
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  className="max-h-[400px] max-w-full object-contain"
                />
              </ReactCrop>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setCropModalOpen(false)
                  setImgSrc('')
                }}
                className="text-slate-500"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCropAndUpload}
                disabled={uploading || !completedCrop}
                className="bg-sky-500 hover:bg-sky-600 text-white"
              >
                {uploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
                ) : (
                  'Crop & Upload'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
