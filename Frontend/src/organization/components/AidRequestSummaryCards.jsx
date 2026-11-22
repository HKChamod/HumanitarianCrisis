
import React from 'react';
import {
  IconHandHeart,
  IconClock,
  IconTrendingUp,
  IconCheckCircle
} from './Icons';
import { useTranslation } from 'react-i18next';

export const AidRequestSummaryCards = ({ requests = [] }) => {
  const { t } = useTranslation();

  const total = requests.length;
  const pendingCount = requests.filter(
    r => r.status === 'Pending' || r.status === 'Pending Review'
  ).length;
  const inProgressCount = requests.filter(
    r => r.status === 'Verified' || r.status === 'Assigned' || r.status === 'In Progress'
  ).length;
  const fulfilledCount = requests.filter(r => r.status === 'Fulfilled').length;

  const cards = [
    {
      id: 'total',
      label: t('aidRequests.kpi.total'),
      value: total,
      subtext: t('aidRequests.kpi.totalSub'),
      icon: IconHandHeart,
      iconColor: '#10756F',
      iconBg: '#ECFBF8',
      iconBorder: '#BCEFE6'
    },
    {
      id: 'pending',
      label: t('aidRequests.kpi.pending'),
      value: pendingCount,
      subtext: t('aidRequests.kpi.pendingSub'),
      icon: IconClock,
      iconColor: '#B45309',
      iconBg: '#FFFBEB',
      iconBorder: '#FDE68A'
    },
    {
      id: 'in-progress',
      label: t('aidRequests.kpi.inProgress'),
      value: inProgressCount,
      subtext: t('aidRequests.kpi.inProgressSub'),
      icon: IconTrendingUp,
      iconColor: '#1D4ED8',
      iconBg: '#EFF6FF',
      iconBorder: '#BFDBFE'
    },
    {
      id: 'fulfilled',
      label: t('aidRequests.kpi.fulfilled'),
      value: fulfilledCount,
      subtext: t('aidRequests.kpi.fulfilledSub'),
      icon: IconCheckCircle,
      iconColor: '#047857',
      iconBg: '#ECFDF5',
      iconBorder: '#A7F3D0'
    }
  ];

  return (
    <div className="org-incidents-kpi-grid org-aid-requests-kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} className="org-incidents-kpi-card">
            <div
              className="org-kpi-icon-box"
              style={{
                backgroundColor: card.iconBg,
                border: `1px solid ${card.iconBorder}`
              }}
            >
              <Icon size={22} color={card.iconColor} />
            </div>
            <div className="org-kpi-content">
              <span className="org-kpi-val">{card.value}</span>
              <span className="org-kpi-label">{card.label}</span>
              <span className="org-kpi-subtext">{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
