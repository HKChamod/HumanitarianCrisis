import { useState, useEffect } from 'react';
import { Heart, Package, CheckCircle2, Copy, Check } from 'lucide-react';
import { publicApi } from '../../../api/publicApi';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { useLanguage } from '../../../context/LanguageContext';

export function DonationInfoPage() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [copiedBank, setCopiedBank] = useState(null);

  useEffect(() => {
    publicApi.getDonationCampaigns().then((res) => setCampaigns(res.data));
  }, []);

  const copyAccount = (accountNo, campId) => {
    navigator.clipboard.writeText(accountNo);
    setCopiedBank(campId);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  return (
    <div style={{ backgroundColor: 'var(--color-surface-subtle)', minHeight: '80vh', padding: '3.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="section-label">{t('humanitarianAidLabel')}</span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
            {t('donationTitle')}
          </h1>
          <p style={{ color: 'var(--color-slate-600)', marginTop: '0.5rem', fontSize: '1rem', maxWidth: '640px', margin: '0.5rem auto 0' }}>
            {t('donationSubtitle')}
          </p>
        </div>

        {/* Campaign Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '2rem' }}>
          {campaigns.map((camp) => (
            <div key={camp.id} className="card" style={{ padding: '2.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                <Heart size={16} /> {t('activeVerifiedAppeal')}
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '0.375rem' }}>
                {camp.title}
              </h2>

              <div style={{ fontSize: '0.8125rem', color: 'var(--color-slate-500)', marginBottom: '1.5rem' }}>
                {t('organizedBy')} <strong>{camp.organizer}</strong>
              </div>

              {/* Fund Progress */}
              <div style={{ backgroundColor: 'var(--color-surface-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-slate-200)', marginBottom: '1.5rem' }}>
                <ProgressBar
                  current={camp.raisedAmount}
                  total={camp.targetAmount}
                  label={`LKR ${(camp.raisedAmount / 1000000).toFixed(2)}M of ${(camp.targetAmount / 1000000).toFixed(2)}M Target Raised`}
                />
              </div>

              {/* Needed Physical Items */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-slate-800)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.625rem' }}>
                  <Package size={16} color="var(--color-primary)" />
                  {t('neededSuppliesTitle')}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {camp.neededItems.map((item, idx) => (
                    <span key={idx} className="tag-pill" style={{ backgroundColor: '#F0FDFA', color: 'var(--color-primary-dark)', border: '1px solid #CCFBF1' }}>
                      <CheckCircle2 size={12} color="var(--color-primary)" /> {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Drop-off Centers */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-slate-800)', marginBottom: '0.375rem' }}>
                  {t('dropOffTitle')}
                </h4>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
                  {camp.dropOffPoints.map((dp, i) => (
                    <li key={i}>{dp}</li>
                  ))}
                </ul>
              </div>

              {/* Bank Transfer Details (Spec Compliance: No raw card entry on HCMS) */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-slate-300)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)' }}>
                    {t('officialBankAccount')}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyAccount(camp.bankDetails.accountNumber, camp.id)}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedBank === camp.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedBank === camp.id ? t('copiedLabel') : t('copyAccountBtn')}
                  </button>
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--color-slate-800)' }}>
                  <div>{t('bankLabel')} <strong>{camp.bankDetails.bank}</strong> ({camp.bankDetails.branch})</div>
                  <div>{t('accountNameLabel')} <strong>{camp.bankDetails.accountName}</strong></div>
                  <div>{t('accountNoLabel')} <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{camp.bankDetails.accountNumber}</strong></div>
                  <div>{t('swiftLabel')} <code>{camp.bankDetails.swiftCode}</code></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
