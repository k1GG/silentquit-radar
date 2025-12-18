import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <div className="size-4 rounded-sm bg-primary" />
              </div>
              <span className="text-xl font-semibold">SilentQuit Radar</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Create an account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Start monitoring employee engagement today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company name</Label>
              <Input id="company" type="text" placeholder="Acme Inc." className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="name@company.com" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" placeholder="••••••••" className="bg-input border-border" />
            </div>
            <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/dashboard">Create account</Link>
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}





