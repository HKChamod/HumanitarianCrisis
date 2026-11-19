import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { crisisService } from '../../../services/api/adminServices';
import { PageHeader } from '../../../components/common/PageHeader';
import { SriLankaMapView } from '../../../components/charts/SriLankaMapView';
import { ErrorState, LoadingState } from '../../../components/common/States';
import { PermissionGate } from '../../../app/providers/AuthProvider';

export function AdminCrisisMapPage() {
  const navigate = useNavigate();
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCrises = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crisisService.list();
      setCrises(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrises();
  }, []);

  return (
    <div>
      <PageHeader
        title="National Crisis Map"
        subtitle="Interactive geographic monitoring of crisis events across Sri Lankan provinces and districts."
        actions={
          <PermissionGate permission="CrisisEvents.Create">
            <Link
              to="/admin/crises/create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0F766E] text-white hover:bg-[#115E59]"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Crisis Event
            </Link>
          </PermissionGate>
        }
      />

      {loading ? (
        <LoadingState message="Loading crisis map markers..." />
      ) : error ? (
        <ErrorState message={error.detail} onRetry={loadCrises} />
      ) : (
        <SriLankaMapView
          crises={crises}
          allowViewToggle
          onSelectCrisis={(crisis) => navigate(`/admin/crises?q=${encodeURIComponent(crisis.id)}`)}
        />
      )}
    </div>
  );
}
