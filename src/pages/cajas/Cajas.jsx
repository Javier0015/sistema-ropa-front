import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Wallet,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  Store,
  CheckCircle,
  UserRound,
  Sparkles,
  Loader2,
  CircleOff,
} from 'lucide-react';
import api from '../../api/axios';

const formInicial = {
  id_sucursal: '',
  nombre: '',
  descripcion: '',
  id_usuario_asignado: '',
  activo: true,
};

export default function Cajas() {
  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cajeros, setCajeros] = useState([]);

  const [idSucursalFiltro, setIdSucursalFiltro] = useState('');
  const [buscar, setBuscar] = useState('');

  const [cargando, setCargando] = useState(false);
  const [cargandoCajeros, setCargandoCajeros] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [cajaEditando, setCajaEditando] = useState(null);
  const [form, setForm] = useState(formInicial);

  const resumen = useMemo(() => {
    const total = cajas.length;
    const activas = cajas.filter((caja) => caja.activo).length;
    const inactivas = cajas.filter((caja) => !caja.activo).length;

    return {
      total,
      activas,
      inactivas,
    };
  }, [cajas]);

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');

      if (data.ok) {
        const activas = (data.sucursales || []).filter((s) => s.activo);

        setSucursales(activas);

        if (!idSucursalFiltro && activas.length > 0) {
          setIdSucursalFiltro(String(activas[0].id_sucursal));
        }
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  const cargarCajeros = async (idSucursal, idCaja = '') => {
    try {
      if (!idSucursal) {
        setCajeros([]);
        return;
      }

      setCargandoCajeros(true);

      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);

      if (idCaja) {
        params.append('id_caja', idCaja);
      }

      const { data } = await api.get(
        `/admin/cajas/cajeros?${params.toString()}`
      );

      if (data.ok) {
        setCajeros(data.cajeros || []);
      } else {
        setCajeros([]);
      }
    } catch (error) {
      console.error('Error al cargar cajeros:', error);
      setCajeros([]);
    } finally {
      setCargandoCajeros(false);
    }
  };

  const cargarCajas = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (idSucursalFiltro) {
        params.append('sucursal', idSucursalFiltro);
      }

      if (buscar.trim()) {
        params.append('buscar', buscar.trim());
      }

      const { data } = await api.get(`/admin/cajas?${params.toString()}`);

      if (data.ok) {
        setCajas(data.cajas || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las cajas.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSucursales();
  }, []);

  useEffect(() => {
    if (idSucursalFiltro) {
      cargarCajas();
    }
  }, [idSucursalFiltro]);

  useEffect(() => {
    if (!modalAbierto || !form.id_sucursal) {
      return;
    }

    cargarCajeros(
      form.id_sucursal,
      cajaEditando?.id_caja || ''
    );
  }, [modalAbierto, form.id_sucursal, cajaEditando?.id_caja]);

  const abrirNuevo = () => {
    setModoEdicion(false);
    setCajaEditando(null);

    setForm({
      ...formInicial,
      id_sucursal:
        idSucursalFiltro ||
        String(sucursales[0]?.id_sucursal || ''),
    });

    setModalAbierto(true);
  };

  const abrirEditar = (caja) => {
    setCajaEditando(caja);
    setModoEdicion(true);

    setForm({
      id_sucursal: String(caja.id_sucursal || ''),
      nombre: caja.nombre || '',
      descripcion: caja.descripcion || '',
      id_usuario_asignado: String(caja.id_usuario_asignado || ''),
      activo: Boolean(caja.activo),
    });

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setCajaEditando(null);
    setCajeros([]);
    setForm(formInicial);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,

      ...(name === 'id_sucursal'
        ? {
            id_usuario_asignado: '',
          }
        : {}),
    }));
  };

  const validarForm = () => {
    if (!form.id_sucursal) {
      Swal.fire({
        icon: 'warning',
        title: 'Sucursal obligatoria',
        text: 'Selecciona una sucursal para la caja.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (!form.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre obligatorio',
        text: 'Ingresa el nombre de la caja.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    return true;
  };

  const guardarCaja = async (e) => {
    e.preventDefault();

    if (!validarForm()) return;

    try {
      setGuardando(true);

      const payload = {
        id_sucursal: Number(form.id_sucursal),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        id_usuario_asignado: form.id_usuario_asignado
          ? Number(form.id_usuario_asignado)
          : null,
        activo: form.activo,
      };

      let respuesta;

      if (modoEdicion) {
        respuesta = await api.put(
          `/admin/cajas/${cajaEditando.id_caja}`,
          payload
        );
      } else {
        respuesta = await api.post('/admin/cajas', payload);
      }

      if (respuesta.data.ok) {
        Swal.fire({
          icon: 'success',
          title: modoEdicion ? 'Caja actualizada' : 'Caja creada',
          text: respuesta.data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModal();
        cargarCajas();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar la caja.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setGuardando(false);
    }
  };

  const desactivarCaja = async (caja) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar caja?',
      text: `Se desactivará: ${caja.nombre}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B85F7D',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(`/admin/cajas/${caja.id_caja}`);

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Caja desactivada',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cargarCajas();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar la caja.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 sm:space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#B85F7D]">
              <Wallet size={24} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#B85F7D]">
                <Sparkles size={13} />
                Configuración operativa
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Administración de cajas
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                Crea cajas por sucursal, asigna cajeros y administra su
                disponibilidad para la operación diaria.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.23)] transition hover:-translate-y-0.5 hover:bg-[#A95270] sm:w-auto"
          >
            <Plus size={19} />
            Nueva caja
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Sucursal
            </label>

            <select
              value={idSucursalFiltro}
              onChange={(e) => setIdSucursalFiltro(e.target.value)}
              className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
            >
              {sucursales.length === 0 && (
                <option value="">Sin sucursales activas</option>
              )}

              {sucursales.map((sucursal) => (
                <option
                  key={sucursal.id_sucursal}
                  value={sucursal.id_sucursal}
                >
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Buscar
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B4A0A7]"
                  size={19}
                />

                <input
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') cargarCajas();
                  }}
                  className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                  placeholder="Buscar por caja, cajero, descripción o sucursal..."
                />
              </div>

              <button
                type="button"
                onClick={cargarCajas}
                disabled={cargando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 sm:w-auto"
              >
                {cargando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}

                {cargando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <ResumenCajaCard
          titulo="Total cajas"
          valor={resumen.total}
          detalle="Registradas en la sucursal"
          icono={Wallet}
          claseIcono="bg-[#FBEAF0] text-[#B85F7D]"
        />

        <ResumenCajaCard
          titulo="Activas"
          valor={resumen.activas}
          detalle="Disponibles para operar"
          icono={CheckCircle}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <ResumenCajaCard
          titulo="Inactivas"
          valor={resumen.inactivas}
          detalle="Fuera de operación"
          icono={CircleOff}
          claseIcono="bg-[#F8EDF1] text-[#766168]"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#B85F7D]">
              <Wallet size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Listado de cajas
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {cajas.length} caja(s) en la vista actual
              </p>
            </div>
          </div>
        </div>

        <div className="md:hidden p-4 space-y-3">
          {cargando ? (
            <div className="rounded-[1.4rem] border border-[#F0E4E8] bg-[#FFFCFD] p-6 text-center font-semibold text-[#8A757D]">
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-[#B85F7D]" />
                Cargando cajas...
              </div>
            </div>
          ) : cajas.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8C777F] font-semibold">
              No hay cajas registradas para esta sucursal.
            </div>
          ) : (
            cajas.map((caja) => (
              <article
                key={caja.id_caja}
                className="rounded-2xl border border-[#F0E4E8] p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)] bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#43353A] break-words">
                      {caja.nombre}
                    </p>

                    <p className="text-xs text-[#AA939B] mt-1">
                      ID #{caja.id_caja}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                      caja.activo
                        ? 'bg-[#FBEAF0] text-[#A84E6C]'
                        : 'bg-[#EFE5E8] text-[#766168]'
                    }`}
                  >
                    {caja.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-[#FFFAFB] p-3">
                  <p className="text-xs text-[#8C777F] flex items-center gap-1">
                    <Store size={15} />
                    Sucursal
                  </p>

                  <p className="font-bold text-[#43353A] mt-1 break-words">
                    {caja.sucursal}
                  </p>

                  <p className="text-xs text-[#8C777F] break-words">
                    {caja.clave_sucursal || 'Sin clave'}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F] flex items-center gap-1">
                      <UserRound size={14} />
                      Cajero asignado
                    </p>

                    <p className="font-semibold text-[#66535A] break-words mt-1">
                      {caja.cajero_asignado || 'Sin asignar'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F]">Descripción</p>

                    <p className="font-semibold text-[#66535A] break-words">
                      {caja.descripcion || '—'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F]">Fecha alta</p>

                    <p className="font-semibold text-[#66535A]">
                      {formatoFecha(caja.fecha_creacion)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => abrirEditar(caja)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#F0EBF6] text-[#765D8D] hover:bg-[#EDE7F3] font-bold transition"
                  >
                    <Pencil size={18} />
                    Editar
                  </button>

                  <button
                    onClick={() => desactivarCaja(caja)}
                    disabled={!caja.activo}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 font-bold transition disabled:opacity-40"
                  >
                    <Trash2 size={18} />
                    Desactivar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead className="bg-[#FFFAFB] border-b border-[#F0E4E8]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Caja
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Sucursal
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Cajero asignado
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Descripción
                </th>

                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase">
                  Estado
                </th>

                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Fecha alta
                </th>

                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase sticky right-0 bg-[#FFFAFB] shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] z-10">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-[#8A757D]"
                  >
                    <div className="flex items-center justify-center gap-2 font-semibold">
                      <Loader2 size={18} className="animate-spin text-[#B85F7D]" />
                      Cargando cajas...
                    </div>
                  </td>
                </tr>
              ) : cajas.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-10 text-center text-[#8C777F]"
                  >
                    No hay cajas registradas para esta sucursal.
                  </td>
                </tr>
              ) : (
                cajas.map((caja) => (
                  <tr key={caja.id_caja} className="hover:bg-[#FFFAFB]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#43353A]">
                        {caja.nombre}
                      </p>

                      <p className="text-xs text-[#AA939B] mt-1">
                        ID #{caja.id_caja}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <Store
                          size={17}
                          className="text-[#AA939B] mt-0.5 shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="font-semibold text-[#43353A]">
                            {caja.sucursal}
                          </p>

                          <p className="text-xs text-[#8C777F]">
                            {caja.clave_sucursal || 'Sin clave'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <UserRound
                          size={17}
                          className="text-[#AA939B] shrink-0"
                        />

                        <span className="text-sm font-semibold text-[#66535A]">
                          {caja.cajero_asignado || 'Sin asignar'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      {caja.descripcion || '—'}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          caja.activo
                            ? 'bg-[#FBEAF0] text-[#A84E6C]'
                            : 'bg-[#EFE5E8] text-[#766168]'
                        }`}
                      >
                        {caja.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      {formatoFecha(caja.fecha_creacion)}
                    </td>

                    <td className="px-5 py-4 sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirEditar(caja)}
                          className="w-9 h-9 rounded-xl bg-[#F0EBF6] text-[#765D8D] hover:bg-[#EDE7F3] flex items-center justify-center transition"
                          title="Editar"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => desactivarCaja(caja)}
                          disabled={!caja.activo}
                          className="w-9 h-9 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition disabled:opacity-40"
                          title="Desactivar"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>


      <style>
        {`
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              transition-duration: 0.01ms !important;
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}
      </style>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm"
            onClick={cerrarModal}
          />

          <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#B85F7D]">
                  <Wallet size={12} />
                  {modoEdicion ? 'Edición' : 'Nuevo registro'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034]">
                  {modoEdicion ? 'Editar caja' : 'Nueva caja'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Define la sucursal, el nombre de la caja y el cajero responsable.
                </p>
              </div>

              <button
                onClick={cerrarModal}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#EFE5E8] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarCaja}>
              <div className="p-4 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Sucursal *
                  </label>

                  <select
                    name="id_sucursal"
                    value={form.id_sucursal}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                  >
                    <option value="">Selecciona sucursal</option>

                    {sucursales.map((sucursal) => (
                      <option
                        key={sucursal.id_sucursal}
                        value={sucursal.id_sucursal}
                      >
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Nombre de caja *
                  </label>

                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Ej. Caja 1, Caja Mostrador, Caja Turno A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Cajero asignado
                  </label>

                  <select
                    name="id_usuario_asignado"
                    value={form.id_usuario_asignado}
                    onChange={handleChange}
                    disabled={!form.id_sucursal || cargandoCajeros}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0] disabled:cursor-not-allowed disabled:bg-[#F8EDF1] disabled:text-[#AA939B]"
                  >
                    <option value="">
                      {cargandoCajeros
                        ? 'Cargando cajeros...'
                        : 'Sin cajero asignado'}
                    </option>

                    {cajeros.map((cajero) => (
                      <option
                        key={cajero.id_usuario}
                        value={cajero.id_usuario}
                      >
                        {cajero.nombre}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs text-[#8C777F] mt-2">
                    Cada cajero solo puede estar asignado a una caja activa.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Descripción
                  </label>

                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="3"
                    className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Ej. Caja principal del mostrador"
                  />
                </div>

                {modoEdicion && (
                  <label className={`flex cursor-pointer items-center gap-3 rounded-[1.3rem] border p-4 transition ${form.activo ? 'border-[#E7BAC8] bg-[#FFF1F5]' : 'border-[#EEE2E6] bg-[#FFFCFD]'}`}>
                    <input
                      type="checkbox"
                      name="activo"
                      checked={form.activo}
                      onChange={handleChange}
                      className="w-5 h-5 accent-[#B85F7D] shrink-0"
                    />

                    <span className="font-semibold text-[#66535A]">
                      Caja activa
                    </span>
                  </label>
                )}
              </div>

              <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#F0E4E8]">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#EFE5E8] text-[#66535A] font-bold transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.22)] transition hover:bg-[#A95270] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Save size={19} />

                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                      ? 'Actualizar caja'
                      : 'Guardar caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenCajaCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  claseIcono,
}) {
  return (
    <div className="min-w-0 rounded-[1.6rem] border border-[#F0E4E8] bg-white p-5 shadow-[0_10px_30px_rgba(118,76,91,0.045)]">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${claseIcono}`}
      >
        <Icono size={20} />
      </div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.08em] text-[#967F87]">
        {titulo}
      </p>

      <p className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#3A2F33]">
        {valor}
      </p>

      <p className="mt-2 text-[11px] font-semibold text-[#AA939B]">
        {detalle}
      </p>
    </div>
  );
}

