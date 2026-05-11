import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Stack, ArrowsDownUp, Clock, Users } from 'phosphor-react';
import Card from '../common/Card';
import MetricCard from '../metrics/MetricCard';
import { apiService } from '../../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const COLOR_N1 = '#38BDF8';
const COLOR_N2 = '#F97316';
const COLOR_GRAY = '#94A3B8';

const fmtPct = (v) => `${(v * 100).toFixed(1)}%`;
const fmtHours = (h) => `${h.toFixed(1)} h`;

const SupportLevelsView = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!filters?.startDate || !filters?.endDate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    
    // Pass all filters to backend
    const apiFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: currentPage,
      pageSize: pageSize
    };
    
    // Add additional filters if defined
    if (filters.organizationId) apiFilters.organizationId = filters.organizationId;
    if (filters.ownerId) apiFilters.ownerId = filters.ownerId;
    if (filters.teamId) apiFilters.teamId = filters.teamId;
    if (filters.state) apiFilters.state = filters.state;
    if (filters.type) apiFilters.type = filters.type;
    
    apiService.getLevelsSummary(apiFilters)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => {
        if (!cancelled) setError(typeof err === 'string' ? err : (err?.message || 'Error cargando niveles'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters?.startDate, filters?.endDate, filters?.organizationId, filters?.ownerId, filters?.teamId, filters?.state, filters?.type, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
        Cargando niveles desde el backend...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
        Carga metricas con un rango de fechas para ver los niveles.
      </div>
    );
  }

  const barData = {
    labels: ['Nivel 1', 'Nivel 2'],
    datasets: [
      {
        label: 'Tickets atendidos',
        data: [data.byLevel.n1.handled, data.byLevel.n2.handled],
        backgroundColor: [COLOR_N1, COLOR_N2],
        borderRadius: 8,
        barThickness: 80,
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = data.totalTickets;
            const v = ctx.parsed.y;
            return `${v} tickets (${((v / total) * 100).toFixed(1)}% del total)`;
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 50 } },
      x: { grid: { display: false } }
    }
  };

  const funnelData = {
    labels: ['Recibidos en N1', 'Resueltos en N1', 'Escalados a N2'],
    datasets: [
      {
        label: 'Tickets',
        data: [data.escalation.receivedN1, data.escalation.resolvedN1, data.escalation.escalatedN2],
        backgroundColor: [COLOR_GRAY, COLOR_N1, COLOR_N2],
        borderRadius: 8,
      }
    ]
  };

  const funnelOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed.x;
            const base = data.escalation.receivedN1;
            return `${v} (${((v / base) * 100).toFixed(1)}% de los recibidos)`;
          }
        }
      }
    },
    scales: {
      x: { beginAtZero: true },
      y: { grid: { display: false } }
    }
  };

  const totalPages = data.organizationsPagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total tickets"
          value={data.totalTickets}
          icon={Stack}
          iconBgColor="bg-info-light"
          iconColor="text-info"
        />
        <MetricCard
          title="Atendidos N1"
          value={data.byLevel.n1.handled}
          icon={Users}
          iconBgColor="bg-sky-100"
          iconColor="text-sky-500"
        />
        <MetricCard
          title="Atendidos N2"
          value={data.byLevel.n2.handled}
          icon={Users}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-500"
        />
        <MetricCard
          title="Tasa de escalamiento"
          value={fmtPct(data.escalation.escalationRate)}
          icon={ArrowsDownUp}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Tickets atendidos por nivel</h3>
          <p className="text-sm text-gray-500 mb-4">
            Comparacion de volumen entre Nivel 1 ({data.byLevel.n1.members} agentes) y
            Nivel 2 ({data.byLevel.n2.members} agentes).
          </p>
          <div style={{ height: '280px' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Embudo de escalamiento</h3>
          <p className="text-sm text-gray-500 mb-4">
            De los {data.escalation.receivedN1} tickets recibidos en N1,&nbsp;
            <strong>{data.escalation.escalatedN2}</strong> escalaron a N2&nbsp;
            ({fmtPct(data.escalation.escalationRate)}).
          </p>
          <div style={{ height: '280px' }}>
            <Bar data={funnelData} options={funnelOptions} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-100 rounded-md">
              <Clock className="w-5 h-5 text-sky-500" weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Tiempo en Nivel 1</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Promedio</div>
              <div className="text-2xl font-bold text-slate-900">{fmtHours(data.timeStats.n1.avgHours)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Mediana (p50)</div>
              <div className="text-2xl font-bold text-slate-900">{fmtHours(data.timeStats.n1.medianHours)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">p95</div>
              <div className="text-2xl font-bold text-slate-900">{fmtHours(data.timeStats.n1.p95Hours)}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-md">
              <Clock className="w-5 h-5 text-orange-500" weight="duotone" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Tiempo en Nivel 2</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Promedio</div>
              <div className="text-2xl font-bold text-slate-900">{fmtHours(data.timeStats.n2.avgHours)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Mediana (p50)</div>
              <div className="text-2xl font-bold text-slate-900">{fmtHours(data.timeStats.n2.medianHours)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">p95</div>
              <div className="text-2xl font-bold text-slate-900">{fmtHours(data.timeStats.n2.p95Hours)}</div>
            </div>
          </div>
        </Card>
      </div>

      {data.topOrganizationsN2?.length > 0 && (
        <Card padding="none">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Top organizaciones atendidas por Nivel 2
              </h3>

              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Mostrar:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="select text-sm py-1"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12">#</th>
                  <th>Organización</th>
                  <th className="w-32 text-center">Tickets</th>
                  <th className="w-24 text-center">Porcentaje</th>
                  <th className="w-40">Distribución</th>
                </tr>
              </thead>
              <tbody>
                {data.topOrganizationsN2.map((org, idx) => {
                  const max = data.topOrganizationsN2[0].ticketCount;
                  const pct = (org.ticketCount / max) * 100;
                  const globalIndex = ((currentPage - 1) * pageSize) + idx + 1;
                  return (
                    <tr key={org.organizationName}>
                      <td className="text-gray-400 font-medium">{globalIndex}</td>
                      <td className="font-medium text-slate-900 truncate max-w-xs" title={org.organizationName}>
                        {org.organizationName}
                      </td>
                      <td className="text-center font-semibold text-slate-700">{org.ticketCount}</td>
                      <td className="text-center text-gray-600">{org.percentage}%</td>
                      <td>
                        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.organizationsPagination && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data.organizationsPagination.totalItems)} de {data.organizationsPagination.totalItems}
              </div>

              {data.organizationsPagination.totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, data.organizationsPagination.totalPages) }, (_, i) => {
                      let pageNumber;
                      if (data.organizationsPagination.totalPages <= 5) {
                        pageNumber = i + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1;
                      } else if (currentPage >= data.organizationsPagination.totalPages - 2) {
                        pageNumber = data.organizationsPagination.totalPages - 4 + i;
                      } else {
                        pageNumber = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-3 py-1 rounded text-sm ${
                            currentPage === pageNumber
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(data.organizationsPagination.totalPages, p + 1))}
                    disabled={currentPage === data.organizationsPagination.totalPages}
                    className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SupportLevelsView;
