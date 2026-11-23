import React from 'react';
import {
  IconUsers,
  IconShieldCheck,
  IconTrendingUp
} from './Icons';
import { useTranslation } from 'react-i18next';

export const ResponseTeamsSummaryCards = ({ teams = [] }) => {
  const { t } = useTranslation();

  const totalTeams = teams.length;

  const availableTeams = teams.filter(
    t => t.status === 'Available'
  ).length;

  const deployedTeams = teams.filter(
    t => t.status === 'Deployed'
  ).length;

  const totalResponders = teams.reduce(
    (acc, t) => acc + (Number(t.membersCount) || 0),
    0
  );

  const cards = [
    {
      id: 'total',
      label: t('responseTeamSummary.total', {
        defaultValue: 'Total Response Teams'
      }),
      value: totalTeams,
      subtext: t('responseTeamSummary.totalSubtext', {
        defaultValue: 'Registered emergency units'
      }),
      icon: IconUsers,
      iconColor: '#10756F',
      iconBg: '#ECFBF8',
      iconBorder: '#BCEFE6'
    },
    {
      id: 'available',
      label: t('responseTeamSummary.available', {
        defaultValue: 'Available Teams'
      }),
      value: availableTeams,
      subtext: t('responseTeamSummary.availableSubtext', {
        defaultValue: 'Ready for immediate dispatch'
      }),
      icon: IconShieldCheck,
      iconColor: '#047857',
      iconBg: '#ECFDF5',
      iconBorder: '#A7F3D0'
    },
    {
      id: 'deployed',
      label: t('responseTeamSummary.deployed', {
        defaultValue: 'Deployed Teams'
      }),
      value: deployedTeams,
      subtext: t('responseTeamSummary.deployedSubtext', {
        defaultValue: 'Active on field crisis missions'
      }),
      icon: IconTrendingUp,
      iconColor: '#1D4ED8',
      iconBg: '#EFF6FF',
      iconBorder: '#BFDBFE'
    },
    {
      id: 'responders',
      label: t('responseTeamSummary.responders', {
        defaultValue: 'Active Responders'
      }),
      value: totalResponders,
      subtext: t('responseTeamSummary.respondersSubtext', {
        defaultValue: 'Trained field personnel'
      }),
      icon: IconUsers,
      iconColor: '#B45309',
      iconBg: '#FFFBEB',
      iconBorder: '#FDE68A'
    }
  ];

  return (
    <div className="org-incidents-kpi-grid org-teams-kpi-grid">
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
              <span className="org-kpi-val">
                {card.value}
              </span>

              <span className="org-kpi-label">
                {card.label}
              </span>

              <span className="org-kpi-subtext">
                {card.subtext}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};