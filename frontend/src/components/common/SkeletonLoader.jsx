const Pulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

const MetricCardSkeleton = () => (
  <div className="bg-white rounded-card shadow-card p-6 flex items-center">
    <Pulse className="w-14 h-14 rounded-full flex-shrink-0 mr-4" />
    <div className="flex-1 space-y-2">
      <Pulse className="h-4 w-24" />
      <Pulse className="h-8 w-16" />
    </div>
  </div>
);

const SLAProgressSkeleton = () => (
  <div className="bg-white rounded-card shadow-card p-6">
    <div className="flex items-center mb-4">
      <Pulse className="w-6 h-6 rounded mr-2" />
      <Pulse className="h-5 w-48" />
    </div>
    <Pulse className="h-10 w-24 mb-4" />
    <Pulse className="h-3 w-full rounded-full mb-4" />
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-2">
        <Pulse className="w-5 h-5 rounded-full" />
        <div className="space-y-1">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-5 w-10" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Pulse className="w-5 h-5 rounded-full" />
        <div className="space-y-1">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-5 w-10" />
        </div>
      </div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-card shadow-card p-6">
    <Pulse className="h-5 w-40 mb-4" />
    <Pulse className="h-48 w-full rounded" />
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-card shadow-card">
    <div className="p-6 border-b border-gray-200">
      <Pulse className="h-6 w-56" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Pulse className="h-4 w-16" />
          <Pulse className="h-4 w-48 flex-1" />
          <Pulse className="h-6 w-20 rounded-full" />
          <Pulse className="h-4 w-32" />
          <Pulse className="h-4 w-24" />
          <Pulse className="h-4 w-28" />
          <Pulse className="h-6 w-20 rounded-full" />
          <Pulse className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Metric Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>

    {/* SLA Progress */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SLAProgressSkeleton />
      <SLAProgressSkeleton />
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table */}
    <TableSkeleton />
  </div>
);

export default DashboardSkeleton;
