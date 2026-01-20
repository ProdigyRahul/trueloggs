import { config } from "dotenv"
config({ path: ".env.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./lib/db/cloud/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
