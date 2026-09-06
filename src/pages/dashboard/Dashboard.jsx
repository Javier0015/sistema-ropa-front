import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  ReceiptText,
  Store,
  CalendarDays,
  CircleDollarSign,
  ChartNoAxesColumnIncreasing,
  Download,
  X,
  Sparkles,
  ArrowUpRight,
  CalendarRange,
  CreditCard,
  PackageCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

export default function Dashboard() {
  const { usuario } = useAuth();

  const puedeCambiarSucursal = esSuperAdmin(usuario);

  const fechaActual = new Date();

  const primerDiaMes = new Date(
    fechaActual.getFullYear(),
    fechaActual.getMonth(),
    1
  ).toLocaleDateString('en-CA');

  const hoy = fechaActual.toLocaleDateString('en-CA');

  const [idSucursal, setIdSucursal] = useState('');
  const [sucursales, setSucursales] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [fechaInicio, setFechaInicio] = useState(primerDiaMes);
  const [fechaFin, setFechaFin] = useState(hoy);

  const [modalGastosAbierto, setModalGastosAbierto] = useState(false);
  const [busquedaGastos, setBusquedaGastos] = useState('');
  const [paginaGastos, setPaginaGastos] = useState(1);
  const [filasPorPaginaGastos, setFilasPorPaginaGastos] = useState(10);

  const [modalGananciasAbierto, setModalGananciasAbierto] = useState(false);
  const [busquedaGanancias, setBusquedaGanancias] = useState('');
  const [paginaGanancias, setPaginaGanancias] = useState(1);
  const [filasPorPaginaGanancias, setFilasPorPaginaGanancias] = useState(10);

  const resumen = dashboard?.resumen || {};
  const ultimasVentas = dashboard?.ultimas_ventas || [];
  const productosBajoStock = dashboard?.productos_bajo_stock || [];
  const productosCaducidadDetalle = dashboard?.productos_caducidad_detalle || [];
  const gastosOperativosDetalle = dashboard?.gastos_operativos_detalle || [];
  const gananciasProductosDetalle = dashboard?.ganancias_productos_detalle || [];

  const ventasPorMetodoPago = dashboard?.ventas_por_metodo_pago || [];
  const productosMasVendidos = dashboard?.productos_mas_vendidos || [];
  const categoriasMasVendidas = dashboard?.categorias_mas_vendidas || [];

  const sucursalActual = useMemo(() => {
    return sucursales.find(
      (sucursal) => Number(sucursal.id_sucursal) === Number(idSucursal)
    );
  }, [sucursales, idSucursal]);

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  };

  const formatoNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatoFechaSimple = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');

      if (data.ok) {
        const activas = (data.sucursales || []).filter((s) => s.activo);
        const sucursalesPermitidas = filtrarSucursalesPorRol(usuario, activas);

        setSucursales(sucursalesPermitidas);

        if (!idSucursal) {
          setIdSucursal(obtenerSucursalInicial(usuario, sucursalesPermitidas));
        }
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales.',
      });
    }
  };

  const cargarDashboard = async () => {
    if (!idSucursal) return;

    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Selecciona la fecha de inicio y la fecha final.',
      });
      return;
    }

    if (fechaInicio > fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'La fecha de inicio no puede ser mayor que la fecha final.',
      });
      return;
    }

    try {
      setCargando(true);

      const { data } = await api.get(
        `/dashboard/resumen?sucursal=${idSucursal}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
      );

      if (data.ok) {
        setDashboard(data);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cargar el resumen del dashboard.',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarSucursales();
    }
  }, [usuario]);

  useEffect(() => {
    if (idSucursal) {
      cargarDashboard();
    }
  }, [idSucursal]);

  const ventasPorMetodoGrafica = useMemo(() => {
    return ventasPorMetodoPago.map((item) => ({
      metodo: item.metodo || 'No especificado',
      ventas: Number(item.ventas || 0),
      total: Number(item.total || 0),
    }));
  }, [ventasPorMetodoPago]);

  const productosMasVendidosGrafica = useMemo(() => {
    return productosMasVendidos.slice(0, 10).map((item) => ({
      ...item,
      producto:
        item.producto?.length > 22
          ? `${item.producto.substring(0, 22)}...`
          : item.producto,
      cantidad: Number(item.cantidad || 0),
      total: Number(item.total || 0),
      ganancia: Number(item.ganancia || 0),
    }));
  }, [productosMasVendidos]);

  const categoriasMasVendidasGrafica = useMemo(() => {
    return categoriasMasVendidas.slice(0, 8).map((item) => ({
      ...item,
      categoria:
        item.categoria?.length > 18
          ? `${item.categoria.substring(0, 18)}...`
          : item.categoria,
      cantidad: Number(item.cantidad || 0),
      total: Number(item.total || 0),
      ganancia: Number(item.ganancia || 0),
    }));
  }, [categoriasMasVendidas]);

  const gastosFiltrados = useMemo(() => {
    const texto = busquedaGastos.trim().toLowerCase();

    if (!texto) return gastosOperativosDetalle;

    return gastosOperativosDetalle.filter((item) => {
      return [
        item.tipo,
        item.concepto,
        item.metodo_pago,
        item.referencia,
        item.observaciones,
        item.usuario,
        formatoFecha(item.fecha_movimiento),
        formatoMoneda(item.monto),
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto);
    });
  }, [gastosOperativosDetalle, busquedaGastos]);

  const totalGastosFiltrados = useMemo(() => {
    return gastosFiltrados.reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );
  }, [gastosFiltrados]);

  const totalPaginasGastos = Math.max(
    1,
    Math.ceil(gastosFiltrados.length / filasPorPaginaGastos)
  );

  const gastosPaginados = useMemo(() => {
    const inicio = (paginaGastos - 1) * filasPorPaginaGastos;
    const fin = inicio + filasPorPaginaGastos;

    return gastosFiltrados.slice(inicio, fin);
  }, [gastosFiltrados, paginaGastos, filasPorPaginaGastos]);

  const gananciasFiltradas = useMemo(() => {
    const texto = busquedaGanancias.trim().toLowerCase();

    if (!texto) return gananciasProductosDetalle;

    return gananciasProductosDetalle.filter((item) => {
      return [
        item.producto,
        formatoNumero(item.cantidad_vendida),
        formatoMoneda(item.costo_compra_unitario),
        formatoMoneda(item.precio_venta_promedio),
        formatoMoneda(item.total_costo_compra),
        formatoMoneda(item.total_vendido),
        formatoMoneda(item.ganancia),
        `${formatoNumero(item.margen_porcentaje)}%`,
      ]
        .join(' ')
        .toLowerCase()
        .includes(texto);
    });
  }, [gananciasProductosDetalle, busquedaGanancias]);

  const totalGananciaFiltrada = useMemo(() => {
    return gananciasFiltradas.reduce(
      (acc, item) => acc + Number(item.ganancia || 0),
      0
    );
  }, [gananciasFiltradas]);

  const totalVendidoGananciaFiltrada = useMemo(() => {
    return gananciasFiltradas.reduce(
      (acc, item) => acc + Number(item.total_vendido || 0),
      0
    );
  }, [gananciasFiltradas]);

  const totalCostoGananciaFiltrada = useMemo(() => {
    return gananciasFiltradas.reduce(
      (acc, item) => acc + Number(item.total_costo_compra || 0),
      0
    );
  }, [gananciasFiltradas]);

  const totalPaginasGanancias = Math.max(
    1,
    Math.ceil(gananciasFiltradas.length / filasPorPaginaGanancias)
  );

  const gananciasPaginadas = useMemo(() => {
    const inicio = (paginaGanancias - 1) * filasPorPaginaGanancias;
    const fin = inicio + filasPorPaginaGanancias;

    return gananciasFiltradas.slice(inicio, fin);
  }, [gananciasFiltradas, paginaGanancias, filasPorPaginaGanancias]);


  const coloresGrafica = [
    '#B85F7D',
    '#D487A0',
    '#E8B4C5',
    '#F0CBD6',
    '#9D6B83',
    '#C6A4B1',
    '#DDAF9D',
    '#B8A6C9',
  ];


  const abrirModalBajoStock = () => {
    if (productosBajoStock.length === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Sin productos bajo stock',
        text: 'No hay productos que requieran revisión por bajo stock.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    const filas = productosBajoStock
      .map(
        (item) => `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:left;">
              <strong style="color:#0f172a;">${item.producto}</strong>
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#b45309;font-weight:700;">
              ${formatoNumero(item.stock_actual)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#334155;font-weight:700;">
              ${formatoNumero(item.stock_minimo)}
            </td>
          </tr>
        `
      )
      .join('');

    Swal.fire({
      title: 'Productos bajo stock',
      width: '95%',
      html: `
        <div style="text-align:left;margin-bottom:14px;color:#475569;font-size:14px;">
          Estos productos tienen stock actual menor o igual al mínimo configurado.
        </div>

        <div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:16px;">
          <table style="width:100%;min-width:620px;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#475569;">Producto</th>
                <th style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#475569;">Stock actual</th>
                <th style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#475569;">Stock mínimo</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#B85F7D',
    });
  };

  const abrirModalCaducidad = () => {
    if (productosCaducidadDetalle.length === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Sin caducidades próximas',
        text: 'No hay productos próximos a caducar en los próximos 90 días.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    const filas = productosCaducidadDetalle
      .map((item) => {
        const dias = Number(item.dias_restantes || 0);

        const color =
          dias <= 0
            ? '#dc2626'
            : dias <= 30
              ? '#ea580c'
              : '#ca8a04';

        const fondo =
          dias <= 0
            ? '#fee2e2'
            : dias <= 30
              ? '#ffedd5'
              : '#fef9c3';

        const textoDias = dias <= 0 ? 'Vencido' : `${dias} día(s)`;

        return `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:left;">
              <strong style="color:#0f172a;">${item.producto}</strong>
              <br />
              <span style="font-size:12px;color:#64748b;">
                Lote: ${item.lote || 'Sin lote'}
              </span>
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#334155;font-weight:700;">
              ${formatoNumero(item.stock_actual)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#334155;">
              ${formatoFechaSimple(item.fecha_caducidad)}
            </td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
              <span style="display:inline-block;padding:5px 10px;border-radius:999px;background:${fondo};color:${color};font-weight:700;font-size:12px;">
                ${textoDias}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    Swal.fire({
      title: 'Productos próximos a caducar',
      width: '95%',
      html: `
        <div style="text-align:left;margin-bottom:14px;color:#475569;font-size:14px;">
          Productos con existencia y fecha de caducidad dentro de los próximos 90 días.
        </div>

        <div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:16px;">
          <table style="width:100%;min-width:760px;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#475569;">Producto</th>
                <th style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#475569;">Stock</th>
                <th style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#475569;">Caducidad</th>
                <th style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#475569;">Restante</th>
              </tr>
            </thead>
            <tbody>
              ${filas}
            </tbody>
          </table>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#B85F7D',
    });
  };

  const abrirModalGastosOperativos = () => {
    setBusquedaGastos('');
    setPaginaGastos(1);
    setModalGastosAbierto(true);
  };

  const abrirModalGanancias = () => {
    setBusquedaGanancias('');
    setPaginaGanancias(1);
    setModalGananciasAbierto(true);
  };

  const exportarGastosExcel = () => {
    if (gastosFiltrados.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay gastos operativos para exportar.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    const datosExcel = gastosFiltrados.map((item) => ({
      Fecha: formatoFecha(item.fecha_movimiento),
      Tipo: item.tipo || '',
      Concepto: item.concepto || '',
      Método: item.metodo_pago || '',
      Monto: Number(item.monto || 0),
      Referencia: item.referencia || '',
      Observaciones: item.observaciones || '',
      Usuario: item.usuario || '',
    }));

    datosExcel.push({
      Fecha: '',
      Tipo: '',
      Concepto: '',
      Método: 'TOTAL',
      Monto: totalGastosFiltrados,
      Referencia: '',
      Observaciones: '',
      Usuario: '',
    });

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, 'Gastos operativos');

    const nombreArchivo = `gastos_operativos_${fechaInicio}_al_${fechaFin}.xlsx`;

    XLSX.writeFile(libro, nombreArchivo);
  };

  const exportarGananciasExcel = () => {
    if (gananciasFiltradas.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay productos para exportar.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    const margenGeneral =
      totalVendidoGananciaFiltrada > 0
        ? (totalGananciaFiltrada / totalVendidoGananciaFiltrada) * 100
        : 0;

    const datosExcel = gananciasFiltradas.map((item) => ({
      Producto: item.producto || '',
      'Cantidad vendida': Number(item.cantidad_vendida || 0),
      'Costo compra unitario': Number(item.costo_compra_unitario || 0),
      'Precio venta promedio': Number(item.precio_venta_promedio || 0),
      'Total costo compra': Number(item.total_costo_compra || 0),
      'Total vendido': Number(item.total_vendido || 0),
      'Ganancia estimada': Number(item.ganancia || 0),
      'Margen %': Number(item.margen_porcentaje || 0),
    }));

    datosExcel.push({
      Producto: 'TOTAL',
      'Cantidad vendida': '',
      'Costo compra unitario': '',
      'Precio venta promedio': '',
      'Total costo compra': totalCostoGananciaFiltrada,
      'Total vendido': totalVendidoGananciaFiltrada,
      'Ganancia estimada': totalGananciaFiltrada,
      'Margen %': margenGeneral,
    });

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, 'Ganancias por producto');

    const nombreArchivo = `ganancias_productos_${fechaInicio}_al_${fechaFin}.xlsx`;

    XLSX.writeFile(libro, nombreArchivo);
  };


  const cards = [
    {
      title: 'Total vendido',
      value: formatoMoneda(resumen.total_vendido),
      icon: ShoppingCart,
      detail: `${resumen.total_ventas || 0} venta(s) en el periodo`,
      accent: '#B85F7D',
      soft: '#FFF0F4',
      span: 'xl:col-span-4',
    },
    {
      title: 'Ganancia estimada',
      value: formatoMoneda(resumen.ganancia_total),
      icon: TrendingUp,
      detail: 'Consulta la utilidad estimada por producto',
      accent: '#8F6678',
      soft: '#F7EFF3',
      span: 'xl:col-span-4',
      onClick: abrirModalGanancias,
      clickable: true,
    },
    {
      title: 'Ticket promedio',
      value: formatoMoneda(resumen.ticket_promedio),
      icon: ReceiptText,
      detail: 'Promedio de ingreso por cada venta',
      accent: '#A76C82',
      soft: '#FBF1F4',
      span: 'xl:col-span-4',
    },
    {
      title: 'Caja actual',
      value: formatoMoneda(resumen.monto_esperado_caja),
      icon: Wallet,
      detail: resumen.caja_abierta
        ? `${resumen.caja_actual?.caja || 'Caja abierta'}`
        : 'Sin caja abierta',
      accent: '#7D6770',
      soft: '#F6F2F4',
      span: 'xl:col-span-3',
    },
    {
      title: 'Gastos operativos',
      value: formatoMoneda(resumen.gastos_operativos),
      icon: CircleDollarSign,
      detail: `${resumen.total_gastos_operativos || 0} movimiento(s)`,
      accent: '#C66D7A',
      soft: '#FFF1F3',
      span: 'xl:col-span-3',
      onClick: abrirModalGastosOperativos,
      clickable: true,
    },
    {
      title: 'Bajo stock',
      value: formatoNumero(resumen.productos_bajo_stock),
      icon: AlertTriangle,
      detail: 'Productos que requieren reposición',
      accent: Number(resumen.productos_bajo_stock || 0) > 0 ? '#B9823E' : '#8D747D',
      soft: Number(resumen.productos_bajo_stock || 0) > 0 ? '#FFF8E9' : '#F8F4F5',
      span: 'xl:col-span-3',
      onClick: abrirModalBajoStock,
      clickable: true,
    },
    {
      title: 'Próxima caducidad',
      value: formatoNumero(resumen.productos_caducidad),
      icon: CalendarDays,
      detail: 'Lotes próximos a vencer en 90 días',
      accent: Number(resumen.productos_caducidad || 0) > 0 ? '#C45F7A' : '#8D747D',
      soft: Number(resumen.productos_caducidad || 0) > 0 ? '#FFF0F4' : '#F8F4F5',
      span: 'xl:col-span-3',
      onClick: abrirModalCaducidad,
      clickable: true,
    },
  ];

  const tooltipContentStyle = {
    borderRadius: '16px',
    border: '1px solid #F0E2E7',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 12px 34px rgba(105, 68, 80, 0.10)',
    color: '#43363B',
    fontSize: '12px',
  };

  return (
    <div className="relative w-full max-w-full overflow-hidden pb-10">
      {/* Fondo editorial suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-[#F8DDE5]/45 blur-3xl" />
        <div className="absolute left-[18%] top-[28rem] h-80 w-80 rounded-full bg-[#FFF0F4]/70 blur-3xl" />
      </div>

      <div className="space-y-5">
        {/* =====================================================
            ENCABEZADO
        ===================================================== */}
        <section className="relative overflow-hidden rounded-[2.2rem] border border-[#F0E2E7] bg-gradient-to-br from-white via-[#FFFBFC] to-[#FCEEF2] shadow-[0_18px_55px_rgba(104,67,79,0.07)]">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border border-[#EFC9D4]/45" />
          <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full border border-[#F3D9E1]/70" />
          <div className="pointer-events-none absolute right-24 top-10 h-3 w-3 rounded-full bg-[#D989A5]/45 shadow-[0_0_24px_rgba(217,137,165,0.55)]" />

          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="grid gap-7 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                

                <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-[#33292D] sm:text-4xl lg:text-[2.65rem]">
                  Hola, {usuario?.nombre || 'Usuario'}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#806B73] sm:text-base">
                  Revisa el comportamiento de tus ventas, inventario, caja y
                  utilidad de cada sucursal desde un solo lugar.
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#EFDFE4] bg-white/75 px-3.5 py-2 text-xs font-bold text-[#6F5D64]">
                    <Store size={14} className="text-[#B85F7D]" />
                    {sucursalActual?.nombre || 'Sucursal por seleccionar'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#EFDFE4] bg-white/75 px-3.5 py-2 text-xs font-bold text-[#6F5D64]">
                    <CalendarRange size={14} className="text-[#B85F7D]" />
                    {fechaInicio} — {fechaFin}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:w-[440px]">
                <div className="rounded-[1.45rem] border border-white bg-white/75 p-4 shadow-[0_10px_30px_rgba(105,68,80,0.06)] backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#A48A94]">
                    Ventas
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-[#342B2F]">
                    {cargando ? '...' : formatoNumero(resumen.total_ventas)}
                  </p>
                </div>

                <div className="rounded-[1.45rem] border border-white bg-[#FFF0F4]/85 p-4 shadow-[0_10px_30px_rgba(184,95,125,0.08)] backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#B85F7D]">
                    Vendido
                  </p>
                  <p className="mt-2 truncate text-lg font-black tracking-tight text-[#9E4F69]">
                    {cargando ? '...' : formatoMoneda(resumen.total_vendido)}
                  </p>
                </div>

                <div className="col-span-2 rounded-[1.45rem] border border-white bg-white/75 p-4 shadow-[0_10px_30px_rgba(105,68,80,0.06)] backdrop-blur sm:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#A48A94]">
                    Ganancia
                  </p>
                  <p className="mt-2 truncate text-lg font-black tracking-tight text-[#6E5360]">
                    {cargando ? '...' : formatoMoneda(resumen.ganancia_total)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FILTROS
        ===================================================== */}
        <section className="rounded-[1.8rem] border border-[#F0E2E7] bg-white/90 p-4 shadow-[0_10px_35px_rgba(105,68,80,0.045)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0 xl:col-span-2">
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-[#765F68]">
                  Sucursal
                </label>

                {puedeCambiarSucursal ? (
                  <select
                    value={idSucursal}
                    onChange={(e) => setIdSucursal(e.target.value)}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-bold text-[#55454B] outline-none transition focus:border-[#D68BA3] focus:bg-white focus:ring-4 focus:ring-[#FCEBF0]"
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
                ) : (
                  <div className="w-full truncate rounded-2xl border border-[#EEDFE4] bg-[#FFF8FA] px-4 py-3 text-sm font-bold text-[#66535B]">
                    {sucursalActual?.nombre ||
                      sucursales[0]?.nombre ||
                      'Sucursal asignada'}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-[#765F68]">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-bold text-[#55454B] outline-none transition focus:border-[#D68BA3] focus:bg-white focus:ring-4 focus:ring-[#FCEBF0]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.1em] text-[#765F68]">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-bold text-[#55454B] outline-none transition focus:border-[#D68BA3] focus:bg-white focus:ring-4 focus:ring-[#FCEBF0]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={cargarDashboard}
              disabled={!idSucursal || cargando}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-6 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.22)] outline-none transition hover:-translate-y-0.5 hover:bg-[#A95370] hover:shadow-[0_16px_32px_rgba(184,95,125,0.28)] focus-visible:ring-4 focus-visible:ring-[#F0CBD6] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <RefreshCw
                size={18}
                className={cargando ? 'animate-spin' : ''}
              />
              Actualizar
            </button>
          </div>
        </section>

        {/* =====================================================
            KPIs
        ===================================================== */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                disabled={!card.clickable}
                className={`group relative min-w-0 overflow-hidden rounded-[1.8rem] border border-[#F0E2E7] bg-white p-5 text-left shadow-[0_10px_34px_rgba(105,68,80,0.045)] transition duration-300 ${card.span} ${
                  card.clickable
                    ? 'cursor-pointer hover:-translate-y-1 hover:border-[#E6C5CF] hover:shadow-[0_18px_42px_rgba(105,68,80,0.085)]'
                    : 'cursor-default'
                }`}
              >
                <div
                  className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full opacity-70 blur-2xl"
                  style={{ backgroundColor: card.soft }}
                />

                <div className="relative flex items-start justify-between gap-4">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]"
                    style={{
                      backgroundColor: card.soft,
                      color: card.accent,
                    }}
                  >
                    <Icon size={20} strokeWidth={1.9} />
                  </span>

                  {card.clickable && (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full opacity-70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                      style={{
                        backgroundColor: card.soft,
                        color: card.accent,
                      }}
                    >
                      <ArrowUpRight size={15} />
                    </span>
                  )}
                </div>

                <div className="relative mt-6">
                  <p className="text-xs font-bold text-[#8E7981]">
                    {card.title}
                  </p>

                  <h3 className="mt-1 break-words text-2xl font-black tracking-[-0.035em] text-[#352B2F] sm:text-3xl">
                    {cargando ? '...' : card.value}
                  </h3>

                  <p className="mt-2 min-h-[38px] text-xs leading-relaxed text-[#A08B93]">
                    {card.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </section>

        {/* =====================================================
            GRÁFICAS: PAGO + PRODUCTOS
        ===================================================== */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="min-w-0 overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_10px_35px_rgba(105,68,80,0.045)] sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#B85F7D]">
                  Ingresos
                </p>
                <h3 className="mt-1 text-lg font-black text-[#3C3035]">
                  Formas de pago
                </h3>
                <p className="mt-1 text-sm text-[#927E86]">
                  Distribución del dinero recibido.
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
                <CreditCard size={20} />
              </div>
            </div>

            <div className="mt-5 h-72">
              {ventasPorMetodoGrafica.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-[#FFFAFB] px-4 text-center text-sm font-bold text-[#9B868E]">
                  No hay pagos registrados para graficar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ventasPorMetodoGrafica}
                      dataKey="total"
                      nameKey="metodo"
                      cx="50%"
                      cy="47%"
                      innerRadius={54}
                      outerRadius={86}
                      paddingAngle={5}
                      stroke="none"
                    >
                      {ventasPorMetodoGrafica.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.metodo}`}
                          fill={coloresGrafica[index % coloresGrafica.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) => formatoMoneda(value)}
                      contentStyle={tooltipContentStyle}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, color: '#806B73' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_10px_35px_rgba(105,68,80,0.045)] sm:p-6 xl:col-span-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#B85F7D]">
                  Ranking
                </p>
                <h3 className="mt-1 text-lg font-black text-[#3C3035]">
                  Productos más vendidos
                </h3>
                <p className="mt-1 text-sm text-[#927E86]">
                  Los productos con mayor movimiento en el periodo.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
                <Package size={20} />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="h-80 min-w-[640px]">
                {productosMasVendidosGrafica.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-[#FFFAFB] px-4 text-center text-sm font-bold text-[#9B868E]">
                    No hay productos vendidos en este periodo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productosMasVendidosGrafica}
                      layout="vertical"
                      margin={{ left: 28, right: 20, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#F0E3E7"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#927E86' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="producto"
                        tick={{ fontSize: 11, fill: '#6F5D64' }}
                        width={150}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (
                            name === 'Total vendido' ||
                            name === 'Ganancia'
                          ) {
                            return formatoMoneda(value);
                          }

                          return formatoNumero(value);
                        }}
                        contentStyle={tooltipContentStyle}
                      />
                      <Bar
                        dataKey="cantidad"
                        name="Cantidad vendida"
                        fill="#B85F7D"
                        radius={[0, 10, 10, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CATEGORÍAS
        ===================================================== */}
        <section className="min-w-0 overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_10px_35px_rgba(105,68,80,0.045)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#B85F7D]">
                Rendimiento
              </p>
              <h3 className="mt-1 text-lg font-black text-[#3C3035]">
                Categorías más vendidas
              </h3>
              <p className="mt-1 text-sm text-[#927E86]">
                Comparativa de ingresos y utilidad por categoría.
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7EFF3] text-[#8F6678]">
              <ChartNoAxesColumnIncreasing size={20} />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="h-80 min-w-[720px] sm:h-96">
              {categoriasMasVendidasGrafica.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-[#FFFAFB] px-4 text-center text-sm font-bold text-[#9B868E]">
                  No hay categorías vendidas en este periodo.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoriasMasVendidasGrafica}
                    margin={{ right: 20, left: 8, top: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F0E3E7"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="categoria"
                      tick={{ fontSize: 11, fill: '#806B73' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#927E86' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) =>
                        `$${Number(value).toLocaleString('es-MX')}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatoMoneda(value)}
                      contentStyle={tooltipContentStyle}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, color: '#806B73' }}
                    />
                    <Bar
                      dataKey="total"
                      name="Total vendido"
                      fill="#B85F7D"
                      radius={[10, 10, 0, 0]}
                      barSize={28}
                    />
                    <Bar
                      dataKey="ganancia"
                      name="Ganancia"
                      fill="#D9A4B5"
                      radius={[10, 10, 0, 0]}
                      barSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            ÚLTIMAS VENTAS + STOCK
        ===================================================== */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="min-w-0 overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_10px_35px_rgba(105,68,80,0.045)] sm:p-6 xl:col-span-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#B85F7D]">
                  Actividad reciente
                </p>
                <h3 className="mt-1 text-lg font-black text-[#3C3035]">
                  Últimas ventas
                </h3>
                <p className="mt-1 text-sm text-[#927E86]">
                  Movimientos recientes del punto de venta.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
                <ReceiptText size={20} />
              </div>
            </div>

            {/* móvil */}
            <div className="mt-5 space-y-3 md:hidden">
              {ultimasVentas.length === 0 ? (
                <div className="rounded-[1.5rem] bg-[#FFFAFB] p-5 text-center text-sm font-bold text-[#9B868E]">
                  No hay ventas recientes.
                </div>
              ) : (
                ultimasVentas.map((venta) => (
                  <div
                    key={venta.id_venta}
                    className="rounded-[1.5rem] border border-[#F0E2E7] bg-[#FFFBFC] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#A08790]">
                          Folio
                        </p>
                        <p className="break-words font-black text-[#43363B]">
                          {venta.folio}
                        </p>
                      </div>

                      <p className="shrink-0 text-right font-black text-[#B85F7D]">
                        {formatoMoneda(venta.total)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs">
                      <div>
                        <span className="text-[#A08790]">Fecha: </span>
                        <span className="font-bold text-[#6C5961]">
                          {formatoFecha(venta.fecha_venta)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A08790]">Método: </span>
                        <span className="font-bold text-[#6C5961]">
                          {venta.metodo_pago}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A08790]">Cajero: </span>
                        <span className="font-bold text-[#6C5961]">
                          {venta.usuario}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* desktop */}
            <div className="mt-5 hidden overflow-x-auto rounded-[1.5rem] border border-[#F0E2E7] md:block">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-[#F0E2E7] bg-[#FFF8FA]">
                  <tr>
                    {['Folio', 'Fecha', 'Método', 'Cajero'].map((titulo) => (
                      <th
                        key={titulo}
                        className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.1em] text-[#9A828B]"
                      >
                        {titulo}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.1em] text-[#9A828B]">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F3E8EB]">
                  {ultimasVentas.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-4 py-10 text-center text-sm text-[#9B868E]"
                      >
                        No hay ventas recientes.
                      </td>
                    </tr>
                  ) : (
                    ultimasVentas.map((venta) => (
                      <tr
                        key={venta.id_venta}
                        className="transition hover:bg-[#FFFAFB]"
                      >
                        <td className="px-4 py-3 font-black text-[#43363B]">
                          {venta.folio}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#76636A]">
                          {formatoFecha(venta.fecha_venta)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#76636A]">
                          {venta.metodo_pago}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#76636A]">
                          {venta.usuario}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#B85F7D]">
                          {formatoMoneda(venta.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_10px_35px_rgba(105,68,80,0.045)] sm:p-6 xl:col-span-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#B9823E]">
                  Atención
                </p>
                <h3 className="mt-1 text-lg font-black text-[#3C3035]">
                  Bajo stock
                </h3>
                <p className="mt-1 text-sm text-[#927E86]">
                  Productos que requieren reposición.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8E9] text-[#B9823E]">
                <PackageCheck size={20} />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {productosBajoStock.length === 0 ? (
                <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-[#FFFAFB] p-5 text-sm font-bold text-[#806B73]">
                  El inventario se encuentra dentro de los mínimos configurados.
                </div>
              ) : (
                productosBajoStock.slice(0, 5).map((item) => (
                  <button
                    key={item.id_inventario}
                    type="button"
                    onClick={abrirModalBajoStock}
                    className="group w-full rounded-[1.4rem] border border-[#F3E3CF] bg-[#FFFBF4] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#ECD1AD] hover:shadow-[0_10px_28px_rgba(155,107,53,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words text-sm font-black text-[#4B3C40]">
                        {item.producto}
                      </p>
                      <ArrowUpRight
                        size={15}
                        className="shrink-0 text-[#B9823E] opacity-60 transition group-hover:opacity-100"
                      />
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-white px-2.5 py-1 font-black text-[#B9823E]">
                        Actual {formatoNumero(item.stock_actual)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 font-bold text-[#8D767E]">
                        Mín. {formatoNumero(item.stock_minimo)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {productosBajoStock.length > 5 && (
              <button
                type="button"
                onClick={abrirModalBajoStock}
                className="mt-4 w-full rounded-2xl bg-[#FFF0F4] px-4 py-3 text-sm font-black text-[#B85F7D] transition hover:bg-[#FBE4EB]"
              >
                Ver todos ({productosBajoStock.length})
              </button>
            )}
          </div>
        </section>

        {/* =====================================================
            MODAL GASTOS OPERATIVOS
        ===================================================== */}
        {modalGastosAbierto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#30272B]/45 p-3 backdrop-blur-sm sm:p-5">
            <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_35px_100px_rgba(50,39,43,0.25)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#F0E2E7] bg-[#FFFBFC] p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF0F3] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#C66D7A]">
                    <CircleDollarSign size={14} />
                    Gastos operativos
                  </div>
                  <h2 className="mt-3 text-xl font-black tracking-tight text-[#392F33] sm:text-2xl">
                    Detalle de gastos
                  </h2>
                  <p className="mt-1 text-sm text-[#8F7A82]">
                    Movimientos registrados del {fechaInicio} al {fechaFin}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalGastosAbierto(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#A85B73] transition hover:bg-[#FBE3EA]"
                  aria-label="Cerrar modal de gastos operativos"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[76vh] overflow-auto p-5 sm:p-6">
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-[#F2DCE2] bg-[#FFF4F6] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#C66D7A]">
                      Total filtrado
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#A9586E] sm:text-3xl">
                      {formatoMoneda(totalGastosFiltrados)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9B858D]">
                      Registros
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#43363B] sm:text-3xl">
                      {gastosFiltrados.length}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-[#F8F2F5] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8C6978]">
                      Sucursal
                    </p>
                    <p className="mt-2 truncate text-base font-black text-[#6F5360]">
                      {sucursalActual?.nombre || 'Sucursal seleccionada'}
                    </p>
                  </div>
                </div>

                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={busquedaGastos}
                      onChange={(e) => {
                        setBusquedaGastos(e.target.value);
                        setPaginaGastos(1);
                      }}
                      placeholder="Buscar por concepto, método, usuario, referencia..."
                      className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#5C4A51] outline-none transition focus:border-[#D68BA3] focus:ring-4 focus:ring-[#FCEBF0] lg:max-w-xl"
                    />

                    <select
                      value={filasPorPaginaGastos}
                      onChange={(e) => {
                        setFilasPorPaginaGastos(Number(e.target.value));
                        setPaginaGastos(1);
                      }}
                      className="rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 text-sm font-bold text-[#66535B] outline-none focus:border-[#D68BA3] focus:ring-4 focus:ring-[#FCEBF0]"
                    >
                      <option value={10}>10 filas</option>
                      <option value={25}>25 filas</option>
                      <option value={50}>50 filas</option>
                      <option value={100}>100 filas</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={exportarGastosExcel}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 text-sm font-black text-white transition hover:bg-[#A95370]"
                  >
                    <Download size={17} />
                    Exportar Excel
                  </button>
                </div>

                <div className="overflow-x-auto rounded-[1.5rem] border border-[#F0E2E7]">
                  <table className="w-full min-w-[1100px]">
                    <thead className="border-b border-[#F0E2E7] bg-[#FFF8FA]">
                      <tr>
                        {[
                          ['Fecha', 'left'],
                          ['Tipo', 'left'],
                          ['Concepto', 'left'],
                          ['Método', 'left'],
                          ['Monto', 'right'],
                          ['Referencia', 'left'],
                          ['Usuario', 'left'],
                          ['Observaciones', 'left'],
                        ].map(([titulo, align]) => (
                          <th
                            key={titulo}
                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.09em] text-[#9A828B] ${align === 'right' ? 'text-right' : 'text-left'}`}
                          >
                            {titulo}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F3E8EB]">
                      {gastosPaginados.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="px-4 py-12 text-center text-sm font-bold text-[#9B868E]"
                          >
                            No hay gastos operativos para mostrar.
                          </td>
                        </tr>
                      ) : (
                        gastosPaginados.map((item, index) => (
                          <tr
                            key={`${item.id_movimiento || item.id || index}`}
                            className="transition hover:bg-[#FFFAFB]"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-[#76636A]">
                              {formatoFecha(item.fecha_movimiento)}
                            </td>
                            <td className="px-4 py-3 text-sm font-bold text-[#66535B]">
                              {item.tipo || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#66535B]">
                              {item.concepto || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#76636A]">
                              {item.metodo_pago || '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-black text-[#C66D7A]">
                              {formatoMoneda(item.monto)}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#76636A]">
                              {item.referencia || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#76636A]">
                              {item.usuario || '—'}
                            </td>
                            <td className="max-w-xs truncate px-4 py-3 text-sm text-[#8F7A82]">
                              {item.observaciones || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[#927E86]">
                    Mostrando {gastosPaginados.length} de{' '}
                    {gastosFiltrados.length} registro(s)
                  </p>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaGastos((pagina) => Math.max(1, pagina - 1))
                      }
                      disabled={paginaGastos <= 1}
                      className="rounded-xl bg-[#FFF0F4] px-4 py-2 text-sm font-black text-[#A95873] transition hover:bg-[#FBE3EA] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>

                    <span className="text-sm font-black text-[#76636A]">
                      Página {paginaGastos} de {totalPaginasGastos}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaGastos((pagina) =>
                          Math.min(totalPaginasGastos, pagina + 1)
                        )
                      }
                      disabled={paginaGastos >= totalPaginasGastos}
                      className="rounded-xl bg-[#FFF0F4] px-4 py-2 text-sm font-black text-[#A95873] transition hover:bg-[#FBE3EA] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            MODAL GANANCIAS
        ===================================================== */}
        {modalGananciasAbierto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#30272B]/45 p-3 backdrop-blur-sm sm:p-5">
            <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_35px_100px_rgba(50,39,43,0.25)]">
              <div className="flex items-start justify-between gap-4 border-b border-[#F0E2E7] bg-[#FFFBFC] p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#F7EFF3] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#8F6678]">
                    <TrendingUp size={14} />
                    Ganancia estimada
                  </div>
                  <h2 className="mt-3 text-xl font-black tracking-tight text-[#392F33] sm:text-2xl">
                    Utilidad por producto
                  </h2>
                  <p className="mt-1 text-sm text-[#8F7A82]">
                    Comparativa de costo, venta, margen y utilidad del{' '}
                    {fechaInicio} al {fechaFin}.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalGananciasAbierto(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#A85B73] transition hover:bg-[#FBE3EA]"
                  aria-label="Cerrar modal de ganancias"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[76vh] overflow-auto p-5 sm:p-6">
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-[#E9DCE2] bg-[#F8F2F5] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#8F6678]">
                      Ganancia filtrada
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#765564] sm:text-3xl">
                      {formatoMoneda(totalGananciaFiltrada)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#F2DCE2] bg-[#FFF4F6] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#B85F7D]">
                      Total vendido
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#A85370] sm:text-3xl">
                      {formatoMoneda(totalVendidoGananciaFiltrada)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#9B858D]">
                      Costo estimado
                    </p>
                    <p className="mt-2 text-2xl font-black text-[#43363B] sm:text-3xl">
                      {formatoMoneda(totalCostoGananciaFiltrada)}
                    </p>
                  </div>
                </div>

                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={busquedaGanancias}
                      onChange={(e) => {
                        setBusquedaGanancias(e.target.value);
                        setPaginaGanancias(1);
                      }}
                      placeholder="Buscar producto..."
                      className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#5C4A51] outline-none transition focus:border-[#D68BA3] focus:ring-4 focus:ring-[#FCEBF0] lg:max-w-xl"
                    />

                    <select
                      value={filasPorPaginaGanancias}
                      onChange={(e) => {
                        setFilasPorPaginaGanancias(Number(e.target.value));
                        setPaginaGanancias(1);
                      }}
                      className="rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 text-sm font-bold text-[#66535B] outline-none focus:border-[#D68BA3] focus:ring-4 focus:ring-[#FCEBF0]"
                    >
                      <option value={10}>10 filas</option>
                      <option value={25}>25 filas</option>
                      <option value={50}>50 filas</option>
                      <option value={100}>100 filas</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={exportarGananciasExcel}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 text-sm font-black text-white transition hover:bg-[#A95370]"
                  >
                    <Download size={17} />
                    Exportar Excel
                  </button>
                </div>

                <div className="overflow-x-auto rounded-[1.5rem] border border-[#F0E2E7]">
                  <table className="w-full min-w-[1200px]">
                    <thead className="border-b border-[#F0E2E7] bg-[#FFF8FA]">
                      <tr>
                        {[
                          ['Producto', 'left'],
                          ['Cantidad', 'right'],
                          ['Costo unitario', 'right'],
                          ['Venta promedio', 'right'],
                          ['Total costo', 'right'],
                          ['Total vendido', 'right'],
                          ['Ganancia', 'right'],
                          ['Margen', 'right'],
                        ].map(([titulo, align]) => (
                          <th
                            key={titulo}
                            className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.09em] text-[#9A828B] ${align === 'right' ? 'text-right' : 'text-left'}`}
                          >
                            {titulo}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F3E8EB]">
                      {gananciasPaginadas.length === 0 ? (
                        <tr>
                          <td
                            colSpan="8"
                            className="px-4 py-12 text-center text-sm font-bold text-[#9B868E]"
                          >
                            No hay productos vendidos para mostrar.
                          </td>
                        </tr>
                      ) : (
                        gananciasPaginadas.map((item, index) => (
                          <tr
                            key={`${item.id_producto || index}`}
                            className="transition hover:bg-[#FFFAFB]"
                          >
                            <td className="min-w-[260px] px-4 py-3 font-bold text-[#514047]">
                              {item.producto || '—'}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[#76636A]">
                              {formatoNumero(item.cantidad_vendida)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[#76636A]">
                              {formatoMoneda(item.costo_compra_unitario)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[#76636A]">
                              {formatoMoneda(item.precio_venta_promedio)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[#76636A]">
                              {formatoMoneda(item.total_costo_compra)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-black text-[#B85F7D]">
                              {formatoMoneda(item.total_vendido)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-black text-[#765564]">
                              {formatoMoneda(item.ganancia)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-black text-[#66535B]">
                              {formatoNumero(item.margen_porcentaje)}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-[#927E86]">
                    Mostrando {gananciasPaginadas.length} de{' '}
                    {gananciasFiltradas.length} producto(s)
                  </p>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaGanancias((pagina) => Math.max(1, pagina - 1))
                      }
                      disabled={paginaGanancias <= 1}
                      className="rounded-xl bg-[#FFF0F4] px-4 py-2 text-sm font-black text-[#A95873] transition hover:bg-[#FBE3EA] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>

                    <span className="text-sm font-black text-[#76636A]">
                      Página {paginaGanancias} de {totalPaginasGanancias}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPaginaGanancias((pagina) =>
                          Math.min(totalPaginasGanancias, pagina + 1)
                        )
                      }
                      disabled={paginaGanancias >= totalPaginasGanancias}
                      className="rounded-xl bg-[#FFF0F4] px-4 py-2 text-sm font-black text-[#A95873] transition hover:bg-[#FBE3EA] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}
      </style>
    </div>
  );
}
