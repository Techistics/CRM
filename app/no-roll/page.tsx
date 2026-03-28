export default function NoRolePage() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-white text-lg font-medium">Account pending setup</p>
          <p className="text-gray-400 text-sm mt-2">
            Your account has no role assigned. Contact your admin.
          </p>
        </div>
      </main>
    )
  }