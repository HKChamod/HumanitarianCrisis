/**
 * Localization Utility Helpers for ReliefLink Organization Portal
 * Provides consistent translation helpers for districts, crisis types,
 * categories, statuses, priorities, dates, and relative time.
 */

// Mapping of language code to Intl locale tag
const LOCALE_MAP = {
  en: 'en-GB',
  si: 'si-LK',
  ta: 'ta-LK'
};

/**
 * Format date string using Intl.DateTimeFormat with Asia/Colombo timezone
 */
export const formatLocalizedDate = (dateString, language = 'en', options = {}) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const locale = LOCALE_MAP[language] || 'en-GB';
    const defaultOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Colombo',
      ...options
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
  } catch {
    return dateString;
  }
};

/**
 * Localize relative time strings (e.g., "12 mins ago", "2 hours ago", "1 hour ago", "+3 in last 24h")
 */
export const getLocalizedRelativeTime = (timeStr, t) => {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();

  // "X mins ago" or "X minutes ago"
  const minMatch = trimmed.match(/^(\d+)\s*(?:mins?|minutes?)\s*ago$/i);
  if (minMatch) {
    return t('time.minsAgo', { count: Number(minMatch[1]), defaultValue: trimmed });
  }

  // "1 hour ago"
  if (/^1\s*hour\s*ago$/i.test(trimmed)) {
    return t('time.hourAgo', { defaultValue: '1 hour ago' });
  }

  // "X hours ago"
  const hourMatch = trimmed.match(/^(\d+)\s*hours?\s*ago$/i);
  if (hourMatch) {
    return t('time.hoursAgo', { count: Number(hourMatch[1]), defaultValue: trimmed });
  }

  // "+X in last 24h"
  const in24hMatch = trimmed.match(/^\+(\d+)\s*in\s*last\s*24h$/i);
  if (in24hMatch) {
    return t('dashboard.kpi.activeIncidentsChange', { defaultValue: trimmed });
  }

  // "+X today"
  const todayMatch = trimmed.match(/^\+(\d+)\s*today$/i);
  if (todayMatch) {
    return t('dashboard.kpi.suppliesChange', { defaultValue: trimmed });
  }

  // "X pending review"
  const pendingMatch = trimmed.match(/^(\d+)\s*pending\s*review$/i);
  if (pendingMatch) {
    return t('dashboard.kpi.aidRequestsPending', { count: Number(pendingMatch[1]), defaultValue: trimmed });
  }

  // "X on standby in hub"
  if (/on\s*standby/i.test(trimmed)) {
    return t('dashboard.kpi.dispatchedTeamsStandby', { defaultValue: trimmed });
  }

  return trimmed;
};

/**
 * Localize Sri Lankan district name
 */
export const getLocalizedDistrict = (district, t) => {
  if (!district) return '';
  const key = String(district).toLowerCase().replace(/[\s-]/g, '');
  return t(`districts.${key}`, { defaultValue: district });
};

/**
 * Localize crisis disaster type (Flood, Landslide, Cyclone, etc.)
 */
export const getLocalizedCrisisType = (crisisType, t) => {
  if (!crisisType) return '';
  const key = String(crisisType).toLowerCase().replace(/[\s-]/g, '');
  return t(`crisisTypes.${key}`, { defaultValue: crisisType });
};

/**
 * Localize Aid category (Food Rations, Drinking Water, Medical Supplies, Emergency Shelter, Rescue & Evacuation)
 */
export const getLocalizedAidCategory = (category, t) => {
  if (!category) return '';
  const cat = String(category).toLowerCase();
  if (cat.includes('food')) {
    return t('aidRequests.categories.food', { defaultValue: 'Food Rations' });
  }
  if (cat.includes('water')) {
    return t('aidRequests.categories.water', { defaultValue: 'Drinking Water' });
  }
  if (cat.includes('medical') || cat.includes('medicine')) {
    return t('aidRequests.categories.medical', { defaultValue: 'Medical Supplies' });
  }
  if (cat.includes('shelter')) {
    return t('aidRequests.categories.shelter', { defaultValue: 'Emergency Shelter' });
  }
  if (cat.includes('rescue') || cat.includes('evac')) {
    return t('aidRequests.categories.rescue', { defaultValue: 'Rescue & Evacuation' });
  }
  return category;
};

/**
 * Localize operational status
 */
export const getLocalizedStatus = (status, t) => {
  if (!status) return '';
  const s = String(status).trim();
  switch (s.toLowerCase()) {
    case 'active':
      return t('status.active', { defaultValue: 'Active' });
    case 'reported':
      return t('status.reported', { defaultValue: 'Reported' });
    case 'resolved':
      return t('status.resolved', { defaultValue: 'Resolved' });
    case 'closed':
      return t('status.closed', { defaultValue: 'Closed' });
    case 'pending review':
    case 'pending':
      return t('status.pendingReview', { defaultValue: t('status.pending', { defaultValue: 'Pending Review' }) });
    case 'in progress':
      return t('status.inProgress', { defaultValue: 'In Progress' });
    case 'fulfilled':
      return t('status.fulfilled', { defaultValue: 'Fulfilled' });
    case 'cancelled':
    case 'rejected':
      return t('status.cancelled', { defaultValue: t('status.rejected', { defaultValue: 'Cancelled' }) });
    case 'operational':
      return t('status.operational', { defaultValue: 'Operational' });
    case 'en route':
      return t('status.enRoute', { defaultValue: 'En Route' });
    case 'completed':
      return t('status.completed', { defaultValue: 'Completed' });
    default:
      return status;
  }
};

/**
 * Localize incident or request priority / severity level
 */
export const getLocalizedSeverity = (severity, t) => {
  if (!severity) return '';
  switch (String(severity).toLowerCase()) {
    case 'critical':
      return t('severity.critical', { defaultValue: 'Critical' });
    case 'high':
      return t('severity.high', { defaultValue: 'High' });
    case 'medium':
      return t('severity.medium', { defaultValue: 'Medium' });
    case 'low':
      return t('severity.low', { defaultValue: 'Low' });
    case 'warning':
      return t('severity.warning', { defaultValue: 'Warning' });
    default:
      return severity;
  }
};
