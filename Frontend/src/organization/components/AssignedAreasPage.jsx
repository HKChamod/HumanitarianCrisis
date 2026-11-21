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
import { IconMapPin, IconPlus } from './Icons';

export const AssignedAreasPage = () => {
  const [areas, setAreas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

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
      setError(err.message || 'Failed to fetch assigned areas.');
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

  // Filtered Areas
  const filteredAreas = useMemo(() => {
    return areas.filter(item => {
      // Search matching area name, ID, district, crisis type, or teams
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = item.areaId?.toLowerCase().includes(q);
        const matchesName = item.areaName?.toLowerCase().includes(q);
        const matchesDist = item.district?.toLowerCase().includes(q);
        const matchesType = item.crisisType?.toLowerCase().includes(q);
        const matchesTeams = item.assignedTeams?.some(t => t.toLowerCase().includes(q));
        if (!matchesId && !matchesName && !matchesDist && !matchesType && !matchesTeams) {
          return false;
        }
      }

      // District filter
      if (districtFilter !== 'all') {
        if (item.district?.toLowerCase() !== districtFilter.toLowerCase()) {
          return false;
        }
      }

      // Risk level filter
      if (riskFilter !== 'all') {
        if (item.riskLevel?.toLowerCase() !== riskFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (item.responseStatus?.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [areas, searchQuery, districtFilter, riskFilter, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    districtFilter !== 'all' ||
    riskFilter !== 'all' ||
    statusFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDistrictFilter('all');
    setRiskFilter('all');
    setStatusFilter('all');
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
