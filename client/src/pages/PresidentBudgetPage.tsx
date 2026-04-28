import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

type IncomeSourceKey = 'organization' | 'membershipFees' | 'eventIncome' | 'sponsorship' | 'others';

interface IncomeSources {
  organization: number;
  membershipFees: number;
  eventIncome: number;
  sponsorship: number;
  others: number;
}

interface BudgetEvent {
  id: string;
  name: string;
  date: string;
  category: string;
  lineItems: BudgetLineItem[];
  budgetedAmount: number;
  actualAmount: number;
}

interface BudgetLineItem {
  _id?: string;
  description?: string;
  label?: string;
  assignedAmount?: number;
  budgetedAmount?: number;
  actualAmount?: number;
  notes?: string;
}

interface BudgetResponse {
  totalBudget: number;
  remainingBudget: number;
  incomeSources: IncomeSources;
  events: BudgetEvent[];
}

type BudgetSummaryResponse = Pick<BudgetResponse, 'totalBudget' | 'remainingBudget' | 'incomeSources'>;

const EMPTY_INCOME_SOURCES: IncomeSources = {
  organization: 0,
  membershipFees: 0,
  eventIncome: 0,
  sponsorship: 0,
  others: 0,
};

const INCOME_SOURCE_CONFIG: Array<{ key: IncomeSourceKey; label: string; color: string }> = [
  { key: 'organization', label: 'Organization', color: '#dc2626' },
  { key: 'membershipFees', label: 'Membership fees', color: '#2563eb' },
  { key: 'eventIncome', label: 'Event Income', color: '#16a34a' },
  { key: 'sponsorship', label: 'Sponsorship', color: '#d97706' },
  { key: 'others', label: 'Others', color: '#64748b' },
];

const sidebarLinks = [
  { label: 'Dashboard', path: '/president/dashboard' },
  { label: 'Events', path: '/president/events' },
  { label: 'Tasks', path: null },
  { label: 'Budget', path: '/president/budget' },
  { label: 'Members', path: '/president/members' },
  { label: 'Safety Files', path: null },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describePieSlice(startAngle: number, endAngle: number) {
  const cx = 150;
  const cy = 150;
  const radius = 120;
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function SemiPieChart({ items, total }: { items: Array<{ color: string; amount: number }>; total: number }) {
  let currentAngle = 180;
  const visibleItems = items.filter(item => item.amount > 0);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg viewBox="0 0 300 170" className="h-56 w-full" role="img" aria-label="Source of income chart">
        {total <= 0 ? (
          <path d={describePieSlice(180, 360)} fill="#e5e7eb" />
        ) : (
          visibleItems.map((item, index) => {
            const nextAngle = currentAngle + (item.amount / total) * 180;
            const path = describePieSlice(currentAngle, nextAngle);
            currentAngle = nextAngle;
            return <path key={`${item.color}-${index}`} d={path} fill={item.color} stroke="#ffffff" strokeWidth="2" />;
          })
        )}
        <circle cx="150" cy="150" r="54" fill="#ffffff" />
        <text x="150" y="118" textAnchor="middle" className="fill-gray-500 text-[11px] font-medium">
          Total income
        </text>
        <text x="150" y="140" textAnchor="middle" className="fill-gray-900 text-[18px] font-bold">
          {formatCurrency(total)}
        </text>
      </svg>
    </div>
  );
}

export default function PresidentBudgetPage() {
  const navigate = useNavigate();
  const { selectedClub } = useAuth();
  const [budget, setBudget] = useState<BudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState<Record<IncomeSourceKey, string>>({
    organization: '',
    membershipFees: '',
    eventIncome: '',
    sponsorship: '',
    others: '',
  });
  const [savingIncome, setSavingIncome] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<BudgetEvent | null>(null);

  useEffect(() => {
    if (!selectedClub?.clubId) return;
    setLoading(true);
    api.get<BudgetResponse>(`/budget?clubId=${selectedClub.clubId}`)
      .then(res => {
        const incomeSources = { ...EMPTY_INCOME_SOURCES, ...(res.data.incomeSources || {}) };
        setBudget({ ...res.data, incomeSources });
      })
      .catch(() => setError('Failed to load budget.'))
      .finally(() => setLoading(false));
  }, [selectedClub]);

  const incomeSources = budget?.incomeSources || EMPTY_INCOME_SOURCES;

  const sourceItems = useMemo(() => (
    INCOME_SOURCE_CONFIG.map(source => ({
      ...source,
      amount: Number(incomeSources[source.key] || 0),
    }))
  ), [incomeSources]);

  const incomeTotal = useMemo(
    () => sourceItems.reduce((sum, source) => sum + source.amount, 0),
    [sourceItems]
  );

  const actualSpend = useMemo(
    () => budget?.events.reduce((sum, event) => sum + Number(event.actualAmount || 0), 0) || 0,
    [budget]
  );

  const selectedEventAssignedTotal = useMemo(
    () => detailsEvent?.lineItems.reduce((sum, item) => (
      sum + Number(item.assignedAmount ?? item.budgetedAmount ?? 0)
    ), 0) || 0,
    [detailsEvent]
  );

  const selectedEventActualTotal = useMemo(
    () => detailsEvent?.lineItems.reduce((sum, item) => (
      sum + Number(item.actualAmount || 0)
    ), 0) || 0,
    [detailsEvent]
  );

  const openIncomeModal = () => {
    setIncomeForm({
      organization: '',
      membershipFees: '',
      eventIncome: '',
      sponsorship: '',
      others: '',
    });
    setIsIncomeModalOpen(true);
  };

  const handleIncomeChange = (key: IncomeSourceKey, value: string) => {
    setIncomeForm(prev => ({ ...prev, [key]: value }));
  };

  const addIncomeSources = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClub?.clubId) return;

    const incomeAdditions = INCOME_SOURCE_CONFIG.reduce((sources, source) => ({
      ...sources,
      [source.key]: Number(incomeForm[source.key] || 0),
    }), {} as IncomeSources);

    setSavingIncome(true);
    setError('');
    try {
      const res = await api.patch<BudgetSummaryResponse>('/budget/income', {
        clubId: selectedClub.clubId,
        incomeSources: incomeAdditions,
      });
      setBudget(prev => ({
        ...(prev || { events: [] }),
        ...res.data,
        incomeSources: { ...EMPTY_INCOME_SOURCES, ...res.data.incomeSources },
      }));
      setIsIncomeModalOpen(false);
    } catch {
      setError('Failed to add income.');
    } finally {
      setSavingIncome(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Navigation</p>
            <nav className="space-y-1">
              {sidebarLinks.map(link => (
                <a
                  key={link.label}
                  href="#"
                  onClick={e => { e.preventDefault(); if (link.path) navigate(link.path); }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    link.label === 'Budget'
                      ? 'bg-yellow-50 font-medium text-yellow-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{selectedClub?.clubName || 'Club'}</p>
                <h1 className="mt-1 text-3xl font-bold text-gray-900">Budget</h1>
              </div>
              <div className="grid grid-cols-3 gap-3 text-right">
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Club Funds</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(budget?.totalBudget || 0)}</p>
                </div>
                <div className="rounded-lg bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Total Spending</p>
                  <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(actualSpend)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Remaining</p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">{formatCurrency(budget?.remainingBudget || 0)}</p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Source of Income</h2>
                <p className="mt-1 text-sm text-gray-500">{formatCurrency(incomeTotal)} recorded across funding sources</p>
              </div>
              <button
                type="button"
                onClick={openIncomeModal}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Add Income
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading budget...</div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 pt-6">
                  <SemiPieChart items={sourceItems} total={incomeTotal} />
                </div>
                <div className="space-y-3">
                  {sourceItems.map(source => {
                    const percentage = incomeTotal > 0 ? (source.amount / incomeTotal) * 100 : 0;
                    return (
                      <div key={source.key} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{source.label}</p>
                            <p className="text-xs text-gray-400">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(source.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Spendings</h2>
                <p className="mt-1 text-sm text-gray-500">View event budgets and spending details.</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Actual Spend</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(actualSpend)}</p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-gray-400">Loading spending report...</div>
            ) : !budget || budget.events.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50 py-12 text-center">
                <p className="text-sm font-medium text-gray-500">No event budgets yet</p>
                <p className="mt-1 text-sm text-gray-400">Create an event and save its budget to populate this report.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="border-b border-gray-200 px-4 py-3">Events</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right">Event Budget</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right">Event Actual Budget</th>
                      <th className="border-b border-gray-200 px-4 py-3 text-right">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.events.map(event => (
                      <tr key={event.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-800">{event.name}</p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {new Date(event.date).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(event.budgetedAmount)}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(event.actualAmount)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDetailsEvent(event)}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <form onSubmit={addIncomeSources}>
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Income</h3>
                <p className="mt-1 text-sm text-gray-500">Enter only the new money received. It will be added to the current club budget.</p>
              </div>
              <div className="space-y-4 px-6 py-5">
                {INCOME_SOURCE_CONFIG.map(source => (
                  <label key={source.key} className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">{source.label}</span>
                    <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 focus-within:ring-2 focus-within:ring-blue-500">
                      <span className="text-sm text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={incomeForm[source.key]}
                        onChange={event => handleIncomeChange(source.key, event.target.value)}
                        className="w-full bg-transparent px-2 py-2 text-sm text-gray-900 outline-none"
                      />
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                <p className="text-sm font-medium text-gray-700">
                  Amount to add: {formatCurrency(Object.values(incomeForm).reduce((sum, value) => sum + Number(value || 0), 0))}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsIncomeModalOpen(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingIncome}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingIncome ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailsEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{detailsEvent.name}</h3>
                <p className="mt-1 text-sm text-gray-500">Budget report only. Values cannot be edited here.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsEvent(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="px-6 py-5">
              {detailsEvent.lineItems.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 py-12 text-center">
                  <p className="text-sm font-medium text-gray-500">No budget rows saved for this event.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="border-b border-gray-200 px-4 py-3">Assigned Amount</th>
                        <th className="border-b border-gray-200 px-4 py-3">Actual Amount</th>
                        <th className="border-b border-gray-200 px-4 py-3">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailsEvent.lineItems.map((item, index) => (
                        <tr key={item._id || index} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-4 py-4 font-semibold text-gray-900">
                            {formatCurrency(Number(item.assignedAmount ?? item.budgetedAmount ?? 0))}
                          </td>
                          <td className="px-4 py-4 font-semibold text-gray-900">
                            {formatCurrency(Number(item.actualAmount || 0))}
                          </td>
                          <td className="px-4 py-4 text-gray-700">
                            {item.description || item.label || 'Budget item'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <div className="rounded-lg bg-blue-50 px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Assigned Total</p>
                  <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrency(selectedEventAssignedTotal)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Actual Total</p>
                  <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(selectedEventActualTotal)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
