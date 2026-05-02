import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicNav from '../components/PublicNav';
import api from '../api/axios';

export default function ConfirmOrganisationRegistrationPage() {
  const { token } = useParams();
  const [message, setMessage] = useState('Confirming your request...');
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(`/organisation-registration-requests/confirm/${token}`)
      .then(res => setMessage(res.data.message || 'Email confirmed. Your request is now pending review.'))
      .catch(err => {
        setError(true);
        setMessage(err.response?.data?.message || 'This confirmation link could not be verified.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />
      <main className="max-w-xl mx-auto px-6 py-20">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl ${error ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {error ? '!' : '✓'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{error ? 'Confirmation Failed' : 'Organisation Registration Confirmed'}</h1>
          <p className="text-gray-600 leading-relaxed">{message}</p>
          <Link to="/" className="mt-8 inline-flex bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg">Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
