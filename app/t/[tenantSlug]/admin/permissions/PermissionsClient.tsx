'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { apiCall } from '@/lib/utils/api-handler';
import { 
  Shield, 
  ShieldAlert, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  Lock,
  DollarSign,
  Users,
  Compass
} from 'lucide-react';

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
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '@/lib/authz';

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
};

type RolesApiRole = Role;

async function parseRolesResponse(res: Response) {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json.data as RolesApiRole;
}

// Categorize permissions for beautiful visual grouping
const PERMISSION_GROUPS = [
  {
    title: 'Lead Management',
    icon: Compass,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    permissions: [
      'leads.view',
      'leads.create',
      'leads.edit',
      'leads.delete',
      'leads.assign',
      'leads.receive',
    ] as Permission[],
  },
  {
    title: 'Payments & Revenue',
    icon: DollarSign,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    permissions: [
      'payments.view',
      'payments.edit',
    ] as Permission[],
  },
  {
    title: 'Workspace & Administration',
    icon: Users,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    permissions: [
      'kanban.view',
      'analytics.view',
      'import.leads',
      'templates.manage',
      'teams.manage',
    ] as Permission[],
  },
];

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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Sleek Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2.5">
            <Shield className="h-8 w-8 text-sky-500 animate-pulse" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Configure authorization roles to regulate feature access across team members.
          </p>
        </div>
        <Button 
          onClick={openCreate} 
          className="bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-lg hover:shadow-sky-500/20 transition-all rounded-xl gap-2 h-10 px-5 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Custom Role
        </Button>
      </div>

      {/* Role Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const matchedGroupPerms = (group: typeof PERMISSION_GROUPS[number]) => 
            role.permissions.filter(p => group.permissions.includes(p));

          return (
            <Card key={role.id} className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-crm-sm border border-slate-200 dark:border-slate-800 flex flex-col hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                      {role.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 dark:text-slate-500">
                      Custom Role
                    </CardDescription>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/25">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-0">
                {PERMISSION_GROUPS.map((group) => {
                  const activePerms = matchedGroupPerms(group);
                  const Icon = group.icon;
                  if (activePerms.length === 0) return null;

                  return (
                    <div key={group.title} className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <Icon className="h-3 w-3" />
                        <span>{group.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePerms.map((perm) => (
                          <Badge 
                            key={perm} 
                            variant="secondary" 
                            className="bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60 text-xs px-2 py-0.5 rounded-md font-medium"
                          >
                            {PERMISSION_LABELS[perm]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {role.permissions.length === 0 && (
                  <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No permissions assigned
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openEdit(role)}
                  className="flex-1 gap-1.5 h-9 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Role
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDeleteId(role.id)}
                  className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Modern Role Form Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
              {editingRole ? 'Modify Custom Role' : 'Create Custom Role'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Provide a name and check the specific capabilities this role should yield.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Role Label / Name
              </label>
              <Input
                placeholder="e.g. Senior Counselor, Support Pro"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-sky-500 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Categorized Permission Checkbox Sections */}
            <div className="space-y-5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Access Permissions
              </label>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div 
                      key={group.title} 
                      className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/10 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-850 dark:text-slate-200 pb-2 border-b border-slate-200/50 dark:border-slate-850">
                        <div className={`p-1.5 rounded-lg border ${group.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span>{group.title}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.permissions.map((perm) => {
                          const active = form.permissions.includes(perm);
                          return (
                            <button
                              key={perm}
                              type="button"
                              onClick={() => togglePermission(perm)}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                                active
                                  ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:bg-sky-500/20 dark:border-sky-500 dark:text-sky-300'
                                  : 'bg-white border-slate-200/70 hover:border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700/60 dark:hover:border-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${
                                active 
                                  ? 'bg-sky-500 border-sky-500 text-white' 
                                  : 'border-slate-300 dark:border-slate-600 bg-transparent'
                              }`}>
                                {active && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{PERMISSION_LABELS[perm]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button 
              variant="outline" 
              onClick={() => setModalOpen(false)}
              className="rounded-xl border-slate-200 dark:border-slate-700 h-10 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={submit} 
              disabled={!form.name.trim()}
              className="bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl h-10 shadow-lg shadow-sky-500/10 active:scale-95"
            >
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Confirming Role Deletion */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              Confirm Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Are you sure you want to delete this custom role? Users assigned to this role will lose their custom authorization bounds immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-slate-200 dark:border-slate-700 text-slate-750">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl h-10"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
