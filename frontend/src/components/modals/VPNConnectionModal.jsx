import { WifiSlash, ArrowClockwise } from 'phosphor-react';

const VPNConnectionModal = ({ onRetry, retrying }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Logo header */}
        <div className="bg-white px-8 pt-8 pb-4 flex justify-center">
          <img src="/logo.png" alt="Blend" className="h-12" />
        </div>

        {/* Content */}
        <div className="px-8 pb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <WifiSlash size={32} className="text-red-500" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Conexion VPN requerida
          </h2>
          <p className="text-gray-500 mb-6">
            No se pudo conectar con el servidor. Por favor verifica que tu
            conexion VPN este activa e intenta nuevamente.
          </p>

          <button
            onClick={onRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0A2342] text-white font-medium rounded-lg hover:bg-[#153562] transition-colors disabled:opacity-50"
          >
            <ArrowClockwise size={20} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Conectando...' : 'Reintentar conexion'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VPNConnectionModal;
