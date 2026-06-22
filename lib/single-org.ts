/** Fixed single-tenant organization configuration (Clerk). */
export function getSingleOrganizationId(): string | null {
  const id = process.env.CLERK_ORGANIZATION_ID?.trim()
  return id || null
}

export function getSingleOrganizationName(): string {
  return process.env.CLERK_ORGANIZATION_NAME?.trim() || 'Wyra'
}

export type AppOrganization = {
  id: string
  name: string
  slug: string | null
}
