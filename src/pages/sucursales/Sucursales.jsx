import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Store,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  MapPin,
  Phone,
  Mail,
  User,
  KeyRound,
  CheckCircle2,
  CircleOff,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';

import api from '../../api/axios';

const formInicial = {
  nombre: '',
  clave: '',
  direccion: '',
  telefono: '',
  url_google_maps: '',
  correo: '',
  responsable: '',
  activo: true,
};

const esActivo = (valor) => {
  return (
    valor === true ||
    valor === 'true' ||
    valor === 1 ||
    valor === '1'
  );
};

export default function Sucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [buscar, setBuscar] = useState('');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [sucursalEditando, setSucursalEditando] = useState(null);

  const [form, setForm] = useState(formInicial);

  // =========================================================
  // FILTRO
  // =========================================================

  const sucursalesFiltradas = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    if (!texto) return sucursales;

    return sucursales.filter((sucursal) => {
      return (
        String(sucursal.nombre || '')
          .toLowerCase()
          .includes(texto) ||
        String(sucursal.clave || '')
          .toLowerCase()
          .includes(texto) ||
        String(sucursal.direccion || '')
          .toLowerCase()
          .includes(texto) ||
        String(sucursal.telefono || '')
          .toLowerCase()
          .includes(texto) ||
        String(sucursal.correo || '')
          .toLowerCase()
          .includes(texto) ||
        String(sucursal.responsable || '')
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [sucursales, buscar]);

  // =========================================================
  // RESUMEN
  // =========================================================

  const resumen = useMemo(() => {
    const total = sucursales.length;
    const activas = sucursales.filter((s) => esActivo(s.activo)).length;
    const inactivas = total - activas;

    return {
      total,
      activas,
      inactivas,
    };
  }, [sucursales]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // =========================================================
  // CARGA
  // =========================================================

  const cargarSucursales = async () => {
    try {
      setCargando(true);

      const { data } = await api.get('/sucursales');

      if (data.ok) {
        setSucursales(data.sucursales || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las sucursales.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSucursales();
  }, []);

  // =========================================================
  // MODAL
  // =========================================================

  const abrirNuevo = () => {
    setForm(formInicial);
    setModoEdicion(false);
    setSucursalEditando(null);
    setModalAbierto(true);
  };

  const abrirEditar = (sucursal) => {
    setSucursalEditando(sucursal);
    setModoEdicion(true);

    setForm({
      nombre: sucursal.nombre || '',
      clave: sucursal.clave || '',
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || '',
      url_google_maps: sucursal.url_google_maps || '',
      correo: sucursal.correo || '',
      responsable: sucursal.responsable || '',
      activo: esActivo(sucursal.activo),
    });

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setModalAbierto(false);
    setModoEdicion(false);
    setSucursalEditando(null);
    setForm(formInicial);
  };

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  const validarForm = () => {
    if (!form.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre obligatorio',
        text: 'Ingresa el nombre de la sucursal.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (!form.clave.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Clave obligatoria',
        text: 'Ingresa una clave para la sucursal.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (form.correo.trim()) {
      const correoValido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.correo.trim()
        );

      if (!correoValido) {
        Swal.fire({
          icon: 'warning',
          title: 'Correo inválido',
          text: 'Ingresa un correo electrónico válido.',
          confirmButtonColor: '#AD526F',
        });

        return false;
      }
    }

    return true;
  };

  // =========================================================
  // GUARDAR
  // =========================================================

  const guardarSucursal = async (e) => {
    e.preventDefault();

    if (!validarForm()) return;

    try {
      setGuardando(true);

      const payload = {
        nombre: form.nombre.trim(),
        clave: form.clave.trim().toUpperCase(),
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        url_google_maps:
          form.url_google_maps.trim() || null,
        correo: form.correo.trim() || null,
        responsable: form.responsable.trim() || null,
        activo: Boolean(form.activo),
      };

      let respuesta;

      if (modoEdicion) {
        respuesta = await api.put(
          `/sucursales/${sucursalEditando.id_sucursal}`,
          payload
        );
      } else {
        respuesta = await api.post(
          '/sucursales',
          payload
        );
      }

      if (respuesta.data.ok) {
        await Swal.fire({
          icon: 'success',
          title: modoEdicion
            ? 'Sucursal actualizada'
            : 'Sucursal creada',
          text: respuesta.data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModal();
        await cargarSucursales();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar la sucursal.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // DESACTIVAR
  // =========================================================

  const desactivarSucursal = async (sucursal) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar sucursal?',
      html: `
        <div style="text-align:left">
          <p><b>Sucursal:</b> ${sucursal.nombre}</p>
          <p><b>Clave:</b> ${sucursal.clave}</p>
          <p>La sucursal quedará inactiva para nuevas operaciones.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(
        `/sucursales/${sucursal.id_sucursal}`
      );

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Sucursal desactivada',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        await cargarSucursales();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar la sucursal.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden pb-8 sm:space-y-6">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F] sm:h-14 sm:w-14">
              <Store size={25} />
            </div>

            <div className="min-w-0">
             

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Sucursales
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D] sm:text-base">
                Administra tiendas, claves operativas, responsables,
                información de contacto y ubicación.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.23)] transition hover:-translate-y-0.5 hover:bg-[#8B3F5B] sm:w-auto"
          >
            <Plus size={19} />
            Nueva sucursal
          </button>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B4A0A7]"
              size={19}
            />

            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4A3B40] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D48BA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder="Buscar por nombre, clave, dirección, teléfono, correo o responsable..."
            />
          </div>

          <button
            type="button"
            onClick={cargarSucursales}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 md:w-auto"
          >
            {cargando ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {cargando
              ? 'Actualizando...'
              : 'Actualizar'}
          </button>
        </div>
      </section>

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SucursalKpi
          titulo="Total sucursales"
          valor={resumen.total}
          detalle="Tiendas registradas"
          icono={Store}
          claseIcono="bg-[#FBEAF0] text-[#AD526F]"
        />

        <SucursalKpi
          titulo="Activas"
          valor={resumen.activas}
          detalle="Disponibles para operar"
          icono={CheckCircle2}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <SucursalKpi
          titulo="Inactivas"
          valor={resumen.inactivas}
          detalle="Fuera de operación"
          icono={CircleOff}
          claseIcono="bg-slate-100 text-slate-600"
        />
      </section>

      {/* =====================================================
          LISTADO
      ===================================================== */}

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#AD526F]">
              <Store size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Listado de sucursales
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {sucursalesFiltradas.length} resultado(s)
              </p>
            </div>
          </div>
        </div>

        {/* MÓVIL */}
        <div className="space-y-3 p-4 lg:hidden">
          {cargando ? (
            <EstadoLista
              cargando
              texto="Cargando sucursales..."
            />
          ) : sucursalesFiltradas.length === 0 ? (
            <EstadoLista texto="No hay sucursales registradas." />
          ) : (
            sucursalesFiltradas.map((sucursal) => (
              <article
                key={sucursal.id_sucursal}
                className="rounded-[1.5rem] border border-[#F0E4E8] bg-[#FFFCFD] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
                      <Store size={20} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-black text-[#43353A]">
                        {sucursal.nombre}
                      </p>

                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F8EDF1] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#66535A]">
                        <KeyRound size={12} />
                        {sucursal.clave}
                      </span>
                    </div>
                  </div>

                  <EstadoSucursal activo={sucursal.activo} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoSucursal
                    icono={User}
                    titulo="Responsable"
                    valor={sucursal.responsable || '—'}
                  />

                  <InfoSucursal
                    icono={Phone}
                    titulo="Teléfono"
                    valor={sucursal.telefono || '—'}
                  />

                  <InfoSucursal
                    icono={Mail}
                    titulo="Correo"
                    valor={sucursal.correo || '—'}
                  />

                  <InfoSucursal
                    icono={MapPin}
                    titulo="Dirección"
                    valor={sucursal.direccion || '—'}
                  />
                </div>

                {sucursal.url_google_maps && (
                  <a
                    href={sucursal.url_google_maps}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8C3CF] bg-[#FFF2F5] px-4 py-3 text-sm font-black text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                  >
                    <MapPin size={16} />
                    Ver ubicación
                    <ExternalLink size={14} />
                  </a>
                )}

                <p className="mt-3 text-[10px] font-semibold text-[#AA939B]">
                  Alta: {formatoFecha(sucursal.fecha_creacion)}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(sucursal)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                  >
                    <Pencil size={17} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      desactivarSucursal(sucursal)
                    }
                    disabled={!esActivo(sucursal.activo)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Trash2 size={17} />
                    Desactivar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* DESKTOP */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1200px]">
            <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
              <tr>
                <Th>Sucursal</Th>
                <Th>Clave</Th>
                <Th>Responsable</Th>
                <Th>Contacto</Th>
                <Th>Dirección</Th>
                <Th align="center">Estado</Th>
                <Th>Alta</Th>
                <Th align="center">Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center"
                  >
                    <LoadingRow texto="Cargando sucursales..." />
                  </td>
                </tr>
              ) : sucursalesFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center font-semibold text-[#8A757D]"
                  >
                    No hay sucursales registradas.
                  </td>
                </tr>
              ) : (
                sucursalesFiltradas.map((sucursal) => (
                  <tr
                    key={sucursal.id_sucursal}
                    className="transition hover:bg-[#FFFAFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
                          <Store size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-[#43353A]">
                            {sucursal.nombre}
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-[#AA939B]">
                            ID #{sucursal.id_sucursal}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8EDF1] px-3 py-1.5 text-xs font-black text-[#66535A]">
                        <KeyRound size={13} />
                        {sucursal.clave}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-center gap-2">
                        <User
                          size={15}
                          className="shrink-0 text-[#B49FA7]"
                        />
                        {sucursal.responsable || '—'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone
                            size={15}
                            className="shrink-0 text-[#B49FA7]"
                          />
                          {sucursal.telefono || '—'}
                        </div>

                        <div className="flex items-center gap-2">
                          <Mail
                            size={15}
                            className="shrink-0 text-[#B49FA7]"
                          />

                          <span className="max-w-[220px] truncate">
                            {sucursal.correo || '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="max-w-xs px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={15}
                          className="mt-0.5 shrink-0 text-[#B49FA7]"
                        />

                        <div className="min-w-0">
                          <span className="line-clamp-2">
                            {sucursal.direccion || '—'}
                          </span>

                          {sucursal.url_google_maps && (
                            <a
                              href={sucursal.url_google_maps}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-[#A84E6C] hover:text-[#8B3F5B]"
                            >
                              Ver mapa
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <EstadoSucursal activo={sucursal.activo} />
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#766168]">
                      {formatoFecha(sucursal.fecha_creacion)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(sucursal)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            desactivarSucursal(sucursal)
                          }
                          disabled={!esActivo(sucursal.activo)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Desactivar"
                        >
                          <Trash2 size={16} />
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

      {/* =====================================================
          MODAL
      ===================================================== */}

      {modalAbierto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#33272C]/55 p-3 backdrop-blur-sm sm:p-5">
          <div
            className="absolute inset-0"
            onClick={cerrarModal}
          />

          <div className="relative my-auto flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#AD526F]">
                  <Store size={12} />
                  {modoEdicion
                    ? 'Edición'
                    : 'Nueva ubicación'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034] sm:text-2xl">
                  {modoEdicion
                    ? 'Editar sucursal'
                    : 'Nueva sucursal'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Captura la información operativa y de contacto de la tienda.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4] disabled:opacity-60"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={guardarSucursal}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  {/* NOMBRE */}
                  <Campo label="Nombre de sucursal *">
                    <div className="relative">
                      <Store
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Ej. Tienda Centro"
                      />
                    </div>
                  </Campo>

                  {/* CLAVE */}
                  <Campo label="Clave *">
                    <div className="relative">
                      <KeyRound
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        name="clave"
                        value={form.clave}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            clave: e.target.value.toUpperCase(),
                          }))
                        }
                        className={`${inputClass} pl-11 uppercase`}
                        placeholder="Ej. CENTRO"
                      />
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#9B858D]">
                      Usa una clave corta y única, por ejemplo CENTRO,
                      BELLEZA o PRINCIPAL.
                    </p>
                  </Campo>

                  {/* RESPONSABLE */}
                  <Campo label="Responsable">
                    <div className="relative">
                      <User
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        name="responsable"
                        value={form.responsable}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Nombre del responsable"
                      />
                    </div>
                  </Campo>

                  {/* TELÉFONO */}
                  <Campo label="Teléfono">
                    <div className="relative">
                      <Phone
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        name="telefono"
                        value={form.telefono}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="7711234567"
                      />
                    </div>
                  </Campo>

                  {/* CORREO */}
                  <div className="md:col-span-2">
                    <Campo label="Correo">
                      <div className="relative">
                        <Mail
                          className={iconInputClass}
                          size={18}
                        />

                        <input
                          type="email"
                          name="correo"
                          value={form.correo}
                          onChange={handleChange}
                          className={`${inputClass} pl-11`}
                          placeholder="centro@tienda.com"
                        />
                      </div>
                    </Campo>
                  </div>

                  {/* DIRECCIÓN */}
                  <div className="md:col-span-2">
                    <Campo label="Dirección">
                      <div className="relative">
                        <MapPin
                          className="absolute left-4 top-4 text-[#B5A1A8]"
                          size={18}
                        />

                        <textarea
                          name="direccion"
                          value={form.direccion}
                          onChange={handleChange}
                          rows="3"
                          className={`${inputClass} resize-none pl-11`}
                          placeholder="Calle, número, colonia, municipio..."
                        />
                      </div>
                    </Campo>
                  </div>

                  {/* GOOGLE MAPS */}
                  <div className="md:col-span-2">
                    <Campo label="Ubicación en Google Maps">
                      <div className="relative">
                        <MapPin
                          className={iconInputClass}
                          size={18}
                        />

                        <input
                          type="url"
                          name="url_google_maps"
                          value={form.url_google_maps}
                          onChange={handleChange}
                          className={`${inputClass} pl-11`}
                          placeholder="https://maps.app.goo.gl/..."
                        />
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-[#9B858D]">
                        Abre Google Maps, selecciona “Compartir” y pega
                        aquí el enlace de la sucursal.
                      </p>

                      {form.url_google_maps?.trim() && (
                        <a
                          href={form.url_google_maps}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E8C3CF] bg-[#FFF2F5] px-3 py-2 text-xs font-black text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                        >
                          <MapPin size={14} />
                          Abrir ubicación
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </Campo>
                  </div>

                  {/* ESTADO */}
                  {modoEdicion && (
                    <div className="md:col-span-2">
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-[1.3rem] border p-4 transition ${
                          form.activo
                            ? 'border-[#E7BAC8] bg-[#FFF1F5]'
                            : 'border-[#EEE2E6] bg-[#FFFCFD]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="activo"
                          checked={form.activo}
                          onChange={handleChange}
                          className="sr-only"
                        />

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            form.activo
                              ? 'bg-[#AD526F] text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {form.activo ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <CircleOff size={18} />
                          )}
                        </span>

                        <span>
                          <span className="block text-sm font-black text-[#59464D]">
                            Sucursal activa
                          </span>

                          <span className="mt-1 block text-xs leading-relaxed text-[#9B858D]">
                            Las sucursales activas pueden recibir ventas,
                            inventario y asignaciones operativas.
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#F3E7EA] px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="w-full rounded-2xl bg-[#F8EDF1] px-5 py-3 font-black text-[#80606B] transition hover:bg-[#F2DDE4] disabled:opacity-60 sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {guardando ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                      ? 'Actualizar sucursal'
                      : 'Guardar sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}

/* =========================================================
   COMPONENTES VISUALES
========================================================= */

const inputClass =
  'w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

const iconInputClass =
  'absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]';

function Campo({
  label,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-[#5D4A51]">
        {label}
      </label>

      {children}
    </div>
  );
}

function SucursalKpi({
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

function EstadoSucursal({
  activo,
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        esActivo(activo)
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {esActivo(activo) ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function InfoSucursal({
  icono: Icono,
  titulo,
  valor,
}) {
  return (
    <div className="rounded-[1.15rem] border border-[#F2E7EA] bg-white p-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#A18A92]">
        <Icono size={13} />
        {titulo}
      </p>

      <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-[#67545B]">
        {valor}
      </p>
    </div>
  );
}

function EstadoLista({
  texto,
  cargando = false,
}) {
  return (
    <div className="rounded-[1.4rem] border border-[#F0E4E8] bg-[#FFFCFD] p-6 text-center font-semibold text-[#8A757D]">
      <div className="flex items-center justify-center gap-2">
        {cargando && (
          <Loader2
            size={18}
            className="animate-spin text-[#AD526F]"
          />
        )}

        {texto}
      </div>
    </div>
  );
}

function LoadingRow({
  texto,
}) {
  return (
    <div className="flex items-center justify-center gap-2 font-semibold text-[#8A757D]">
      <Loader2
        size={18}
        className="animate-spin text-[#AD526F]"
      />
      {texto}
    </div>
  );
}

function Th({
  children,
  align = 'left',
}) {
  const alineacion =
    align === 'center'
      ? 'text-center'
      : align === 'right'
        ? 'text-right'
        : 'text-left';

  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#9B858D] ${alineacion}`}
    >
      {children}
    </th>
  );
}
