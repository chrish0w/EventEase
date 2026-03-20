import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function BudgetPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link to="/president/dashboard" className="text-sm font-medium text-yellow-700 hover:text-yellow-800">
          Back to dashboard
        </Link>

        <div className="mt-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-yellow-100">Budget</p>
              <h1 className="mt-1 text-3xl font-bold">Budget Overview</h1>
              <p className="mt-2 text-sm text-yellow-100">
                Placeholder page for {user?.name ? `${user.name}'s` : 'the'} budget tools.
              </p>
            </div>
            <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold">
              President
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-50 text-3xl text-yellow-700">
            $
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Budget page is ready for development</h2>
          <p className="mt-2 text-sm text-gray-500">
            Routing is in place. Next step is adding categories, transactions, and summary cards.
          </p>
        </div>
      </div>
    </div>
  );
}
