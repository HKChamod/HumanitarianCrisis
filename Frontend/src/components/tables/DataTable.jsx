import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, Pagination } from '../common/States';

function getCellValue(row, col) {
  if (typeof col.accessorFn === 'function') return col.accessorFn(row);
  if (col.accessorKey) return row?.[col.accessorKey];
  return undefined;
}

export function DataTable({
  data = [],
  columns = [],
  loading = false,
  error = null,
  onRetry,
  pageSize = 8,
  emptyTitle = 'No matching records',
  emptyDescription = 'Try adjusting your search or filter criteria.',
  emptyAction,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [page, setPage] = useState(1);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return safeData;
    const col = columns.find((c) => (c.id || c.accessorKey) === sortConfig.key);
    if (!col) return safeData;

    return [...safeData].sort((a, b) => {
      const valA = getCellValue(a, col);
      const valB = getCellValue(b, col);
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const cmp =
        typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [safeData, columns, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const toggleSort = (col) => {
    if (col.enableSorting === false) return;
    const key = col.id || col.accessorKey;
    if (!key) return;
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error.detail || error.message || String(error)} onRetry={onRetry} />;
  if (safeData.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-[#E2E8F0]">
              {columns.map((col, idx) => {
                const key = col.id || col.accessorKey || String(idx);
                const canSort = col.enableSorting !== false && Boolean(col.accessorKey || col.accessorFn);
                const sortDir = sortConfig.key === key ? sortConfig.direction : null;
                return (
                  <th
                    key={key}
                    onClick={canSort ? () => toggleSort(col) : undefined}
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap ${
                      canSort ? 'cursor-pointer select-none hover:text-[#0F172A]' : ''
                    }`}
                  >
                    <div className="inline-flex items-center gap-1">
                      {typeof col.header === 'function' ? col.header() : col.header}
                      {canSort &&
                        (sortDir === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-[#0F766E]" />
                        ) : sortDir === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-[#0F766E]" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        ))}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
            {paginatedRows.map((rowData, rowIdx) => (
              <tr key={rowData.id ?? rowIdx} className="hover:bg-[#F0FDFA]/60 transition-colors">
                {columns.map((col, colIdx) => {
                  const key = col.id || col.accessorKey || String(colIdx);
                  const val = getCellValue(rowData, col);
                  const cellCtx = {
                    row: { original: rowData },
                    getValue: () => val,
                  };
                  return (
                    <td key={key} className="px-4 py-3 align-middle">
                      {typeof col.cell === 'function' ? col.cell(cellCtx) : val ?? '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
