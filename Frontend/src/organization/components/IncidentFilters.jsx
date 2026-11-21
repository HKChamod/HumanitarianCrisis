import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconSearch } from './Icons';
import {
  getLocalizedDistrict,
  getLocalizedSeverity,
  getLocalizedStatus
} from '../utils/localizationUtils';

export const IncidentFilters = ({
  searchQuery,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
  districtFilter,
  onDistrictChange,
  onResetFilters,
  hasActiveFilters,
  availableDistricts = [],
  activeSimState = 'normal',
  onSimStateChange = () => {}
}) => {
  const { t } = useTranslation();

  return (
    <div className="org-filter-card">
      <div className="org-filter-row">
        {/* Search Bar */}
        <div className="org-filter-search-box">
          <span className="org-search-icon-pos">
            <IconSearch size={16} color="#64748B" />
          </span>
          <input
            type="text"
            className="org-filter-search-input"
            placeholder={t('incidents.filters.searchPlaceholder', { defaultValue: 'Search by incident name, code, type, or area...' })}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('common.search', { defaultValue: 'Search incidents' })}
          />
          {searchQuery && (
            <button
              className="org-search-clear-btn"
              onClick={() => onSearchChange('')}
              type="button"
              title={t('common.clear', { defaultValue: 'Clear search' })}
            >
              &times;
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="org-filter-select-group">
          {/* Severity Filter */}
          <select
            className="org-filter-select"
            value={severityFilter}
            onChange={(e) => onSeverityChange(e.target.value)}
            aria-label={t('common.severity', { defaultValue: 'Filter by Severity' })}
          >
            <option value="all">{t('severity.allSeverities', { defaultValue: 'All Severities' })}</option>
            <option value="Critical">{t('severity.critical', { defaultValue: 'Critical' })}</option>
            <option value="High">{t('severity.high', { defaultValue: 'High' })}</option>
            <option value="Medium">{t('severity.medium', { defaultValue: 'Medium' })}</option>
            <option value="Low">{t('severity.low', { defaultValue: 'Low' })}</option>
          </select>

          {/* Status Filter (Reported, Active, Resolved, Closed) */}
          <select
            className="org-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label={t('common.status', { defaultValue: 'Filter by Status' })}
          >
            <option value="all">{t('incidents.filters.allStatuses', { defaultValue: 'All Statuses' })}</option>
            <option value="Active">{t('status.active', { defaultValue: 'Active' })}</option>
            <option value="Reported">{t('status.reported', { defaultValue: 'Reported' })}</option>
            <option value="Resolved">{t('status.resolved', { defaultValue: 'Resolved' })}</option>
            <option value="Closed">{t('status.closed', { defaultValue: 'Closed' })}</option>
          </select>

          {/* District Filter */}
          <select
            className="org-filter-select"
            value={districtFilter}
            onChange={(e) => onDistrictChange(e.target.value)}
            aria-label={t('common.district', { defaultValue: 'Filter by District' })}
          >
            <option value="all">{t('incidents.filters.allDistricts', { defaultValue: 'All Districts' })}</option>
            {availableDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {getLocalizedDistrict(dist, t)}
              </option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              className="org-filter-reset-btn"
              onClick={onResetFilters}
              type="button"
              title={t('common.resetFilters', { defaultValue: 'Reset all filters' })}
            >
              <span>{t('common.reset', { defaultValue: 'Reset' })}</span>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Active Tags & UI State Simulator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div className="org-active-filter-tags">
          <span style={{ fontWeight: 600 }}>{t('common.activeFiltersLabel', { defaultValue: 'Active Filters:' })}</span>
          {searchQuery && (
            <span className="org-filter-tag-pill">
              {t('common.search', { defaultValue: 'Search' })}: "{searchQuery}"
            </span>
          )}
          {severityFilter !== 'all' && (
            <span className="org-filter-tag-pill">
              {t('common.severity', { defaultValue: 'Severity' })}: {getLocalizedSeverity(severityFilter, t)}
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="org-filter-tag-pill">
              {t('common.status', { defaultValue: 'Status' })}: {getLocalizedStatus(statusFilter, t)}
            </span>
          )}
          {districtFilter !== 'all' && (
            <span className="org-filter-tag-pill">
              {t('common.district', { defaultValue: 'District' })}: {getLocalizedDistrict(districtFilter, t)}
            </span>
          )}
          {!hasActiveFilters && (
            <span style={{ color: '#94A3B8' }}>{t('incidents.filters.showingAll', { defaultValue: 'Showing all crisis incidents' })}</span>
          )}
        </div>

        {/* State Simulator Switcher (for QA / testing loading, empty, and error states) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
            {t('common.previewState', { defaultValue: 'Preview State:' })}
          </span>
          <div className="org-state-simulator-bar">
            <button
              className={`org-sim-btn ${activeSimState === 'normal' ? 'active' : ''}`}
              onClick={() => onSimStateChange('normal')}
              type="button"
            >
              {t('common.normal', { defaultValue: 'Normal' })}
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'loading' ? 'active' : ''}`}
              onClick={() => onSimStateChange('loading')}
              type="button"
            >
              {t('common.loading', { defaultValue: 'Loading' })}
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'empty' ? 'active' : ''}`}
              onClick={() => onSimStateChange('empty')}
              type="button"
            >
              {t('common.empty', { defaultValue: 'Empty' })}
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'error' ? 'active' : ''}`}
              onClick={() => onSimStateChange('error')}
              type="button"
            >
              {t('common.error', { defaultValue: 'Error' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
