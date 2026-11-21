import { FileText, Clock, CheckCircle2, Truck } from 'lucide-react';

export function CitizenStats({ requests = [] }) {
  const total = requests.length;
  const pending = requests.filter(
    (r) => r.status === 'Submitted' || r.status === 'Under Review' || r.status === 'Pending'
  ).length;
  const inProgress = requests.filter(
    (r) => r.status === 'Approved' || r.status === 'In Progress' || r.status === 'Verified'
  ).length;
  const completed = requests.filter((r) => r.status === 'Completed').length;

  return (
    <div className="citizen-stats-grid" aria-label="Assistance Request Summary">
      {/* 1. Total Requests */}
      <div className="citizen-stat-card">
        <div>
          <div className="citizen-stat-label">Total Requests</div>
          <p className="citizen-stat-value">{total}</p>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Lifetime submitted</span>
        </div>
        <div className="citizen-stat-icon-wrap icon-teal">
          <FileText size={24} />
        </div>
      </div>

      {/* 2. Pending Review */}
      <div className="citizen-stat-card">
        <div>
          <div className="citizen-stat-label">Pending Review</div>
          <p className="citizen-stat-value" style={{ color: '#B45309' }}>{pending}</p>
          <span style={{ fontSize: '0.75rem', color: '#B45309' }}>Awaiting officer check</span>
        </div>
        <div className="citizen-stat-icon-wrap icon-amber">
          <Clock size={24} />
        </div>
      </div>

      {/* 3. Approved / In Progress */}
      <div className="citizen-stat-card">
        <div>
          <div className="citizen-stat-label">Approved &amp; Active</div>
          <p className="citizen-stat-value" style={{ color: '#0F766E' }}>{inProgress}</p>
          <span style={{ fontSize: '0.75rem', color: '#0F766E' }}>Relief team dispatching</span>
        </div>
        <div className="citizen-stat-icon-wrap icon-blue">
          <Truck size={24} />
        </div>
      </div>

      {/* 4. Completed */}
      <div className="citizen-stat-card">
        <div>
          <div className="citizen-stat-label">Assistance Delivered</div>
          <p className="citizen-stat-value" style={{ color: '#059669' }}>{completed}</p>
          <span style={{ fontSize: '0.75rem', color: '#059669' }}>Successfully fulfilled</span>
        </div>
        <div className="citizen-stat-icon-wrap icon-green">
          <CheckCircle2 size={24} />
        </div>
      </div>
    </div>
  );
}
