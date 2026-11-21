import { useEffect, useMemo, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { donationService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable } from '../../../components/tables/DataTable';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ErrorState, LoadingState } from '../../../components/common/States';

export function DonationsPage({ mode = 'donations' }) {
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [donList, campList] = await Promise.all([
        donationService.list(),
        donationService.listCampaigns(),
      ]);
      setDonations(donList);
      setCampaigns(campList);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDonations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return donations.filter((d) => {
      if (typeFilter && d.donationType !== typeFilter) return false;
      if (q && !`${d.donorName} ${d.campaignName} ${d.itemDescription || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [donations, search, typeFilter]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'donorName',
        header: 'Donor',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[#0F172A]">{row.original.donorName}</div>
            <div className="text-[11px] text-[#64748B]">{row.original.donorType}</div>
          </div>
        ),
      },
      {
        accessorKey: 'donationType',
        header: 'Type',
        cell: ({ getValue }) => (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-[#475569]">{getValue()}</span>
        ),
      },
      {
        id: 'contribution',
        header: 'Contribution',
        accessorFn: (row) => (row.donationType === 'Monetary' ? row.amountLkr : row.quantity),
        cell: ({ row }) =>
          row.original.donationType === 'Monetary' ? (
            <span className="font-semibold text-[#0F766E] tabular-nums">
              LKR {row.original.amountLkr?.toLocaleString()}
            </span>
          ) : (
            <div className="text-xs">
              <div className="font-semibold text-[#0F172A]">
                {row.original.quantity?.toLocaleString()} {row.original.unit}
              </div>
              <div className="text-[11px] text-[#64748B]">{row.original.itemDescription}</div>
            </div>
          ),
      },
      {
        accessorKey: 'campaignName',
        header: 'Campaign',
        cell: ({ getValue }) => <span className="text-xs text-[#475569]">{getValue()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      },
      {
        accessorKey: 'donatedAt',
        header: 'Date',
        cell: ({ getValue }) => <span className="text-xs text-[#64748B]">{new Date(getValue()).toLocaleDateString('en-LK')}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title={mode === 'campaigns' ? 'Donation Campaigns' : 'Donation Management'}
        subtitle="Track pledged and received monetary and physical-goods donations across active relief campaigns."
      />

      {mode === 'campaigns' ? (
        loading ? (
          <LoadingState message="Loading donation campaigns..." />
        ) : error ? (
          <ErrorState message={error.detail} onRetry={loadData} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#F0FDFA] border border-teal-200 text-[#0F766E] flex items-center justify-center">
                      <HeartHandshake className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#0F172A]">{c.title}</h3>
                      <p className="text-[11px] text-[#64748B]">{c.crisisName}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">{c.targetDescription}</p>
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                  <span>{c.donationCount} recorded donations</span>
                  <span>Started {new Date(c.startDate).toLocaleDateString('en-LK')}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <FilterPanel
            hasActiveFilters={Boolean(search || typeFilter)}
            onReset={() => {
              setSearch('');
              setTypeFilter('');
            }}
          >
            <SearchBar value={search} onChange={setSearch} placeholder="Search donor, campaign, item..." className="w-full sm:w-64" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
            >
              <option value="">All Types</option>
              <option value="Monetary">Monetary</option>
              <option value="Goods">Goods</option>
            </select>
          </FilterPanel>

          <DataTable data={filteredDonations} columns={columns} loading={loading} error={error} onRetry={loadData} />
        </>
      )}
    </div>
  );
}
