import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../styles/CrisisIncidents.css';
import '../styles/AidRequests.css';
import { AidRequestSummaryCards } from './AidRequestSummaryCards';
import { AidRequestFilters } from './AidRequestFilters';
import { AidRequestTable } from './AidRequestTable';
import { AidRequestDetailsModal } from './AidRequestDetailsModal';
import { aidRequestsService } from '../services/aidRequestsService';
import { IconHandHeart } from './Icons';
import { useTranslation } from 'react-i18next';

export const AidRequestsPage = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');

  // Selected Request for Details Drawer
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // QA Simulation State (normal | loading | empty | error)
  const [simState, setSimState] = useState('normal');

  // Load Data
  const loadData = useCallback(async (stateMode = simState) => {
    setIsLoading(true);
    setError(null);

    try {
      if (stateMode === 'loading') {
        return; // maintain skeleton loading
      }

      const data = await aidRequestsService.getAllAidRequests({
        simulateError: stateMode === 'error',
        simulateEmpty: stateMode === 'empty'
      });
      setRequests(data);
    } catch (err) {
      setError(err?.detail || err?.message || 'Failed to fetch aid requests.');
      setRequests([]);
    } finally {
      if (stateMode !== 'loading') {
        setIsLoading(false);
      }
    }
  }, [simState]);

  useEffect(() => {
    loadData(simState);
  }, [loadData, simState]);

  // Derived Districts for Filter Dropdown
  const availableDistricts = useMemo(() => {
    const set = new Set();
    requests.forEach(r => {
      if (r.district) set.add(r.district);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Filtered Aid Requests
  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      // Search matching request ID, requester, location, or aid category
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = String(item.requestId ?? '').toLowerCase().includes(q);
        const matchesRequester = item.requester?.toLowerCase().includes(q);
        const matchesLoc = item.location?.toLowerCase().includes(q);
        const matchesDist = item.district?.toLowerCase().includes(q);
        const matchesCat = item.aidCategory?.toLowerCase().includes(q);
        if (!matchesId && !matchesRequester && !matchesLoc && !matchesDist && !matchesCat) {
          return false;
        }
      }

      // Aid Category filter
      if (categoryFilter !== 'all') {
        if (item.aidCategory?.toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        if (item.priority?.toLowerCase() !== priorityFilter.toLowerCase()) {
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
  }, [requests, searchQuery, categoryFilter, priorityFilter, statusFilter, districtFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all' ||
    districtFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setDistrictFilter('all');
  };

  const handleViewDetails = (req) => {
    setSelectedRequest(req);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRequest(null);
  };

  // Functional Status Update
  const handleUpdateStatus = async (requestId, newStatus) => {
    const updated = await aidRequestsService.updateStatus(requestId, newStatus);
    const nextStatus = updated?.status || newStatus;
    setRequests(prev =>
      prev.map(item =>
        item.requestId === requestId ? { ...item, status: nextStatus } : item
      )
    );
    if (selectedRequest && selectedRequest.requestId === requestId) {
      setSelectedRequest(prev => ({ ...prev, status: nextStatus }));
    }
  };

  // Functional Response Team Assignment
  const handleAssignTeam = async (requestId, teamName) => {
    await aidRequestsService.assignTeam(requestId, teamName);
    setRequests(prev =>
      prev.map(item => {
        if (item.requestId === requestId) {
          const updatedStatus =
            item.status === 'Pending Review' && teamName !== 'Unassigned'
              ? 'In Progress'
              : item.status;
          return { ...item, assignedTeam: teamName, status: updatedStatus };
        }
        return item;
      })
    );
    if (selectedRequest && selectedRequest.requestId === requestId) {
      setSelectedRequest(prev => {
        const updatedStatus =
          prev.status === 'Pending Review' && teamName !== 'Unassigned'
            ? 'In Progress'
            : prev.status;
        return { ...prev, assignedTeam: teamName, status: updatedStatus };
      });
    }
  };

  return (
    <div className="org-aid-requests-page">
      {/* 1. Page Header */}
      <div className="org-page-header">
        <div className="org-page-title-wrap">
          <h1 className="org-page-title">
            <IconHandHeart size={24} color="#10756F" />
            <span>{t('aidRequests.pageTitle')}</span>
          </h1>
          <p className="org-page-subtitle">
            {t('aidRequests.pageSubtitle')}
          </p>
        </div>
      </div>

      {/* 2. Four Summary KPI Cards */}
      <AidRequestSummaryCards requests={requests} />

      {/* 3. Search and Filter Section */}
      <AidRequestFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
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

      {/* 4. Aid Requests Table with States */}
      <AidRequestTable
        requests={filteredRequests}
        isLoading={isLoading}
        error={error}
        onViewDetails={handleViewDetails}
        onRetry={() => loadData(simState)}
        onResetFilters={handleResetFilters}
      />

      {/* 6 & 7. Request Details Modal / Side Panel */}
      <AidRequestDetailsModal
        request={selectedRequest}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onUpdateStatus={handleUpdateStatus}
        onAssignTeam={handleAssignTeam}
      />
    </div>
  );
};

export default AidRequestsPage;
