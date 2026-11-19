import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { crisisService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { CascadingAreaSelector, FormField } from '../../../components/forms/FormControls';

const crisisSchema = z.object({
  crisisName: z.string().min(5, 'Crisis name must be at least 5 characters'),
  crisisType: z.enum(['Flood', 'Landslide', 'Cyclone', 'Drought', 'Coastal Erosion', 'Wildfire', 'Health Emergency']),
  description: z.string().min(15, 'Provide a clear operational description (at least 15 characters)'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Draft', 'Active', 'Monitoring']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  affectedPeopleEstimate: z.string().optional(),
});

export function CreateCrisisEventPage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState({
    provinceId: '',
    provinceName: '',
    districtId: '',
    districtName: '',
    dsDivisionId: '',
    dsDivisionName: '',
    gnDivisionId: '',
    gnDivisionName: '',
    village: '',
  });
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(crisisSchema),
    defaultValues: {
      crisisType: 'Flood',
      severity: 'High',
      status: 'Active',
      startDate: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values) => {
    if (!location.provinceId || !location.districtId) {
      setLocationError('Please select at least a Province and District.');
      return;
    }
    setLocationError('');
    setSubmitting(true);

    try {
      const created = await crisisService.create({
        crisisName: values.crisisName,
        crisisType: values.crisisType,
        description: values.description,
        severity: values.severity,
        status: values.status,
        startDate: new Date(values.startDate).toISOString(),
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        affectedPeopleEstimate: values.affectedPeopleEstimate ? Number(values.affectedPeopleEstimate) : undefined,
        location: {
          ...location,
          latitude: values.latitude ? Number(values.latitude) : 7.8731,
          longitude: values.longitude ? Number(values.longitude) : 80.7718,
        },
      });
      setCreatedEvent(created);
    } finally {
      setSubmitting(false);
    }
  };

  if (createdEvent) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-[#16A34A] flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A]">Crisis Event Created</h2>
        <p className="text-sm text-[#64748B] mt-1">
          <strong>{createdEvent.crisisName}</strong> ({createdEvent.id}) has been registered and logged in the audit trail.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/crises')}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
          >
            View All Crisis Events
          </button>
          <button
            type="button"
            onClick={() => setCreatedEvent(null)}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E2E8F0] text-[#0F172A] hover:bg-slate-50"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Create Crisis Event"
        subtitle="Register a new national or regional crisis event with severity classification and Sri Lankan geographic hierarchy."
        actions={
          <Link
            to="/admin/crises"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Crisis Events
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
            1. Crisis Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <FormField label="Crisis Name" required error={errors.crisisName?.message}>
                <input
                  {...register('crisisName')}
                  placeholder="e.g., Nilwala Ganga Basin Flood Warning"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </FormField>
            </div>

            <FormField label="Crisis Type" required error={errors.crisisType?.message}>
              <select
                {...register('crisisType')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              >
                {['Flood', 'Landslide', 'Cyclone', 'Drought', 'Coastal Erosion', 'Wildfire', 'Health Emergency'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Severity" required error={errors.severity?.message}>
                <select
                  {...register('severity')}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
                >
                  {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Initial Status" required error={errors.status?.message}>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
                >
                  {['Active', 'Monitoring', 'Draft'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Operational Description" required error={errors.description?.message}>
                <textarea
                  rows={3}
                  {...register('description')}
                  placeholder="Summarize current impact, affected access routes, and immediate response priorities..."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
                />
              </FormField>
            </div>

            <FormField label="Start Date" required error={errors.startDate?.message}>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </FormField>

            <FormField label="End Date (Optional)" error={errors.endDate?.message}>
              <input
                type="date"
                {...register('endDate')}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </FormField>

            <FormField label="Estimated Affected People (Optional)">
              <input
                type="number"
                min="0"
                {...register('affectedPeopleEstimate')}
                placeholder="e.g., 1200"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </FormField>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
            2. Affected Location (Sri Lanka Administrative Hierarchy)
          </h2>

          <CascadingAreaSelector value={location} onChange={setLocation} />
          {locationError && <p className="text-xs text-[#DC2626]">{locationError}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <FormField label="Latitude (Optional)" hint="e.g., 6.5854 for Kalutara">
              <input
                type="number"
                step="any"
                {...register('latitude')}
                placeholder="6.5854"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </FormField>
            <FormField label="Longitude (Optional)" hint="e.g., 79.9607 for Kalutara">
              <input
                type="number"
                step="any"
                {...register('longitude')}
                placeholder="79.9607"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            to="/admin/crises"
            className="px-4 py-2 rounded-lg text-xs font-medium border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {submitting ? 'Creating Crisis Event...' : 'Create Crisis Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
