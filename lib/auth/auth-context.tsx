"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  profilePictureUrl?: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isGuest: boolean
  login: (provider?: "google") => void
  logout: () => Promise<void>
  continueAsGuest: () => void
  checkLocalData: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const GUEST_MODE_KEY = "trueloggs_guest_mode"

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
  initialUser?: User | null
}

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      setIsLoading(false)
      return
    }

    if (typeof window !== "undefined") {
      const guestMode = localStorage.getItem(GUEST_MODE_KEY)
      if (guestMode === "true") {
        setIsGuest(true)
      }
    }
    setIsLoading(false)
  }, [initialUser])

  const login = useCallback((provider?: "google") => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_MODE_KEY)
    }

    if (provider === "google") {
      window.location.href = "/login?provider=google"
    } else {
      window.location.href = "/login"
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const { signOut } = await import("@workos-inc/authkit-nextjs")
      await signOut()
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/")
    }
    setUser(null)
  }, [router])

  const continueAsGuest = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(GUEST_MODE_KEY, "true")
    }
    setIsGuest(true)
    router.push("/dashboard")
  }, [router])

  const checkLocalData = useCallback(async (): Promise<boolean> => {
    try {
      const { db } = await import("@/lib/db")
      const projectCount = await db.projects.count()
      const timeEntryCount = await db.timeEntries.count()
      const invoiceCount = await db.invoices.count()
      return projectCount > 0 || timeEntryCount > 0 || invoiceCount > 0
    } catch {
      return false
    }
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isGuest,
    login,
    logout,
    continueAsGuest,
    checkLocalData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
