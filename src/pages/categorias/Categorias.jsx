import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Tags,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers3,
  CircleOff,
  Loader2,
} from 'lucide-react';

import api from '../../api/axios';

const formInicial = {
  nombre: '',
  descripcion: '',
  activo: true,
};

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [buscar, setBuscar] = useState('');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [form, setForm] = useState(formInicial);

  // =========================================================
  // FILTROS Y RESUMEN
  // =========================================================

  const categoriasFiltradas = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    if (!texto) return categorias;

    return categorias.filter((categoria) => {
      return (
        categoria.nombre?.toLowerCase().includes(texto) ||
        categoria.descripcion?.toLowerCase().includes(texto)
      );
    });
  }, [categorias, buscar]);

  const resumen = useMemo(() => {
    const total = categorias.length;
    const activas = categorias.filter((c) => Boolean(c.activo)).length;
    const inactivas = categorias.filter((c) => !Boolean(c.activo)).length;

    return {
      total,
      activas,
      inactivas,
    };
  }, [categorias]);

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

  const cargarCategorias = async () => {
    try {
      setCargando(true);

      const { data } = await api.get('/categorias');

      if (data.ok) {
        setCategorias(data.categorias || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las categorías.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  // =========================================================
  // MODAL
  // =========================================================

  const abrirNuevo = () => {
    setForm(formInicial);
    setModoEdicion(false);
    setCategoriaEditando(null);
    setModalAbierto(true);
  };

  const abrirEditar = (categoria) => {
    setCategoriaEditando(categoria);
    setModoEdicion(true);

    setForm({
      nombre: categoria.nombre || '',
      descripcion: categoria.descripcion || '',
      activo: Boolean(categoria.activo),
    });

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setCategoriaEditando(null);
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
  // GUARDAR
  // =========================================================

  const validarForm = () => {
    if (!form.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre obligatorio',
        text: 'Ingresa el nombre de la categoría.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    return true;
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();

    if (!validarForm()) return;

    try {
      setGuardando(true);

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        activo: form.activo,
      };

      let respuesta;

      if (modoEdicion) {
        respuesta = await api.put(
          `/categorias/${categoriaEditando.id_categoria}`,
          payload
        );
      } else {
        respuesta = await api.post('/categorias', payload);
      }

      if (respuesta.data.ok) {
        await Swal.fire({
          icon: 'success',
          title: modoEdicion
            ? 'Categoría actualizada'
            : 'Categoría creada',
          text: respuesta.data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModal();
        await cargarCategorias();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar la categoría.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // DESACTIVAR
  // =========================================================

  const desactivarCategoria = async (categoria) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar categoría?',
      html: `
        <div style="text-align:left">
          <p><b>Categoría:</b> ${categoria.nombre}</p>
          <p style="margin-top:8px">
            La categoría quedará inactiva y no estará disponible para nuevos productos.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B85F7D',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(
        `/categorias/${categoria.id_categoria}`
      );

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Categoría desactivada',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        await cargarCategorias();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar la categoría.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden pb-8 sm:space-y-6">
      {/* =======================================================
          ENCABEZADO
      ======================================================= */}

      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#FCEEF2] blur-3xl" />

        <div className="pointer-events-none absolute right-[24%] top-7 h-20 w-20 rounded-full border border-[#E9C7D2]/40" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#B85F7D]">
              <Tags size={24} />
            </div>

            <div className="min-w-0">
             

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Categorías
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                Organiza los productos por líneas, colecciones o tipos para
                facilitar la búsqueda, venta e inventario.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.23)] transition hover:-translate-y-0.5 hover:bg-[#A95270] sm:w-auto"
          >
            <Plus size={19} />
            Nueva categoría
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
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4A3B40] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D48BA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder="Buscar por nombre o descripción..."
            />
          </div>

          <button
            type="button"
            onClick={cargarCategorias}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 md:w-auto"
          >
            {cargando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}

            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </section>

      {/* =======================================================
          KPIS
      ======================================================= */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <ResumenCard
          titulo="Total categorías"
          valor={resumen.total}
          detalle="Registradas en catálogo"
          icono={Layers3}
          claseIcono="bg-[#FBEAF0] text-[#B85F7D]"
        />

        <ResumenCard
          titulo="Activas"
          valor={resumen.activas}
          detalle="Disponibles para productos"
          icono={CheckCircle2}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <ResumenCard
          titulo="Inactivas"
          valor={resumen.inactivas}
          detalle="Ocultas para nuevos registros"
          icono={CircleOff}
          claseIcono="bg-slate-100 text-slate-600"
        />
      </section>

      {/* =======================================================
          LISTADO
      ======================================================= */}

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex flex-col gap-2 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#B85F7D]">
              <Tags size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Listado de categorías
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {categoriasFiltradas.length} categoría(s) en la vista actual
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            MÓVIL
        ===================================================== */}

        <div className="space-y-3 p-4 md:hidden">
          {cargando ? (
            <EstadoLista
              cargando
              texto="Cargando categorías..."
            />
          ) : categoriasFiltradas.length === 0 ? (
            <EstadoLista texto="No hay categorías registradas." />
          ) : (
            categoriasFiltradas.map((categoria) => (
              <article
                key={categoria.id_categoria}
                className="rounded-[1.5rem] border border-[#F0E4E8] bg-[#FFFCFD] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#B85F7D]">
                      <Tags size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-black text-[#43353A]">
                        {categoria.nombre}
                      </p>

                      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#AA939B]">
                        ID #{categoria.id_categoria}
                      </p>
                    </div>
                  </div>

                  <EstadoCategoria activo={categoria.activo} />
                </div>

                <div className="mt-4 rounded-[1.2rem] border border-[#F2E7EA] bg-white p-3.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#A18A92]">
                    <FileText size={13} />
                    Descripción
                  </p>

                  <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-[#67545B]">
                    {categoria.descripcion || 'Sin descripción'}
                  </p>
                </div>

                <div className="mt-3 rounded-[1.2rem] border border-[#F2E7EA] bg-white p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#A18A92]">
                    Fecha de alta
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#67545B]">
                    {formatoFecha(categoria.fecha_creacion)}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(categoria)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                  >
                    <Pencil size={17} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => desactivarCategoria(categoria)}
                    disabled={!categoria.activo}
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

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
              <tr>
                <Th>Categoría</Th>
                <Th>Descripción</Th>
                <Th align="center">Estado</Th>
                <Th>Alta</Th>
                <Th align="center">Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center text-[#8A757D]"
                  >
                    <div className="flex items-center justify-center gap-2 font-bold">
                      <Loader2
                        size={19}
                        className="animate-spin text-[#B85F7D]"
                      />
                      Cargando categorías...
                    </div>
                  </td>
                </tr>
              ) : categoriasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-12 text-center font-semibold text-[#8A757D]"
                  >
                    No hay categorías registradas.
                  </td>
                </tr>
              ) : (
                categoriasFiltradas.map((categoria) => (
                  <tr
                    key={categoria.id_categoria}
                    className="transition hover:bg-[#FFFAFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#B85F7D]">
                          <Tags size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="break-words font-black text-[#43353A]">
                            {categoria.nombre}
                          </p>

                          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#AA939B]">
                            ID #{categoria.id_categoria}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="max-w-xl px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-start gap-2">
                        <FileText
                          size={14}
                          className="mt-0.5 shrink-0 text-[#B49FA7]"
                        />

                        <span className="line-clamp-2 break-words">
                          {categoria.descripcion || 'Sin descripción'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <EstadoCategoria activo={categoria.activo} />
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#766168]">
                      {formatoFecha(categoria.fecha_creacion)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(categoria)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#A84E6C] transition hover:bg-[#F5DDE5]"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => desactivarCategoria(categoria)}
                          disabled={!categoria.activo}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#33272C]/50 px-3 py-5 backdrop-blur-sm sm:px-4 sm:py-8">
          <div
            className="absolute inset-0"
            onClick={cerrarModal}
          />

          <div className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#B85F7D]">
                  <Tags size={12} />
                  {modoEdicion ? 'Edición' : 'Nuevo registro'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034]">
                  {modoEdicion
                    ? 'Editar categoría'
                    : 'Nueva categoría'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Define el nombre y una descripción que ayude a identificar
                  claramente el grupo de productos.
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

            <form onSubmit={guardarCategoria}>
              <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5 sm:p-6">
                {/* NOMBRE */}
                <div>
                  <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                    Nombre *
                  </label>

                  <div className="relative">
                    <Tags
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                      size={18}
                    />

                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                      placeholder="Ej. Ropa, Maquillaje, Perfumería..."
                    />
                  </div>
                </div>

                {/* DESCRIPCIÓN */}
                <div>
                  <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                    Descripción
                  </label>

                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="4"
                    className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Ej. Prendas, accesorios y artículos relacionados con moda."
                  />
                </div>

                {/* ESTADO */}
                {modoEdicion && (
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
                          ? 'bg-[#B85F7D] text-white'
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
                        Categoría activa
                      </span>

                      <span className="mt-1 block text-xs leading-relaxed text-[#9B858D]">
                        Cuando está activa puede utilizarse para registrar y
                        clasificar productos.
                      </span>
                    </span>
                  </label>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#F3E7EA] px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.22)] transition hover:bg-[#A95270] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                      ? 'Actualizar categoría'
                      : 'Guardar categoría'}
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

function ResumenCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  claseIcono,
}) {
  return (
    <div className="rounded-[1.6rem] border border-[#F0E4E8] bg-white p-5 shadow-[0_10px_30px_rgba(118,76,91,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${claseIcono}`}
        >
          <Icono size={20} />
        </div>
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.07em] text-[#967F87]">
        {titulo}
      </p>

      <p className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#3A2F33] sm:text-4xl">
        {valor}
      </p>

      <p className="mt-2 text-xs font-semibold text-[#AA939B]">
        {detalle}
      </p>
    </div>
  );
}

function EstadoCategoria({ activo }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        activo
          ? 'bg-[#FBEAF0] text-[#A84E6C]'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {activo ? 'Activa' : 'Inactiva'}
    </span>
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
            className="animate-spin text-[#B85F7D]"
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
