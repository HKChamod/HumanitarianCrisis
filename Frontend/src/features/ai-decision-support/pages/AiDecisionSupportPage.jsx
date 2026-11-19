import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { aiRecommendationService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { FilterPanel, SearchBar } from '../../../components/forms/FormControls';
import { SeverityBadge, StatusBadge } from '../../../components/common/StatusBadge';
import { Drawer } from '../../../components/common/Modal';
import { ErrorState, LoadingState } from '../../../components/common/States';

export function AiDecisionSupportPage({ mode = 'overview' }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRec, setSelectedRec] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      setRecommendations(await aiRecommendationService.list());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recommendations.filter((r) => {
      if (statusFilter && r.reviewStatus !== statusFilter) return false;
      if (q && !`${r.title} ${r.category} ${r.relatedCrisisName || ''} ${r.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recommendations, search, statusFilter]);

  const handleDecision = async (nextStatus) => {
    if (!selectedRec) return;
    setSubmitting(true);
    try {
      const note =
        decisionNote.trim() ||
        `Human administrator marked recommendation as "${nextStatus}".`;
      const updated = await aiRecommendationService.submitHumanDecision(selectedRec.id, nextStatus, note);
      setRecommendations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedRec(updated);
      setDecisionNote('');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = recommendations.filter((r) => r.reviewStatus === 'Pending Review').length;
  const acceptedCount = recommendations.filter((r) => r.reviewStatus === 'Accepted' || r.reviewStatus === 'Modified').length;

  const title =
    mode === 'recommendations'
      ? 'AI Recommendations Review'
      : mode === 'analytics'
        ? 'AI Predictions & Operational Insights'
        : 'AI Decision Support Overview';

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Advisory operational recommendations generated from crisis, shelter, and inventory signals."
      />

      {/* Governance Banner */}
      <div className="mb-5 p-4 rounded-xl bg-[#F0FDFA] border border-teal-200 flex items-start gap-3 text-xs text-[#134E4A]">
        <ShieldCheck className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-[#0F172A]">Human-in-the-Loop Governance Policy</div>
          <p className="mt-0.5 leading-relaxed">
            AI recommendations are strictly advisory and never execute critical operational actions automatically. An
            authorized human administrator must review supporting evidence and record an explicit decision. Model
            confidence or accuracy metrics are only shown when supplied by a verified backend model evaluation.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Total Advisory Recommendations</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{recommendations.length}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Pending Human Review</div>
          <div className="text-2xl font-bold text-[#F59E0B] mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Accepted by Administrators</div>
          <div className="text-2xl font-bold text-[#16A34A] mt-1">{acceptedCount}</div>
        </div>
      </div>

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <SearchBar value={search} onChange={setSearch} placeholder="Search recommendation, crisis, category..." className="w-full sm:w-64" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#E2E8F0] rounded-lg"
        >
          <option value="">All Review Statuses</option>
          {['Pending Review', 'Accepted', 'Further Review', 'Rejected'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </FilterPanel>

      {loading ? (
        <LoadingState message="Loading AI recommendations..." />
      ) : error ? (
        <ErrorState message={error.detail} onRetry={loadData} />
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => (
            <div key={rec.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#64748B]">
                    <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                    {rec.id}
                  </span>
                  <SeverityBadge severity={rec.priority} />
                  <StatusBadge status={rec.reviewStatus} />
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-[#475569]">
                    {rec.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#0F172A]">{rec.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{rec.summary}</p>
                <div className="text-[11px] text-[#64748B]">
                  Related Crisis: <strong className="text-[#0F172A]">{rec.relatedCrisisName || 'General'}</strong> •
                  Resource: <strong className="text-[#0F172A]">{rec.relatedResource || '—'}</strong>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRec(rec);
                    setDecisionNote(rec.humanDecisionNote || '');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Inspect & Decide
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Human Decision Review Drawer */}
      <Drawer
        open={Boolean(selectedRec)}
        onClose={() => setSelectedRec(null)}
        title={selectedRec?.title || 'Recommendation Review'}
        subtitle={selectedRec ? `${selectedRec.id} • ${selectedRec.category}` : ''}
      >
        {selectedRec && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap gap-2">
              <SeverityBadge severity={selectedRec.priority} />
              <StatusBadge status={selectedRec.reviewStatus} />
            </div>

            <div>
              <h4 className="font-semibold text-[#0F172A] mb-1">Summary</h4>
              <p className="text-[#475569] leading-relaxed">{selectedRec.summary}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0]">
              <h4 className="font-semibold text-[#0F172A] mb-2">Supporting Operational Evidence</h4>
              <ul className="list-disc pl-4 space-y-1.5 text-[#475569]">
                {selectedRec.supportingEvidence.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F0FDFA] border border-teal-200">
              <h4 className="font-semibold text-[#0F766E] mb-1">Suggested Action</h4>
              <p className="text-[#0F172A]">{selectedRec.suggestedAction}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <label className="block font-semibold text-[#0F172A]">Human Decision Note (Recorded in Audit Log)</label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Document your operational rationale for accepting, modifying, or rejecting this recommendation..."
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('Accepted')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accept Recommendation
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('Further Review')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Mark Further Review
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecision('Rejected')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>

            {selectedRec.reviewedBy && (
              <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-[11px] text-[#64748B]">
                Last reviewed by <strong className="text-[#0F172A]">{selectedRec.reviewedBy}</strong> on{' '}
                {new Date(selectedRec.reviewedAt).toLocaleString('en-LK')}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
