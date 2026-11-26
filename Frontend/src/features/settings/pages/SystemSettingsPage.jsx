import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Cpu,
  Globe,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { FormField } from '../../../components/forms/FormControls';
import { ErrorState, LoadingState } from '../../../components/common/States';
import { useAuth } from '../../../app/providers/AuthProvider';
import { systemSettingsService } from '../../../services/api/adminServices';

const TABS = [
  { id: 'general', label: 'General Settings', icon: Globe },
  { id: 'organization', label: 'Organization Settings', icon: Building2 },
  { id: 'operational', label: 'Operational Settings', icon: Sliders },
  { id: 'notification', label: 'Notification Settings', icon: Bell },
  { id: 'ai', label: 'AI Configuration', icon: Cpu },
  { id: 'security', label: 'Security Settings', icon: ShieldCheck },
  { id: 'system', label: 'System Information', icon: Server },
];

const STATUS_BADGE_CLASS = {
  Healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Degraded: 'bg-amber-50 text-amber-800 border-amber-200',
  Unavailable: 'bg-rose-50 text-rose-700 border-rose-200',
  'Not configured': 'bg-slate-100 text-slate-700 border-slate-200',
};

function HealthPill({ status }) {
  const cls = STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS['Not configured'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status}
    </span>
  );
}

export function SystemSettingsPage() {
  const { hasPermission } = useAuth();
  const canEditSettings = hasPermission('Roles.Manage');
  const canViewAi = hasPermission('AI.View');
  const canRunDiagnostic = hasPermission('AI.Review');

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [savedSettings, setSavedSettings] = useState(null);
  const [formState, setFormState] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [validationError, setValidationError] = useState('');

  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [diagnosticError, setDiagnosticError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [settingsRes, infoRes, aiRes] = await Promise.all([
        systemSettingsService.getSettings(),
        systemSettingsService.getSystemInformation(),
        canViewAi ? systemSettingsService.getAiConfiguration().catch(() => null) : Promise.resolve(null),
      ]);
      setSavedSettings(settingsRes);
      setFormState({
        general: { ...settingsRes.general },
        organization: { ...settingsRes.organization },
        operational: { ...settingsRes.operational },
        notification: { ...settingsRes.notification },
      });
      setSystemInfo(infoRes);
      setAiConfig(aiRes);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [canViewAi]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const isDirty = useMemo(() => {
    if (!savedSettings || !formState) return false;
    const baseline = {
      general: savedSettings.general,
      organization: savedSettings.organization,
      operational: savedSettings.operational,
      notification: savedSettings.notification,
    };
    return JSON.stringify(baseline) !== JSON.stringify(formState);
  }, [savedSettings, formState]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const updateSection = (section, field, value) => {
    setSaveSuccess('');
    setSaveError('');
    setValidationError('');
    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleCancel = () => {
    if (!savedSettings) return;
    setFormState({
      general: { ...savedSettings.general },
      organization: { ...savedSettings.organization },
      operational: { ...savedSettings.operational },
      notification: { ...savedSettings.notification },
    });
    setValidationError('');
    setSaveError('');
    setSaveSuccess('');
  };

  const validateForm = () => {
    if (!formState) return 'Settings have not loaded yet.';
    const { general, operational, notification } = formState;
    if (!general.systemDisplayName?.trim() || general.systemDisplayName.trim().length < 2) {
      return 'System Display Name must be at least 2 characters.';
    }
    if (general.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(general.contactEmail.trim())) {
      return 'Contact Email must be a valid email address.';
    }
    const batchLimit = Number(operational.DefaultAllocationBatchLimit ?? operational.defaultAllocationBatchLimit);
    if (Number.isNaN(batchLimit) || batchLimit < 1 || batchLimit > 100000) {
      return 'Allocation Batch Limit must be between 1 and 100,000.';
    }
    const shelterPct = Number(operational.defaultShelterCapacityAlertPercent);
    if (Number.isNaN(shelterPct) || shelterPct < 50 || shelterPct > 100) {
      return 'Shelter Capacity Alert Threshold must be between 50% and 100%.';
    }
    const retention = Number(notification.notificationRetentionDays);
    if (Number.isNaN(retention) || retention < 7 || retention > 3650) {
      return 'Notification Retention Days must be between 7 and 3650.';
    }
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEditSettings || saving) return;

    const errMsg = validateForm();
    if (errMsg) {
      setValidationError(errMsg);
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    setValidationError('');

    try {
      const payload = {
        general: formState.general,
        organization: formState.organization,
        operational: {
          ...formState.operational,
          defaultAllocationBatchLimit: Number(formState.operational.defaultAllocationBatchLimit),
          defaultShelterCapacityAlertPercent: Number(formState.operational.defaultShelterCapacityAlertPercent),
        },
        notification: {
          ...formState.notification,
          notificationRetentionDays: Number(formState.notification.notificationRetentionDays),
        },
      };
      const updated = await systemSettingsService.updateSettings(payload);
      setSavedSettings(updated);
      setFormState({
        general: { ...updated.general },
        organization: { ...updated.organization },
        operational: { ...updated.operational },
        notification: { ...updated.notification },
      });
      setSaveSuccess('System settings saved and recorded in Audit Logs.');
    } catch (err) {
      setSaveError(err?.detail || err?.message || 'Failed to save system settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunDiagnostic = async () => {
    if (!canRunDiagnostic || diagnosticRunning) return;
    setDiagnosticRunning(true);
    setDiagnosticError('');
    setDiagnosticResult(null);
    try {
      const res = await systemSettingsService.runAiDiagnostic();
      setDiagnosticResult(res);
    } catch (err) {
      setDiagnosticError(err?.detail || err?.message || 'AI provider diagnostic failed.');
    } finally {
      setDiagnosticRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl">
        <PageHeader title="System Settings" subtitle="Loading persisted configuration and system health..." />
        <LoadingState message="Loading system settings..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-5xl">
        <PageHeader title="System Settings" subtitle="Manage system-wide preferences, governance, and diagnostics." />
        <ErrorState
          message={loadError?.detail || loadError?.message || 'Unable to load system settings.'}
          onRetry={loadAll}
        />
      </div>
    );
  }

  const isEditableTab = ['general', 'organization', 'operational', 'notification'].includes(activeTab);

  return (
    <div className="max-w-6xl space-y-5">
      <PageHeader
        title="System Settings"
        subtitle="Manage persistent platform preferences, operational defaults, notification controls, AI status, and system health."
        actions={
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0F766E]" />
            Refresh
          </button>
        }
      />

      {savedSettings?.persistenceMode === 'ServerFilePendingMigration' && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong>Pending Database Schema Migration:</strong> Non-secret settings are currently persisted in the
            server-side file store (`App_Data/system-settings.json`) and audited in SQL Server `AuditLogs`. The
            `SystemSettings` EF Core table migration is prepared and awaiting authorization.
          </div>
        </div>
      )}

      {!canEditSettings && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] text-xs text-[#475569]">
          <Lock className="w-4 h-4 text-[#64748B]" />
          <span>Read-only access: `Roles.Manage` permission is required to modify system-wide settings.</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {(saveError || validationError) && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError || saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Tab Navigation */}
        <nav aria-label="Settings Sections" className="lg:col-span-3 space-y-1">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-2 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    active
                      ? 'bg-[#F0FDFA] text-[#0F766E] border border-teal-200'
                      : 'text-[#475569] hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {savedSettings?.updatedAt && (
            <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 text-[11px] text-[#64748B] space-y-1">
              <div className="font-semibold text-[#334155]">Last Updated</div>
              <div>{new Date(savedSettings.updatedAt).toLocaleString()}</div>
              {savedSettings.updatedByEmail && <div>By: {savedSettings.updatedByEmail}</div>}
            </div>
          )}
        </nav>

        {/* Right Content Area */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSave} className="space-y-4">
            {activeTab === 'general' && formState && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
                  General Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="System Display Name" required>
                    <input
                      disabled={!canEditSettings}
                      value={formState.general.systemDisplayName}
                      onChange={(e) => updateSection('general', 'systemDisplayName', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                  <FormField label="Default Country" required>
                    <input
                      disabled={!canEditSettings}
                      value={formState.general.defaultCountry}
                      onChange={(e) => updateSection('general', 'defaultCountry', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Application Description">
                      <textarea
                        rows={2}
                        disabled={!canEditSettings}
                        value={formState.general.applicationDescription}
                        onChange={(e) => updateSection('general', 'applicationDescription', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                      />
                    </FormField>
                  </div>
                  <FormField label="Default Timezone" required>
                    <input
                      disabled={!canEditSettings}
                      value={formState.general.defaultTimezone}
                      onChange={(e) => updateSection('general', 'defaultTimezone', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                  <FormField label="Default Language" required>
                    <select
                      disabled={!canEditSettings}
                      value={formState.general.defaultLanguage}
                      onChange={(e) => updateSection('general', 'defaultLanguage', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white disabled:bg-slate-50"
                    >
                      <option value="en">English (en)</option>
                      <option value="si">Sinhala (si)</option>
                      <option value="ta">Tamil (ta)</option>
                    </select>
                  </FormField>
                  <FormField label="Date Format" required>
                    <select
                      disabled={!canEditSettings}
                      value={formState.general.dateFormat}
                      onChange={(e) => updateSection('general', 'dateFormat', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white disabled:bg-slate-50"
                    >
                      <option value="yyyy-MM-dd">YYYY-MM-DD (ISO)</option>
                      <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                      <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                    </select>
                  </FormField>
                  <FormField label="Time Format" required>
                    <select
                      disabled={!canEditSettings}
                      value={formState.general.timeFormat}
                      onChange={(e) => updateSection('general', 'timeFormat', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white disabled:bg-slate-50"
                    >
                      <option value="24h">24-hour (24h)</option>
                      <option value="12h">12-hour (12h)</option>
                    </select>
                  </FormField>
                  <FormField label="Default Currency" required>
                    <input
                      disabled={!canEditSettings}
                      value={formState.general.defaultCurrency}
                      onChange={(e) => updateSection('general', 'defaultCurrency', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                  <FormField label="Contact Email">
                    <input
                      type="email"
                      disabled={!canEditSettings}
                      value={formState.general.contactEmail}
                      onChange={(e) => updateSection('general', 'contactEmail', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                  <FormField label="Contact Phone / Emergency Hotline">
                    <input
                      disabled={!canEditSettings}
                      value={formState.general.contactPhone}
                      onChange={(e) => updateSection('general', 'contactPhone', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                </div>
              </div>
            )}

            {activeTab === 'organization' && formState && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
                  Organization Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Default Organization Type" required>
                    <select
                      disabled={!canEditSettings}
                      value={formState.organization.defaultOrganizationType}
                      onChange={(e) => updateSection('organization', 'defaultOrganizationType', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white disabled:bg-slate-50"
                    >
                      <option value="NGO">NGO</option>
                      <option value="Government Department">Government Department</option>
                      <option value="Hospital">Hospital</option>
                      <option value="Relief Partner">Relief Partner</option>
                      <option value="Volunteer Network">Volunteer Network</option>
                    </select>
                  </FormField>
                  <FormField label="Default Scoped Role Name" required>
                    <input
                      disabled={!canEditSettings}
                      value={formState.organization.defaultMembershipRoleName}
                      onChange={(e) => updateSection('organization', 'defaultMembershipRoleName', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Allow Organization Registration</span>
                      <span className="text-xs text-[#64748B]">Enable onboarding of new partner organizations by administrators.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.organization.allowOrganizationRegistration}
                      onChange={(e) => updateSection('organization', 'allowOrganizationRegistration', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Require Membership Approval</span>
                      <span className="text-xs text-[#64748B]">New memberships enter Pending status until approved by an authorized officer.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.organization.requireMembershipApproval}
                      onChange={(e) => updateSection('organization', 'requireMembershipApproval', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'operational' && formState && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
                  Operational Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Default Request Priority" required>
                    <select
                      disabled={!canEditSettings}
                      value={formState.operational.defaultRequestPriority}
                      onChange={(e) => updateSection('operational', 'defaultRequestPriority', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white disabled:bg-slate-50"
                    >
                      {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Allocation Batch Limit" required>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      disabled={!canEditSettings}
                      value={formState.operational.defaultAllocationBatchLimit}
                      onChange={(e) => updateSection('operational', 'defaultAllocationBatchLimit', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                  <FormField label="Shelter Capacity Alert (%)" required>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      disabled={!canEditSettings}
                      value={formState.operational.defaultShelterCapacityAlertPercent}
                      onChange={(e) => updateSection('operational', 'defaultShelterCapacityAlertPercent', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                    />
                  </FormField>
                </div>
                <div className="space-y-3 pt-2">
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Allow Citizen Request Submission</span>
                      <span className="text-xs text-[#64748B]">Controls public and citizen portal emergency request intake.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.operational.allowCitizenRequestSubmission}
                      onChange={(e) => updateSection('operational', 'allowCitizenRequestSubmission', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Require Request Review Before Allocation</span>
                      <span className="text-xs text-[#64748B]">Requests must pass verification before resource dispatch.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.operational.requireRequestReviewBeforeAllocation}
                      onChange={(e) => updateSection('operational', 'requireRequestReviewBeforeAllocation', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Require Volunteer Approval Before Assignment</span>
                      <span className="text-xs text-[#64748B]">Enforces Approved volunteer status prior to crisis deployment.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.operational.requireVolunteerApprovalBeforeAssignment}
                      onChange={(e) => updateSection('operational', 'requireVolunteerApprovalBeforeAssignment', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'notification' && formState && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
                  Notification Settings
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Enable System-Wide Role Notifications</span>
                      <span className="text-xs text-[#64748B]">Master switch controlling automated role-based notifications in NotificationService.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.notification.systemNotificationsEnabled}
                      onChange={(e) => updateSection('notification', 'systemNotificationsEnabled', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Crisis Escalation Alerts</span>
                      <span className="text-xs text-[#64748B]">Dispatch in-app alerts for new or escalated Crisis Events.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.notification.enableCrisisAlerts}
                      onChange={(e) => updateSection('notification', 'enableCrisisAlerts', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Citizen Request Alerts</span>
                      <span className="text-xs text-[#64748B]">Notify coordinators when citizen assistance requests change state.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.notification.enableRequestAlerts}
                      onChange={(e) => updateSection('notification', 'enableRequestAlerts', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Inventory & Allocation Alerts</span>
                      <span className="text-xs text-[#64748B]">Notify logistics officers on allocation approvals, dispatches, and low stock.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.notification.enableLowStockAlerts}
                      onChange={(e) => updateSection('notification', 'enableLowStockAlerts', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
                    <span>
                      <span className="font-medium text-[#0F172A] block">Shelter Capacity Alerts</span>
                      <span className="text-xs text-[#64748B]">Notify administrators when a shelter reaches full capacity.</span>
                    </span>
                    <input
                      type="checkbox"
                      disabled={!canEditSettings}
                      checked={formState.notification.enableShelterAlerts}
                      onChange={(e) => updateSection('notification', 'enableShelterAlerts', e.target.checked)}
                      className="accent-[#0F766E] w-4 h-4"
                    />
                  </label>
                  <div className="max-w-xs pt-2">
                    <FormField label="Notification Retention (Days)" required>
                      <input
                        type="number"
                        min="7"
                        max="3650"
                        disabled={!canEditSettings}
                        value={formState.notification.notificationRetentionDays}
                        onChange={(e) => updateSection('notification', 'notificationRetentionDays', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg disabled:bg-slate-50"
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <h2 className="text-sm font-semibold text-[#0F172A]">AI Provider Configuration (Server-Managed)</h2>
                  {aiConfig && <HealthPill status={aiConfig.status} />}
                </div>
                {aiConfig ? (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                        <div className="text-[#64748B]">Active Provider</div>
                        <div className="font-semibold text-[#0F172A] mt-0.5">{aiConfig.activeProvider}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                        <div className="text-[#64748B]">Active Model</div>
                        <div className="font-semibold text-[#0F172A] mt-0.5 font-mono">{aiConfig.modelName}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                        <div className="text-[#64748B]">Groq Key Status</div>
                        <div className="font-semibold text-[#0F172A] mt-0.5">
                          {aiConfig.groqKeyConfigured ? 'Configured (Secret Hidden)' : 'Not Configured'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                        <div className="text-[#64748B]">Gemini Key Status</div>
                        <div className="font-semibold text-[#0F172A] mt-0.5">
                          {aiConfig.geminiKeyConfigured ? 'Configured (Secret Hidden)' : 'Not Configured'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                        <div className="text-[#64748B]">Privacy Sanitization</div>
                        <div className="font-semibold text-[#0F172A] mt-0.5">
                          {aiConfig.includeSanitizedDescriptions ? 'Sanitized Descriptions Included' : 'Strict Mode (No Free-Text)'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                        <div className="text-[#64748B]">Human Review Enforcement</div>
                        <div className="font-semibold text-[#0F766E] mt-0.5">
                          {aiConfig.humanApprovalRequired ? 'Mandatory (Advisory Only)' : 'Optional'}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-[#475569]">
                      <div className="font-semibold text-[#0F172A] mb-1">Setup & Security Policy</div>
                      <p>{aiConfig.setupInstructions}</p>
                    </div>

                    {canRunDiagnostic && (
                      <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[#475569]">
                            Explicit Live Diagnostic (sends synthetic ping only — no citizen data):
                          </span>
                          <button
                            type="button"
                            onClick={handleRunDiagnostic}
                            disabled={diagnosticRunning || !aiConfig.isConfigured}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-50"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            {diagnosticRunning ? 'Running Live Diagnostic...' : 'Run Live Provider Diagnostic'}
                          </button>
                        </div>
                        {diagnosticResult && (
                          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                            <strong>{diagnosticResult.providerName}</strong> ({diagnosticResult.model}) responded in{' '}
                            {diagnosticResult.elapsedMs} ms: {diagnosticResult.message}
                          </div>
                        )}
                        {diagnosticError && (
                          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                            {diagnosticError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[#64748B]">AI configuration requires `AI.View` permission.</p>
                )}
              </div>
            )}

            {activeTab === 'security' && systemInfo && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <h2 className="text-sm font-semibold text-[#0F172A]">Security Settings (Read-Only Server-Managed)</h2>
                  <HealthPill status={systemInfo.jwtConfigured ? 'Healthy' : 'Degraded'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Authentication Method</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">{systemInfo.authenticationMethod}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">JWT Signing Configuration</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {systemInfo.jwtConfigured ? 'Configured (Key Redacted)' : 'Incomplete'}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Access Token Expiration</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {systemInfo.jwtAccessTokenExpirationMinutes} minutes
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Transport Security (HTTPS)</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {systemInfo.httpsEnabled ? 'HTTPS Active' : 'HTTP (Local Development)'}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs text-[#475569]">
                  <Lock className="w-4 h-4 shrink-0 text-[#0F766E] mt-0.5" />
                  <span>
                    JWT signing keys, database connection strings, and external provider secrets are server-managed via
                    .NET User Secrets or environment variables and cannot be viewed or modified from the browser.
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'system' && systemInfo && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <h2 className="text-sm font-semibold text-[#0F172A]">System Information & Module Health</h2>
                  <HealthPill status={systemInfo.overallStatus} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Application</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">{systemInfo.applicationName}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Environment</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">{systemInfo.environmentName}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Backend / .NET Runtime</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      v{systemInfo.backendVersion} ({systemInfo.dotNetRuntimeVersion})
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Database Provider</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">{systemInfo.databaseProvider}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Settings Persistence</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5 font-mono">{systemInfo.persistenceMode}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                    <div className="text-[#64748B]">Server UTC Time</div>
                    <div className="font-semibold text-[#0F172A] mt-0.5">
                      {new Date(systemInfo.serverUtcTime).toISOString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold text-[#334155]">Module Health</div>
                  <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl">
                    {systemInfo.modules.map((mod) => (
                      <div key={mod.name} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-[#0F172A]">{mod.name}</div>
                          <div className="text-[#64748B]">{mod.detail}</div>
                        </div>
                        <HealthPill status={mod.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isEditableTab && canEditSettings && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E2E8F0] rounded-xl p-4">
                <div className="text-xs text-[#64748B]">
                  {isDirty ? (
                    <span className="font-semibold text-amber-700">You have unsaved changes.</span>
                  ) : (
                    <span>All settings are up to date.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={!isDirty || saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-[#E2E8F0] text-[#475569] hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isDirty || saving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
