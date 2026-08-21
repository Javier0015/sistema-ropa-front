import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  CircleOff,
  Building2,
} from 'lucide-react';

import api from '../../api/axios';

const formInicial = {
  nombre: '',
  rfc: '',
  telefono: '',
  correo: '',
  direccion: '',
  contacto: '',
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

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [form, setForm] = useState(formInicial);

  // =========================================================
  // RESUMEN
  // =========================================================

  const resumen = useMemo(() => {
    const total = proveedores.length;
    const activos = proveedores.filter((p) => esActivo(p.activo)).length;
    const inactivos = proveedores.filter((p) => !esActivo(p.activo)).length;

    return {
      total,
      activos,
      inactivos,
    };
  }, [proveedores]);

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

  const cargarProveedores = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (buscar.trim()) {
        params.append('buscar', buscar.trim());
      }

      const query = params.toString();

      const { data } = await api.get(
        query ? `/proveedores?${query}` : '/proveedores'
      );

      if (data.ok) {
        setProveedores(data.proveedores || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar los proveedores.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // MODAL
  // =========================================================

  const abrirNuevo = () => {
    setForm(formInicial);
    setModoEdicion(false);
    setProveedorEditando(null);
    setModalAbierto(true);
  };

  const abrirEditar = (proveedor) => {
    setProveedorEditando(proveedor);
    setModoEdicion(true);

    setForm({
      nombre: proveedor.nombre || '',
      rfc: proveedor.rfc || '',
      telefono: proveedor.telefono || '',
      correo: proveedor.correo || '',
      direccion: proveedor.direccion || '',
      contacto: proveedor.contacto || '',
      activo: esActivo(proveedor.activo),
    });

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setProveedorEditando(null);
    setForm(formInicial);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

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
        text: 'Ingresa el nombre del proveedor.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (form.correo.trim()) {
      const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
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

  const guardarProveedor = async (e) => {
    e.preventDefault();

    if (!validarForm()) return;

    try {
      setGuardando(true);

      const payload = {
        nombre: form.nombre.trim(),
        rfc: form.rfc.trim() || null,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
        contacto: form.contacto.trim() || null,
        activo: Boolean(form.activo),
      };

      let respuesta;

      if (modoEdicion) {
        respuesta = await api.put(
          `/proveedores/${proveedorEditando.id_proveedor}`,
          payload
        );
      } else {
        respuesta = await api.post('/proveedores', payload);
      }

      if (respuesta.data.ok) {
        await Swal.fire({
          icon: 'success',
          title: modoEdicion
            ? 'Proveedor actualizado'
            : 'Proveedor creado',
          text: respuesta.data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModal();
        await cargarProveedores();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar el proveedor.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // DESACTIVAR
  // =========================================================

  const desactivarProveedor = async (proveedor) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar proveedor?',
      text: `Se desactivará: ${proveedor.nombre}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#AD526F',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(
        `/proveedores/${proveedor.id_proveedor}`
      );

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Proveedor desactivado',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        await cargarProveedores();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar el proveedor.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden pb-8 sm:space-y-6">
      {/* =======================================================
          HERO
      ======================================================= */}

      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F]">
              <Truck size={24} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#AD526F]">
                <Sparkles size={13} />
                Abastecimiento
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Proveedores
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                Administra proveedores para compras, abastecimiento, pagos y
                entradas de inventario.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.23)] transition hover:-translate-y-0.5 hover:bg-[#8B3F5B] sm:w-auto"
          >
            <Plus size={19} />
            Nuevo proveedor
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="relative mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B4A0A7]"
              size={19}
            />

            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  cargarProveedores();
                }
              }}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4A3B40] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D48BA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder="Buscar por nombre, RFC, teléfono, correo o contacto..."
            />
          </div>

          <button
            type="button"
            onClick={cargarProveedores}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 md:w-auto"
          >
            {cargando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}

            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </section>

      {/* =======================================================
          KPIS
      ======================================================= */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <ResumenProveedor
          titulo="Total proveedores"
          valor={resumen.total}
          detalle="Registrados en catálogo"
          icono={Truck}
          claseIcono="bg-[#FBEAF0] text-[#AD526F]"
        />

        <ResumenProveedor
          titulo="Activos"
          valor={resumen.activos}
          detalle="Disponibles para compras"
          icono={CheckCircle2}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <ResumenProveedor
          titulo="Inactivos"
          valor={resumen.inactivos}
          detalle="Fuera de operación"
          icono={CircleOff}
          claseIcono="bg-slate-100 text-slate-600"
        />
      </section>

      {/* =======================================================
          LISTADO
      ======================================================= */}

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#AD526F]">
              <Building2 size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Listado de proveedores
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {proveedores.length} proveedor(es) en la vista actual
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            MÓVIL
        ===================================================== */}

        <div className="space-y-3 p-4 lg:hidden">
          {cargando ? (
            <EstadoLista
              cargando
              texto="Cargando proveedores..."
            />
          ) : proveedores.length === 0 ? (
            <EstadoLista texto="No hay proveedores registrados." />
          ) : (
            proveedores.map((proveedor) => (
              <article
                key={proveedor.id_proveedor}
                className="rounded-[1.5rem] border border-[#F0E4E8] bg-[#FFFCFD] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
                      <Truck size={20} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-black text-[#43353A]">
                        {proveedor.nombre}
                      </p>

                      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#AA939B]">
                        ID #{proveedor.id_proveedor}
                      </p>
                    </div>
                  </div>

                  <EstadoProveedor activo={proveedor.activo} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoProveedor
                    icono={FileText}
                    titulo="RFC"
                    valor={proveedor.rfc || '—'}
                  />

                  <InfoProveedor
                    icono={User}
                    titulo="Contacto"
                    valor={proveedor.contacto || '—'}
                  />

                  <InfoProveedor
                    icono={Phone}
                    titulo="Teléfono"
                    valor={proveedor.telefono || '—'}
                  />

                  <InfoProveedor
                    icono={Mail}
                    titulo="Correo"
                    valor={proveedor.correo || '—'}
                  />
                </div>

                <div className="mt-3">
                  <InfoProveedor
                    icono={MapPin}
                    titulo="Dirección"
                    valor={proveedor.direccion || '—'}
                  />
                </div>

                <p className="mt-3 text-[10px] font-semibold text-[#AA939B]">
                  Registro: {formatoFecha(proveedor.fecha_creacion)}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(proveedor)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                  >
                    <Pencil size={17} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => desactivarProveedor(proveedor)}
                    disabled={!esActivo(proveedor.activo)}
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

        {/* =====================================================
            DESKTOP
        ===================================================== */}

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1150px]">
            <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
              <tr>
                <Th>Proveedor</Th>
                <Th>RFC</Th>
                <Th>Contacto</Th>
                <Th>Teléfono</Th>
                <Th>Correo</Th>
                <Th>Dirección</Th>
                <Th align="center">Estado</Th>
                <Th align="center">Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center text-[#8A757D]"
                  >
                    <div className="flex items-center justify-center gap-2 font-semibold">
                      <Loader2
                        size={18}
                        className="animate-spin text-[#AD526F]"
                      />
                      Cargando proveedores...
                    </div>
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center font-semibold text-[#8A757D]"
                  >
                    No hay proveedores registrados.
                  </td>
                </tr>
              ) : (
                proveedores.map((proveedor) => (
                  <tr
                    key={proveedor.id_proveedor}
                    className="transition hover:bg-[#FFFAFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
                          <Truck size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-[#43353A]">
                            {proveedor.nombre}
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-[#AA939B]">
                            Registro: {formatoFecha(proveedor.fecha_creacion)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#766168]">
                      {proveedor.rfc || '—'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-center gap-2">
                        <User
                          size={15}
                          className="shrink-0 text-[#B49FA7]"
                        />
                        {proveedor.contacto || '—'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-center gap-2">
                        <Phone
                          size={15}
                          className="shrink-0 text-[#B49FA7]"
                        />
                        {proveedor.telefono || '—'}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={15}
                          className="shrink-0 text-[#B49FA7]"
                        />
                        <span className="max-w-[220px] truncate">
                          {proveedor.correo || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="max-w-xs px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={15}
                          className="mt-0.5 shrink-0 text-[#B49FA7]"
                        />
                        <span className="line-clamp-2">
                          {proveedor.direccion || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <EstadoProveedor activo={proveedor.activo} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(proveedor)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => desactivarProveedor(proveedor)}
                          disabled={!esActivo(proveedor.activo)}
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

      {/* =======================================================
          MODAL
      ======================================================= */}

      {modalAbierto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#33272C]/50 p-3 backdrop-blur-sm sm:p-5">
          <div
            className="absolute inset-0"
            onClick={cerrarModal}
          />

          <div className="relative my-auto flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#AD526F]">
                  <Truck size={12} />
                  {modoEdicion ? 'Edición' : 'Nuevo registro'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034] sm:text-2xl">
                  {modoEdicion
                    ? 'Editar proveedor'
                    : 'Nuevo proveedor'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Registra la información fiscal y de contacto necesaria para
                  compras y abastecimiento.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4]"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={guardarProveedor}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  {/* NOMBRE */}
                  <div className="md:col-span-2">
                    <Campo label="Nombre del proveedor *">
                      <div className="relative">
                        <Building2
                          size={18}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                        />

                        <input
                          name="nombre"
                          value={form.nombre}
                          onChange={handleChange}
                          className={`${inputClass} pl-11`}
                          placeholder="Ej. Distribuidora Moda Centro"
                        />
                      </div>
                    </Campo>
                  </div>

                  {/* RFC */}
                  <Campo label="RFC">
                    <div className="relative">
                      <FileText
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                      />

                      <input
                        name="rfc"
                        value={form.rfc}
                        onChange={handleChange}
                        className={`${inputClass} pl-11 uppercase`}
                        placeholder="DMC010101ABC"
                      />
                    </div>
                  </Campo>

                  {/* CONTACTO */}
                  <Campo label="Persona de contacto">
                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                      />

                      <input
                        name="contacto"
                        value={form.contacto}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Ej. Andrea Pérez"
                      />
                    </div>
                  </Campo>

                  {/* TELÉFONO */}
                  <Campo label="Teléfono">
                    <div className="relative">
                      <Phone
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
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
                  <Campo label="Correo">
                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                      />

                      <input
                        name="correo"
                        value={form.correo}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="ventas@proveedor.com"
                      />
                    </div>
                  </Campo>

                  {/* DIRECCIÓN */}
                  <div className="md:col-span-2">
                    <Campo label="Dirección">
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute left-4 top-4 text-[#B5A1A8]"
                        />

                        <textarea
                          name="direccion"
                          value={form.direccion}
                          onChange={handleChange}
                          rows="3"
                          className={`${inputClass} resize-none pl-11`}
                          placeholder="Dirección fiscal o domicilio del proveedor"
                        />
                      </div>
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
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
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
                            Proveedor activo
                          </span>

                          <span className="mt-1 block text-xs leading-relaxed text-[#9B858D]">
                            Cuando está activo puede seleccionarse en compras y
                            entradas de inventario.
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
                  className="w-full rounded-2xl bg-[#F8EDF1] px-5 py-3 font-black text-[#80606B] transition hover:bg-[#F2DDE4] sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {guardando ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}

                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                      ? 'Actualizar proveedor'
                      : 'Guardar proveedor'}
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

function ResumenProveedor({
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

function EstadoProveedor({
  activo,
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        esActivo(activo)
          ? 'bg-[#FBEAF0] text-[#A84E6C]'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {esActivo(activo) ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function InfoProveedor({
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
