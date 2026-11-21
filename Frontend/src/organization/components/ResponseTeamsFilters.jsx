
import React from 'react';
import { IconSearch } from './Icons';
import { TEAM_TYPES, TEAM_STATUSES } from '../data/mockResponseTeams';
import { useTranslation } from 'react-i18next';

export const ResponseTeamsFilters = ({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
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

  const translateType = (value) =>
    t(`responseTeamFilters.types.${value}`, { defaultValue: value });

  const translateStatus = (value) =>
    t(`responseTeamFilters.statuses.${value}`, { defaultValue: value });

  const translateDistrict = (value) =>
    t(`districts.${value.toLowerCase().replace(/\s+/g, '')}`, {
      defaultValue: value
    });

  return (
    <div className="org-filter-card">
      <div className="org-filter-row">

        {/* Search Input */}
        <div className="org-filter-search-box">
          <span className="org-search-icon-pos">
            <IconSearch size={16} color="#64748B" />
          </span>

          <input
            type="text"
            className="org-filter-search-input"
            placeholder={t('responseTeamFilters.searchPlaceholder', {
              defaultValue: 'Search by team name, ID, leader, or area...'
            })}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={t('responseTeamFilters.searchLabel', {
              defaultValue: 'Search response teams'
            })}
          />

          {searchQuery && (
            <button
              className="org-search-clear-btn"
              onClick={() => onSearchChange('')}
              type="button"
              title={t('responseTeamFilters.clearSearch', {
                defaultValue: 'Clear search'
              })}
            >
              &times;
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="org-filter-select-group">

          <select
            className="org-filter-select"
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            aria-label={t('responseTeamFilters.allTypes', {
              defaultValue: 'All Team Types'
            })}
          >
            <option value="all">
              {t('responseTeamFilters.allTypes', {
                defaultValue: 'All Team Types'
              })}
            </option>

            {TEAM_TYPES.map((type) => (
              <option key={type} value={type}>
                {translateType(type)}
              </option>
            ))}
          </select>

          <select
            className="org-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label={t('responseTeamFilters.allStatuses', {
              defaultValue: 'All Statuses'
            })}
          >
            <option value="all">
              {t('responseTeamFilters.allStatuses', {
                defaultValue: 'All Statuses'
              })}
            </option>

            {TEAM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {translateStatus(status)}
              </option>
            ))}
          </select>

          <select
            className="org-filter-select"
            value={districtFilter}
            onChange={(e) => onDistrictChange(e.target.value)}
            aria-label={t('responseTeamFilters.allDistricts', {
              defaultValue: 'All Districts'
            })}
          >
            <option value="all">
              {t('responseTeamFilters.allDistricts', {
                defaultValue: 'All Districts'
              })}
            </option>

            {availableDistricts.map((district) => (
              <option key={district} value={district}>
                {translateDistrict(district)}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              className="org-filter-reset-btn"
              onClick={onResetFilters}
              type="button"
              title={t('common.clearFilters', {
                defaultValue: 'Clear all filters'
              })}
            >
              <span>
                {t('responseTeamFilters.clear', {
                  defaultValue: 'Clear'
                })}
              </span>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div className="org-active-filter-tags">

          <span style={{ fontWeight: 600 }}>
            {t('common.activeFiltersLabel', {
              defaultValue: 'Active Filters:'
            })}
          </span>

          {searchQuery && (
            <span className="org-filter-tag-pill">
              {t('common.search')}: "{searchQuery}"
            </span>
          )}

          {typeFilter !== 'all' && (
            <span className="org-filter-tag-pill">
              {t('common.type')}: {translateType(typeFilter)}
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="org-filter-tag-pill">
              {t('common.status')}: {translateStatus(statusFilter)}
            </span>
          )}

          {districtFilter !== 'all' && (
            <span className="org-filter-tag-pill">
              {t('common.district')}: {translateDistrict(districtFilter)}
            </span>
          )}

          {!hasActiveFilters && (
            <span style={{ color: '#94A3B8' }}>
              {t('responseTeamFilters.showingAll', {
                defaultValue: 'Showing all emergency response teams'
              })}
            </span>
          )}
        </div>

        {/* Development QA State Simulator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            fontSize: '11px',
            color: '#94A3B8',
            fontWeight: 600
          }}>
            {t('common.previewState', {
              defaultValue: 'Preview State'
            })}:
          </span>

          <div className="org-state-simulator-bar">
            {['normal', 'loading', 'empty', 'error'].map((state) => (
              <button
                key={state}
                className={`org-sim-btn ${activeSimState === state ? 'active' : ''}`}
                onClick={() => onSimStateChange(state)}
                type="button"
              >
                {t(`common.${state}`, {
                  defaultValue: state.charAt(0).toUpperCase() + state.slice(1)
                })}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
