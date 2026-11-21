import { useEffect, useMemo, useState } from 'react';
import { Plus, UserCheck } from 'lucide-react';
import { crisisService, volunteerService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, FormField, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { Modal } from '../../../components/common/Modal';

export function VolunteersPage({ mode = 'volunteers' }) {
  const [volunteers, setVolunteers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);

  const [volunteerId, setVolunteerId] = useState('');
  const [crisisId, setCrisisId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vols, assigns, crisisList] = await Promise.all([
        volunteerService.list(),
        volunteerService.listAssignments(),
        crisisService.list(),
      ]);
      setVolunteers(vols);
      setAssignments(assigns);
      setCrises(crisisList);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVolunteers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return volunteers.filter((v) => {
      if (availabilityFilter && v.availability !== availabilityFilter) return false;
      if (q && !`${v.fullName} ${v.district} ${v.skills.join(' ')}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [volunteers, search, availabilityFilter]);

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assignments.filter((a) => {
      if (q && !`${a.volunteerName} ${a.crisisName} ${a.taskTitle} ${a.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assignments, search]);

  const handleAssign = async (e) => {
    e.preventDefault();
    const vol = volunteers.find((v) => v.id === volunteerId);
    const cr = crises.find((c) => c.id === crisisId);
    if (!vol || !cr) return;
    setSaving(true);
    try {
      const created = await volunteerService.createAssignment({
        volunteerId: vol.id,
        volunteerName: vol.fullName,
        crisisId: cr.id,
        crisisName: cr.crisisName,
        taskTitle: taskTitle.trim(),
        location: location.trim() || cr.location?.districtName || 'Field Zone',
        status: 'Assigned',
      });
      setAssignments((prev) => [created, ...prev]);
      setVolunteers(await volunteerService.list());
      setAssignOpen(false);
      setVolunteerId('');
      setCrisisId('');
      setTaskTitle('');
      setLocation('');
    } finally {
      setSaving(false);
    }
  };

  const volunteerColumns = useMemo(
    () => [
      {
        accessorKey: 'fullName',
        header: 'Volunteer',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.fullName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.phone} • {row.original.district}</div>
          </div>
        ),
      },
      {
        id: 'skills',
        header: 'Skills',
        accessorFn: (row) => row.skills.join(', '),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.skills.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-[#475569]">
                {s}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'verificationStatus',
        header: 'Verification',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'availability',
        header: 'Availability',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'completedAssignments',
        header: 'Completed',
        cell: ({ getValue }) => <span className="text-xs font-semibold text-[#0F172A]">{getValue()} tasks</span>,
      },
    ],
    []
  );

  const assignmentColumns = useMemo(
    () => [
      {
        accessorKey: 'volunteerName',
        header: 'Volunteer',
        cell: ({ getValue }) => <span className="font-semibold text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'taskTitle',
        header: 'Assignment Task',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[#0F172A]">{row.original.taskTitle}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.crisisName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ getValue }) => <span className="text-xs text-[#475569]">{getValue()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'assignedAt',
        header: 'Assigned',
        cell: ({ getValue }) => <span className="text-xs text-[#64748B]">{new Date(getValue()).toLocaleDateString('en-LK')}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title={mode === 'assignments' ? 'Volunteer Assignments' : 'Volunteer Management'}
        subtitle="Coordinate verified volunteers, review skills and availability, and assign field response tasks."
        actions={
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Assignment
          </button>
        }
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || availabilityFilter)}
        onReset={() => {
          setSearch('');
          setAvailabilityFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search volunteer, skill, district, task..." className="w-full sm:w-64" />
        {mode === 'volunteers' && (
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
          >
            <option value="">All Availability</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        )}
      </FilterPanel>

      {mode === 'assignments' ? (
        <DataTable data={filteredAssignments} columns={assignmentColumns} loading={loading} error={error} onRetry={loadData} />
      ) : (
        <DataTable data={filteredVolunteers} columns={volunteerColumns} loading={loading} error={error} onRetry={loadData} />
      )}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Volunteer to Crisis">
        <form onSubmit={handleAssign} className="space-y-4">
          <FormField label="Select Volunteer" required>
            <select
              required
              value={volunteerId}
              onChange={(e) => setVolunteerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Choose volunteer...</option>
              {volunteers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.fullName} ({v.availability} — {v.district})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Target Crisis Event" required>
            <select
              required
              value={crisisId}
              onChange={(e) => setCrisisId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
            >
              <option value="">Choose crisis event...</option>
              {crises.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.crisisName} ({c.location?.districtName})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Task Title" required>
            <input
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g., Medical Triage Support — Kalutara Central College"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>

          <FormField label="Field Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Kalutara North"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAssignOpen(false)} className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              <UserCheck className="w-3.5 h-3.5" />
              {saving ? 'Assigning...' : 'Assign Volunteer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
