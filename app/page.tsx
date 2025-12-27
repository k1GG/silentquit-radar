import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Silent Quit Radar</h1>
        <p className="text-muted-foreground">Choose your login type</p>
        <div className="space-y-2">
          <Link href="/hr-login" className="block">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              HR Login
            </button>
          </Link>
          <Link href="/employee-login" className="block">
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
              Employee Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
