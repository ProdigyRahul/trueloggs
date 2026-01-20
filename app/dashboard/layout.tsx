import { Suspense } from "react"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DatabaseProvider } from "@/lib/db/provider"
import { ModeToggle } from "@/components/mode-toggle"
import { SyncProvider } from "@/lib/sync/sync-provider"
import { SyncStatusIndicator } from "@/components/sync-status"
import { UserMenu } from "@/components/user-menu"
import { getUser, syncUserToCloud } from "@/lib/auth/server"
import { DashboardMigrationHandler } from "./migration-handler"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (user) {
    try {
      await syncUserToCloud(user)
    } catch (error) {
      console.error("Failed to sync user to cloud:", error)
    }
  }

  return (
    <DatabaseProvider>
      <SyncProvider userId={user?.id}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <div className="flex-1" />
              <SyncStatusIndicator />
              <UserMenu user={user} />
              <ModeToggle />
            </header>
            <main className="flex-1 p-4">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Suspense fallback={null}>
          <DashboardMigrationHandler user={user} />
        </Suspense>
      </SyncProvider>
    </DatabaseProvider>
  )
}
