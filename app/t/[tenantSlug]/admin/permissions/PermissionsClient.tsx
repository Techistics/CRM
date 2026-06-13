'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiCall } from '@/lib/utils/api-handler';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '@/lib/authz';

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

type RolesApiRole = Role

async function parseRolesResponse(res: Response) {
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json.data as RolesApiRole
}

export default function PermissionsClient({ initialRoles }: { initialRoles: Role[] }) {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [roles, setRoles] = useState<Role[]>(
    initialRoles.map((r) => ({
      ...r,
      permissions: (r.permissions ?? []) as Permission[],
    })),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<{ name: string; permissions: Permission[] }>({
    name: '',
    permissions: [],
  });

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: '', permissions: [] });
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({ name: role.name, permissions: role.permissions });
    setModalOpen(true);
  };

  const togglePermission = (perm: Permission) => {
    setForm((prev) => {
      const has = prev.permissions.includes(perm);
      const newPerms = has ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm];
      return { ...prev, permissions: newPerms };
    });
  };

  const submit = async () => {
    const endpoint = `/api/t/${tenantSlug}/roles`;
    const method = editingRole ? 'PATCH' : 'POST';
    const body = editingRole
      ? JSON.stringify({ id: editingRole.id, name: form.name, permissions: form.permissions })
      : JSON.stringify({ name: form.name, permissions: form.permissions });

    const result = await apiCall(async () => {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      return parseRolesResponse(res);
    }, {
      successMsg: editingRole ? 'Role updated' : 'Role created',
      errorMsg: editingRole ? 'Update failed' : 'Creation failed',
    });

    if (!result) return;

    if (editingRole) {
      setRoles((prev) =>
        prev.map((r) => (r.id === result.id ? { ...r, name: result.name, permissions: result.permissions } : r)),
      );
    } else {
      setRoles((prev) => [...prev, result]);
    }
    setModalOpen(false);
    toast.success(editingRole ? 'Role updated' : 'Role created');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const result = await apiCall(async () => {
      const res = await fetch(`/api/t/${tenantSlug}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      return json.data;
    }, { successMsg: 'Role deleted', errorMsg: 'Delete failed' });
    if (!result) return;
    setRoles((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
    toast.success('Role deleted');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#223955] dark:text-slate-100">Permissions</h1>
        <Button onClick={openCreate} className="bg-sky-500 hover:bg-sky-600 text-white">
          New Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="bg-white dark:bg-[#0f172a] rounded-xl shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-[#223955] dark:text-slate-100">
                {role.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 mb-2">
              {role.permissions.map((perm) => (
                <Badge key={perm} variant="secondary" className="bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-200">
                  {PERMISSION_LABELS[perm]}
                </Badge>
              ))}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEdit(role)}>
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteId(role.id)}>
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>Define a role and its permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Role name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>{PERMISSION_LABELS[perm]}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!form.name.trim()}>
              {editingRole ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? Members using it will lose those permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
