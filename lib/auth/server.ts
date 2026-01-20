import { withAuth } from "@workos-inc/authkit-nextjs"
import type { User } from "./auth-context"

export async function getUser(): Promise<User | null> {
  try {
    const { user } = await withAuth()

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      fullName:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName ?? user.lastName ?? undefined,
      profilePictureUrl: user.profilePictureUrl ?? undefined,
    }
  } catch {
    return null
  }
}

export async function getUserOrRedirect(): Promise<User> {
  const { user } = await withAuth({ ensureSignedIn: true })

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    fullName:
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName ?? user.lastName ?? undefined,
    profilePictureUrl: user.profilePictureUrl ?? undefined,
  }
}

export async function syncUserToCloud(user: User): Promise<void> {
  const { cloudDb, users } = await import("@/lib/db/cloud")

  await cloudDb
    .insert(users)
    .values({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.profilePictureUrl,
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.profilePictureUrl,
        updatedAt: new Date().toISOString(),
      },
    })
}
