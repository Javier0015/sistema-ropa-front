import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { obtenerPermisos } from '../services/permisosService';

const PermisosContext = createContext(null);

export function PermisosProvider({ children }) {
  const [permisosPorRol, setPermisosPorRol] = useState({});
  const [cargandoPermisos, setCargandoPermisos] = useState(true);
  const [errorPermisos, setErrorPermisos] = useState(null);

  const cargarPermisos = useCallback(async () => {
    try {
      setCargandoPermisos(true);
      setErrorPermisos(null);

      const data = await obtenerPermisos();

      setPermisosPorRol(
        data && typeof data === 'object'
          ? data
          : {}
      );
    } catch (error) {
      console.error(
        'Error al cargar permisos:',
        error
      );

      setPermisosPorRol({});
      setErrorPermisos(error);
    } finally {
      setCargandoPermisos(false);
    }
  }, []);

  useEffect(() => {
    cargarPermisos();
  }, [cargarPermisos]);

  const tienePermiso = useCallback(
    (rol, modulo) => {
      if (!rol || !modulo) {
        return false;
      }

      /*
       * ROOT no se configura desde la pantalla.
       * Siempre tiene acceso total.
       */
      if (rol === 'ROOT') {
        return true;
      }

      const permisosRol =
        permisosPorRol[rol] || [];

      return permisosRol.includes(modulo);
    },
    [permisosPorRol]
  );

  return (
    <PermisosContext.Provider
      value={{
        permisosPorRol,
        cargandoPermisos,
        errorPermisos,
        tienePermiso,
        recargarPermisos: cargarPermisos,
      }}
    >
      {children}
    </PermisosContext.Provider>
  );
}

export function usePermisos() {
  const context = useContext(PermisosContext);

  if (!context) {
    throw new Error(
      'usePermisos debe utilizarse dentro de PermisosProvider'
    );
  }

  return context;
}