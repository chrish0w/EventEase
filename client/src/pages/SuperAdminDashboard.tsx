import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axios';

interface Stats {
  totalOrgs: number;
  totalUsers: number;
  totalAdmins: number;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/super-admin/stats')
      .then(res => setStats(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-purple-800 to-purple-900 rounded-xl p-6 text-white mb-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Super Admin Dashboard</h1>
              <p className="text-purple-200 text-sm">Platform-wide governance and control.</p>
            </div>
            <span className="bg-white/20 border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Super Admin
            </span>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Organisations', value: stats.totalOrgs },
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Org Admins', value: stats.totalAdmins },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-purple-700">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/super-admin/organisations')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-left hover:border-purple-300 hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">🏫</div>
            <p className="font-semibold text-gray-800">Organisation Management</p>
            <p className="text-sm text-gray-400 mt-1">Create, edit, or delete clubs.</p>
          </button>
          <button
            onClick={() => navigate('/super-admin/org-admins')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-left hover:border-purple-300 hover:shadow-md transition"
          >
            <div className="text-2xl mb-2">👤</div>
            <p className="font-semibold text-gray-800">Org Admin Management</p>
            <p className="text-sm text-gray-400 mt-1">Assign or manage platform admins.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
