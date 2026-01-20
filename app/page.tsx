"use client"

import { useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Clock, Cloud, Timer, FileText, ArrowRight, User } from "lucide-react"

function getInitialGuestMode(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem("trueloggs_guest_mode") === "true"
}

export default function LandingPage() {
  const router = useRouter()
  const redirectedRef = useRef(false)

  useLayoutEffect(() => {
    if (redirectedRef.current) return
    const guestMode = getInitialGuestMode()
    if (guestMode) {
      redirectedRef.current = true
      router.push("/dashboard")
    }
  }, [router])

  const handleContinueAsGuest = () => {
    localStorage.setItem("trueloggs_guest_mode", "true")
    router.push("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Timer className="size-6 text-primary" />
            <span className="text-xl font-semibold">TrueLoggs</span>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Track Time.
            <br />
            <span className="text-primary">Build Invoices.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            A simple, powerful time tracking app for freelancers and teams.
            Track your work, generate professional invoices, and sync across
            devices.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                <User className="mr-2 size-4" />
                Sign In with Google or Email
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleContinueAsGuest}
            >
              Continue as Guest
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Guest mode works offline. Sign in to sync across devices.
          </p>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Timer className="size-6" />}
            title="Time Tracking"
            description="Start and stop timers with one click. Track time across multiple projects."
          />
          <FeatureCard
            icon={<FileText className="size-6" />}
            title="Invoicing"
            description="Generate professional PDF invoices from your tracked time entries."
          />
          <FeatureCard
            icon={<Clock className="size-6" />}
            title="Reports"
            description="See your work patterns with detailed charts and statistics."
          />
          <FeatureCard
            icon={<Cloud className="size-6" />}
            title="Cloud Sync"
            description="Sign in to sync your data across all your devices automatically."
          />
          <FeatureCard
            icon={
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
            title="Offline First"
            description="Works without internet. Your data is stored locally and syncs when online."
          />
          <FeatureCard
            icon={
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            }
            title="Privacy First"
            description="Your data stays on your device in guest mode. No account required."
          />
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TrueLoggs. All rights reserved.</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-left">
      <div className="mb-3 text-primary">{icon}</div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
