import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
})

export const projects = sqliteTable("projects", {
  cloudId: text("cloud_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  localId: integer("local_id"),
  name: text("name").notNull(),
  clientName: text("client_name"),
  hourlyRate: real("hourly_rate").notNull(),
  color: text("color").notNull(),
  status: text("status", { enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  syncVersion: integer("sync_version").notNull().default(1),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  deletedAt: text("deleted_at"),
})

export const timeEntries = sqliteTable("time_entries", {
  cloudId: text("cloud_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  localId: integer("local_id"),
  projectCloudId: text("project_cloud_id")
    .notNull()
    .references(() => projects.cloudId, { onDelete: "cascade" }),
  date: text("date").notNull(),
  duration: integer("duration").notNull(),
  notes: text("notes"),
  syncVersion: integer("sync_version").notNull().default(1),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  deletedAt: text("deleted_at"),
})

export const timerStates = sqliteTable("timer_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  isRunning: integer("is_running", { mode: "boolean" }).notNull().default(false),
  projectCloudId: text("project_cloud_id").references(() => projects.cloudId, {
    onDelete: "set null",
  }),
  taskDescription: text("task_description").default(""),
  startedAt: text("started_at"),
  accumulatedSeconds: integer("accumulated_seconds").notNull().default(0),
  syncVersion: integer("sync_version").notNull().default(1),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
})

export const settings = sqliteTable("settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  profileFullName: text("profile_full_name").default(""),
  profileEmail: text("profile_email").default(""),
  profileCompany: text("profile_company").default(""),
  profilePhone: text("profile_phone").default(""),
  profileAddress: text("profile_address").default(""),
  profileBio: text("profile_bio").default(""),
  targetHoursPerWeek: integer("target_hours_per_week").notNull().default(40),
  defaultHourlyRate: real("default_hourly_rate").notNull().default(50),
  workDays: text("work_days")
    .notNull()
    .default("[false,true,true,true,true,true,false]"),
  invoiceCounter: integer("invoice_counter").notNull().default(0),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  lastInvoiceYear: integer("last_invoice_year").notNull(),
  theme: text("theme", { enum: ["light", "dark", "system"] })
    .notNull()
    .default("system"),
  syncVersion: integer("sync_version").notNull().default(1),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
})

export const recentTasks = sqliteTable("recent_tasks", {
  cloudId: text("cloud_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  localId: integer("local_id"),
  projectCloudId: text("project_cloud_id")
    .notNull()
    .references(() => projects.cloudId, { onDelete: "cascade" }),
  taskDescription: text("task_description").notNull(),
  lastUsedAt: text("last_used_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  usageCount: integer("usage_count").notNull().default(1),
  syncVersion: integer("sync_version").notNull().default(1),
  deletedAt: text("deleted_at"),
})

export const invoices = sqliteTable("invoices", {
  cloudId: text("cloud_id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  localId: integer("local_id"),
  invoiceNumber: text("invoice_number").notNull(),
  status: text("status", { enum: ["draft", "sent", "paid", "cancelled"] })
    .notNull()
    .default("draft"),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date").notNull(),
  paidAt: text("paid_at"),
  companyName: text("company_name").notNull(),
  companyEmail: text("company_email").notNull(),
  companyPhone: text("company_phone").notNull(),
  companyAddress: text("company_address").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  projectName: text("project_name").notNull(),
  projectColor: text("project_color").notNull(),
  projectCloudId: text("project_cloud_id").references(() => projects.cloudId, {
    onDelete: "set null",
  }),
  lineItems: text("line_items").notNull(),
  subtotal: real("subtotal").notNull(),
  taxRate: real("tax_rate").notNull(),
  taxAmount: real("tax_amount").notNull(),
  total: real("total").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  syncVersion: integer("sync_version").notNull().default(1),
  createdAt: text("created_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(datetime('now'))`)
    .notNull(),
  deletedAt: text("deleted_at"),
})

export const syncMetadata = sqliteTable(
  "sync_metadata",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    lastSyncedAt: text("last_synced_at")
      .default(sql`(datetime('now'))`)
      .notNull(),
    lastSyncVersion: integer("last_sync_version").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.userId, table.entityType] })]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type CloudProject = typeof projects.$inferSelect
export type NewCloudProject = typeof projects.$inferInsert

export type CloudTimeEntry = typeof timeEntries.$inferSelect
export type NewCloudTimeEntry = typeof timeEntries.$inferInsert

export type CloudTimerState = typeof timerStates.$inferSelect
export type NewCloudTimerState = typeof timerStates.$inferInsert

export type CloudSettings = typeof settings.$inferSelect
export type NewCloudSettings = typeof settings.$inferInsert

export type CloudRecentTask = typeof recentTasks.$inferSelect
export type NewCloudRecentTask = typeof recentTasks.$inferInsert

export type CloudInvoice = typeof invoices.$inferSelect
export type NewCloudInvoice = typeof invoices.$inferInsert

export type SyncMetadata = typeof syncMetadata.$inferSelect
export type NewSyncMetadata = typeof syncMetadata.$inferInsert
