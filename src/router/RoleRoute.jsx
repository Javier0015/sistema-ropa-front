import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { usePermisos } from '../context/PermisosContext';

export default function RoleRoute({ modulo, children }) {
  const { usuario } = useAuth();

  const {
    tienePermiso,
    cargandoPermisos,
    errorPermisos,
  } = usePermisos();

  // Si todavía no hay usuario autenticado
  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  // Mientras se cargan los permisos desde PostgreSQL
  if (cargandoPermisos) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Verificando permisos...
          </p>
        </div>
      </div>
    );
  }

  // Si hubo un error al cargar los permisos
  if (errorPermisos) {
    return (
      <div className="flex min-h-[300px] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-bold text-red-700">
            Error al cargar permisos
          </h2>

          <p className="mt-2 text-sm text-red-600">
            No fue posible consultar los permisos del sistema.
          </p>
        </div>
      </div>
    );
  }

  const rol = usuario?.rol;

  if (!tienePermiso(rol, modulo)) {
    return (
      <Navigate
        to="/app/no-autorizado"
        replace
      />
    );
  }

  return children;
}