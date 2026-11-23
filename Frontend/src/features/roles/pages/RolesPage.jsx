import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Shield, Users } from 'lucide-react';
import { permissionService, roleService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { Modal } from '../../../components/common/Modal';
import { FormField } from '../../../components/forms/FormControls';
import { ErrorState, LoadingState } from '../../../components/common/States';

const roleSchema = z.object({
  name: z.string().min(3, 'Role name must be at least 3 characters'),
  description: z.string().min(10, 'Provide a clear role description'),
});

export function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(roleSchema) });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleList, permList] = await Promise.all([roleService.list(), permissionService.list()]);
      setRoles(roleList);
      setPermissions(permList);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const togglePerm = (code) => {
    setSelectedPerms((prev) => (prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]));
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const created = await roleService.create({
        name: values.name,
        description: values.description,
        permissions: selectedPerms,
      });
      setRoles((prev) => [...prev, created]);
      setCreateOpen(false);
      reset();
      setSelectedPerms([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Role Management"
        subtitle="Configure system roles and review assigned permission sets. Authorization is enforced server-side."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Role
          </button>
        }
      />

      {loading ? (
        <LoadingState message="Loading roles..." />
      ) : error ? (
        <ErrorState message={error.detail} onRetry={loadData} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#0F766E] flex items-center justify-center">
                      <Shield className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#0F172A]">{role.name}</h3>
                      <span className="text-[11px] text-[#64748B] font-mono">{role.id}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-[#475569]">
                    <Users className="w-3.5 h-3.5" />
                    {role.userCount} users
                  </span>
                </div>

                <p className="text-xs text-[#475569] mt-3 leading-relaxed">{role.description}</p>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    Assigned Permissions ({role.permissions.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2 py-0.5 rounded-md bg-slate-50 border border-[#E2E8F0] font-mono text-[11px] text-[#0F172A]"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create System Role" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Role Name" required error={errors.name?.message}>
            <input
              {...register('name')}
              placeholder="e.g., Regional Logistics Officer"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </FormField>

          <FormField label="Description" required error={errors.description?.message}>
            <textarea
              rows={2}
              {...register('description')}
              placeholder="Describe operational scope and responsibilities..."
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </FormField>

          <div>
            <div className="text-xs font-semibold text-[#0F172A] mb-2">Assign Permissions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-[#E2E8F0] rounded-lg bg-slate-50">
              {permissions.map((p) => (
                <label key={p.id} className="flex items-start gap-2 p-2 rounded-md bg-white border border-[#E2E8F0] cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(p.code)}
                    onChange={() => togglePerm(p.code)}
                    className="mt-0.5 accent-[#0F766E]"
                  />
                  <span>
                    <span className="font-semibold text-[#0F172A] block">{p.name}</span>
                    <span className="font-mono text-[10px] text-[#64748B]">{p.code}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
