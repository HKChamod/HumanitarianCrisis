import React from 'react';
import { IconSearch } from './Icons';
import { AREA_RESPONSE_STATUSES, AREA_RISK_LEVELS } from '../data/mockAssignedAreas';

export const AssignedAreasFilters = ({
  searchQuery,
  onSearchChange,
  districtFilter,
  onDistrictChange,
  riskFilter,
  onRiskChange,
  statusFilter,
  onStatusChange,
  onResetFilters,
  hasActiveFilters,
  availableDistricts = [],
  activeSimState = 'normal',
  onSimStateChange = () => {}
}) => {
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
            placeholder="Search by area name, ID, district, crisis type, or assigned teams..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search assigned areas"
          />
          {searchQuery && (
            <button
              className="org-search-clear-btn"
              onClick={() => onSearchChange('')}
              type="button"
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div className="org-filter-select-group">
          {/* District Filter */}
          <select
            className="org-filter-select"
            value={districtFilter}
            onChange={(e) => onDistrictChange(e.target.value)}
            aria-label="Filter by District"
          >
            <option value="all">All Districts</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Risk Level Filter */}
          <select
            className="org-filter-select"
            value={riskFilter}
            onChange={(e) => onRiskChange(e.target.value)}
            aria-label="Filter by Risk Level"
          >
            <option value="all">All Risk Levels</option>
            {AREA_RISK_LEVELS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Response Status Filter */}
          <select
            className="org-filter-select"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by Response Status"
          >
            <option value="all">All Response Statuses</option>
            {AREA_RESPONSE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              className="org-filter-reset-btn"
              onClick={onResetFilters}
              type="button"
              title="Clear all filters"
            >
              <span>Clear</span>
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Active Badges & QA Simulator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div className="org-active-filter-tags">
          <span style={{ fontWeight: 600 }}>Active Filters:</span>
          {searchQuery && (
            <span className="org-filter-tag-pill">Search: "{searchQuery}"</span>
          )}
          {districtFilter !== 'all' && (
            <span className="org-filter-tag-pill">District: {districtFilter}</span>
          )}
          {riskFilter !== 'all' && (
            <span className="org-filter-tag-pill">Risk: {riskFilter}</span>
          )}
          {statusFilter !== 'all' && (
            <span className="org-filter-tag-pill">Status: {statusFilter}</span>
          )}
          {!hasActiveFilters && (
            <span style={{ color: '#94A3B8' }}>Showing all assigned areas & synchronized map</span>
          )}
        </div>

        {/* Development QA State Simulator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Preview State:</span>
          <div className="org-state-simulator-bar">
            <button
              className={`org-sim-btn ${activeSimState === 'normal' ? 'active' : ''}`}
              onClick={() => onSimStateChange('normal')}
              type="button"
            >
              Normal
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'loading' ? 'active' : ''}`}
              onClick={() => onSimStateChange('loading')}
              type="button"
            >
              Loading
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'empty' ? 'active' : ''}`}
              onClick={() => onSimStateChange('empty')}
              type="button"
            >
              Empty
            </button>
            <button
              className={`org-sim-btn ${activeSimState === 'error' ? 'active' : ''}`}
              onClick={() => onSimStateChange('error')}
              type="button"
            >
              Error
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
