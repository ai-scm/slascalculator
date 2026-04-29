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

  useEffect(() => {
    if (!filters?.startDate || !filters?.endDate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService.getLevelsSummary({ startDate: filters.startDate, endDate: filters.endDate })
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => {
        if (!cancelled) setError(typeof err === 'string' ? err : (err?.message || 'Error cargando niveles'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters?.startDate, filters?.endDate]);

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

      {data.topEscalators?.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top agentes que escalaron a N2</h3>
          <div className="space-y-3">
            {data.topEscalators.map((agent, idx) => {
              const max = data.topEscalators[0].count;
              const pct = (agent.count / max) * 100;
              return (
                <div key={agent.agentId || agent.name} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-gray-400">{idx + 1}</span>
                  <span className="w-44 text-sm text-slate-900">{agent.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-slate-700">
                    {agent.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SupportLevelsView;
