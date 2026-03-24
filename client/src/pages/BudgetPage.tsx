import { useEffect, useState } from 'react';
import Navbar, { PresidentNav } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

type EventBudget = {
  id: string;
  name: string;
  date: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  notes: string;
};

type BudgetResponse = {
  totalBudget: number;
  events: EventBudget[];
};

export default function BudgetPage() {
  const { user, selectedClub } = useAuth();
  const [totalBudget, setTotalBudget] = useState('0');
  const [eventBudgets, setEventBudgets] = useState<EventBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedClub?.clubId) {
      setLoading(false);
      return;
    }

    api.get<BudgetResponse>(`/budget?clubId=${selectedClub.clubId}`)
      .then((res) => {
        setTotalBudget(String(res.data.totalBudget ?? 0));
        setEventBudgets(res.data.events ?? []);
      })
      .catch((err) => {
        const message = err.response?.data?.message || 'Failed to load budget data.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const updateEventBudget = (id: string, field: 'budgetedAmount' | 'actualAmount' | 'notes', value: string) => {
    setEventBudgets((prev) => prev.map((event) => (
      event.id === id
        ? { ...event, [field]: field === 'notes' ? value : Number(value || 0) }
        : event
    )));
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-8 flex gap-6">
        <PresidentNav active="budget" />

        <main className="flex-1">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="mt-3 text-3xl font-bold text-stone-900">Club Budget</h1>
              <p className="mt-2 text-sm text-stone-600">
                Track your overall budget and review each event in one place.
              </p>
            </div>

            <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
              {user?.role === 'president' ? 'President View' : 'Read Only'}
            </div>
          </div>

          <div className="space-y-8">
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
                <h2 className="text-lg font-semibold text-stone-900">Total Budget</h2>
                <p className="mt-1 text-sm text-stone-500">
                  This is still local-only in the UI for now.
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
                        {user?.role === 'president' ? 'Editable in UI' : 'Read only'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-200 bg-stone-50 px-6 py-4">
                <h2 className="text-lg font-semibold text-stone-900">Event Budgets</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Events created in the event system now appear here automatically.
                </p>
              </div>

              {loading ? (
                <div className="px-6 py-12 text-center text-sm text-stone-500">Loading budget data...</div>
              ) : error ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-base font-medium text-red-700">{error}</p>
                  <p className="mt-2 text-sm text-stone-500">Make sure you are in a selected club as president.</p>
                </div>
              ) : eventBudgets.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-base font-medium text-stone-700">No events yet</p>
                  <p className="mt-2 text-sm text-stone-500">
                    Create an event first and it will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  {eventBudgets.map((eventBudget) => (
                    <div key={eventBudget.id} className="overflow-hidden rounded-xl border border-stone-200">
                      <div className="border-b border-stone-200 bg-amber-50 px-5 py-3">
                        <h3 className="font-semibold text-stone-900">{eventBudget.name}</h3>
                        <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">
                          {eventBudget.category} | {new Date(eventBudget.date).toLocaleDateString('en-AU')}
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-white text-left text-stone-700">
                              <th className="border-b border-stone-200 px-5 py-3 font-semibold">Budgeted Amount</th>
                              <th className="border-b border-stone-200 px-5 py-3 font-semibold">Actual Amount</th>
                              <th className="border-b border-stone-200 px-5 py-3 font-semibold">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border-b border-stone-200 px-5 py-4">
                                <input
                                  type="number"
                                  min="0"
                                  value={eventBudget.budgetedAmount}
                                  onChange={(event) => updateEventBudget(eventBudget.id, 'budgetedAmount', event.target.value)}
                                  className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-stone-900 outline-none"
                                />
                              </td>
                              <td className="border-b border-stone-200 px-5 py-4">
                                <input
                                  type="number"
                                  min="0"
                                  value={eventBudget.actualAmount}
                                  onChange={(event) => updateEventBudget(eventBudget.id, 'actualAmount', event.target.value)}
                                  className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-stone-900 outline-none"
                                />
                              </td>
                              <td className="border-b border-stone-200 px-5 py-4">
                                <input
                                  value={eventBudget.notes}
                                  onChange={(event) => updateEventBudget(eventBudget.id, 'notes', event.target.value)}
                                  placeholder="Add notes for this event"
                                  className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-stone-900 outline-none"
                                />
                              </td>
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
        </main>
      </div>
    </div>
  );
}
