import React from 'react';
import {
  IconMapPin,
  IconAlertTriangle,
  IconTrendingUp,
  IconUsers
} from './Icons';

export const AssignedAreasSummaryCards = ({ areas = [] }) => {
  const totalAreas = areas.length;
  const highRiskAreas = areas.filter(
    a => a.riskLevel === 'Critical' || a.riskLevel === 'High'
  ).length;
  const activeResponseAreas = areas.filter(
    a => a.responseStatus === 'Active Response'
  ).length;
  const totalCitizensCovered = areas.reduce(
    (sum, a) => sum + (Number(a.affectedCitizens) || 0),
    0
  );

  const cards = [
    {
      id: 'total-areas',
      label: 'Total Assigned Areas',
      value: totalAreas,
      subtext: 'Operational relief sectors',
      icon: IconMapPin,
      iconColor: '#10756F',
      iconBg: '#ECFBF8',
      iconBorder: '#BCEFE6'
    },
    {
      id: 'high-risk',
      label: 'High Risk Areas',
      value: highRiskAreas,
      subtext: 'Critical & High severity zones',
      icon: IconAlertTriangle,
      iconColor: '#DC2626',
      iconBg: '#FEF2F2',
      iconBorder: '#FECACA'
    },
    {
      id: 'active-response',
      label: 'Areas Under Active Response',
      value: activeResponseAreas,
      subtext: 'Field teams deployed on-site',
      icon: IconTrendingUp,
      iconColor: '#047857',
      iconBg: '#ECFDF5',
      iconBorder: '#A7F3D0'
    },
    {
      id: 'citizens-covered',
      label: 'Citizens Covered',
      value: totalCitizensCovered.toLocaleString(),
      subtext: 'Populations under response coverage',
      icon: IconUsers,
      iconColor: '#B45309',
      iconBg: '#FFFBEB',
      iconBorder: '#FDE68A'
    }
  ];

  return (
    <div className="org-incidents-kpi-grid">
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
