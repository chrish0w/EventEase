import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

type EventBudget = {
  id: string;
  name: string;
  budgetedAmount: string;
  actualAmount: string;
  notes: string;
};

const eventBudgets: EventBudget[] = [];

export default function BudgetPage() {
  const { user } = useAuth();
  const [totalBudget, setTotalBudget] = useState('0');

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <Link to="/president/dashboard" className="text-sm font-medium text-amber-700 hover:text-amber-800">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-stone-900">Club Budget</h1>
            <p className="mt-2 text-sm text-stone-600">
              Spreadsheet-style budget tracking for total budget and event expenses.
            </p>
          </div>

          <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
            President View
          </div>
        </div>

        <div className="space-y-8">
          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">Total Budget</h2>
              <p className="mt-1 text-sm text-stone-500">
                Only the president can edit the club&apos;s total budget amount.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-amber-50 text-left text-stone-700">
                    <th className="border-b border-stone-200 px-6 py-3 font-semibold">Budget Item</th>
                    <th className="border-b border-stone-200 px-6 py-3 font-semibold">Amount</th>
                    <th className="border-b border-stone-200 px-6 py-3 font-semibold">Access</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border-b border-stone-200 px-6 py-4 font-medium text-stone-900">Club Total Budget</td>
                    <td className="border-b border-stone-200 px-6 py-4">
                      <div className="flex max-w-xs items-center rounded-lg border border-stone-300 bg-stone-50 px-3">
                        <span className="text-stone-500">$</span>
                        <input
                          type="number"
                          min="0"
                          value={totalBudget}
                          onChange={(event) => setTotalBudget(event.target.value)}
                          disabled={user?.role !== 'president'}
                          className="w-full bg-transparent px-2 py-2 text-stone-900 outline-none disabled:cursor-not-allowed disabled:text-stone-500"
                        />
                      </div>
                    </td>
                    <td className="border-b border-stone-200 px-6 py-4 text-stone-600">
                      {user?.role === 'president' ? 'Editable' : 'Read only'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">Expenses</h2>
              <p className="mt-1 text-sm text-stone-500">
                Each event will appear here once the event management system is connected.
              </p>
            </div>

            {eventBudgets.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-base font-medium text-stone-700">No events yet</p>
                <p className="mt-2 text-sm text-stone-500">
                  Event expense tables will appear here after events are created in the system.
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                {eventBudgets.map((eventBudget) => (
                  <div key={eventBudget.id} className="overflow-hidden rounded-xl border border-stone-200">
                    <div className="border-b border-stone-200 bg-amber-50 px-5 py-3">
                      <h3 className="font-semibold text-stone-900">{eventBudget.name}</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-white text-left text-stone-700">
                            <th className="border-b border-stone-200 px-5 py-3 font-semibold">Budgetted Amount</th>
                            <th className="border-b border-stone-200 px-5 py-3 font-semibold">Actual Amount</th>
                            <th className="border-b border-stone-200 px-5 py-3 font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border-b border-stone-200 px-5 py-4 text-stone-600">{eventBudget.budgetedAmount}</td>
                            <td className="border-b border-stone-200 px-5 py-4 text-stone-600">{eventBudget.actualAmount}</td>
                            <td className="border-b border-stone-200 px-5 py-4 text-stone-600">{eventBudget.notes}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
