import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, Pagination } from '../common/States';

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
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const table = useReactTable({
    data: safeData,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

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
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-slate-50 border-b border-[#E2E8F0]">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] whitespace-nowrap ${
                        canSort ? 'cursor-pointer select-none hover:text-[#0F172A]' : ''
                      }`}
                    >
                      <div className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
            ))}
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-sm text-[#0F172A]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-[#F0FDFA]/60 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={table.getState().pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        totalItems={safeData.length}
        pageSize={table.getState().pagination.pageSize}
        onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
      />
    </div>
  );
}
