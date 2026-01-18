"use client"

import { useEffect, useState, createContext, useContext, type ReactNode } from "react"
import { initializeDatabase } from "./index"

interface DatabaseContextValue {
  isReady: boolean
  error: Error | null
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  error: null,
})

export function useDatabaseReady() {
  return useContext(DatabaseContext)
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsReady(true))
      .catch((err) => {
        setError(err)
      })
  }, [])

  return (
    <DatabaseContext.Provider value={{ isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  )
}
