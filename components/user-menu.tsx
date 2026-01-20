"use client"

import { useState } from "react"
import { signOut } from "@workos-inc/authkit-nextjs"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { User, LogOut, LogIn, Settings, Cloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface UserMenuProps {
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    fullName?: string
    profilePictureUrl?: string
  } | null
  isGuest?: boolean
}

export function UserMenu({ user, isGuest }: UserMenuProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("trueloggs_guest_mode")
      }
      await signOut()
    } catch (error) {
      console.error("Sign out error:", error)
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("trueloggs_guest_mode")
    }
    router.push("/login")
  }

  if (!user || isGuest) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <User className="size-4" />
          <span className="hidden sm:inline">Guest</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Guest Mode</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <div className="px-2 py-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Cloud className="size-3.5" />
              Sign in to sync your data across devices
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignIn}>
            <LogIn className="mr-2 size-4" />
            Sign In
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const displayName = user.fullName || user.firstName || user.email.split("@")[0]
  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ""}`
    : user.email[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        {user.profilePictureUrl ? (
          <Image
            src={user.profilePictureUrl}
            alt={displayName}
            width={20}
            height={20}
            className="size-5 rounded-full"
          />
        ) : (
          <div className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline">{displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
          <Settings className="mr-2 size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          disabled={isLoading}
        >
          <LogOut className="mr-2 size-4" />
          {isLoading ? "Signing out..." : "Sign Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
