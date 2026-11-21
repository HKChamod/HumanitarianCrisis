import React from 'react';
import {
  IconBell,
  IconAlertTriangle,
  IconHandHeart,
  IconUsers,
  IconMapPin,
  IconPackage,
  IconMail
} from './Icons';

export const NotificationPreferencesSection = ({
  formData,
  onChange
}) => {
  const notifications = formData.notifications || {};

  const handleToggle = (key) => {
    onChange('notifications', {
      ...notifications,
      [key]: !notifications[key]
    });
  };

  const notificationItems = [
    {
      key: 'criticalCrisisAlerts',
      title: 'Critical Crisis Incidents',
      badge: 'High Priority',
      isUrgent: true,
      icon: <IconAlertTriangle size={18} color="#DC2626" />,
      description: 'Immediate audible alert and high-priority notification when Severity 4 or 5 incidents are reported in active districts.'
    },
    {
      key: 'newAidRequests',
      title: 'New Emergency Aid Requests',
      badge: 'Real-time',
      isUrgent: false,
      icon: <IconHandHeart size={18} color="#10756F" />,
      description: 'Receive real-time notifications as soon as affected citizens submit requests for medical aid, food, clean water, or rescue.'
    },
    {
      key: 'responseTeamUpdates',
      title: 'Response Team Deployment Updates',
      badge: 'Field Ops',
      isUrgent: false,
      icon: <IconUsers size={18} color="#10756F" />,
      description: 'Status updates when response teams are mobilized, reach operational staging points, or complete field missions.'
    },
    {
      key: 'assignedAreaRiskUpdates',
      title: 'Assigned Area Risk Level Changes',
      badge: 'Geo-Alert',
      isUrgent: false,
      icon: <IconMapPin size={18} color="#D97706" />,
      description: 'Notifications when regional meteorological or disaster risk ratings are escalated (e.g. from Moderate to High or Critical).'
    },
    {
      key: 'resourceShortageAlerts',
      title: 'Resource & Inventory Shortage Warnings',
      badge: 'Logistics',
      isUrgent: false,
      icon: <IconPackage size={18} color="#10756F" />,
      description: 'Warning flags when emergency stockpiles (clean water, medical kits, dry food rations) fall below minimum buffer reserves.'
    },
    {
      key: 'emailNotifications',
      title: 'Official Email Operational Digests',
      badge: 'Daily & Urgent',
      isUrgent: false,
      icon: <IconMail size={18} color="#10756F" />,
      description: 'Send daily incident summaries and immediate urgent incident dispatch memos directly to the official organization email.'
    }
  ];

  return (
    <section className="org-settings-card" aria-label="Notification Preferences">
      <div className="org-settings-card-header">
        <div>
          <h2>
            <IconBell size={20} color="#10756F" />
            Notification Preferences
          </h2>
          <p>Configure which operational events trigger sound notifications, banner alerts, and email briefs.</p>
        </div>
      </div>

      <div className="org-notifications-list">
        {notificationItems.map((item) => {
          const isChecked = !!notifications[item.key];
          return (
            <div key={item.key} className="org-notification-row">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ marginTop: '2px' }}>
                  {item.icon}
                </div>
                <div className="org-notification-info">
                  <h3>
                    <span>{item.title}</span>
                    <span className={`org-notification-badge ${item.isUrgent ? 'urgent' : ''}`}>
                      {item.badge}
                    </span>
                  </h3>
                  <p>{item.description}</p>
                </div>
              </div>

              {/* Custom Accessible Toggle */}
              <label className="org-toggle-switch" aria-label={`Toggle ${item.title}`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(item.key)}
                />
                <span className="org-toggle-slider" />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
};
