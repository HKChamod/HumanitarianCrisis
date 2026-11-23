import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Eye,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  aiRecommendationService,
  assistanceRequestService,
} from '../../../services/api/adminServices';
import {
  AI_REVIEW_STATUSES,
  isAiProviderUnavailableError,
} from '../../../services/api/backendMappers';
import { USE_MOCK_API } from '../../../services/api/apiConfig';
import { PageHeader } from '../../../components/common/PageHeader';
import { FilterPanel, FormField, SearchBar } from '../../../components/forms/FormControls';
import { SeverityBadge, StatusBadge } from '../../../components/common/StatusBadge';
import { Drawer } from '../../../components/common/Modal';
import { ErrorState, LoadingState } from '../../../components/common/States';
import { PermissionGate, useAuth } from '../../../app/providers/AuthProvider';

const URGENCY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

function formatConfidence(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return '—';
  return `${Math.round(score * 100)}%`;
}

export function AiDecisionSupportPage({ mode = 'overview' }) {
  const { hasPermission } = useAuth();
  const canReviewAi = hasPermission('AI.Review');
  const canViewRequests = hasPermission('CitizenRequests.View');

  const [providerStatus, setProviderStatus] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [citizenRequests, setCitizenRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadSeqRef = useRef(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Analyze Citizen Request state (live mode)
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeBanner, setAnalyzeBanner] = useState(null); // { type: 'success'|'unavailable'|'error', message }

  // Review Drawer state
  const [selectedRec, setSelectedRec] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('Approved');
  const [decisionNote, setDecisionNote] = useState('');
  const [overriddenCategory, setOverriddenCategory] = useState('');
  const [overriddenUrgencyLevel, setOverriddenUrgencyLevel] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      if (USE_MOCK_API) {
        const [status, list] = await Promise.all([
          aiRecommendationService.getStatus(),
          aiRecommendationService.list(),
        ]);
        if (loadSeqRef.current !== seq) return;
        setProviderStatus(status);
        setRecommendations(list);
        return;
      }

      const [statusResult, recsResult, reqsResult] = await Promise.allSettled([
        aiRecommendationService.getStatus(),
        aiRecommendationService.list(),
        canReviewAi && canViewRequests ? assistanceRequestService.list() : Promise.resolve([]),
      ]);

      if (loadSeqRef.current !== seq) return;

      if (statusResult.status === 'fulfilled') {
        setProviderStatus(statusResult.value);
      } else {
        setProviderStatus({
          isConfigured: false,
          providerName: 'None',
          status: 'Unavailable',
          message:
            statusResult.reason?.detail ||
            statusResult.reason?.message ||
            'Unable to verify AI provider status.',
        });
      }

      if (recsResult.status === 'rejected') {
        setError(recsResult.reason);
        setRecommendations([]);
      } else {
        setRecommendations(recsResult.value);
      }

      setCitizenRequests(reqsResult.status === 'fulfilled' ? reqsResult.value : []);
    } catch (err) {
      if (loadSeqRef.current !== seq) return;
      setError(err);
    } finally {
      if (loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }, [canReviewAi, canViewRequests]);

  useEffect(() => {
    loadData();
    return () => {
      loadSeqRef.current += 1;
    };
  }, [loadData]);

  const openReviewDrawer = (rec) => {
    setSelectedRec(rec);
    setReviewDecision('Approved');
    setDecisionNote(rec.humanDecisionNote || '');
    setOverriddenCategory(rec.overriddenCategory || '');
    setOverriddenUrgencyLevel(rec.overriddenUrgencyLevel || '');
    setReviewError('');
    setReviewSuccess('');
  };

  const handleAnalyzeRequest = async (e) => {
    e.preventDefault();
    if (analyzing || !selectedRequestId || !providerStatus?.isConfigured) return;

    setAnalyzing(true);
    setAnalyzeBanner(null);
    try {
      const created = await aiRecommendationService.analyzeCitizenRequest(Number(selectedRequestId));
      setAnalyzeBanner({
        type: 'success',
        message: `Generated advisory recommendation #${created.recommendationId} for Citizen Request #${created.citizenRequestId}. CitizenRequest status was not modified.`,
      });
      await loadData();
    } catch (err) {
      if (isAiProviderUnavailableError(err)) {
        setProviderStatus((prev) => ({
          ...(prev || {}),
          isConfigured: false,
          status: 'Unavailable',
          message: err?.detail || 'No AI provider is configured.',
        }));
        setAnalyzeBanner({
          type: 'unavailable',
          message: err?.detail || 'AI Provider Unavailable (HTTP 503). Configure an AI provider before running analysis.',
        });
      } else {
        setAnalyzeBanner({
          type: 'error',
          message: err?.detail || err?.message || 'Unable to analyze citizen request.',
        });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLiveReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRec || submitting) return;

    setReviewError('');
    setReviewSuccess('');

    if (
      reviewDecision === 'Overridden' &&
      !overriddenCategory.trim() &&
      !overriddenUrgencyLevel.trim()
    ) {
      setReviewError('Overriding a recommendation requires at least an Overridden Category or Overridden Urgency Level.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await aiRecommendationService.review(selectedRec.recommendationId, {
        decision: reviewDecision,
        humanDecisionNote: decisionNote,
        overriddenCategory: reviewDecision === 'Overridden' ? overriddenCategory : null,
        overriddenUrgencyLevel: reviewDecision === 'Overridden' ? overriddenUrgencyLevel : null,
      });
      setSelectedRec(updated);
      setReviewSuccess(`Human review decision "${updated.reviewStatus}" recorded. CitizenRequest status remains unchanged.`);
      await loadData();
    } catch (err) {
      setReviewError(err?.detail || err?.message || 'Failed to record review decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockDecision = async (nextStatus) => {
    if (!selectedRec || submitting) return;
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recommendations.filter((r) => {
      if (statusFilter && r.reviewStatus !== statusFilter) return false;
      if (!q) return true;
      if (USE_MOCK_API) {
        return `${r.title} ${r.category} ${r.relatedCrisisName || ''} ${r.summary}`.toLowerCase().includes(q);
      }
      return `${r.recommendationId} ${r.citizenRequestId} ${r.suggestedCategory} ${r.suggestedUrgencyLevel} ${r.areaName} ${r.crisisName || ''} ${r.explanation} ${r.providerName}`
        .toLowerCase()
        .includes(q);
    });
  }, [recommendations, search, statusFilter]);

  const pendingCount = recommendations.filter((r) =>
    USE_MOCK_API ? r.reviewStatus === 'Pending Review' : r.reviewStatus === 'PendingReview'
  ).length;
  const approvedOrOverriddenCount = recommendations.filter((r) =>
    USE_MOCK_API
      ? r.reviewStatus === 'Accepted' || r.reviewStatus === 'Modified'
      : r.reviewStatus === 'Approved' || r.reviewStatus === 'Overridden'
  ).length;

  const title =
    mode === 'recommendations'
      ? 'AI Recommendations Review'
      : mode === 'analytics'
        ? 'AI Predictions & Operational Insights'
        : 'AI Decision Support Overview';

  const providerConfigured = Boolean(providerStatus?.isConfigured);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Advisory operational recommendations backed by the HCMS AI Decision Support API with mandatory human review."
        actions={
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#94A3B8] bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {/* Provider Status Banner (Live Mode) */}
      {!USE_MOCK_API && providerStatus && (
        <div
          className={`mb-5 p-4 rounded-xl border flex items-start gap-3 text-xs ${
            providerConfigured
              ? 'bg-[#F0FDFA] border-teal-200 text-[#134E4A]'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          {providerConfigured ? (
            <ShieldCheck className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm">
                {providerConfigured ? 'AI Provider Active' : 'AI Provider Unavailable'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  providerConfigured
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                Status: {providerStatus.status} • Provider: {providerStatus.providerName}
              </span>
            </div>
            <p className="mt-1 leading-relaxed">{providerStatus.message}</p>
            {!providerConfigured && (
              <p className="mt-1 text-[11px] text-amber-900/90">
                Analysis actions are disabled until a real AI provider is configured on the backend. Persisted recommendations remain visible below.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Governance Banner */}
      <div className="mb-5 p-4 rounded-xl bg-[#F0FDFA] border border-teal-200 flex items-start gap-3 text-xs text-[#134E4A]">
        <ShieldCheck className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-[#0F172A]">Human-in-the-Loop Governance Policy</div>
          <p className="mt-0.5 leading-relaxed">
            AI recommendations are strictly advisory and never automatically change Citizen Request status. An authorized
            reviewer with <code className="font-mono bg-white/80 px-1 rounded">AI.Review</code> permission must inspect
            verified database facts alongside AI suggestions and record an explicit Approve, Override, or Reject decision.
          </p>
        </div>
      </div>

      {/* Run Live AI Analysis Panel (AI.Review permission) */}
      {!USE_MOCK_API && (
        <PermissionGate permission="AI.Review">
          <div className="mb-5 bg-white border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <form onSubmit={handleAnalyzeRequest} className="flex-1 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <FormField label="Analyze Citizen Request (Advisory Only)">
                    {citizenRequests.length > 0 ? (
                      <select
                        value={selectedRequestId}
                        onChange={(e) => setSelectedRequestId(e.target.value)}
                        disabled={!providerConfigured || analyzing}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] disabled:bg-slate-100 disabled:text-[#64748B]"
                      >
                        <option value="">Select a citizen request...</option>
                        {citizenRequests.map((req) => (
                          <option key={req.id} value={req.id}>
                            REQ-{req.id} • {req.category} ({req.urgency}) — {req.status}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter Citizen Request ID..."
                        value={selectedRequestId}
                        onChange={(e) => setSelectedRequestId(e.target.value)}
                        disabled={!providerConfigured || analyzing}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] disabled:bg-slate-100 disabled:text-[#64748B]"
                      />
                    )}
                  </FormField>
                </div>
                <button
                  type="submit"
                  disabled={!providerConfigured || !selectedRequestId || analyzing}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] disabled:bg-[#E2E8F0] disabled:text-[#64748B] disabled:border disabled:border-[#CBD5E1]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
              </form>
            </div>
            {analyzeBanner && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs border ${
                  analyzeBanner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : analyzeBanner.type === 'unavailable'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : 'bg-red-50 border-red-200 text-[#991B1B]'
                }`}
              >
                {analyzeBanner.message}
              </div>
            )}
          </div>
        </PermissionGate>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Persisted AI Recommendations</div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">{recommendations.length}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Pending Human Review</div>
          <div className="text-2xl font-bold text-[#B45309] mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-xs text-[#64748B]">Approved / Overridden</div>
          <div className="text-2xl font-bold text-[#15803D] mt-1">{approvedOrOverriddenCount}</div>
        </div>
      </div>

      <FilterPanel
        hasActiveFilters={Boolean(search || statusFilter)}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search request ID, category, urgency, area, explanation..."
          className="w-full sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A]"
        >
          <option value="">All Review Statuses</option>
          {(USE_MOCK_API ? ['Pending Review', 'Accepted', 'Further Review', 'Rejected'] : AI_REVIEW_STATUSES).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </FilterPanel>

      {loading ? (
        <LoadingState message="Loading AI recommendations..." />
      ) : error ? (
        <ErrorState message={error.detail || error.message} onRetry={loadData} />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-[#0F172A]">No AI Recommendations Found</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
            {recommendations.length === 0
              ? providerConfigured
                ? 'No persisted AI recommendations exist yet. Select a citizen request above to run advisory analysis.'
                : 'No persisted AI recommendations exist in the database, and no live AI provider is currently configured.'
              : 'No recommendations match your current search or review status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) =>
            USE_MOCK_API ? (
              <div
                key={rec.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
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
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => openReviewDrawer(rec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect &amp; Decide
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={rec.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#0F172A]">
                      <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                      AI-#{rec.recommendationId}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-mono text-[#334155]">
                      REQ-{rec.citizenRequestId} ({rec.currentRequestStatus})
                    </span>
                    <SeverityBadge severity={rec.suggestedUrgencyLevel} />
                    <StatusBadge status={rec.reviewStatus} />
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[11px] font-semibold text-[#0F766E]">
                      Confidence: {formatConfidence(rec.confidenceScore)}
                    </span>
                    {rec.isPotentialDuplicate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
                        <Copy className="w-3 h-3" />
                        Potential Duplicate{rec.duplicateOfRequestId ? ` of REQ-${rec.duplicateOfRequestId}` : ''}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-[#0F172A]">
                    Suggested: {rec.suggestedCategory} ({rec.suggestedUrgencyLevel} Urgency)
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">{rec.explanation}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#64748B]">
                    <span>
                      Area: <strong className="text-[#0F172A]">{rec.areaName || '—'}</strong>
                    </span>
                    {rec.crisisName && (
                      <span>
                        Crisis: <strong className="text-[#0F172A]">{rec.crisisName}</strong>
                      </span>
                    )}
                    {rec.suggestedResourceName && (
                      <span className="inline-flex items-center gap-1">
                        <Package className="w-3 h-3 text-[#0F766E]" />
                        Suggested Stock:{' '}
                        <strong className="text-[#0F172A]">
                          {rec.suggestedResourceName} ({rec.suggestedResourceQuantity ?? '—'}) @ {rec.suggestedWarehouseName}
                        </strong>
                      </span>
                    )}
                    <span>
                      Provider: <strong className="text-[#0F172A]">{rec.providerName}{rec.modelVersion ? ` (${rec.modelVersion})` : ''}</strong>
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => openReviewDrawer(rec)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {canReviewAi ? 'Inspect & Review' : 'View Details'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Human Decision Review Drawer */}
      <Drawer
        open={Boolean(selectedRec)}
        onClose={() => setSelectedRec(null)}
        title={
          selectedRec
            ? USE_MOCK_API
              ? selectedRec.title
              : `AI Recommendation #${selectedRec.recommendationId}`
            : 'Recommendation Review'
        }
        subtitle={
          selectedRec
            ? USE_MOCK_API
              ? `${selectedRec.id} • ${selectedRec.category}`
              : `Citizen Request #${selectedRec.citizenRequestId} • ${selectedRec.reviewStatus}`
            : ''
        }
      >
        {selectedRec && USE_MOCK_API && (
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
                {(selectedRec.supportingEvidence || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <label className="block font-semibold text-[#0F172A]">Human Decision Note</label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleMockDecision('Accepted')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleMockDecision('Further Review')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300"
                >
                  <Clock className="w-3.5 h-3.5" /> Further Review
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleMockDecision('Rejected')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-red-50 text-[#DC2626] border border-red-200"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedRec && !USE_MOCK_API && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedRec.reviewStatus} />
              <SeverityBadge severity={selectedRec.suggestedUrgencyLevel} />
              <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 font-semibold text-[#0F766E]">
                Confidence: {formatConfidence(selectedRec.confidenceScore)}
              </span>
            </div>

            {/* Verified Database Facts */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] space-y-2">
              <h4 className="font-bold text-[#0F172A] uppercase tracking-wide text-[11px]">
                Verified Database Facts (Citizen Request #{selectedRec.citizenRequestId})
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[#64748B]">Current Category</div>
                  <div className="font-semibold text-[#0F172A]">{selectedRec.currentRequestType || '—'}</div>
                </div>
                <div>
                  <div className="text-[#64748B]">Current Urgency</div>
                  <div className="font-semibold text-[#0F172A]">{selectedRec.currentUrgencyLevel || '—'}</div>
                </div>
                <div>
                  <div className="text-[#64748B]">Current Status</div>
                  <div className="font-semibold text-[#0F172A]">{selectedRec.currentRequestStatus || '—'}</div>
                </div>
                <div>
                  <div className="text-[#64748B]">Geographic Area</div>
                  <div className="font-semibold text-[#0F172A]">{selectedRec.areaName || '—'}</div>
                </div>
                {selectedRec.crisisName && (
                  <div className="col-span-2">
                    <div className="text-[#64748B]">Linked Crisis Event</div>
                    <div className="font-semibold text-[#0F172A]">
                      #{selectedRec.crisisId} — {selectedRec.crisisName}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Advisory Suggestions */}
            <div className="p-3.5 rounded-xl bg-[#F0FDFA] border border-teal-200 space-y-2">
              <h4 className="font-bold text-[#0F766E] uppercase tracking-wide text-[11px]">
                AI Advisory Suggestion ({selectedRec.providerName}{selectedRec.modelVersion ? ` • ${selectedRec.modelVersion}` : ''})
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[#134E4A]/80">Suggested Category</div>
                  <div className="font-semibold text-[#0F172A]">{selectedRec.suggestedCategory}</div>
                </div>
                <div>
                  <div className="text-[#134E4A]/80">Suggested Urgency</div>
                  <div className="font-semibold text-[#0F172A]">{selectedRec.suggestedUrgencyLevel}</div>
                </div>
                <div>
                  <div className="text-[#134E4A]/80">Duplicate Flag</div>
                  <div className="font-semibold text-[#0F172A]">
                    {selectedRec.isPotentialDuplicate
                      ? `Potential Duplicate${selectedRec.duplicateOfRequestId ? ` (REQ-${selectedRec.duplicateOfRequestId})` : ''}`
                      : 'No duplicate flagged'}
                  </div>
                </div>
                {selectedRec.suggestedResourceName && (
                  <div>
                    <div className="text-[#134E4A]/80">Suggested Inventory</div>
                    <div className="font-semibold text-[#0F172A]">
                      {selectedRec.suggestedResourceName} ({selectedRec.suggestedResourceQuantity ?? '—'}) @{' '}
                      {selectedRec.suggestedWarehouseName}
                      {selectedRec.suggestedInventoryAvailableQuantity != null
                        ? ` [Avail: ${selectedRec.suggestedInventoryAvailableQuantity}]`
                        : ''}
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-teal-200/70">
                <div className="font-semibold text-[#0F172A] mb-0.5">Explanation</div>
                <p className="text-[#134E4A] leading-relaxed">{selectedRec.explanation}</p>
              </div>
            </div>

            {/* Existing Human Review Record */}
            {selectedRec.reviewedAt && (
              <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] space-y-1 text-[11px] text-[#475569]">
                <div>
                  Reviewed by <strong className="text-[#0F172A]">{selectedRec.reviewedByUserName || `User #${selectedRec.reviewedByUserId}`}</strong> on{' '}
                  {new Date(selectedRec.reviewedAt).toLocaleString('en-LK')}
                </div>
                {selectedRec.overriddenCategory && (
                  <div>
                    Overridden Category: <strong className="text-[#0F172A]">{selectedRec.overriddenCategory}</strong>
                  </div>
                )}
                {selectedRec.overriddenUrgencyLevel && (
                  <div>
                    Overridden Urgency: <strong className="text-[#0F172A]">{selectedRec.overriddenUrgencyLevel}</strong>
                  </div>
                )}
                {selectedRec.humanDecisionNote && (
                  <div>
                    Note: <strong className="text-[#0F172A]">{selectedRec.humanDecisionNote}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Human Review Form (AI.Review Permission) */}
            <PermissionGate
              permission="AI.Review"
              fallback={
                <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-[#64748B]">
                  Read-only view (<code className="font-mono">AI.View</code>). Recording Approve/Override/Reject decisions requires <code className="font-mono">AI.Review</code> permission.
                </div>
              }
            >
              <form onSubmit={handleLiveReviewSubmit} className="space-y-3 pt-3 border-t border-[#E2E8F0]">
                <h4 className="font-semibold text-[#0F172A]">Record Human Review Decision</h4>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Approved', label: 'Approve', icon: CheckCircle2 },
                    { value: 'Overridden', label: 'Override', icon: Edit3 },
                    { value: 'Rejected', label: 'Reject', icon: XCircle },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = reviewDecision === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setReviewDecision(opt.value);
                          setReviewError('');
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? opt.value === 'Rejected'
                              ? 'bg-[#DC2626] text-white border-[#DC2626]'
                              : 'bg-[#0F766E] text-white border-[#0F766E]'
                            : 'bg-[#F1F5F9] text-[#0F172A] border-[#94A3B8] hover:bg-[#E2E8F0]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {reviewDecision === 'Overridden' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                    <FormField label="Overridden Category">
                      <input
                        maxLength={50}
                        value={overriddenCategory}
                        onChange={(e) => setOverriddenCategory(e.target.value)}
                        placeholder="e.g., Medical, Water, Food"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                      />
                    </FormField>
                    <FormField label="Overridden Urgency Level">
                      <select
                        value={overriddenUrgencyLevel}
                        onChange={(e) => setOverriddenUrgencyLevel(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                      >
                        <option value="">(Keep unchanged)</option>
                        {URGENCY_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                )}

                <FormField label="Human Decision Note (Optional)">
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    placeholder="Document operational rationale for approving, overriding, or rejecting this AI suggestion..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg"
                  />
                </FormField>

                {reviewError && <p className="text-xs text-[#DC2626]">{reviewError}</p>}
                {reviewSuccess && <p className="text-xs text-[#15803D] font-medium">{reviewSuccess}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] disabled:bg-[#E2E8F0] disabled:text-[#64748B]"
                >
                  {submitting ? 'Saving Decision...' : `Submit "${reviewDecision}" Decision`}
                </button>
              </form>
            </PermissionGate>
          </div>
        )}
      </Drawer>
    </div>
  );
}
