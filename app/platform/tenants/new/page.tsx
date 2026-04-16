import { createWorkspaceAction } from '@/app/platform/actions'

export default function NewWorkspacePage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">New workspace</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Creates a workspace and sends an invitation email to the first admin.
      </p>
      <form action={createWorkspaceAction} className="mt-8 space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Organization name
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="slug" className="text-sm font-medium">
            Subdomain slug
          </label>
          <input
            id="slug"
            name="slug"
            placeholder="acme"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Becomes <strong>slug.yourdomain.com</strong> — used for workspace routing.
          </p>
        </div>
        <div>
          <label htmlFor="firstAdminEmail" className="text-sm font-medium">
            First admin email
          </label>
          <input
            id="firstAdminEmail"
            name="firstAdminEmail"
            type="email"
            required
            placeholder="admin@company.com"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This person will receive an invite email as workspace admin.
          </p>
        </div>
        <div>
          <label htmlFor="brandName" className="text-sm font-medium">
            Display name (optional)
          </label>
          <input
            id="brandName"
            name="brandName"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create workspace
        </button>
      </form>
    </div>
  )
}