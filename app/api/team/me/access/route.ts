import { NextResponse } from 'next/server'
import { isTeamAuthContext, requireTeamAuth } from '@/lib/team-auth'

/** Current user's resolved module permissions (for sidebar / UI gates). */
export async function GET() {
  const authResult = await requireTeamAuth()
  if (!isTeamAuthContext(authResult)) {
    return authResult
  }

  return NextResponse.json({
    isAdmin: authResult.isAdmin,
    orgRole: authResult.orgRole,
    moduleAccess: authResult.moduleAccess,
  })
}
