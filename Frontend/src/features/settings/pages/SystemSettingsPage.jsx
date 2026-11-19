import { useState } from 'react';
import { CheckCircle2, Lock, Save } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { FormField } from '../../../components/forms/FormControls';
import { USE_MOCK_API, axiosClient } from '../../../services/api/axiosClient';

export function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    portalTitle: 'HCMS Central Administration Portal — Sri Lanka',
    defaultLanguage: 'en',
    emergencyHotline: '117',
    criticalAlertEmails: true,
    lowStockWarnings: true,
    requireHumanAiApproval: true,
    sessionTimeoutMinutes: '30',
  });
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="System Settings"
        subtitle="Configure general portal preferences, notification rules, localization defaults, and administrative policies."
      />

      {savedBanner && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-[#16A34A] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Settings saved for current session. Backend persistence requires the `/api/system/settings` endpoint.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* General Settings */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">General Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Portal Display Name">
              <input
                value={settings.portalTitle}
                onChange={(e) => setSettings({ ...settings, portalTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
            <FormField label="National Emergency Hotline">
              <input
                value={settings.emergencyHotline}
                onChange={(e) => setSettings({ ...settings, emergencyHotline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
              />
            </FormField>
          </div>
        </div>

        {/* Localization */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">Localization Preferences</h2>
          <div className="max-w-sm">
            <FormField label="Default Administrative Language" hint="Public portal supports English, Sinhala (සිංහල), and Tamil (தமிழ்).">
              <select
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white"
              >
                <option value="en">English (Default)</option>
                <option value="si">Sinhala (සිංහල)</option>
                <option value="ta">Tamil (தமிழ்)</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* Notifications & Governance */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
            Notification & Governance Preferences
          </h2>

          <label className="flex items-center justify-between gap-4 py-1.5 text-sm cursor-pointer">
            <span>
              <span className="font-medium text-[#0F172A] block">Critical Crisis Escalation Alerts</span>
              <span className="text-xs text-[#64748B]">Notify central officers immediately when a crisis is marked Critical.</span>
            </span>
            <input
              type="checkbox"
              checked={settings.criticalAlertEmails}
              onChange={(e) => setSettings({ ...settings, criticalAlertEmails: e.target.checked })}
              className="accent-[#0F766E] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between gap-4 py-1.5 text-sm cursor-pointer">
            <span>
              <span className="font-medium text-[#0F172A] block">Low-Stock Inventory Warnings</span>
              <span className="text-xs text-[#64748B]">Highlight resources falling below reorder threshold on the dashboard.</span>
            </span>
            <input
              type="checkbox"
              checked={settings.lowStockWarnings}
              onChange={(e) => setSettings({ ...settings, lowStockWarnings: e.target.checked })}
              className="accent-[#0F766E] w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between gap-4 py-1.5 text-sm">
            <span>
              <span className="font-medium text-[#0F172A] block">Mandatory Human Approval for AI Recommendations</span>
              <span className="text-xs text-[#64748B]">Enforced policy — AI output remains advisory only.</span>
            </span>
            <input type="checkbox" checked disabled className="accent-[#0F766E] w-4 h-4 opacity-70" />
          </label>
        </div>

        {/* Read-only Environment Diagnostics */}
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-5 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
            <Lock className="w-3.5 h-3.5 text-[#0F766E]" />
            API Integration Environment (Read-Only)
          </div>
          <div className="text-[#475569]">
            Configured Base URL: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">{axiosClient.defaults.baseURL}</code>
          </div>
          <div className="text-[#475569]">
            Data Adapter Mode: <strong className="text-[#0F172A]">{USE_MOCK_API ? 'Mock Adapter (VITE_USE_MOCK_API=true)' : 'Live .NET 10 Backend API'}</strong>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
          >
            <Save className="w-3.5 h-3.5" />
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
