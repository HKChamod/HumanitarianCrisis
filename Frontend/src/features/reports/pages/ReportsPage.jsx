import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { FilterPanel } from '../../../components/forms/FormControls';
import { ChartCard } from '../../../components/charts/ChartCard';
import { ErrorState, LoadingState } from '../../../components/common/States';
import { PROVINCES } from '../../../data/sriLankaAreas';

const PIE_COLORS = ['#0F766E', '#F59E0B', '#DC2626', '#0284C7', '#16A34A', '#64748B'];

export function ReportsPage({ mode = 'reports' }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [provinceFilter, setProvinceFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await reportService.getDashboardSnapshot());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCrises = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.crises.filter((c) => !provinceFilter || c.location?.provinceId === provinceFilter);
  }, [snapshot, provinceFilter]);

  const filteredRequests = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.requests.filter((r) => !provinceFilter || r.location?.provinceId === provinceFilter);
  }, [snapshot, provinceFilter]);

  const exportCsv = () => {
    const rows = [
      ['Crisis ID', 'Crisis Name', 'Type', 'Severity', 'Status', 'Province', 'District', 'Affected Estimate'],
      ...filteredCrises.map((c) => [
        c.id,
        `"${c.crisisName}"`,
        c.crisisType,
        c.severity,
        c.status,
        c.location?.provinceName || '',
        c.location?.districtName || '',
        c.affectedPeopleEstimate ?? 0,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hcms-operational-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState message="Compiling operational analytics..." />;
  if (error || !snapshot) return <ErrorState message={error?.detail} onRetry={loadData} />;

  const requestByCategory = Object.entries(
    filteredRequests.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const shelterChartData = snapshot.shelters.map((s) => ({
    name: s.name.split(' ').slice(0, 2).join(' '),
    Occupied: s.currentOccupancy,
    Available: Math.max(0, s.capacity - s.currentOccupancy),
  }));

  const severityCounts = ['Critical', 'High', 'Medium', 'Low'].map((sev) => ({
    name: sev,
    count: filteredCrises.filter((c) => c.severity === sev).length,
    color: sev === 'Critical' ? '#DC2626' : sev === 'High' ? '#F59E0B' : sev === 'Medium' ? '#0284C7' : '#16A34A',
  }));

  return (
    <div>
      <PageHeader
        title={mode === 'analytics' ? 'Analytics Dashboard' : 'Reports & Analytics'}
        subtitle="National statistics across crisis events, assistance requests, resources, shelters, volunteers, and donations."
        actions={
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
          >
            <Download className="w-3.5 h-3.5" />
            Export Crisis CSV
          </button>
        }
      />

      <FilterPanel hasActiveFilters={Boolean(provinceFilter)} onReset={() => setProvinceFilter('')}>
        <select
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Provinces (National)</option>
          {PROVINCES.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </FilterPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Crisis Events by Severity" subtitle="Distribution of logged crisis incidents">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityCounts} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {severityCounts.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Assistance Requests by Category" subtitle="Citizen need categories in selected scope">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={requestByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {requestByCategory.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Shelter Occupancy vs Available Capacity" subtitle="Current bed utilization across active shelters" className="lg:col-span-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shelterChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }} />
                <Bar dataKey="Occupied" stackId="a" fill="#0F766E" radius={[0, 0, 0, 0]} maxBarSize={56} />
                <Bar dataKey="Available" stackId="a" fill="#CCFBF1" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
