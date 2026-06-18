// POST /api/auth/select-workspace
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tenantMembers, tenants, users } from '@/db/schema';
import { encrypt } from '@/lib/auth';
import { getCredentialVersionForSession } from '@/lib/session-credential';
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response';

/**
 * Select a workspace after a user with multiple memberships logs in.
 * Input: { tenantId: string }
 * - Verify the current user (via session cookie) is a member of the given tenant.
 * - Issue a new session token scoped to that tenant (including role and tenantSlug).
 * - Return { tenantSlug, role }.
 */
export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    // Ensure user has a valid session cookie.
    const sessionCookie = (await req.cookies.get('session'))?.value;
    if (!sessionCookie) return errorResponse('Not authenticated', 'UNAUTHENTICATED', 401);

    // Decrypt session to get userId.
    const { decrypt } = await import('@/lib/auth');
    const session = await decrypt(sessionCookie);
    if (!session) return errorResponse('Invalid session', 'INVALID_SESSION', 401);

    const body = await req.json().catch(() => null);
    if (!body || typeof body.tenantId !== 'string') {
      return errorResponse('Invalid request body', 'BAD_REQUEST', 400);
    }
    const { tenantId } = body as { tenantId: string };

    // Verify membership.
    const [membership] = await db
      .select({ role: tenantMembers.role, tenantSlug: tenants.slug })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
      .where(
        and(
          eq(tenantMembers.userId, session.userId),
          eq(tenantMembers.tenantId, tenantId)
        )
      );

    if (!membership) {
      return errorResponse('User is not a member of the selected workspace', 'NOT_MEMBER', 403);
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const credentialVersion = await getCredentialVersionForSession({
      userId: session.userId,
      tenantId,
    });

    const sessionToken = await encrypt({
      userId: session.userId,
      tenantId,
      role: membership.role as 'ADMIN' | 'PRO',
      tenantSlug: membership.tenantSlug,
      expiresAt,
      credentialVersion,
      globalRole: null,
    });

    const response = successResponse({ tenantSlug: membership.tenantSlug, role: membership.role });
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    });
    return response;
  });
}
