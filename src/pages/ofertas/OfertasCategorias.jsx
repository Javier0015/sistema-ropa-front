import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  BadgePercent,
  Calendar,
  Edit,
  Plus,
  RefreshCw,
  Save,
  Search,
  Tags,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Sparkles,
  Loader2,
  Clock3,
  CheckCircle2,
} from 'lucide-react';

import api from '../../api/axios';

const formInicial = {
  id_categoria: '',
  nombre: '',
  descripcion: '',
  porcentaje_descuento: '',
  fecha_inicio: '',
  fecha_fin: '',
  activo: true,
};

export default function OfertasCategorias() {
  const [ofertas, setOfertas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('TODAS');
  const [vigencia, setVigencia] = useState('TODAS');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formInicial);

  const formatoNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-MX', {
      dateStyle: 'medium',
    });
  };

  const cargarCategorias = async () => {
    const { data } = await api.get('/categorias');

    if (data.ok) {
      setCategorias(data.categorias || data.data || []);
    }
  };

  const cargarOfertas = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (busqueda.trim()) {
        params.append('buscar', busqueda.trim());
      }

      if (estado !== 'TODAS') {
        params.append('estado', estado);
      }

      if (vigencia !== 'TODAS') {
        params.append('vigencia', vigencia);
      }

      const { data } = await api.get(
        `/ofertas-categorias?${params.toString()}`
      );

      if (data.ok) {
        setOfertas(data.ofertas || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las ofertas.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      await Promise.all([cargarCategorias(), cargarOfertas()]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cargarOfertas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, vigencia]);

  const resumen = useMemo(() => {
    return ofertas.reduce(
      (acc, oferta) => {
        acc.total += 1;

        if (oferta.activo) acc.activas += 1;
        if (oferta.vigente) acc.vigentes += 1;

        if (oferta.estatus_calculado === 'PROGRAMADA') acc.programadas += 1;
        if (oferta.estatus_calculado === 'VENCIDA') acc.vencidas += 1;

        return acc;
      },
      {
        total: 0,
        activas: 0,
        vigentes: 0,
        programadas: 0,
        vencidas: 0,
      }
    );
  }, [ofertas]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(formInicial);
    setModalAbierto(true);
  };

  const abrirEditar = (oferta) => {
    setEditando(oferta);

    setForm({
      id_categoria: oferta.id_categoria || '',
      nombre: oferta.nombre || '',
      descripcion: oferta.descripcion || '',
      porcentaje_descuento: oferta.porcentaje_descuento || '',
      fecha_inicio: oferta.fecha_inicio
        ? String(oferta.fecha_inicio).substring(0, 10)
        : '',
      fecha_fin: oferta.fecha_fin
        ? String(oferta.fecha_fin).substring(0, 10)
        : '',
      activo: oferta.activo === true || oferta.activo === 'true',
    });

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setForm(formInicial);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validarFormulario = () => {
    if (!form.id_categoria) {
      Swal.fire({
        icon: 'warning',
        title: 'Categoría requerida',
        text: 'Selecciona una categoría para la oferta.',
        confirmButtonColor: '#AD526F',
      });
      return false;
    }

    if (!form.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Ingresa el nombre de la oferta.',
        confirmButtonColor: '#AD526F',
      });
      return false;
    }

    const porcentaje = Number(form.porcentaje_descuento);

    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      Swal.fire({
        icon: 'warning',
        title: 'Porcentaje inválido',
        text: 'El descuento debe estar entre 0 y 100.',
        confirmButtonColor: '#AD526F',
      });
      return false;
    }

    if (!form.fecha_inicio || !form.fecha_fin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Selecciona fecha de inicio y fecha final.',
        confirmButtonColor: '#AD526F',
      });
      return false;
    }

    if (form.fecha_fin < form.fecha_inicio) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'La fecha final no puede ser menor que la fecha de inicio.',
        confirmButtonColor: '#AD526F',
      });
      return false;
    }

    return true;
  };

  const guardarOferta = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    try {
      setGuardando(true);

      const payload = {
        id_categoria: Number(form.id_categoria),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        porcentaje_descuento: Number(form.porcentaje_descuento),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        activo: form.activo,
      };

      const { data } = editando
        ? await api.put(`/ofertas-categorias/${editando.id_oferta}`, payload)
        : await api.post('/ofertas-categorias', payload);

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: editando ? 'Oferta actualizada' : 'Oferta creada',
          text: data.mensaje || 'La oferta fue guardada correctamente.',
          timer: 1600,
          showConfirmButton: false,
        });

        cerrarModal();
        await cargarOfertas();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar la oferta.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (oferta) => {
    const nuevoEstado = !oferta.activo;

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: nuevoEstado ? '¿Activar oferta?' : '¿Desactivar oferta?',
      text: nuevoEstado
        ? 'La oferta volverá a aplicar si está dentro de su rango de fechas.'
        : 'La oferta dejará de aplicarse en el punto de venta.',
      showCancelButton: true,
      confirmButtonText: nuevoEstado ? 'Sí, activar' : 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevoEstado ? '#AD526F' : '#dc2626',
      cancelButtonColor: '#64748b',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.patch(
        `/ofertas-categorias/${oferta.id_oferta}/estado`,
        {
          activo: nuevoEstado,
        }
      );

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Estado actualizado',
          text: data.mensaje || 'La oferta fue actualizada correctamente.',
          timer: 1400,
          showConfirmButton: false,
        });

        await cargarOfertas();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cambiar el estado de la oferta.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  const eliminarOferta = async (oferta) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar oferta?',
      html: `
        <div style="text-align:left">
          <p><b>Oferta:</b> ${oferta.nombre}</p>
          <p><b>Categoría:</b> ${oferta.categoria}</p>
          <p>Si la oferta ya fue usada en ventas, se desactivará en lugar de eliminarse.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(
        `/ofertas-categorias/${oferta.id_oferta}`
      );

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Oferta eliminada',
          text: data.mensaje || 'La oferta fue eliminada correctamente.',
          timer: 1600,
          showConfirmButton: false,
        });

        await cargarOfertas();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo eliminar la oferta.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  const claseEstatus = (estatus) => {
    if (estatus === 'VIGENTE') return 'bg-emerald-100 text-emerald-700';
    if (estatus === 'PROGRAMADA') return 'bg-[#F0EBF6] text-[#765D8D]';
    if (estatus === 'VENCIDA') return 'bg-[#EFE5E8] text-[#66535A]';
    if (estatus === 'INACTIVA') return 'bg-red-100 text-red-700';

    return 'bg-[#F8EDF1] text-[#766168]';
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 sm:space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F] sm:h-14 sm:w-14">
              <BadgePercent size={27} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#AD526F]">
                <Sparkles size={13} />
                Promociones
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Ofertas por categoría
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D] sm:text-base">
                Configura descuentos automáticos para categorías de ropa,
                cosméticos y accesorios.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto">
            <button
              type="button"
              onClick={cargarOfertas}
              disabled={cargando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60"
            >
              {cargando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}

              {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>

            <button
              type="button"
              onClick={abrirNuevo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.23)] transition hover:-translate-y-0.5 hover:bg-[#8B3F5B]"
            >
              <Plus size={18} />
              Nueva oferta
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OfertaKpi
          titulo="Total ofertas"
          valor={formatoNumero(resumen.total)}
          detalle="Registradas"
          icono={BadgePercent}
          claseIcono="bg-[#FBEAF0] text-[#AD526F]"
        />

        <OfertaKpi
          titulo="Activas"
          valor={formatoNumero(resumen.activas)}
          detalle="Habilitadas"
          icono={ToggleRight}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <OfertaKpi
          titulo="Vigentes"
          valor={formatoNumero(resumen.vigentes)}
          detalle="Aplicando en POS"
          icono={CheckCircle2}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <OfertaKpi
          titulo="Programadas"
          valor={formatoNumero(resumen.programadas)}
          detalle="Próximamente"
          icono={Clock3}
          claseIcono="bg-[#F0EBF6] text-[#765D8D]"
        />

        <OfertaKpi
          titulo="Vencidas"
          valor={formatoNumero(resumen.vencidas)}
          detalle="Fuera de vigencia"
          icono={Calendar}
          claseIcono="bg-[#F8EDF1] text-[#766168]"
        />
      </section>

      <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)] sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_200px_220px_auto] gap-3">
          <div className="relative min-w-0">
            <Search
              className="absolute left-4 top-3.5 text-[#AA939B]"
              size={20}
            />

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') cargarOfertas();
              }}
              className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder="Buscar oferta, descripción o categoría..."
            />
          </div>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
          >
            <option value="TODAS">Todas</option>
            <option value="ACTIVAS">Activas</option>
            <option value="INACTIVAS">Inactivas</option>
          </select>

          <select
            value={vigencia}
            onChange={(e) => setVigencia(e.target.value)}
            className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
          >
            <option value="TODAS">Toda vigencia</option>
            <option value="VIGENTES">Vigentes</option>
            <option value="PROGRAMADAS">Programadas</option>
            <option value="VENCIDAS">Vencidas</option>
          </select>

          <button
            type="button"
            onClick={cargarOfertas}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white transition hover:bg-[#8B3F5B] lg:w-auto"
          >
            <Search size={19} />
            Buscar
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#AD526F]">
              <BadgePercent size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Listado de ofertas
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {ofertas.length} oferta(s) en la vista actual
              </p>
            </div>
          </div>
        </div>

        {/* Vista móvil */}
        <div className="md:hidden p-4 space-y-3">
          {cargando ? (
            <div className="rounded-[1.4rem] border border-[#F0E4E8] bg-[#FFFCFD] p-6 text-center font-semibold text-[#8A757D]">
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-[#AD526F]" />
                Cargando ofertas...
              </div>
            </div>
          ) : ofertas.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8C777F] font-semibold">
              No hay ofertas registradas.
            </div>
          ) : (
            ofertas.map((oferta) => (
              <article
                key={oferta.id_oferta}
                className="rounded-2xl border border-[#F0E4E8] p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)] bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#43353A] break-words">
                      {oferta.nombre}
                    </p>
                    <p className="text-xs text-[#8C777F] mt-1 break-words">
                      {oferta.descripcion || 'Sin descripción'}
                    </p>
                  </div>

                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold shrink-0 ${claseEstatus(
                      oferta.estatus_calculado
                    )}`}
                  >
                    {oferta.estatus_calculado || '—'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#FBEAF0] px-3 py-1 text-xs font-black text-[#A84E6C]">
                    <Tags size={14} />
                    {oferta.categoria}
                  </span>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                    <BadgePercent size={14} />
                    {formatoNumero(oferta.porcentaje_descuento)}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F] flex items-center gap-1">
                      <Calendar size={14} />
                      Vigencia
                    </p>
                    <p className="font-bold text-[#43353A] mt-1">
                      {formatoFecha(String(oferta.fecha_inicio).substring(0, 10))}
                    </p>
                    <p className="text-xs text-[#8C777F]">
                      al {formatoFecha(String(oferta.fecha_fin).substring(0, 10))}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#8C777F]">Estado</p>
                      <p className="font-bold text-[#43353A]">
                        {oferta.activo ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => cambiarEstado(oferta)}
                      className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold transition shrink-0 ${
                        oferta.activo
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {oferta.activo ? (
                        <ToggleRight size={15} />
                      ) : (
                        <ToggleLeft size={15} />
                      )}
                      {oferta.activo ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(oferta)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F4D9E2]"
                  >
                    <Edit size={18} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarOferta(oferta)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-bold transition"
                  >
                    <Trash2 size={18} />
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Vista tablet/escritorio */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-[#FFFAFB] border-b border-[#F0E4E8]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Oferta
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Categoría
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8C777F] uppercase">
                  Descuento
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Vigencia
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase">
                  Estatus
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase">
                  Activa
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase sticky right-0 bg-[#FFFAFB] shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] z-10">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-[#8A757D]">
                    <div className="flex items-center justify-center gap-2 font-semibold">
                      <Loader2 size={18} className="animate-spin text-[#AD526F]" />
                      Cargando ofertas...
                    </div>
                  </td>
                </tr>
              ) : ofertas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-[#8C777F]">
                    No hay ofertas registradas.
                  </td>
                </tr>
              ) : (
                ofertas.map((oferta) => (
                  <tr key={oferta.id_oferta} className="transition hover:bg-[#FFFAFB]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#43353A]">
                        {oferta.nombre}
                      </p>
                      <p className="text-xs text-[#8C777F] mt-1">
                        {oferta.descripcion || 'Sin descripción'}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#FBEAF0] px-3 py-1 text-xs font-black text-[#A84E6C]">
                        <Tags size={14} />
                        {oferta.categoria}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-emerald-700">
                      {formatoNumero(oferta.porcentaje_descuento)}%
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <p>{formatoFecha(String(oferta.fecha_inicio).substring(0, 10))}</p>
                      <p className="text-xs text-[#AA939B]">
                        al {formatoFecha(String(oferta.fecha_fin).substring(0, 10))}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${claseEstatus(
                          oferta.estatus_calculado
                        )}`}
                      >
                        {oferta.estatus_calculado || '—'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => cambiarEstado(oferta)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
                          oferta.activo
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {oferta.activo ? (
                          <ToggleRight size={15} />
                        ) : (
                          <ToggleLeft size={15} />
                        )}
                        {oferta.activo ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>

                    <td className="px-5 py-4 sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(oferta)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#A84E6C] transition hover:bg-[#F4D9E2]"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarOferta(oferta)}
                          className="w-10 h-10 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center transition"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
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

          <form
            onSubmit={guardarOferta}
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#AD526F]">
                  <BadgePercent size={12} />
                  {editando ? 'Edición' : 'Nueva promoción'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034]">
                  {editando ? 'Editar oferta' : 'Nueva oferta'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Configura el descuento, la categoría y su periodo de vigencia.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#EFE5E8] text-[#66535A] flex items-center justify-center transition shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
              <div className="md:col-span-2 min-w-0">
                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                  Categoría *
                </label>

                <select
                  name="id_categoria"
                  value={form.id_categoria}
                  onChange={handleChange}
                  className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                >
                  <option value="">Selecciona una categoría</option>

                  {categorias.map((categoria) => (
                    <option
                      key={categoria.id_categoria}
                      value={categoria.id_categoria}
                    >
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 min-w-0">
                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                  Nombre de la oferta *
                </label>

                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  className={inputOfferClass}
                  placeholder="Ej. Semana de maquillaje"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                  Porcentaje de descuento *
                </label>

                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    name="porcentaje_descuento"
                    value={form.porcentaje_descuento}
                    onChange={handleChange}
                    className={`${inputOfferClass} pr-10`}
                    placeholder="10.00"
                  />
                  <span className="absolute right-4 top-3.5 text-[#8C777F] font-bold">
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-end min-w-0">
                <label className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[1.3rem] border px-4 py-3 transition ${
                  form.activo
                    ? 'border-[#E7BAC8] bg-[#FFF1F5]'
                    : 'border-[#EEE2E6] bg-[#FFFCFD]'
                }`}>
                  <div className="min-w-0">
                    <p className="font-bold text-[#66535A] text-sm">
                      Oferta activa
                    </p>
                    <p className="text-xs text-[#8C777F]">
                      Si está activa y vigente, aplicará en POS.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    name="activo"
                    checked={form.activo}
                    onChange={handleChange}
                    className="w-5 h-5 accent-[#AD526F] shrink-0"
                  />
                </label>
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                  Fecha de inicio *
                </label>

                <input
                  type="date"
                  name="fecha_inicio"
                  value={form.fecha_inicio}
                  onChange={handleChange}
                  className={inputOfferClass}
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                  Fecha final *
                </label>

                <input
                  type="date"
                  name="fecha_fin"
                  value={form.fecha_fin}
                  onChange={handleChange}
                  className={inputOfferClass}
                />
              </div>

              <div className="md:col-span-2 min-w-0">
                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                  Descripción
                </label>

                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows="3"
                  className={`${inputOfferClass} resize-none`}
                  placeholder="Descripción opcional..."
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-5 border-t border-[#F0E4E8] flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={cerrarModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#EFE5E8] text-[#66535A] font-bold transition"
              >
                <X size={18} />
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Save size={18} />
                {guardando ? 'Guardando...' : 'Guardar oferta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputOfferClass =
  'w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

function OfertaKpi({
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

