import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Eye,
  HandHeart,
  Home,
  Package,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../../app/providers/AuthProvider';
import { reportService } from '../../../services/api/adminServices';
import { StatCard } from '../../../components/common/PageHeader';
import { SeverityBadge, StatusBadge } from '../../../components/common/StatusBadge';
import { ErrorState, LoadingState } from '../../../components/common/States';
import { SriLankaMapView } from '../../../components/charts/SriLankaMapView';
import { ChartCard } from '../../../components/charts/ChartCard';
import { Drawer } from '../../../components/common/Modal';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeAgo(iso) {
  if (!iso) return '';
  const diffMins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const hrs = Math.round(diffMins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrisis, setSelectedCrisis] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getDashboardSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const todayFormatted = useMemo(
    () =>
      new Date().toLocaleDateString('en-LK', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  if (loading) return <LoadingState message="Loading Central Administration Dashboard..." />;
  if (error || !snapshot) {
    return (
      <ErrorState
        title="Dashboard Unavailable"
        message={error?.detail || 'Could not retrieve national operations overview.'}
        onRetry={loadDashboard}
      />
    );
  }

  const {
    crises,
    requests,
    organizations,
    users,
    resources,
    shelters,
    volunteers,
    aiRecommendations,
    recentActivities,
  } = snapshot;

  const activeCrises = crises.filter((c) => c.status === 'Active' || c.status === 'Monitoring');
  const criticalCrisesCount = activeCrises.filter((c) => c.severity === 'Critical').length;

  const pendingRequests = requests.filter((r) => r.status === 'Pending' || r.status === 'Under Review');
  const approvedRequests = requests.filter((r) => r.status === 'Approved' || r.status === 'Assigned' || r.status === 'In Progress');
  const rejectedRequests = requests.filter((r) => r.status === 'Rejected');
  const urgentRequests = requests.filter((r) => (r.urgency === 'Critical' || r.urgency === 'High') && r.status !== 'Rejected' && r.status !== 'Completed');

  const pendingOrgApps = organizations.filter((o) => o.status === 'Pending');
  const activeOrgs = organizations.filter((o) => o.status === 'Active' || o.status === 'Approved');

  const totalAvailableUnits = resources.reduce((sum, r) => sum + r.availableQuantity, 0);
  const totalAllocatedUnits = resources.reduce((sum, r) => sum + r.allocatedQuantity, 0);
  const lowStockItems = resources.filter((r) => r.availableQuantity < r.reorderThreshold);

  const activeShelters = shelters.filter((s) => s.status !== 'Closed');
  const totalShelterCapacity = activeShelters.reduce((sum, s) => sum + s.capacity, 0);
  const totalShelterOccupancy = activeShelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
  const occupancyPct = totalShelterCapacity > 0 ? Math.round((totalShelterOccupancy / totalShelterCapacity) * 100) : 0;

  const pendingAiReviews = aiRecommendations.filter((rec) => rec.reviewStatus === 'Pending Review');

  const requestChartData = [
    { name: 'Pending', count: pendingRequests.length, color: '#F59E0B' },
    { name: 'Approved / Active', count: approvedRequests.length, color: '#16A34A' },
    { name: 'Urgent Attention', count: urgentRequests.length, color: '#DC2626' },
    { name: 'Rejected', count: rejectedRequests.length, color: '#64748B' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#0F766E]">{todayFormatted}</div>
          <h1 className="text-xl font-bold text-[#0F172A] mt-0.5">
            Welcome back, {user?.fullName || 'Administrator'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            National Operations Status:{' '}
            <span className="font-semibold text-[#0F172A]">
              {activeCrises.length} active crisis events
            </span>{' '}
            ({criticalCrisesCount} critical) and{' '}
            <span className="font-semibold text-[#0F172A]">
              {pendingRequests.length} assistance requests
            </span>{' '}
            awaiting review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/crises/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Create Crisis Event
          </Link>
          <Link
            to="/admin/requests/pending"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#0F766E] border border-teal-200 hover:bg-teal-100/70 transition-colors"
          >
            Review Pending Requests
          </Link>
        </div>
      </section>

      {/* 8 KPI Cards */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Registered Users"
          value={users.length}
          icon={Users}
          comparison={`${users.filter((u) => u.isActive).length} active accounts`}
          tone="primary"
          to="/admin/users"
        />
        <StatCard
          label="Active Crisis Events"
          value={activeCrises.length}
          icon={AlertTriangle}
          comparison={`${criticalCrisesCount} critical severity`}
          tone={criticalCrisesCount > 0 ? 'critical' : 'warning'}
          to="/admin/crises/active"
        />
        <StatCard
          label="Pending Assistance Requests"
          value={pendingRequests.length}
          icon={HandHeart}
          comparison={`${urgentRequests.length} high/critical urgency`}
          tone="warning"
          to="/admin/requests/pending"
        />
        <StatCard
          label="Registered Organizations"
          value={activeOrgs.length}
          icon={Building2}
          comparison={`${organizations.length} total in registry`}
          tone="primary"
          to="/admin/organizations"
        />
        <StatCard
          label="Available Resources"
          value={totalAvailableUnits.toLocaleString()}
          icon={Package}
          comparison={`${lowStockItems.length} items below threshold`}
          tone={lowStockItems.length > 0 ? 'warning' : 'success'}
          to="/admin/resources/inventory"
        />
        <StatCard
          label="Active Shelters"
          value={activeShelters.length}
          icon={Home}
          comparison={`${occupancyPct}% overall occupancy`}
          tone={occupancyPct >= 85 ? 'warning' : 'success'}
          to="/admin/shelters"
        />
        <StatCard
          label="Registered Volunteers"
          value={volunteers.length}
          icon={UserCheck}
          comparison={`${volunteers.filter((v) => v.availability === 'Available').length} available for dispatch`}
          tone="success"
          to="/admin/volunteers"
        />
        <StatCard
          label="Pending Org Applications"
          value={pendingOrgApps.length}
          icon={ClipboardCheck}
          comparison="Awaiting central verification"
          tone={pendingOrgApps.length > 0 ? 'warning' : 'neutral'}
          to="/admin/organizations/applications"
        />
      </section>

      {/* National Crisis Map + AI Decision Support Summary */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8">
          <SriLankaMapView
            crises={crises}
            compact
            onSelectCrisis={(crisis) => setSelectedCrisis(crisis)}
          />
        </div>

        {/* AI Decision Support Summary */}
        <div className="xl:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] border border-teal-200 flex items-center justify-center text-[#0F766E]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">AI Decision Support</h3>
                  <p className="text-[11px] text-[#64748B]">Advisory — human review required</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                {pendingAiReviews.length} Pending
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {aiRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-lg border border-[#E2E8F0] hover:border-[#0F766E]/50 transition-colors bg-slate-50/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <SeverityBadge severity={rec.priority} />
                    <StatusBadge status={rec.reviewStatus} />
                  </div>
                  <h4 className="text-xs font-semibold text-[#0F172A] leading-snug">{rec.title}</h4>
                  <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2">{rec.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/admin/ai/recommendations"
            className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-semibold bg-[#F0FDFA] text-[#0F766E] border border-teal-200 hover:bg-teal-100/70 transition-colors"
          >
            Review AI Recommendations
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Active Crisis Events Table */}
      <section className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Active Crisis Events</h3>
            <p className="text-xs text-[#64748B]">Current national incidents requiring coordination</p>
          </div>
          <Link
            to="/admin/crises"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline"
          >
            View all events
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-3">Crisis Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reported Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {activeCrises.map((crisis) => (
                <tr key={crisis.id} className="hover:bg-[#F0FDFA]/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0F172A]">
                    <div>{crisis.crisisName}</div>
                    <div className="text-[11px] text-[#64748B] font-mono">{crisis.id}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569]">{crisis.crisisType}</td>
                  <td className="px-4 py-3 text-xs text-[#475569]">
                    {crisis.location?.districtName}, {crisis.location?.provinceName}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={crisis.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={crisis.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                    {formatDate(crisis.reportedDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedCrisis(crisis)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#0F766E] border border-teal-200 bg-[#F0FDFA] hover:bg-teal-100/70"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Assistance Requests Chart + Resource & Shelter Overview + Recent Activities */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Assistance Request Overview */}
        <ChartCard
          title="Assistance Request Overview"
          subtitle="Current triage breakdown across citizen submissions"
          action={
            <Link to="/admin/requests" className="text-xs font-semibold text-[#0F766E] hover:underline">
              Manage
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200">
              <div className="text-lg font-bold text-[#0F172A]">{pendingRequests.length}</div>
              <div className="text-[11px] text-amber-900">Pending Review</div>
            </div>
            <div className="p-2.5 rounded-lg bg-red-50/80 border border-red-200">
              <div className="text-lg font-bold text-[#DC2626]">{urgentRequests.length}</div>
              <div className="text-[11px] text-red-900">Urgent Attention</div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200">
              <div className="text-lg font-bold text-[#16A34A]">{approvedRequests.length}</div>
              <div className="text-[11px] text-emerald-900">Approved / Active</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <div className="text-lg font-bold text-[#475569]">{rejectedRequests.length}</div>
              <div className="text-[11px] text-[#64748B]">Rejected</div>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E2E8F0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {requestChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Resource & Shelter Overview */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Resource & Shelter Overview</h3>
                <p className="text-xs text-[#64748B]">National stock levels and shelter capacity</p>
              </div>
              <Link to="/admin/resources/inventory" className="text-xs font-semibold text-[#0F766E] hover:underline">
                Inventory
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="p-3 rounded-lg bg-[#F0FDFA] border border-teal-200">
                <div className="text-base font-bold text-[#0F766E] tabular-nums">
                  {totalAvailableUnits.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#475569]">Available Units</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                <div className="text-base font-bold text-[#0F172A] tabular-nums">
                  {totalAllocatedUnits.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#64748B]">Allocated Units</div>
              </div>
            </div>

            {lowStockItems.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
                  {lowStockItems.length} Low-Stock Warnings
                </div>
                <ul className="space-y-1 text-[11px] text-amber-900/90">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span className="truncate">{item.name}</span>
                      <span className="font-semibold whitespace-nowrap">
                        {item.availableQuantity} / {item.reorderThreshold}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0F172A]">Shelter Occupancy</span>
                <span className="text-[#64748B]">
                  {totalShelterOccupancy} / {totalShelterCapacity} beds ({occupancyPct}%)
                </span>
              </div>
              {activeShelters.slice(0, 3).map((shelter) => {
                const pct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
                const barColor = pct >= 95 ? 'bg-[#DC2626]' : pct >= 80 ? 'bg-[#F59E0B]' : 'bg-[#0F766E]';
                return (
                  <div key={shelter.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#0F172A] truncate">{shelter.name}</span>
                      <span className="text-[#64748B] whitespace-nowrap">
                        {shelter.currentOccupancy}/{shelter.capacity} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            to="/admin/shelters/occupancy"
            className="mt-4 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-xs font-medium border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
          >
            View All Shelters
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent System Activities */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0F766E]" />
                <div>
                  <h3 className="text-sm font-semibold text-[#0F172A]">Recent System Activities</h3>
                  <p className="text-xs text-[#64748B]">Latest administrative actions</p>
                </div>
              </div>
              <Link to="/admin/audit-logs" className="text-xs font-semibold text-[#0F766E] hover:underline">
                Audit Logs
              </Link>
            </div>

            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 pb-3 border-b border-[#E2E8F0] last:border-b-0 last:pb-0">
                  <span className="w-2 h-2 rounded-full bg-[#0F766E] mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0F172A] truncate">{act.title}</span>
                      <span className="text-[10px] text-[#64748B] whitespace-nowrap">{formatTimeAgo(act.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{act.description}</p>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5">By {act.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Crisis Quick Detail Drawer */}
      <Drawer
        open={Boolean(selectedCrisis)}
        onClose={() => setSelectedCrisis(null)}
        title={selectedCrisis?.crisisName || 'Crisis Details'}
        subtitle={selectedCrisis ? `${selectedCrisis.id} • ${selectedCrisis.crisisType}` : ''}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedCrisis(null)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCrisis(null);
                navigate('/admin/crises');
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              Manage in Crisis Module
            </button>
          </>
        }
      >
        {selectedCrisis && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <SeverityBadge severity={selectedCrisis.severity} />
              <StatusBadge status={selectedCrisis.status} />
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">{selectedCrisis.description}</p>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs">
              <div>
                <div className="text-[#64748B]">Province</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.provinceName}</div>
              </div>
              <div>
                <div className="text-[#64748B]">District</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.districtName}</div>
              </div>
              <div>
                <div className="text-[#64748B]">DS Division</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.location?.dsDivisionName || '—'}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Est. Affected</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">
                  {selectedCrisis.affectedPeopleEstimate?.toLocaleString() || '—'}
                </div>
              </div>
              <div>
                <div className="text-[#64748B]">Related Requests</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{selectedCrisis.relatedRequestCount}</div>
              </div>
              <div>
                <div className="text-[#64748B]">Reported</div>
                <div className="font-semibold text-[#0F172A] mt-0.5">{formatDate(selectedCrisis.reportedDate)}</div>
              </div>
            </div>
            {selectedCrisis.assignedOrganizations?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#0F172A] mb-2">Assigned Partner Organizations</h4>
                <ul className="space-y-1.5">
                  {selectedCrisis.assignedOrganizations.map((org) => (
                    <li key={org} className="text-xs px-3 py-2 rounded-lg bg-[#F0FDFA] border border-teal-100 text-[#0F172A]">
                      {org}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
