export function StepCard({ number, title, description }) {
  return (
    <div className="step-card">
      <div className="step-badge-number">{number}</div>
      <h4 className="step-card-title">{title}</h4>
      <p className="step-card-desc">{description}</p>
    </div>
  );
}
