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
    <div className="super-admin-workspace min-h-screen bg-[#130c24]">
      <Navbar />
      <div className="relative max-w-5xl mx-auto px-6 py-8">
        <div className="bg-gradient-to-r from-violet-900 via-fuchsia-900 to-slate-950 rounded-2xl p-7 text-white mb-6 shadow-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200 mb-3">Platform Governance</p>
              <h1 className="text-3xl font-black mb-2">Super Admin Dashboard</h1>
              <p className="text-purple-100 text-sm">Approve organisations, manage admins, and review platform-wide roles.</p>
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
              <div key={s.label} className="bg-white/95 rounded-2xl border border-purple-100 shadow-xl p-5 text-center">
                <p className="text-3xl font-black text-violet-800">{s.value}</p>
                <p className="text-sm text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/super-admin/organisation-requests')}
            className="bg-white/95 rounded-2xl border border-purple-100 shadow-xl p-6 text-left hover:border-fuchsia-300 hover:-translate-y-1 transition"
          >
            <div className="text-2xl mb-2">📨</div>
            <p className="font-bold text-slate-900">Organisation Requests</p>
            <p className="text-sm text-slate-500 mt-1">Review new organisation workspace requests.</p>
          </button>
          <button
            onClick={() => navigate('/super-admin/organisations')}
            className="bg-white/95 rounded-2xl border border-purple-100 shadow-xl p-6 text-left hover:border-fuchsia-300 hover:-translate-y-1 transition"
          >
            <div className="text-2xl mb-2">🏫</div>
            <p className="font-bold text-slate-900">Organisation Management</p>
            <p className="text-sm text-slate-500 mt-1">View universities and assign organisation admins.</p>
          </button>
          <button
            onClick={() => navigate('/super-admin/users')}
            className="bg-white/95 rounded-2xl border border-purple-100 shadow-xl p-6 text-left hover:border-fuchsia-300 hover:-translate-y-1 transition sm:col-span-2"
          >
            <div className="text-2xl mb-2">👤</div>
            <p className="font-bold text-slate-900">Users & Roles</p>
            <p className="text-sm text-slate-500 mt-1">Search users and review their platform or club roles.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
