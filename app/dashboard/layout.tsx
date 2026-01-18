import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { DatabaseProvider } from "@/lib/db/provider"
import { ModeToggle } from "@/components/mode-toggle"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DatabaseProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <ModeToggle />
          </header>
          <main className="flex-1 p-4">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DatabaseProvider>
  )
}
