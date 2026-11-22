import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../styles/CrisisIncidents.css';
import '../styles/AssignedAreas.css';
import { AssignedAreasSummaryCards } from './AssignedAreasSummaryCards';
import { SriLankaCoverageMap } from './SriLankaCoverageMap';
import { AssignedAreasFilters } from './AssignedAreasFilters';
import { AssignedAreasTable } from './AssignedAreasTable';
import { AreaDetailsModal } from './AreaDetailsModal';
import { AssignNewAreaModal } from './AssignNewAreaModal';
import { assignedAreasService } from '../services/assignedAreasService';
import { USE_MOCK_API } from '../../services/api/axiosClient';
import { IconMapPin, IconPlus, IconAlertTriangle, IconSearch, IconCheckCircle } from './Icons';

export const AssignedAreasPage = () => {
  const [areas, setAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaTypeFilter, setAreaTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');

  // Selected Area for Details Drawer or Map interaction
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Assign/Edit Modal Form State
  const [areaToEdit, setAreaToEdit] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // QA Simulation State
  const [simState, setSimState] = useState('normal');

  // Load Areas Data
  const loadData = useCallback(async (stateMode = simState) => {
    setIsLoading(true);
    setError(null);

    try {
      if (stateMode === 'loading') {
        return; // maintain skeleton loading
      }

      const data = await assignedAreasService.getAllAssignedAreas({
        simulateError: stateMode === 'error',
        simulateEmpty: stateMode === 'empty'
      });
      setAreas(data);
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to fetch geographic areas.');
      setAreas([]);
    } finally {
      if (stateMode !== 'loading') {
        setIsLoading(false);
      }
    }
  }, [simState]);

  useEffect(() => {
    loadData(simState);
  }, [loadData, simState]);

  // Derived Districts for Filter
  const availableDistricts = useMemo(() => {
    const set = new Set();
    areas.forEach(a => {
      if (a.district) set.add(a.district);
    });
    return Array.from(set).sort();
  }, [areas]);

  // Derived Area Types for Live Filter
  const availableAreaTypes = useMemo(() => {
    const set = new Set();
    areas.forEach(a => {
      if (a.areaType) set.add(a.areaType);
    });
    return Array.from(set).sort();
  }, [areas]);

  // Filtered Areas
  const filteredAreas = useMemo(() => {
    return areas.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = String(item.areaId ?? '').toLowerCase().includes(q);
        const matchesName = item.areaName?.toLowerCase().includes(q);
        const matchesDist = item.district?.toLowerCase().includes(q);
        const matchesType = item.crisisType?.toLowerCase().includes(q) || item.areaType?.toLowerCase().includes(q);
        const matchesParent = item.parentAreaName?.toLowerCase().includes(q);
        const matchesCode = item.code?.toLowerCase().includes(q);
        const matchesTeams = item.assignedTeams?.some(t => t.toLowerCase().includes(q));
        if (!matchesId && !matchesName && !matchesDist && !matchesType && !matchesParent && !matchesCode && !matchesTeams) {
          return false;
        }
      }

      if (!USE_MOCK_API) {
        if (areaTypeFilter !== 'all' && item.areaType !== areaTypeFilter) {
          return false;
        }
        if (activeFilter === 'active' && !item.isActive) {
          return false;
        }
        if (activeFilter === 'inactive' && item.isActive) {
          return false;
        }
        return true;
      }

      // District filter (mock mode)
      if (districtFilter !== 'all') {
        if (item.district?.toLowerCase() !== districtFilter.toLowerCase()) {
          return false;
        }
      }

      // Risk level filter (mock mode)
      if (riskFilter !== 'all') {
        if (item.riskLevel?.toLowerCase() !== riskFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter (mock mode)
      if (statusFilter !== 'all') {
        if (item.responseStatus?.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [areas, searchQuery, districtFilter, riskFilter, statusFilter, areaTypeFilter, activeFilter]);

  const hasActiveFilters = USE_MOCK_API
    ? searchQuery.trim() !== '' ||
      districtFilter !== 'all' ||
      riskFilter !== 'all' ||
      statusFilter !== 'all'
    : searchQuery.trim() !== '' ||
      areaTypeFilter !== 'all' ||
      activeFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDistrictFilter('all');
    setRiskFilter('all');
    setStatusFilter('all');
    setAreaTypeFilter('all');
    setActiveFilter('all');
  };

  // View Details
  const handleOpenDetails = (area) => {
    setSelectedArea(area);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedArea(null);
  };

  // Open Assign New Area Modal
  const handleOpenAssignModal = () => {
    setAreaToEdit(null);
    setIsAssignModalOpen(true);
  };

  // Open Edit Area Modal
  const handleOpenEditModal = (area) => {
    setAreaToEdit(area);
    setIsAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setAreaToEdit(null);
  };

  // Save New or Edited Area
  const handleSaveArea = async (formData, editId) => {
    if (editId) {
      const updated = await assignedAreasService.updateArea(editId, formData);
      setAreas(prev => prev.map(a => (a.areaId === editId ? updated : a)));
      if (selectedArea && selectedArea.areaId === editId) {
        setSelectedArea(updated);
      }
    } else {
      const created = await assignedAreasService.assignNewArea(formData);
      setAreas(prev => [created, ...prev]);
    }
  };

  // Update Status & Risk
  const handleUpdateStatusAndRisk = async (areaId, newStatus, newRisk) => {
    const updated = await assignedAreasService.updateStatusAndRisk(areaId, newStatus, newRisk);
    setAreas(prev => prev.map(a => (a.areaId === areaId ? updated : a)));
    if (selectedArea && selectedArea.areaId === areaId) {
      setSelectedArea(updated);
    }
  };

  // Update Teams Assigned
  const handleUpdateTeams = async (areaId, teamNames) => {
    const updated = await assignedAreasService.assignTeamsToArea(areaId, teamNames);
    setAreas(prev => prev.map(a => (a.areaId === areaId ? updated : a)));
    if (selectedArea && selectedArea.areaId === areaId) {
      setSelectedArea(updated);
    }
  };

  if (!USE_MOCK_API) {
    const activeCount = areas.filter(a => a.isActive).length;
    const inactiveCount = areas.length - activeCount;

    return (
      <div className="org-areas-page">
        <div className="org-page-header">
          <div className="org-page-title-wrap">
            <h1 className="org-page-title">
              <IconMapPin size={24} color="#10756F" />
              <span>Geographic Areas Directory</span>
            </h1>
            <p className="org-page-subtitle">
              Platform geographical hierarchy records loaded from the HCMS Areas API (Provinces, Districts, DS/GN Divisions).
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '12.5px',
            color: '#475569',
            marginBottom: '16px',
          }}
        >
          <strong>Note:</strong> These records represent global platform geographical areas. Organization-specific area assignments, field team deployments, risk levels, and shelter capacities are not yet supported by the backend Areas API.
        </div>

        <div className="org-incidents-kpi-grid">
          <div className="org-incidents-kpi-card">
            <div className="org-kpi-icon-box" style={{ backgroundColor: '#ECFBF8', border: '1px solid #BCEFE6' }}>
              <IconMapPin size={22} color="#10756F" />
            </div>
            <div className="org-kpi-content">
              <span className="org-kpi-val">{areas.length}</span>
              <span className="org-kpi-label">Total Geographic Areas</span>
              <span className="org-kpi-subtext">Registered hierarchy records</span>
            </div>
          </div>
          <div className="org-incidents-kpi-card">
            <div className="org-kpi-icon-box" style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <IconCheckCircle size={22} color="#047857" />
            </div>
            <div className="org-kpi-content">
              <span className="org-kpi-val">{activeCount}</span>
              <span className="org-kpi-label">Active Areas</span>
              <span className="org-kpi-subtext">Available for crisis reporting</span>
            </div>
          </div>
          <div className="org-incidents-kpi-card">
            <div className="org-kpi-icon-box" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <IconAlertTriangle size={22} color="#DC2626" />
            </div>
            <div className="org-kpi-content">
              <span className="org-kpi-val">{inactiveCount}</span>
              <span className="org-kpi-label">Inactive Areas</span>
              <span className="org-kpi-subtext">Deactivated hierarchy entries</span>
            </div>
          </div>
          <div className="org-incidents-kpi-card">
            <div className="org-kpi-icon-box" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <IconMapPin size={22} color="#2563EB" />
            </div>
            <div className="org-kpi-content">
              <span className="org-kpi-val">{availableAreaTypes.length}</span>
              <span className="org-kpi-label">Area Types</span>
              <span className="org-kpi-subtext">Distinct administrative levels</span>
            </div>
          </div>
        </div>

        <div className="org-filter-card">
          <div className="org-filter-row">
            <div className="org-filter-search-box">
              <span className="org-search-icon-pos">
                <IconSearch size={16} color="#64748B" />
              </span>
              <input
                type="text"
                className="org-filter-search-input"
                placeholder="Search by Area ID, name, type, parent area, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search geographic areas"
              />
              {searchQuery && (
                <button
                  className="org-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  type="button"
                  title="Clear search"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="org-filter-select-group">
              <select
                className="org-filter-select"
                value={areaTypeFilter}
                onChange={(e) => setAreaTypeFilter(e.target.value)}
                aria-label="Filter by area type"
              >
                <option value="all">All Area Types</option>
                {availableAreaTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                className="org-filter-select"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                aria-label="Filter by active status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {hasActiveFilters && (
                <button
                  className="org-filter-reset-btn"
                  onClick={handleResetFilters}
                  type="button"
                  title="Clear filters"
                >
                  <span>Clear</span>
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="org-incidents-table-card">
          <div className="org-table-header-bar">
            <span className="org-table-count-label">
              Geographic Areas ({filteredAreas.length} Records)
            </span>
          </div>

          {isLoading && (
            <div style={{ padding: '24px' }}>
              <div className="org-skeleton-row"></div>
              <div className="org-skeleton-row"></div>
              <div className="org-skeleton-row"></div>
              <div className="org-skeleton-row"></div>
            </div>
          )}

          {!isLoading && error && (
            <div className="org-state-box">
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconAlertTriangle size={26} color="#DC2626" />
              </div>
              <h3 className="org-state-title">Unable to Load Geographic Areas</h3>
              <p className="org-state-desc">{error}</p>
              <button
                className="org-btn-primary"
                onClick={() => loadData(simState)}
                style={{ marginTop: '8px' }}
                type="button"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!isLoading && !error && filteredAreas.length === 0 && (
            <div className="org-state-box">
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#ECFBF8', color: '#10756F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconMapPin size={24} color="#10756F" />
              </div>
              <h3 className="org-state-title">No Geographic Areas Found</h3>
              <p className="org-state-desc">
                No geographic area records match your current filters.
              </p>
              {hasActiveFilters && (
                <button
                  className="org-btn-secondary"
                  onClick={handleResetFilters}
                  style={{ marginTop: '8px' }}
                  type="button"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && filteredAreas.length > 0 && (
            <div className="org-table-responsive">
              <table className="org-incidents-table">
                <thead>
                  <tr>
                    <th>Area ID</th>
                    <th>Area Name</th>
                    <th>Area Type</th>
                    <th>Parent Area</th>
                    <th>Code</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAreas.map((area) => (
                    <tr key={area.areaId}>
                      <td>
                        <span className="org-incident-code">#{area.areaId}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>{area.areaName}</td>
                      <td>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#10756F', backgroundColor: '#ECFBF8', padding: '2px 8px', borderRadius: '4px' }}>
                          {area.areaType}
                        </span>
                      </td>
                      <td style={{ color: '#475569' }}>{area.parentAreaName || '—'}</td>
                      <td style={{ color: '#64748B', fontFamily: 'monospace' }}>{area.code || '—'}</td>
                      <td>
                        <span className={`org-area-status-pill ${area.isActive ? 'active' : 'awaiting'}`}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: area.isActive ? '#059669' : '#DC2626' }}></span>
                          {area.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="org-areas-page">
      {/* 2. Page Header */}
      <div className="org-page-header">
        <div className="org-page-title-wrap">
          <h1 className="org-page-title">
            <IconMapPin size={24} color="#10756F" />
            <span>Assigned Areas Management</span>
          </h1>
          <p className="org-page-subtitle">
            Monitor disaster-affected regions, coordinate area coverage, and manage humanitarian response assignments.
          </p>
        </div>

        <div className="org-header-action-group">
          <button
            className="org-btn-primary"
            onClick={handleOpenAssignModal}
            type="button"
          >
            <IconPlus size={16} />
            <span>Assign New Area</span>
          </button>
        </div>
      </div>

      {/* 3. Dynamic Summary Cards */}
      <AssignedAreasSummaryCards areas={areas} />

      {/* 4. Geographic Coverage Map (Leaflet Sri Lanka Map) */}
      <SriLankaCoverageMap
        areas={areas}
        selectedAreaId={selectedArea?.areaId}
        onSelectArea={handleOpenDetails}
        districtFilter={districtFilter}
      />

      {/* 5. Search & Filters Toolbar */}
      <AssignedAreasFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        districtFilter={districtFilter}
        onDistrictChange={setDistrictFilter}
        riskFilter={riskFilter}
        onRiskChange={setRiskFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        availableDistricts={availableDistricts}
        activeSimState={simState}
        onSimStateChange={(state) => setSimState(state)}
      />

      {/* 6. Assigned Areas Directory Table */}
      <AssignedAreasTable
        areas={filteredAreas}
        isLoading={isLoading}
        error={error}
        onViewDetails={handleOpenDetails}
        onEditArea={handleOpenEditModal}
        onAssignTeam={handleOpenDetails}
        onRetry={() => loadData(simState)}
        onResetFilters={handleResetFilters}
      />

      {/* 7. View Details Drawer */}
      <AreaDetailsModal
        area={selectedArea}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onUpdateStatusAndRisk={handleUpdateStatusAndRisk}
        onUpdateTeams={handleUpdateTeams}
        onEdit={handleOpenEditModal}
      />

      {/* 8. Assign / Edit Area Modal Dialog */}
      <AssignNewAreaModal
        isOpen={isAssignModalOpen}
        areaToEdit={areaToEdit}
        onClose={handleCloseAssignModal}
        onSave={handleSaveArea}
      />
    </div>
  );
};

export default AssignedAreasPage;
