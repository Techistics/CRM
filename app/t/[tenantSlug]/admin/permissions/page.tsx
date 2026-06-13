import { requireTenantAdminSession } from '@/lib/tenant-server';
import PermissionsClient from './PermissionsClient';
import { db } from '@/db';
import { customRoles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizePermissions } from '@/lib/authz';

export default async function PermissionsPage() {
  const { tenant } = await requireTenantAdminSession();
  const roles = await db.select().from(customRoles).where(eq(customRoles.tenantId, tenant.id));
  return (
    <PermissionsClient
      initialRoles={roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: sanitizePermissions(r.permissions),
      }))}
    />
  );
}
