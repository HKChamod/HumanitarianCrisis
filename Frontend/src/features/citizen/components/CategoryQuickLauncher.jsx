import { Utensils, HeartPulse, Home, Truck, Accessibility, HelpCircle } from 'lucide-react';

const CATEGORIES = [
  {
    key: 'Food',
    name: 'Food & Clean Water',
    description: 'Dry rations, cooked meals, drinking water',
    icon: Utensils,
  },
  {
    key: 'Medicine',
    name: 'Medicine & First Aid',
    description: 'Prescription drugs, baby formula, urgent care',
    icon: HeartPulse,
  },
  {
    key: 'Shelter',
    name: 'Emergency Shelter',
    description: 'Evacuation bedding, tarpaulins, camp placement',
    icon: Home,
  },
  {
    key: 'Transport',
    name: 'Emergency Transport',
    description: 'Flood boat evacuation, patient transit',
    icon: Truck,
  },
  {
    key: 'Accessibility Support',
    name: 'Accessibility Support',
    description: 'Wheelchair assistance, elder care mobility',
    icon: Accessibility,
  },
  {
    key: 'Other',
    name: 'Other Urgent Help',
    description: 'Clothing, blankets, hygiene or sanitation kits',
    icon: HelpCircle,
  },
];

export function CategoryQuickLauncher({ onSelectCategory }) {
  return (
    <section className="citizen-categories-section" aria-label="Assistance Needs Categories">
      <div className="section-eyebrow">Start Here</div>
      <h2 className="section-heading">What emergency assistance do you need?</h2>
      <p className="section-desc">
        Select a category below to instantly begin your assistance request.
      </p>

      <div className="citizen-category-grid">
        {CATEGORIES.map((cat) => {
          const IconComp = cat.icon;
          return (
            <button
              key={cat.key}
              type="button"
              className="citizen-cat-card"
              onClick={() => onSelectCategory(cat.key)}
              title={`Request ${cat.name}`}
            >
              <div className="citizen-cat-icon">
                <IconComp size={22} strokeWidth={2.2} />
              </div>
              <div>
                <p className="citizen-cat-name">{cat.name}</p>
                <p className="citizen-cat-sub">{cat.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
