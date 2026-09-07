import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ShieldCheck,
  Save,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  LockKeyhole,
} from 'lucide-react';

import {
  obtenerConfiguracionPermisos,
  actualizarPermisosRol,
} from '../services/permisosService';

const ROLES_EDITABLES = [
  {
    value: 'SUPER_ADMIN',
    label: 'Super administrador',
  },
  {
    value: 'CAJERO',
    label: 'Cajero',
  },
];

const ConfiguracionPermisos = () => {
  const [rolSeleccionado, setRolSeleccionado] =
    useState('SUPER_ADMIN');

  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [hayCambios, setHayCambios] = useState(false);

  const cargarPermisos = async (rol = rolSeleccionado) => {
    try {
      setCargando(true);
      setHayCambios(false);

      const data = await obtenerConfiguracionPermisos(rol);

      setModulos(
        Array.isArray(data?.modulos)
          ? data.modulos.map((modulo) => ({
              ...modulo,
              permitido: Boolean(modulo.permitido),
            }))
          : []
      );
    } catch (error) {
      console.error('Error cargando permisos:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.response?.data?.message ||
          'No se pudieron cargar los permisos.',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPermisos(rolSeleccionado);
  }, [rolSeleccionado]);

  const cambiarPermiso = (id) => {
    setModulos((prev) =>
      prev.map((modulo) =>
        modulo.id === id
          ? {
              ...modulo,
              permitido: !modulo.permitido,
            }
          : modulo
      )
    );

    setHayCambios(true);
  };

  const activarTodos = () => {
    setModulos((prev) =>
      prev.map((modulo) => ({
        ...modulo,
        permitido: true,
      }))
    );

    setHayCambios(true);
  };

  const desactivarTodos = () => {
    setModulos((prev) =>
      prev.map((modulo) => ({
        ...modulo,
        permitido: false,
      }))
    );

    setHayCambios(true);
  };

  const guardarCambios = async () => {
    const permisosSeleccionados = modulos
      .filter((modulo) => modulo.permitido)
      .map((modulo) => modulo.clave);

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: 'Guardar permisos',
      text: `¿Deseas actualizar los permisos del rol ${rolSeleccionado}?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    try {
      setGuardando(true);

      const respuesta = await actualizarPermisosRol(
        rolSeleccionado,
        permisosSeleccionados
      );

      await Swal.fire({
        icon: 'success',
        title: 'Permisos actualizados',
        text:
          respuesta?.message ||
          respuesta?.mensaje ||
          'Los permisos se guardaron correctamente.',
        timer: 1800,
        showConfirmButton: false,
      });

      setHayCambios(false);

      await cargarPermisos(rolSeleccionado);
    } catch (error) {
      console.error('Error guardando permisos:', error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudieron guardar',
        text:
          error?.response?.data?.message ||
          'Ocurrió un error al actualizar los permisos.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const modulosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return modulos;
    }

    return modulos.filter((modulo) => {
      const clave = String(modulo.clave || '').toLowerCase();
      const nombre = String(modulo.nombre || '').toLowerCase();
      const descripcion = String(
        modulo.descripcion || ''
      ).toLowerCase();

      return (
        clave.includes(texto) ||
        nombre.includes(texto) ||
        descripcion.includes(texto)
      );
    });
  }, [modulos, busqueda]);

  const totalActivos = useMemo(() => {
    return modulos.filter((modulo) => modulo.permitido).length;
  }, [modulos]);

  const totalInactivos = modulos.length - totalActivos;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm">
                  <ShieldCheck size={26} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">
                    Configuración de permisos
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Administra los módulos disponibles para cada rol.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <LockKeyhole size={18} />

                <span>
                  Los permisos del rol ROOT no se modifican desde esta vista.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total de módulos
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-800">
              {modulos.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Permitidos
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-800">
                  {totalActivos}
                </p>
              </div>

              <CheckCircle2
                className="text-emerald-600"
                size={34}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rose-700">
                  Bloqueados
                </p>

                <p className="mt-2 text-3xl font-bold text-rose-800">
                  {totalInactivos}
                </p>
              </div>

              <XCircle
                className="text-rose-600"
                size={34}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[280px_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Rol
                </label>

                <select
                  value={rolSeleccionado}
                  onChange={(e) =>
                    setRolSeleccionado(e.target.value)
                  }
                  disabled={guardando}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  {ROLES_EDITABLES.map((rol) => (
                    <option
                      key={rol.value}
                      value={rol.value}
                    >
                      {rol.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Buscar módulo
                </label>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) =>
                      setBusqueda(e.target.value)
                    }
                    placeholder="Buscar por nombre o clave..."
                    className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    cargarPermisos(rolSeleccionado)
                  }
                  disabled={cargando || guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                >
                  <RefreshCw
                    size={18}
                    className={
                      cargando ? 'animate-spin' : ''
                    }
                  />

                  Recargar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={activarTodos}
                disabled={cargando || guardando}
                className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Activar todos
              </button>

              <button
                type="button"
                onClick={desactivarTodos}
                disabled={cargando || guardando}
                className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
              >
                Desactivar todos
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {cargando ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <RefreshCw
                    size={36}
                    className="mx-auto animate-spin text-blue-600"
                  />

                  <p className="mt-4 text-sm font-medium text-slate-500">
                    Cargando permisos...
                  </p>
                </div>
              </div>
            ) : modulosFiltrados.length === 0 ? (
              <div className="py-14 text-center">
                <Search
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-semibold text-slate-600">
                  No se encontraron módulos
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Prueba con otra búsqueda.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-[1fr_180px] bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600 md:grid">
                  <div>Módulo</div>
                  <div className="text-center">
                    Acceso
                  </div>
                </div>

                <div className="divide-y divide-slate-200">
                  {modulosFiltrados.map((modulo) => (
                    <div
                      key={modulo.id}
                      className="grid gap-4 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_180px] md:items-center md:px-5"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-800">
                            {modulo.nombre}
                          </h3>

                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                            {modulo.clave}
                          </span>
                        </div>

                        {modulo.descripcion && (
                          <p className="mt-1 text-sm text-slate-500">
                            {modulo.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-center">
                        <span className="text-sm font-medium text-slate-500 md:hidden">
                          Acceso
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            cambiarPermiso(modulo.id)
                          }
                          disabled={guardando}
                          aria-pressed={modulo.permitido}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                            modulo.permitido
                              ? 'bg-blue-600'
                              : 'bg-slate-300'
                          } ${
                            guardando
                              ? 'cursor-not-allowed opacity-60'
                              : ''
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                              modulo.permitido
                                ? 'translate-x-8'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              {hayCambios ? (
                <p className="text-sm font-medium text-amber-700">
                  Hay cambios pendientes por guardar.
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Los permisos mostrados coinciden con la configuración guardada.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={guardarCambios}
              disabled={
                cargando ||
                guardando ||
                !hayCambios
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {guardando ? (
                <>
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionPermisos;