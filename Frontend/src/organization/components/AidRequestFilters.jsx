import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconSearch } from './Icons';
import { getLocalizedDistrict } from '../utils/localizationUtils';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { BACKEND_REQUEST_STATUSES } from '../services/aidRequestsService';

export const AidRequestFilters = ({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  priorityFilter,
  onPriorityChange,
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
        {/* Search input */}
        <div className="org-filter-search-box">
          <span className="org-search-icon-pos">
            <IconSearch size={16} color="#64748B" />
          </span>
          <input
            type="text"
            className="org-filter-search-input"
            placeholder={t('aidRequests.filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('common.search')}
          />
          {searchQuery && (
            <button
              className="org-search-clear-btn"
              onClick={() => onSearchChange('')}
              type="button"
              title={t('common.clear')}
            >
              &times;
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="org-filter-select-group">
          {/* Category Filter */}
          <select
            className="org-filter-select"
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label={t('aidRequests.filters.allCategories')}
          >
            <option value="all">{t('aidRequests.filters.allCategories')}</option>
            <option value="Food Rations">{t('aidRequests.categories.food')}</option>
            <option value="Drinking Water">{t('aidRequests.categories.water')}</option>
            <option value="Medical Supplies">{t('aidRequests.categories.medical')}</option>
            <option value="Emergency Shelter">{t('aidRequests.categories.shelter')}</option>
            <option value="Rescue & Evacuation">{t('aidRequests.categories.rescue')}</option>
          </select>

          {/* Priority Filter */}
          <select
            className="org-filter-select"
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            aria-label={t('aidRequests.filters.allPriorities')}
          >
            <option value="all">{t('aidRequests.filters.allPriorities')}</option>
            <option value="Critical">{t('common.critical')}</option>
            <option value="High">{t('common.high')}</option>
            <option value="Medium">{t('common.medium')}</option>
            <option value="Low">{t('common.low')}</option>
          </select>

          {/* Status Filter */}
          <select
            className="org-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label={t('aidRequests.filters.allStatuses')}
          >
            <option value="all">{t('aidRequests.filters.allStatuses')}</option>
            {USE_MOCK_API ? (
              <>
                <option value="Pending Review">{t('status.pendingReview', { defaultValue: 'Pending Review' })}</option>
                <option value="In Progress">{t('status.inProgress', { defaultValue: 'In Progress' })}</option>
                <option value="Fulfilled">{t('status.fulfilled', { defaultValue: 'Fulfilled' })}</option>
                <option value="Cancelled">{t('status.cancelled', { defaultValue: 'Cancelled' })}</option>
              </>
            ) : (
              BACKEND_REQUEST_STATUSES.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {t(`status.${statusOption.toLowerCase()}`, { defaultValue: statusOption })}
                </option>
              ))
            )}
          </select>

          {/* District Filter */}
          <select
            className="org-filter-select"
            value={districtFilter}
            onChange={(e) => onDistrictChange(e.target.value)}
            aria-label={t('aidRequests.filters.allDistricts')}
          >
            <option value="all">{t('aidRequests.filters.allDistricts')}</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>{getLocalizedDistrict(d, t)}</option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              className="org-filter-reset-btn"
              onClick={onResetFilters}
              type="button"
              title={t('common.clearFilters')}
            >
              <span>{t('common.clear')}</span>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Badges & QA Simulator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div className="org-active-filter-tags">
          <span style={{ fontWeight: 600 }}>{t('common.activeFiltersLabel')}</span>
          {searchQuery && (
            <span className="org-filter-tag-pill">{t('common.search')}: "{searchQuery}"</span>
          )}
          {categoryFilter !== 'all' && (
            <span className="org-filter-tag-pill">{t('aidRequests.table.aidCategory')}: {t(`aidRequests.categories.${categoryFilter === 'Food Rations' ? 'food' : categoryFilter === 'Drinking Water' ? 'water' : categoryFilter === 'Medical Supplies' ? 'medical' : categoryFilter === 'Emergency Shelter' ? 'shelter' : 'rescue'}`, { defaultValue: categoryFilter })}</span>
          )}
          {priorityFilter !== 'all' && (
            <span className="org-filter-tag-pill">{t('common.priority')}: {t(`common.${priorityFilter.toLowerCase()}`, { defaultValue: priorityFilter })}</span>
          )}
          {statusFilter !== 'all' && (
            <span className="org-filter-tag-pill">{t('common.status')}: {t(`status.${statusFilter === 'Pending Review' ? 'pendingReview' : statusFilter === 'In Progress' ? 'inProgress' : statusFilter.toLowerCase()}`, { defaultValue: statusFilter })}</span>
          )}
          {districtFilter !== 'all' && (
            <span className="org-filter-tag-pill">{t('common.district')}: {getLocalizedDistrict(districtFilter, t)}</span>
          )}
          {!hasActiveFilters && (
            <span style={{ color: '#94A3B8' }}>{t('aidRequests.filters.showingAll')}</span>
          )}
        </div>

        {/* State Simulator Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{t('common.previewState')}:</span>
          <div className="org-state-simulator-bar">
            <button
              className={`org-sim-btn ${activeSimState === 'normal' ? 'active' : ''}`}
              onClick={() => onSimStateChange('normal')}
              type="button"
            >
              {t('common.normal')}
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
              {t('common.empty')}
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'error' ? 'active' : ''}`}
              onClick={() => onSimStateChange('error')}
              type="button"
            >
              {t('common.error')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
