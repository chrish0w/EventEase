import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function ConfirmClubRegistrationPage() {
  const { token } = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your request...');

  useEffect(() => {
    api.get(`/club-registration-requests/confirm/${token}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message || 'Email confirmed. Your request is now pending review.');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This confirmation link could not be verified.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600">EventEase</Link>
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">Login</Link>
        </div>
      </nav>
      <main className="max-w-xl mx-auto px-6 py-20">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl ${
            status === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {status === 'loading' ? '...' : status === 'error' ? '!' : '✓'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {status === 'error' ? 'Confirmation Failed' : 'Club Registration Confirmed'}
          </h1>
          <p className="text-gray-600 leading-relaxed">{message}</p>
          {status === 'success' && (
            <p className="text-gray-500 mt-4">
              Your request will now appear in the admin review queue.
            </p>
          )}
          <Link
            to="/"
            className="mt-8 inline-flex items-center justify-center bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
