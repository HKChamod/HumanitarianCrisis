import { useEffect, useMemo, useState } from 'react';
import { auditLogService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setLogs(await auditLogService.list());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const modules = useMemo(() => Array.from(new Set(logs.map((l) => l.module))), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (moduleFilter && l.module !== moduleFilter) return false;
      if (q && !`${l.actorName} ${l.action} ${l.module} ${l.recordRef} ${l.details}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, search, moduleFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-[#64748B] whitespace-nowrap">
            {new Date(getValue()).toLocaleString('en-LK')}
          </span>
        ),
      },
      {
        accessorKey: 'actorName',
        header: 'Administrator',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.actorName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.actorRole}</div>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => (
          <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] border border-teal-200 font-mono text-[11px] font-semibold text-[#0F766E]">
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'module',
        header: 'Module',
        cell: ({ getValue }) => <span className="text-xs font-medium text-[#475569]">{getValue()}</span>,
      },
      {
        accessorKey: 'recordRef',
        header: 'Record Ref',
        cell: ({ getValue }) => <span className="font-mono text-xs text-[#0F172A]">{getValue()}</span>,
      },
      {
        accessorKey: 'details',
        header: 'Details',
        cell: ({ getValue }) => <span className="text-xs text-[#475569]">{getValue()}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="System Audit Logs"
        subtitle="Immutable record of administrative approvals, status transitions, allocations, and AI review decisions."
      />

      <FilterPanel
        hasActiveFilters={Boolean(search || moduleFilter)}
        onReset={() => {
          setSearch('');
          setModuleFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search actor, action, ref, details..." className="w-full sm:w-64" />
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </FilterPanel>

      <DataTable data={filtered} columns={columns} loading={loading} error={error} onRetry={loadData} />
    </div>
  );
}
