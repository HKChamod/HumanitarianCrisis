import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/CrisisIncidents.css';
import { IncidentSummaryCards } from './IncidentSummaryCards';
import { IncidentFilters } from './IncidentFilters';
import { IncidentTable } from './IncidentTable';
import { IncidentDetailsModal } from './IncidentDetailsModal';
import { crisisEventsService } from '../services/crisisEventsService';
import { IconAlertTriangle, IconPlus } from './Icons';

export const CrisisIncidentsPage = () => {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  // Selected Incident for Details Drawer
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // State Simulator for Testing QA (normal | loading | empty | error)
  const [simState, setSimState] = useState('normal');

  // Load Incidents
  const loadData = useCallback(async (stateMode = simState) => {
    setIsLoading(true);
    setError(null);

    try {
      if (stateMode === 'loading') {
        // Keeps loading state visible
        return;
      }

      const data = await crisisEventsService.getAllCrisisEvents({
        simulateError: stateMode === 'error',
        simulateEmpty: stateMode === 'empty'
      });
      setIncidents(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch crisis events.');
      setIncidents([]);
    } finally {
      if (stateMode !== 'loading') {
        setIsLoading(false);
      }
    }
  }, [simState]);

  useEffect(() => {
    loadData(simState);
  }, [loadData, simState]);

  // Extract distinct districts for filter dropdown
  const availableDistricts = useMemo(() => {
    const set = new Set();
    incidents.forEach(i => {
      if (i.district) set.add(i.district);
    });
    return Array.from(set).sort();
  }, [incidents]);

  // Filtered dataset
  const filteredIncidents = useMemo(() => {
    return incidents.filter(item => {
      // Search matching name, type, ID, or location
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.crisisName?.toLowerCase().includes(q);
        const matchesType = item.crisisType?.toLowerCase().includes(q);
        const matchesId = String(item.crisisId).includes(q) || `cr-${item.crisisId}`.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesDist = item.district?.toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesId && !matchesLoc && !matchesDist) {
          return false;
        }
      }

      // Severity filter
      if (severityFilter !== 'all') {
        if (item.severityLevel?.toLowerCase() !== severityFilter.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (item.status?.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      // District filter
      if (districtFilter !== 'all') {
        if (item.district?.toLowerCase() !== districtFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter, districtFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || severityFilter !== 'all' || statusFilter !== 'all' || districtFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSeverityFilter('all');
    setStatusFilter('all');
    setDistrictFilter('all');
  };

  const handleViewDetails = (incident) => {
    setSelectedIncident(incident);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedIncident(null);
  };

  const handleUpdateStatus = async (crisisId, newStatus) => {
    await crisisEventsService.updateCrisisStatus(crisisId, newStatus);
    // Update local state
    setIncidents(prev =>
      prev.map(item =>
        item.crisisId === crisisId
          ? { ...item, status: newStatus, lastUpdated: new Date().toISOString() }
          : item
      )
    );
    if (selectedIncident && selectedIncident.crisisId === crisisId) {
      setSelectedIncident(prev => ({
        ...prev,
        status: newStatus,
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  return (
    <div className="org-incidents-page">
      {/* Page Heading & Action */}
      <div className="org-page-header">
        <div className="org-page-title-wrap">
          <h1 className="org-page-title">
            <IconAlertTriangle size={24} color="#10756F" />
            <span>{t('incidents.pageTitle', { defaultValue: 'Crisis Incidents Command' })}</span>
          </h1>
          <p className="org-page-subtitle">
            {t('incidents.pageSubtitle', {
              defaultValue: 'Real-time incident directory, severity escalation monitoring, and relief operation deployment.'
            })}
          </p>
        </div>

        <div className="org-header-action-group">
          <button className="org-btn-primary" type="button">
            <IconPlus size={16} />
            <span>{t('incidents.addIncident', { defaultValue: 'Log Crisis Incident' })}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <IncidentSummaryCards incidents={incidents} />

      {/* Filter and Search Bar */}
      <IncidentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        districtFilter={districtFilter}
        onDistrictChange={setDistrictFilter}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        availableDistricts={availableDistricts}
        activeSimState={simState}
        onSimStateChange={(state) => setSimState(state)}
      />

      {/* Crisis Incidents Data Table */}
      <IncidentTable
        incidents={filteredIncidents}
        isLoading={isLoading}
        error={error}
        onViewDetails={handleViewDetails}
        onRetry={() => loadData(simState)}
        onResetFilters={handleResetFilters}
      />

      {/* Details Slide-Over Drawer */}
      <IncidentDetailsModal
        incident={selectedIncident}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default CrisisIncidentsPage;
