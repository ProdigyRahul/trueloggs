"use client"

import { db } from "@/lib/db"
import type {
  SyncQueueItem,
  SyncEntityType,
  SyncOperation,
  Invoice,
  Project,
  TimeEntry,
} from "@/lib/db/schema"

export interface SyncResult {
  success: boolean
  reason?: string
  error?: unknown
  pushed?: number
  pulled?: number
  conflicts?: number
}

interface PushResponse {
  projects?: Array<{
    localId: number
    cloudId: string
    syncVersion: number
    status: "success" | "conflict" | "error"
    error?: string
    serverData?: unknown
  }>
  timeEntries?: Array<{
    localId: number
    cloudId: string
    syncVersion: number
    status: "success" | "conflict" | "error"
    error?: string
    serverData?: unknown
  }>
  invoices?: Array<{
    localId: number
    cloudId: string
    syncVersion: number
    status: "success" | "conflict" | "error"
    error?: string
    serverData?: unknown
  }>
}

interface PullResponse {
  data: {
    projects?: Array<Record<string, unknown>>
    timeEntries?: Array<Record<string, unknown>>
    invoices?: Array<Record<string, unknown>>
    settings?: Array<Record<string, unknown>>
    timerState?: Array<Record<string, unknown>>
    recentTasks?: Array<Record<string, unknown>>
  }
  syncedAt: string
}

class SyncEngine {
  private isOnline: boolean = true
  private isSyncing: boolean = false
  private syncInterval: ReturnType<typeof setInterval> | null = null
  private userId: string | null = null
  private listeners: Set<(status: SyncStatus) => void> = new Set()

  constructor() {
    if (typeof window !== "undefined") {
      this.isOnline = navigator.onLine
      window.addEventListener("online", () => this.handleOnline())
      window.addEventListener("offline", () => this.handleOffline())
    }
  }

  setUser(userId: string | null) {
    this.userId = userId
    if (userId) {
      this.startPeriodicSync()
    } else {
      this.stopPeriodicSync()
    }
  }

  getUserId(): string | null {
    return this.userId
  }

  isEnabled(): boolean {
    return !!this.userId
  }

  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      userId: this.userId,
    }
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    const status = this.getStatus()
    this.listeners.forEach((listener) => listener(status))
  }

  private handleOnline() {
    this.isOnline = true
    this.notifyListeners()
    this.syncNow()
  }

  private handleOffline() {
    this.isOnline = false
    this.notifyListeners()
  }

  private startPeriodicSync() {
    if (this.syncInterval) return
    this.syncInterval = setInterval(() => this.syncNow(), 30000)
    this.syncNow()
  }

  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async syncNow(): Promise<SyncResult> {
    if (!this.isOnline || !this.userId || this.isSyncing) {
      return {
        success: false,
        reason: !this.isOnline
          ? "offline"
          : !this.userId
            ? "no_user"
            : "already_syncing",
      }
    }

    this.isSyncing = true
    this.notifyListeners()

    try {
      const pushResult = await this.pushChanges()
      const pullResult = await this.pullChanges()

      return {
        success: true,
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pushResult.conflicts,
      }
    } catch (error) {
      console.error("Sync error:", error)
      return { success: false, error }
    } finally {
      this.isSyncing = false
      this.notifyListeners()
    }
  }

  private async pushChanges(): Promise<{
    pushed: number
    conflicts: number
  }> {
    const pendingItems = await db.syncQueue.toArray()

    if (pendingItems.length === 0) {
      return { pushed: 0, conflicts: 0 }
    }

    const grouped = this.groupByEntityType(pendingItems)

    const response = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grouped),
    })

    if (!response.ok) {
      throw new Error(`Push failed: ${response.status}`)
    }

    const result: PushResponse = await response.json()

    let pushed = 0
    let conflicts = 0

    if (result.projects) {
      for (const item of result.projects) {
        if (item.status === "success") {
          await db.projects.update(item.localId, {
            cloudId: item.cloudId,
            syncStatus: "synced",
            syncVersion: item.syncVersion,
          } as Record<string, unknown>)

          await this.addIdMapping("project", item.localId, item.cloudId)

          await db.syncQueue
            .where("entityType")
            .equals("project")
            .and((q) => q.entityId === item.localId)
            .delete()

          pushed++
        } else if (item.status === "conflict") {
          await db.projects.update(item.localId, {
            syncStatus: "conflict",
          } as Record<string, unknown>)
          conflicts++
        }
      }
    }

    if (result.timeEntries) {
      for (const item of result.timeEntries) {
        if (item.status === "success") {
          await db.timeEntries.update(item.localId, {
            cloudId: item.cloudId,
            syncStatus: "synced",
            syncVersion: item.syncVersion,
          } as Record<string, unknown>)

          await this.addIdMapping("timeEntry", item.localId, item.cloudId)

          await db.syncQueue
            .where("entityType")
            .equals("timeEntry")
            .and((q) => q.entityId === item.localId)
            .delete()

          pushed++
        } else if (item.status === "conflict") {
          await db.timeEntries.update(item.localId, {
            syncStatus: "conflict",
          } as Record<string, unknown>)
          conflicts++
        }
      }
    }

    if (result.invoices) {
      for (const item of result.invoices) {
        if (item.status === "success") {
          await db.invoices.where("id").equals(item.localId).modify({
            cloudId: item.cloudId,
            syncStatus: "synced",
            syncVersion: item.syncVersion,
          })

          await this.addIdMapping("invoice", item.localId, item.cloudId)

          await db.syncQueue
            .where("entityType")
            .equals("invoice")
            .and((q) => q.entityId === item.localId)
            .delete()

          pushed++
        } else if (item.status === "conflict") {
          await db.invoices.where("id").equals(item.localId).modify({
            syncStatus: "conflict",
          })
          conflicts++
        }
      }
    }

    return { pushed, conflicts }
  }

  private async pullChanges(): Promise<{ pulled: number }> {
    const lastSync = this.getLastSyncTime()

    const url = lastSync
      ? `/api/sync/pull?lastSyncedAt=${encodeURIComponent(lastSync)}`
      : "/api/sync/pull"

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Pull failed: ${response.status}`)
    }

    const result: PullResponse = await response.json()
    let pulled = 0

    await db.transaction(
      "rw",
      [db.projects, db.timeEntries, db.invoices, db.idMappings],
      async () => {
        if (result.data.projects) {
          for (const remote of result.data.projects) {
            pulled += await this.applyRemoteProject(remote)
          }
        }

        if (result.data.timeEntries) {
          for (const remote of result.data.timeEntries) {
            pulled += await this.applyRemoteTimeEntry(remote)
          }
        }

        if (result.data.invoices) {
          for (const remote of result.data.invoices) {
            pulled += await this.applyRemoteInvoice(remote)
          }
        }
      }
    )

    this.setLastSyncTime(result.syncedAt)

    return { pulled }
  }

  private async applyRemoteProject(
    remote: Record<string, unknown>
  ): Promise<number> {
    const cloudId = remote.cloudId as string
    const deletedAt = remote.deletedAt as string | null

    const mapping = await db.idMappings
      .where("[entityType+cloudId]")
      .equals(["project", cloudId])
      .first()

    if (deletedAt) {
      if (mapping) {
        await db.projects.delete(mapping.localId)
        await db.idMappings.delete(mapping.id!)
      }
      return 1
    }

    if (mapping) {
      const local = await db.projects.get(mapping.localId)
      const localVersion = local?.syncVersion || 0
      const remoteVersion = remote.syncVersion as number

      if (!local || localVersion < remoteVersion) {
        await db.projects.update(mapping.localId, {
          name: remote.name as string,
          clientName: remote.clientName as string | undefined,
          hourlyRate: remote.hourlyRate as number,
          color: remote.color as string,
          status: remote.status as "active" | "archived",
          cloudId,
          syncStatus: "synced",
          syncVersion: remoteVersion,
          updatedAt: new Date(remote.updatedAt as string),
        })
        return 1
      }
    } else {
      const projectData: Project = {
        name: remote.name as string,
        clientName: remote.clientName as string | undefined,
        hourlyRate: remote.hourlyRate as number,
        color: remote.color as string,
        status: remote.status as "active" | "archived",
        cloudId,
        syncStatus: "synced",
        syncVersion: remote.syncVersion as number,
        createdAt: new Date(remote.createdAt as string),
        updatedAt: new Date(remote.updatedAt as string),
      }
      const localId = (await db.projects.add(projectData)) as number

      await this.addIdMapping("project", localId, cloudId)
      return 1
    }

    return 0
  }

  private async applyRemoteTimeEntry(
    remote: Record<string, unknown>
  ): Promise<number> {
    const cloudId = remote.cloudId as string
    const deletedAt = remote.deletedAt as string | null
    const projectCloudId = remote.projectCloudId as string

    const projectMapping = await db.idMappings
      .where("[entityType+cloudId]")
      .equals(["project", projectCloudId])
      .first()

    if (!projectMapping) {
      console.warn(`No local project found for cloud ID: ${projectCloudId}`)
      return 0
    }

    const mapping = await db.idMappings
      .where("[entityType+cloudId]")
      .equals(["timeEntry", cloudId])
      .first()

    if (deletedAt) {
      if (mapping) {
        await db.timeEntries.delete(mapping.localId)
        await db.idMappings.delete(mapping.id!)
      }
      return 1
    }

    if (mapping) {
      const local = await db.timeEntries.get(mapping.localId)
      const localVersion = local?.syncVersion || 0
      const remoteVersion = remote.syncVersion as number

      if (!local || localVersion < remoteVersion) {
        await db.timeEntries.update(mapping.localId, {
          projectId: projectMapping.localId,
          date: new Date(remote.date as string),
          duration: remote.duration as number,
          notes: remote.notes as string | undefined,
          cloudId,
          projectCloudId,
          syncStatus: "synced",
          syncVersion: remoteVersion,
          updatedAt: new Date(remote.updatedAt as string),
        })
        return 1
      }
    } else {
      const entryData: TimeEntry = {
        projectId: projectMapping.localId,
        date: new Date(remote.date as string),
        duration: remote.duration as number,
        notes: remote.notes as string | undefined,
        cloudId,
        projectCloudId,
        syncStatus: "synced",
        syncVersion: remote.syncVersion as number,
        createdAt: new Date(remote.createdAt as string),
        updatedAt: new Date(remote.updatedAt as string),
      }
      const localId = (await db.timeEntries.add(entryData)) as number

      await this.addIdMapping("timeEntry", localId, cloudId)
      return 1
    }

    return 0
  }

  private async applyRemoteInvoice(
    remote: Record<string, unknown>
  ): Promise<number> {
    const cloudId = remote.cloudId as string
    const deletedAt = remote.deletedAt as string | null

    const mapping = await db.idMappings
      .where("[entityType+cloudId]")
      .equals(["invoice", cloudId])
      .first()

    if (deletedAt) {
      if (mapping) {
        await db.invoices.delete(mapping.localId)
        await db.idMappings.delete(mapping.id!)
      }
      return 1
    }

    const lineItems =
      typeof remote.lineItems === "string"
        ? JSON.parse(remote.lineItems)
        : remote.lineItems

    if (mapping) {
      const local = await db.invoices.get(mapping.localId)
      const localVersion = local?.syncVersion || 0
      const remoteVersion = remote.syncVersion as number

      if (!local || localVersion < remoteVersion) {
        await db.invoices.where("id").equals(mapping.localId).modify({
          invoiceNumber: remote.invoiceNumber as string,
          status: remote.status as "draft" | "sent" | "paid" | "cancelled",
          invoiceDate: remote.invoiceDate as string,
          dueDate: remote.dueDate as string,
          paidAt: remote.paidAt as string | undefined,
          companyName: remote.companyName as string,
          companyEmail: remote.companyEmail as string,
          companyPhone: remote.companyPhone as string,
          companyAddress: remote.companyAddress as string,
          clientName: remote.clientName as string,
          clientEmail: remote.clientEmail as string | undefined,
          projectName: remote.projectName as string,
          projectColor: remote.projectColor as string,
          lineItems,
          subtotal: remote.subtotal as number,
          taxRate: remote.taxRate as number,
          taxAmount: remote.taxAmount as number,
          total: remote.total as number,
          periodStart: remote.periodStart as string,
          periodEnd: remote.periodEnd as string,
          notes: remote.notes as string | undefined,
          paymentTerms: remote.paymentTerms as string | undefined,
          cloudId,
          syncStatus: "synced",
          syncVersion: remoteVersion,
          updatedAt: remote.updatedAt as string,
        })
        return 1
      }
    } else {
      const invoiceData: Invoice = {
        invoiceNumber: remote.invoiceNumber as string,
        status: remote.status as "draft" | "sent" | "paid" | "cancelled",
        invoiceDate: remote.invoiceDate as string,
        dueDate: remote.dueDate as string,
        paidAt: remote.paidAt as string | undefined,
        companyName: remote.companyName as string,
        companyEmail: remote.companyEmail as string,
        companyPhone: remote.companyPhone as string,
        companyAddress: remote.companyAddress as string,
        clientName: remote.clientName as string,
        clientEmail: remote.clientEmail as string | undefined,
        projectName: remote.projectName as string,
        projectColor: remote.projectColor as string,
        lineItems,
        subtotal: remote.subtotal as number,
        taxRate: remote.taxRate as number,
        taxAmount: remote.taxAmount as number,
        total: remote.total as number,
        periodStart: remote.periodStart as string,
        periodEnd: remote.periodEnd as string,
        notes: remote.notes as string | undefined,
        paymentTerms: remote.paymentTerms as string | undefined,
        cloudId,
        syncStatus: "synced",
        syncVersion: remote.syncVersion as number,
        createdAt: remote.createdAt as string,
        updatedAt: remote.updatedAt as string,
      }
      const localId = (await db.invoices.add(invoiceData)) as number

      await this.addIdMapping("invoice", localId, cloudId)
      return 1
    }

    return 0
  }

  private groupByEntityType(items: SyncQueueItem[]): Record<string, unknown[]> {
    const grouped: Record<string, unknown[]> = {}

    for (const item of items) {
      const key = `${item.entityType}s`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push({
        operation: item.operation,
        localId: item.entityId,
        cloudId: item.cloudId,
        data: item.payload,
        syncVersion: 1,
      })
    }

    return grouped
  }

  private async addIdMapping(
    entityType: string,
    localId: number,
    cloudId: string
  ): Promise<void> {
    if (!this.userId) return

    const existing = await db.idMappings
      .where("[entityType+localId]")
      .equals([entityType, localId])
      .first()

    if (existing) {
      await db.idMappings.update(existing.id!, { cloudId })
    } else {
      await db.idMappings.add({
        entityType,
        localId,
        cloudId,
        userId: this.userId,
      })
    }
  }

  private getLastSyncTime(): string | null {
    if (typeof window === "undefined" || !this.userId) return null
    return localStorage.getItem(`trueloggs_lastSync_${this.userId}`)
  }

  private setLastSyncTime(time: string): void {
    if (typeof window === "undefined" || !this.userId) return
    localStorage.setItem(`trueloggs_lastSync_${this.userId}`, time)
  }

  async queueChange(
    entityType: SyncEntityType,
    entityId: number,
    operation: SyncOperation,
    payload: unknown,
    cloudId?: string
  ): Promise<void> {
    if (!this.userId) return

    const existing = await db.syncQueue
      .where("entityType")
      .equals(entityType)
      .and((item) => item.entityId === entityId)
      .first()

    if (existing) {
      await db.syncQueue.update(existing.id!, {
        operation,
        payload,
        cloudId,
        createdAt: new Date(),
        retryCount: 0,
      })
    } else {
      await db.syncQueue.add({
        entityType,
        entityId,
        cloudId,
        operation,
        payload,
        createdAt: new Date(),
        retryCount: 0,
      })
    }

    if (this.isOnline) {
      this.syncNow()
    }
  }

  async getPendingCount(): Promise<number> {
    return db.syncQueue.count()
  }

  async getConflictsCount(): Promise<number> {
    const projects = await db.projects
      .filter((p) => p.syncStatus === "conflict")
      .count()
    const entries = await db.timeEntries
      .filter((e) => e.syncStatus === "conflict")
      .count()
    const invoices = await db.invoices
      .filter((i) => i.syncStatus === "conflict")
      .count()
    return projects + entries + invoices
  }
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  userId: string | null
}

export const syncEngine = new SyncEngine()
