'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Sin conexión
        </h1>
        <p className="text-gray-600 mb-6">
          Parece que no tienes conexión a internet. Algunas funciones pueden no estar disponibles.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Los datos que hayas cargado previamente estarán disponibles.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800 transition-colors"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    </div>
  );
}
