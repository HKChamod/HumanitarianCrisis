import { Link } from 'react-router-dom';
import { Utensils, HeartPulse, Home, Truck, Accessibility, HelpCircle } from 'lucide-react';

const CATEGORY_ICONS = {
  Food: { icon: Utensils, className: 'cat-icon-food' },
  Medicine: { icon: HeartPulse, className: 'cat-icon-medicine' },
  Shelter: { icon: Home, className: 'cat-icon-shelter' },
  Transport: { icon: Truck, className: 'cat-icon-transport' },
  'Accessibility Support': { icon: Accessibility, className: 'cat-icon-accessibility' },
  Other: { icon: HelpCircle, className: 'cat-icon-other' },
};

export function CategoryCard({ title, categoryKey }) {
  const meta = CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.Other;
  const Icon = meta.icon;

  return (
    <Link
      to={`/request-help?category=${encodeURIComponent(categoryKey)}`}
      className="category-card"
      title={`Request ${title} assistance`}
    >
      <div className={`cat-icon-box ${meta.className}`}>
        <Icon size={24} strokeWidth={2.2} />
      </div>
      <div>
        <h4 className="category-title">{title}</h4>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)' }}>
          Request assistance →
        </span>
      </div>
    </Link>
  );
}
