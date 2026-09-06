import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  FileText,
  RefreshCw,
  Download,
  Trash2,
  Search,
  CalendarDays,
  CheckSquare,
  Square,
  Eye,
  X,
  AlertTriangle,
  Sparkles,
  Loader2,
  Archive,
  CheckCircle2,
} from 'lucide-react';

import api from '../../api/axios';

export default function ReportesCierreCaja() {
  const [reportes, setReportes] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);

  const [modalVista, setModalVista] = useState(false);
  const [urlVistaPdf, setUrlVistaPdf] = useState('');
  const [reporteVista, setReporteVista] = useState(null);

  const [filtros, setFiltros] = useState({
    busqueda: '',
    fecha_inicio: '',
    fecha_fin: '',
  });

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatoFechaCorta = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleDateString('es-MX', {
      dateStyle: 'medium',
    });
  };

  const cargarReportes = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (filtros.fecha_inicio) {
        params.append('fecha_inicio', filtros.fecha_inicio);
      }

      if (filtros.fecha_fin) {
        params.append('fecha_fin', filtros.fecha_fin);
      }

      const queryString = params.toString();
      const url = queryString
        ? `/caja/reportes-cierre?${queryString}`
        : '/caja/reportes-cierre';

      const { data } = await api.get(url);

      if (data.ok) {
        setReportes(data.reportes || []);
        setSeleccionados([]);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar los reportes de cierre de caja.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReportes();

    return () => {
      if (urlVistaPdf) {
        window.URL.revokeObjectURL(urlVistaPdf);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reportesFiltrados = useMemo(() => {
    const texto = filtros.busqueda.trim().toLowerCase();

    if (!texto) return reportes;

    return reportes.filter((reporte) => {
      return (
        String(reporte.id_reporte || '').includes(texto) ||
        String(reporte.id_sesion || '').includes(texto) ||
        String(reporte.id_caja || '').includes(texto) ||
        String(reporte.id_sucursal || '').includes(texto) ||
        String(reporte.sucursal || '').toLowerCase().includes(texto) ||
        String(reporte.caja || '').toLowerCase().includes(texto) ||
        String(reporte.nombre_archivo || '').toLowerCase().includes(texto) ||
        String(reporte.usuario_generador || '').toLowerCase().includes(texto) ||
        String(reporte.generado_por_nombre || '').toLowerCase().includes(texto)
      );
    });
  }, [reportes, filtros.busqueda]);

  const todosSeleccionados =
    reportesFiltrados.length > 0 &&
    reportesFiltrados.every((reporte) =>
      seleccionados.includes(Number(reporte.id_reporte))
    );

  const alternarSeleccion = (idReporte) => {
    const id = Number(idReporte);

    setSeleccionados((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [...prev, id];
    });
  };

  const alternarTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados([]);
      return;
    }

    setSeleccionados(reportesFiltrados.map((reporte) => Number(reporte.id_reporte)));
  };

  const descargarBlob = (blob, nombreArchivo) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', nombreArchivo || 'reporte-cierre-caja.pdf');

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const descargarReporte = async (reporte) => {
    try {
      const response = await api.get(
        `/caja/reportes-cierre/${reporte.id_reporte}/descargar`,
        {
          responseType: 'blob',
        }
      );

      descargarBlob(
        response.data,
        reporte.nombre_archivo || `reporte-cierre-caja-${reporte.id_reporte}.pdf`
      );
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo descargar el reporte seleccionado.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  const verReporte = async (reporte) => {
    try {
      setCargando(true);

      const response = await api.get(
        `/caja/reportes-cierre/${reporte.id_reporte}/descargar`,
        {
          responseType: 'blob',
        }
      );

      if (urlVistaPdf) {
        window.URL.revokeObjectURL(urlVistaPdf);
      }

      const blob = new Blob([response.data], {
        type: 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);

      setUrlVistaPdf(url);
      setReporteVista(reporte);
      setModalVista(true);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo abrir la vista previa del reporte.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  const cerrarVistaPdf = () => {
    setModalVista(false);
    setReporteVista(null);

    if (urlVistaPdf) {
      window.URL.revokeObjectURL(urlVistaPdf);
      setUrlVistaPdf('');
    }
  };

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin selección',
        text: 'Selecciona al menos un reporte para eliminar.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar reportes?',
      html: `
        <div style="text-align:left">
          <p>Se eliminarán <b>${seleccionados.length}</b> reporte(s).</p>
          <p>Esta acción eliminará el PDF del servidor y lo ocultará del historial.</p>
          <p style="color:#dc2626"><b>No se eliminará la sesión de caja ni las ventas registradas.</b></p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setCargando(true);

      const { data } = await api.delete('/caja/reportes-cierre', {
        data: {
          ids_reportes: seleccionados,
        },
      });

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Reportes eliminados',
          text: data.mensaje || 'Los reportes fueron eliminados correctamente.',
          timer: 1600,
          showConfirmButton: false,
        });

        await cargarReportes();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron eliminar los reportes seleccionados.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      fecha_inicio: '',
      fecha_fin: '',
    });
  };

  const totalReportes = reportesFiltrados.length;

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 sm:space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#B85F7D]">
              <FileText size={24} />
            </div>

            <div className="min-w-0">
             

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Reportes de cierre de caja
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                Consulta, visualiza y descarga los PDF generados al cerrar
                sesiones de caja.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto">
            <button
              type="button"
              onClick={cargarReportes}
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
              onClick={eliminarSeleccionados}
              disabled={seleccionados.length === 0 || cargando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Trash2 size={18} />
              Eliminar seleccionados
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        <ResumenReporteCard
          titulo="Reportes visibles"
          valor={totalReportes}
          detalle="Según filtros aplicados"
          icono={FileText}
          claseIcono="bg-[#FBEAF0] text-[#B85F7D]"
        />

        <ResumenReporteCard
          titulo="Seleccionados"
          valor={seleccionados.length}
          detalle="Marcados para acción"
          icono={CheckCircle2}
          claseIcono="bg-[#F0EBF6] text-[#765D8D]"
        />

        <div className="rounded-[1.6rem] border border-amber-100 bg-white p-5 shadow-[0_10px_30px_rgba(118,76,91,0.045)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Archive size={20} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.07em] text-[#967F87]">
                Limpieza de espacio
              </p>

              <p className="mt-2 text-xs font-semibold leading-relaxed text-[#8C777F]">
                Eliminar un reporte borra el PDF almacenado, pero conserva la
                sesión de caja y las ventas relacionadas.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_12px_40px_rgba(118,76,91,0.05)] sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Buscar
            </label>

            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA939B]"
              />

              <input
                value={filtros.busqueda}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    busqueda: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-11 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                placeholder="Buscar por sesión, sucursal, caja, archivo o usuario..."
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Fecha inicio
            </label>

            <div className="relative">
              <CalendarDays
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA939B]"
              />

              <input
                type="date"
                value={filtros.fecha_inicio}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    fecha_inicio: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-11 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Fecha fin
            </label>

            <div className="relative">
              <CalendarDays
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA939B]"
              />

              <input
                type="date"
                value={filtros.fecha_fin}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    fecha_fin: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-11 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-[#8C777F]">
            Mostrando <b>{reportesFiltrados.length}</b> reporte(s).
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={limpiarFiltros}
              disabled={cargando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F8EDF1] px-5 py-3 font-black text-[#80606B] transition hover:bg-[#F2DDE4] disabled:opacity-60"
            >
              Limpiar
            </button>

            <button
              onClick={cargarReportes}
              disabled={cargando}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.20)] transition hover:bg-[#A95270] disabled:opacity-60"
            >
              <Search size={18} />
              Aplicar filtros
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="lg:hidden p-4 space-y-3">
          {cargando ? (
            <div className="rounded-[1.4rem] border border-[#F0E4E8] bg-[#FFFCFD] p-6 text-center font-semibold text-[#8A757D]">
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-[#B85F7D]" />
                Cargando reportes...
              </div>
            </div>
          ) : reportesFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-[#F0E4E8] bg-[#FFFAFB] p-6 text-center text-[#8C777F]">
              No hay reportes de cierre registrados.
            </div>
          ) : (
            reportesFiltrados.map((reporte) => {
              const seleccionado = seleccionados.includes(Number(reporte.id_reporte));

              return (
                <div
                  key={reporte.id_reporte}
                  className={`rounded-2xl border p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)] ${
                    seleccionado
                      ? 'border-[#E8C3CF] bg-[#FFF2F5]'
                      : 'border-[#F0E4E8] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => alternarSeleccion(reporte.id_reporte)}
                      className="mt-1 text-[#8C777F] hover:text-[#A84E6C]"
                      title="Seleccionar"
                    >
                      {seleccionado ? (
                        <CheckSquare size={22} />
                      ) : (
                        <Square size={22} />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="font-black text-[#43353A] break-words">
                        Sesión #{reporte.id_sesion}
                      </p>

                      <p className="text-sm text-[#8C777F] mt-1 break-words">
                        {reporte.sucursal || 'Sucursal no disponible'} ·{' '}
                        {reporte.caja || 'Caja no disponible'}
                      </p>

                      <p className="text-xs text-[#AA939B] mt-2">
                        Generado: {formatoFecha(reporte.fecha_generacion)}
                      </p>

                      <p className="text-xs text-[#AA939B] mt-1 break-words">
                        Archivo: {reporte.nombre_archivo || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => verReporte(reporte)}
                      disabled={cargando}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-3 text-sm font-black text-[#A84E6C] transition hover:bg-[#F4D9E2] disabled:opacity-60"
                    >
                      <Eye size={17} />
                      Ver
                    </button>

                    <button
                      onClick={() => descargarReporte(reporte)}
                      disabled={cargando}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#44353B] hover:bg-[#35292E] text-white font-bold text-sm transition disabled:opacity-60"
                    >
                      <Download size={17} />
                      Descargar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={alternarTodos}
                    className="inline-flex items-center justify-center text-[#766168] hover:text-[#A84E6C]"
                    title="Seleccionar todos"
                  >
                    {todosSeleccionados ? (
                      <CheckSquare size={21} />
                    ) : (
                      <Square size={21} />
                    )}
                  </button>
                </th>

                <th className="px-4 py-3 text-left text-xs font-black text-[#8C777F] uppercase">
                  Reporte
                </th>

                <th className="px-4 py-3 text-left text-xs font-black text-[#8C777F] uppercase">
                  Sesión
                </th>

                <th className="px-4 py-3 text-left text-xs font-black text-[#8C777F] uppercase">
                  Sucursal / Caja
                </th>

                <th className="px-4 py-3 text-left text-xs font-black text-[#8C777F] uppercase">
                  Generado
                </th>

                <th className="px-4 py-3 text-left text-xs font-black text-[#8C777F] uppercase">
                  Usuario
                </th>

                <th className="px-4 py-3 text-right text-xs font-black text-[#8C777F] uppercase">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-[#8A757D]">
                    <div className="flex items-center justify-center gap-2 font-semibold">
                      <Loader2 size={18} className="animate-spin text-[#B85F7D]" />
                      Cargando reportes...
                    </div>
                  </td>
                </tr>
              ) : reportesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-[#8C777F]">
                    No hay reportes de cierre registrados.
                  </td>
                </tr>
              ) : (
                reportesFiltrados.map((reporte) => {
                  const seleccionado = seleccionados.includes(
                    Number(reporte.id_reporte)
                  );

                  return (
                    <tr
                      key={reporte.id_reporte}
                      className={seleccionado ? 'bg-[#FFF2F5]' : 'hover:bg-[#FFFAFB]'}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => alternarSeleccion(reporte.id_reporte)}
                          className="inline-flex items-center justify-center text-[#766168] hover:text-[#A84E6C]"
                          title="Seleccionar"
                        >
                          {seleccionado ? (
                            <CheckSquare size={21} />
                          ) : (
                            <Square size={21} />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-[#FFF2F5] text-[#A84E6C] flex items-center justify-center shrink-0">
                            <FileText size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-[#43353A] truncate">
                              #{reporte.id_reporte}
                            </p>

                            <p className="text-xs text-[#AA939B] truncate max-w-[260px]">
                              {reporte.nombre_archivo || 'Archivo PDF'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-bold text-[#66535A]">
                          Sesión #{reporte.id_sesion}
                        </p>

                        {reporte.fecha_cierre && (
                          <p className="text-xs text-[#AA939B] mt-1">
                            Cierre: {formatoFechaCorta(reporte.fecha_cierre)}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#66535A]">
                          {reporte.sucursal || '—'}
                        </p>

                        <p className="text-xs text-[#AA939B] mt-1">
                          {reporte.caja || '—'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-[#766168]">
                        {formatoFecha(reporte.fecha_generacion)}
                      </td>

                      <td className="px-4 py-3 text-[#766168]">
                        {reporte.usuario_generador ||
                          reporte.generado_por_nombre ||
                          '—'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => verReporte(reporte)}
                            disabled={cargando}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-2 text-sm font-black text-[#A84E6C] transition hover:bg-[#F4D9E2] disabled:opacity-60"
                            title="Ver reporte"
                          >
                            <Eye size={17} />
                            Ver
                          </button>

                          <button
                            onClick={() => descargarReporte(reporte)}
                            disabled={cargando}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#44353B] hover:bg-[#35292E] text-white font-bold text-sm transition disabled:opacity-60"
                            title="Descargar reporte"
                          >
                            <Download size={17} />
                            Descargar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {modalVista && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/65 backdrop-blur-sm"
            onClick={cerrarVistaPdf}
          />

          <div className="relative my-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Vista previa del reporte
                </h2>

                <p className="text-sm text-[#8C777F] break-words">
                  {reporteVista
                    ? `Reporte #${reporteVista.id_reporte} · Sesión #${reporteVista.id_sesion}`
                    : 'Reporte de cierre de caja'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {reporteVista && (
                  <button
                    onClick={() => descargarReporte(reporteVista)}
                    className="hidden sm:inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#44353B] hover:bg-[#35292E] text-white font-bold transition"
                  >
                    <Download size={18} />
                    Descargar
                  </button>
                )}

                <button
                  onClick={cerrarVistaPdf}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4]"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="h-[75vh] bg-[#F8F2F4] p-3 sm:p-5">
              {urlVistaPdf ? (
                <iframe
                  src={urlVistaPdf}
                  title="Vista previa reporte cierre caja"
                  className="h-full w-full rounded-2xl border border-[#EEDFE4] bg-white"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[#EEDFE4] bg-white text-[#8C777F]">
                  No se pudo cargar el PDF.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenReporteCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  claseIcono,
}) {
  return (
    <div className="rounded-[1.6rem] border border-[#F0E4E8] bg-white p-5 shadow-[0_10px_30px_rgba(118,76,91,0.045)]">
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

