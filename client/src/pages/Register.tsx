import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PublicNav from '../components/PublicNav';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    role: 'user',
  });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/clubs/join');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="public-page-shell">
      <PublicNav />

      <main className="public-bg min-h-[calc(100vh-73px)] flex items-center justify-center px-4 py-16">
        <div className="relative bg-gray-900/85 border border-white/10 p-8 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">EventEase</h1>
          <p className="text-gray-400 text-sm mt-1">Create your account</p>
        </div>
        {error && <p className="text-red-500 mb-4 text-sm bg-red-50 p-2 rounded">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Full Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Student ID</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. 12345678"
              value={form.studentId}
              onChange={e => setForm({ ...form, studentId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium transition"
            type="submit"
          >
            Create Account
          </button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-300">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign In</Link>
        </p>
      </div>
      </main>
    </div>
  );
}
