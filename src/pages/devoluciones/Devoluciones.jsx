import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  ImageOff,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

const resolverUrlImagenVariante = (ruta) => {
  const valor = String(ruta || '').trim();
  if (!valor) return '';

  if (
    valor.startsWith('http://') ||
    valor.startsWith('https://') ||
    valor.startsWith('data:') ||
    valor.startsWith('blob:')
  ) {
    return valor;
  }

  const baseApi = String(api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  return `${baseApi}${valor.startsWith('/') ? '' : '/'}${valor}`;
};

const formatoMoneda = (valor) =>
  Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

const formatoNumero = (valor) =>
  Number(valor || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatoFecha = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatoHora = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fechaLocalISO = (fecha = new Date()) => {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const obtenerFechaRelativa = (dias = 0) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocalISO(fecha);
};

const normalizarBusqueda = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizarAtributos = (valor) => {
  if (!valor) return {};
  if (typeof valor === 'object' && !Array.isArray(valor)) return valor;

  try {
    const parsed = JSON.parse(valor);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const obtenerDescripcionVariante = (item = {}) => {
  const nombre = String(item.nombre_variante || item.variante || '').trim();
  if (nombre) return nombre;

  const atributos = normalizarAtributos(
    item.atributos_variante || item.atributos
  );

  const valores = [
    item.talla,
    item.color,
    item.tono,
    item.presentacion_variante || item.presentacion,
    ...Object.values(atributos),
  ]
    .map((valor) => String(valor ?? '').trim())
    .filter(Boolean);

  return [...new Set(valores)].join(' · ') || 'Variante';
};

const esActivo = (valor) =>
  valor === true || valor === 'true' || valor === 1 || valor === '1';

const obtenerPrecioSalida = (producto, variante = null) => {
  const precioBase = Number(
    variante?.precio_venta !== undefined &&
      variante?.precio_venta !== null &&
      variante?.precio_venta !== ''
      ? variante.precio_venta
      : producto?.precio_venta || 0
  );

  const porcentaje = Number(producto?.porcentaje_descuento || 0);
  const tieneOferta = Boolean(producto?.id_oferta) || esActivo(producto?.tiene_oferta);

  const precioFinal = tieneOferta
    ? precioBase - precioBase * (porcentaje / 100)
    : precioBase;

  return {
    precio_base: Number(precioBase.toFixed(2)),
    precio_final: Number(precioFinal.toFixed(2)),
    porcentaje_descuento: tieneOferta ? porcentaje : 0,
  };
};

const obtenerPrecioDesdeProducto = (producto) => {
  const variantes = (producto?.variantes || []).filter(
    (variante) => Number(variante.stock_actual || 0) > 0
  );

  if (esActivo(producto?.usa_variantes) && variantes.length > 0) {
    return Math.min(
      ...variantes.map((variante) =>
        obtenerPrecioSalida(producto, variante).precio_final
      )
    );
  }

  return obtenerPrecioSalida(producto).precio_final;
};

const CLASE_BOTON =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50';

export default function Devoluciones() {
  const { usuario } = useAuth();

  const rolActual = String(usuario?.rol || '').toUpperCase();
  const esAdminGlobal =
    rolActual === 'ROOT' || rolActual === 'SUPER_ADMIN' || esSuperAdmin(usuario);

  const puedeCambiarSucursal = esAdminGlobal;
  const puedeCambiarCaja = esAdminGlobal;

  const [sucursales, setSucursales] = useState([]);
  const [idSucursal, setIdSucursal] = useState('');
  const [cajas, setCajas] = useState([]);
  const [idCaja, setIdCaja] = useState('');
  const [sesionAbierta, setSesionAbierta] = useState(null);

  const [fechaVenta, setFechaVenta] = useState(() => fechaLocalISO());
  const [ventasDia, setVentasDia] = useState([]);
  const [filtroVentas, setFiltroVentas] = useState('');
  const [cargandoVentasDia, setCargandoVentasDia] = useState(false);
  const [ventaSeleccionando, setVentaSeleccionando] = useState(null);

  const [venta, setVenta] = useState(null);
  const [productosVenta, setProductosVenta] = useState([]);
  const [historialVenta, setHistorialVenta] = useState([]);

  const [buscarProducto, setBuscarProducto] = useState('');
  const [buscandoProducto, setBuscandoProducto] = useState(false);
  const [resultadosProductos, setResultadosProductos] = useState([]);
  const [autocompletePrendasAbierto, setAutocompletePrendasAbierto] = useState(false);
  const [salidas, setSalidas] = useState([]);

  const [productoVariantes, setProductoVariantes] = useState(null);
  const [productoLotes, setProductoLotes] = useState(null);
  const [lotesDisponibles, setLotesDisponibles] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);

  const [tipoEfectivo, setTipoEfectivo] = useState('SIN_MOVIMIENTO');
  const [montoEfectivo, setMontoEfectivo] = useState('0');
  const [ajusteManual, setAjusteManual] = useState(false);
  const [motivo, setMotivo] = useState('Cambio de talla / prenda');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [historialGeneral, setHistorialGeneral] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const sucursalSeleccionada = sucursales.find(
    (item) => Number(item.id_sucursal) === Number(idSucursal)
  );

  const cajaSeleccionada = cajas.find(
    (item) => Number(item.id_caja) === Number(idCaja)
  );

  const ventasDiaFiltradas = useMemo(() => {
    const termino = normalizarBusqueda(filtroVentas);

    if (!termino) return ventasDia;

    return ventasDia.filter((item) => {
      const productos = Array.isArray(item.productos) ? item.productos : [];

      const contenido = [
        item.total,
        item.metodo_pago,
        item.usuario_original,
        item.caja_original,
        item.folio,
        ...productos.flatMap((producto) => [
          producto.producto,
          producto.nombre_variante,
          producto.talla,
          producto.color,
          producto.tono,
          producto.codigo_barras,
          producto.codigo_barras_variante,
          producto.cantidad,
          producto.precio_unitario,
        ]),
      ]
        .map((valor) => String(valor ?? ''))
        .join(' ');

      return normalizarBusqueda(contenido).includes(termino);
    });
  }, [ventasDia, filtroVentas]);

  const entradasSeleccionadas = useMemo(
    () =>
      productosVenta.filter(
        (item) => Number(item.cantidad_devolver || 0) > 0
      ),
    [productosVenta]
  );

  const totalDevuelto = useMemo(
    () =>
      entradasSeleccionadas.reduce(
        (acc, item) =>
          acc +
          Number(item.cantidad_devolver || 0) *
            Number(item.precio_reconocido_unitario || 0),
        0
      ),
    [entradasSeleccionadas]
  );

  const totalNuevo = useMemo(
    () =>
      salidas.reduce(
        (acc, item) =>
          acc + Number(item.cantidad || 0) * Number(item.precio_venta || 0),
        0
      ),
    [salidas]
  );

  const diferenciaCalculada = Number((totalNuevo - totalDevuelto).toFixed(2));

  const limpiarOperacion = ({ conservarVentasDia = true } = {}) => {
    setVenta(null);
    setProductosVenta([]);
    setHistorialVenta([]);
    setResultadosProductos([]);
    setBuscarProducto('');
    setAutocompletePrendasAbierto(false);
    setSalidas([]);
    setTipoEfectivo('SIN_MOVIMIENTO');
    setMontoEfectivo('0');
    setAjusteManual(false);
    setMotivo('Cambio de talla / prenda');
    setObservaciones('');
    setProductoVariantes(null);
    setProductoLotes(null);
    setLotesDisponibles([]);
    setVentaSeleccionando(null);

    if (!conservarVentasDia) {
      setVentasDia([]);
      setFiltroVentas('');
    }
  };

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');
      if (!data.ok) return;

      const activas = (data.sucursales || []).filter((s) => s.activo);
      const permitidas = filtrarSucursalesPorRol(usuario, activas);
      setSucursales(permitidas);

      setIdSucursal((anterior) =>
        anterior || obtenerSucursalInicial(usuario, permitidas)
      );
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales.',
      });
    }
  };

  const cargarCajas = async () => {
    if (!idSucursal) return;

    try {
      const { data } = await api.get(`/caja/cajas?sucursal=${idSucursal}`);
      if (!data.ok) return;

      const activas = (data.cajas || []).filter((caja) => caja.activo);
      setCajas(activas);

      if (puedeCambiarCaja) {
        setIdCaja((anterior) => {
          const existe = activas.some(
            (caja) => Number(caja.id_caja) === Number(anterior)
          );
          return existe ? anterior : String(activas[0]?.id_caja || '');
        });
      } else {
        setIdCaja(String(activas[0]?.id_caja || ''));
      }
    } catch (error) {
      console.error(error);
      setCajas([]);
      setIdCaja('');
      Swal.fire({
        icon: 'error',
        title: 'Caja no disponible',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las cajas asignadas.',
      });
    }
  };

  const cargarSesionAbierta = async () => {
    if (!idCaja) {
      setSesionAbierta(null);
      return;
    }

    try {
      const { data } = await api.get(`/caja/sesion-abierta?id_caja=${idCaja}`);
      setSesionAbierta(data.ok ? data.sesion_abierta : null);
    } catch (error) {
      console.error(error);
      setSesionAbierta(null);
    }
  };

  const cargarHistorialGeneral = async () => {
    if (!idSucursal) return;

    try {
      setCargandoHistorial(true);
      const { data } = await api.get(
        `/ventas/cambios/historial?sucursal=${idSucursal}&limit=20`
      );
      if (data.ok) setHistorialGeneral(data.movimientos || []);
    } catch (error) {
      console.error('Error al cargar historial de cambios:', error);
      setHistorialGeneral([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (usuario) cargarSucursales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  useEffect(() => {
    if (!idSucursal) return;
    setIdCaja('');
    setSesionAbierta(null);
    limpiarOperacion({ conservarVentasDia: false });
    cargarCajas();
    cargarHistorialGeneral();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSucursal]);

  useEffect(() => {
    cargarSesionAbierta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCaja]);

  useEffect(() => {
    if (!idSucursal || !fechaVenta) return;
    cargarVentasDelDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSucursal, fechaVenta]);

  useEffect(() => {
    const termino = String(buscarProducto || '').trim();

    if (!venta || !idSucursal || termino.length < 2) {
      setResultadosProductos([]);
      setBuscandoProducto(false);
      setAutocompletePrendasAbierto(false);
      return undefined;
    }

    let cancelado = false;

    const temporizador = window.setTimeout(async () => {
      try {
        setBuscandoProducto(true);

        const params = new URLSearchParams();
        params.append('sucursal', idSucursal);
        params.append('buscar', termino);
        params.append('limit', '10');
        params.append('autocomplete', '1');

        const { data } = await api.get(`/inventario?${params.toString()}`);

        if (cancelado) return;

        const encontrados = data?.ok
          ? (data.inventario || []).filter(
              (item) => Number(item.stock_actual || 0) > 0
            )
          : [];

        setResultadosProductos(encontrados.slice(0, 10));
        setAutocompletePrendasAbierto(true);
      } catch (error) {
        if (!cancelado) {
          console.error('Error en autocompletado de prendas:', error);
          setResultadosProductos([]);
        }
      } finally {
        if (!cancelado) setBuscandoProducto(false);
      }
    }, 280);

    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
    };
  }, [buscarProducto, idSucursal, venta]);

  useEffect(() => {
    if (ajusteManual) return;

    if (diferenciaCalculada > 0) {
      setTipoEfectivo('ENTRADA');
      setMontoEfectivo(String(Math.abs(diferenciaCalculada).toFixed(2)));
    } else if (diferenciaCalculada < 0) {
      setTipoEfectivo('SALIDA');
      setMontoEfectivo(String(Math.abs(diferenciaCalculada).toFixed(2)));
    } else {
      setTipoEfectivo('SIN_MOVIMIENTO');
      setMontoEfectivo('0');
    }
  }, [diferenciaCalculada, ajusteManual]);

  const cargarVentasDelDia = async ({ silencioso = false } = {}) => {
    if (!idSucursal || !fechaVenta) {
      if (!silencioso) {
        Swal.fire({
          icon: 'warning',
          title: 'Selecciona una fecha',
        });
      }
      return;
    }

    try {
      setCargandoVentasDia(true);

      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      params.append('fecha', fechaVenta);

      const { data } = await api.get(
        `/ventas/cambios/ventas-dia?${params.toString()}`
      );

      if (data.ok) {
        setVentasDia(data.ventas || []);
      }
    } catch (error) {
      console.error(error);
      setVentasDia([]);

      if (!silencioso) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudieron cargar las ventas',
          text:
            error.response?.data?.mensaje ||
            'Ocurrió un error al consultar las ventas del día.',
        });
      }
    } finally {
      setCargandoVentasDia(false);
    }
  };

  const seleccionarFechaRapida = (dias) => {
    const nuevaFecha = obtenerFechaRelativa(dias);

    if (nuevaFecha === fechaVenta) {
      cargarVentasDelDia();
      return;
    }

    limpiarOperacion({ conservarVentasDia: false });
    setFechaVenta(nuevaFecha);
  };

  const seleccionarVenta = async (ventaReferencia, { silencioso = false } = {}) => {
    const idVenta = Number(
      typeof ventaReferencia === 'object'
        ? ventaReferencia?.id_venta
        : ventaReferencia
    );

    if (!idVenta || !idSucursal) {
      if (!silencioso) {
        Swal.fire({
          icon: 'warning',
          title: 'Venta no válida',
        });
      }
      return;
    }

    try {
      setVentaSeleccionando(idVenta);

      const params = new URLSearchParams();
      params.append('id_venta', String(idVenta));
      params.append('sucursal', idSucursal);

      const { data } = await api.get(
        `/ventas/cambios/buscar-venta?${params.toString()}`
      );

      if (!data.ok) return;

      limpiarOperacion({ conservarVentasDia: true });

      setVenta(data.venta);
      setHistorialVenta(data.historial || []);
      setProductosVenta(
        (data.productos || []).map((item) => ({
          ...item,
          cantidad_devolver: 0,
          reintegrar_stock: true,
        }))
      );

      if (!silencioso) {
        window.setTimeout(() => {
          document
            .getElementById('detalle-venta-cambio')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo seleccionar la venta',
        text:
          error.response?.data?.mensaje ||
          'No se pudo consultar el detalle de la venta.',
      });
    } finally {
      setVentaSeleccionando(null);
    }
  };

  const elegirOtraVenta = () => {
    limpiarOperacion({ conservarVentasDia: true });

    window.setTimeout(() => {
      document
        .getElementById('seleccion-venta-cambio')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const cambiarCantidadEntrada = (idDetalle, nuevaCantidad) => {
    setProductosVenta((actual) =>
      actual.map((item) => {
        if (Number(item.id_detalle) !== Number(idDetalle)) return item;

        const disponible = Number(item.cantidad_disponible || 0);
        const cantidad = Math.min(
          Math.max(Number(nuevaCantidad || 0), 0),
          disponible
        );

        return {
          ...item,
          cantidad_devolver: cantidad,
        };
      })
    );
  };

  const buscarPrendasNuevas = async () => {
    const termino = String(buscarProducto || '').trim();

    if (!venta) {
      Swal.fire({
        icon: 'info',
        title: 'Primero selecciona la venta',
        text: 'Selecciona la venta original antes de agregar prendas nuevas.',
      });
      return;
    }

    if (termino.length < 2) {
      Swal.fire({
        icon: 'warning',
        title: 'Escribe al menos 2 caracteres',
      });
      return;
    }

    try {
      setBuscandoProducto(true);
      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      params.append('buscar', termino);
      params.append('limit', '20');
      params.append('autocomplete', '1');

      const { data } = await api.get(`/inventario?${params.toString()}`);

      if (data.ok) {
        const encontrados = (data.inventario || []).filter(
          (item) => Number(item.stock_actual || 0) > 0
        );

        setResultadosProductos(encontrados);
        setAutocompletePrendasAbierto(true);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron buscar las prendas.',
      });
    } finally {
      setBuscandoProducto(false);
    }
  };

  const seleccionarProductoDesdeAutocomplete = async (producto) => {
    setAutocompletePrendasAbierto(false);
    setResultadosProductos([]);
    setBuscarProducto('');
    await seleccionarProductoNuevo(producto);
  };


  const construirSalida = (producto, variante = null, lote = null) => {
    const precio = obtenerPrecioSalida(producto, variante);
    const usaVariantes = esActivo(producto.usa_variantes);
    const stock = lote
      ? Number(lote.stock_actual || 0)
      : variante
        ? Number(variante.stock_actual || 0)
        : Number(producto.stock_actual || 0);

    return {
      id_producto: Number(producto.id_producto),
      producto: producto.producto || producto.nombre,
      codigo_barras: producto.codigo_barras || null,
      id_variante: variante?.id_variante ? Number(variante.id_variante) : null,
      nombre_variante: variante ? obtenerDescripcionVariante(variante) : null,
      imagen_referencia: variante?.imagen_referencia || null,
      id_lote: lote?.id_lote ? Number(lote.id_lote) : null,
      lote: lote?.lote || null,
      controla_lotes: esActivo(producto.controla_lotes),
      precio_venta: precio.precio_final,
      precio_base: precio.precio_base,
      porcentaje_descuento: precio.porcentaje_descuento,
      id_oferta: producto.id_oferta || null,
      stock_disponible: stock,
      cantidad: 1,
    };
  };

  const agregarSalidaCarrito = (item) => {
    const clave = `${item.id_producto}-${item.id_variante || 0}-${item.id_lote || 0}`;

    setSalidas((actual) => {
      const existente = actual.find((fila) => fila.clave === clave);

      if (existente) {
        if (Number(existente.cantidad || 0) >= Number(existente.stock_disponible || 0)) {
          Swal.fire({
            icon: 'warning',
            title: 'Stock máximo alcanzado',
            text: 'No puedes agregar más unidades de esta variante/lote.',
          });
          return actual;
        }

        return actual.map((fila) =>
          fila.clave === clave
            ? { ...fila, cantidad: Number(fila.cantidad || 0) + 1 }
            : fila
        );
      }

      return [...actual, { ...item, clave }];
    });

    setProductoVariantes(null);
    setProductoLotes(null);
    setLotesDisponibles([]);
  };

  const cargarLotesParaSalida = async (productoBase, variante = null) => {
    try {
      setCargandoLotes(true);
      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      params.append('producto', productoBase.id_producto);
      if (variante?.id_variante) params.append('variante', variante.id_variante);

      const { data } = await api.get(`/inventario/lotes?${params.toString()}`);

      if (!data.ok) return;

      const lotes = (data.lotes || []).filter(
        (lote) => Number(lote.stock_actual || 0) > 0
      );

      setLotesDisponibles(lotes);
      setProductoLotes({ producto: productoBase, variante });
      setProductoVariantes(null);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.mensaje || 'No se pudieron cargar los lotes.',
      });
    } finally {
      setCargandoLotes(false);
    }
  };

  const seleccionarProductoNuevo = async (producto) => {
    if (esActivo(producto.usa_variantes)) {
      const variantes = (producto.variantes || []).filter(
        (variante) => Number(variante.stock_actual || 0) > 0
      );

      if (variantes.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin variantes disponibles',
          text: 'Este producto no tiene variantes con stock.',
        });
        return;
      }

      setProductoVariantes(producto);
      return;
    }

    if (esActivo(producto.controla_lotes)) {
      await cargarLotesParaSalida(producto, null);
      return;
    }

    agregarSalidaCarrito(construirSalida(producto));
  };

  const seleccionarVarianteNueva = async (producto, variante) => {
    if (esActivo(producto.controla_lotes)) {
      await cargarLotesParaSalida(producto, variante);
      return;
    }

    agregarSalidaCarrito(construirSalida(producto, variante));
  };

  const cambiarCantidadSalida = (clave, delta) => {
    setSalidas((actual) =>
      actual
        .map((item) => {
          if (item.clave !== clave) return item;

          const nueva = Math.min(
            Math.max(Number(item.cantidad || 0) + delta, 0),
            Number(item.stock_disponible || 0)
          );

          return { ...item, cantidad: nueva };
        })
        .filter((item) => Number(item.cantidad || 0) > 0)
    );
  };

  const usarDiferenciaSugerida = () => {
    setAjusteManual(false);

    if (diferenciaCalculada > 0) {
      setTipoEfectivo('ENTRADA');
      setMontoEfectivo(String(Math.abs(diferenciaCalculada).toFixed(2)));
    } else if (diferenciaCalculada < 0) {
      setTipoEfectivo('SALIDA');
      setMontoEfectivo(String(Math.abs(diferenciaCalculada).toFixed(2)));
    } else {
      setTipoEfectivo('SIN_MOVIMIENTO');
      setMontoEfectivo('0');
    }
  };

  const confirmarOperacion = async () => {
    if (!venta) {
      Swal.fire({ icon: 'warning', title: 'Selecciona una venta' });
      return;
    }

    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'Caja cerrada',
        text: 'Debes tener una sesión de caja abierta para realizar el cambio.',
      });
      return;
    }

    if (entradasSeleccionadas.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona lo que regresa',
        text: 'Indica al menos una prenda que devuelve el cliente.',
      });
      return;
    }

    if (!String(motivo || '').trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Motivo requerido',
      });
      return;
    }

    const monto = Number(montoEfectivo || 0);

    if (tipoEfectivo !== 'SIN_MOVIMIENTO' && (!Number.isFinite(monto) || monto <= 0)) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto de efectivo requerido',
      });
      return;
    }

    const textoCaja =
      tipoEfectivo === 'ENTRADA'
        ? `Entrarán ${formatoMoneda(monto)} a caja.`
        : tipoEfectivo === 'SALIDA'
          ? `Saldrán ${formatoMoneda(monto)} de caja.`
          : 'No habrá movimiento de efectivo.';

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: salidas.length > 0 ? '¿Confirmar cambio?' : '¿Confirmar devolución?',
      html: `
        <div style="text-align:left;line-height:1.7">
          <p><b>Venta original:</b> ${formatoFecha(venta.fecha_venta)}</p>
          <p><b>Valor que regresa:</b> ${formatoMoneda(totalDevuelto)}</p>
          <p><b>Prendas nuevas:</b> ${formatoMoneda(totalNuevo)}</p>
          <p><b>Diferencia calculada:</b> ${formatoMoneda(diferenciaCalculada)}</p>
          <hr style="margin:10px 0" />
          <p><b>Movimiento real:</b> ${textoCaja}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B85F7D',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setGuardando(true);

      const payload = {
        id_sucursal: Number(idSucursal),
        id_caja: Number(idCaja),
        id_sesion: Number(sesionAbierta.id_sesion),
        id_venta_original: Number(venta.id_venta),
        entradas: entradasSeleccionadas.map((item) => ({
          id_detalle: Number(item.id_detalle),
          cantidad: Number(item.cantidad_devolver),
          reintegrar_stock: item.reintegrar_stock !== false,
        })),
        salidas: salidas.map((item) => ({
          id_producto: Number(item.id_producto),
          id_variante: item.id_variante ? Number(item.id_variante) : null,
          id_lote: item.id_lote ? Number(item.id_lote) : null,
          cantidad: Number(item.cantidad),
        })),
        tipo_movimiento_efectivo: tipoEfectivo,
        monto_efectivo: tipoEfectivo === 'SIN_MOVIMIENTO' ? 0 : monto,
        motivo: String(motivo).trim(),
        observaciones: String(observaciones || '').trim() || null,
      };

      const { data } = await api.post('/ventas/cambios', payload);

      if (!data.ok) return;

      await Swal.fire({
        icon: 'success',
        title: salidas.length > 0 ? 'Cambio aplicado' : 'Devolución aplicada',
        html: `
          <div style="text-align:left;line-height:1.7">
            <p><b>Folio:</b> ${data.movimiento?.folio || '—'}</p>
            <p><b>Valor devuelto:</b> ${formatoMoneda(data.resumen?.valor_devuelto)}</p>
            <p><b>Valor nuevo:</b> ${formatoMoneda(data.resumen?.valor_nuevo)}</p>
            <p><b>Diferencia:</b> ${formatoMoneda(data.resumen?.diferencia_calculada)}</p>
            <p><b>Efectivo:</b> ${data.resumen?.tipo_movimiento_efectivo} ${formatoMoneda(data.resumen?.monto_efectivo)}</p>
          </div>
        `,
        confirmButtonColor: '#B85F7D',
      });

      await seleccionarVenta(venta.id_venta, { silencioso: true });
      await cargarVentasDelDia({ silencioso: true });
      await cargarHistorialGeneral();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'No se pudo aplicar',
        text:
          error.response?.data?.mensaje ||
          'Ocurrió un error al realizar el cambio/devolución.',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FFF9FA] p-3 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_18px_50px_rgba(95,54,68,0.06)]">
          <div className="bg-gradient-to-br from-[#B85F7D] to-[#8E596B] px-5 py-5 text-white sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                  <ArrowRightLeft size={25} />
                </div>
                <div>
                
                  <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                    Cambios / Devoluciones
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm font-semibold text-white/80">
                    Busca una venta histórica, recibe prendas y entrega otras usando la caja actualmente abierta.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/12 px-4 py-3 text-sm backdrop-blur">
                <p className="font-black">
                  {sucursalSeleccionada?.nombre || 'Sucursal'}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white/75">
                  {cajaSeleccionada?.nombre || 'Sin caja'} ·{' '}
                  {sesionAbierta
                    ? `Sesión #${sesionAbierta.id_sesion} abierta`
                    : 'Sin sesión abierta'}
                </p>
              </div>
            </div>
          </div>

          {(puedeCambiarSucursal || puedeCambiarCaja) && (
            <div className="grid gap-3 border-b border-[#F4EAED] bg-[#FFFCFD] p-4 sm:grid-cols-2 sm:px-6">
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-[#8B7A80]">
                  Sucursal
                </span>
                <select
                  value={idSucursal}
                  onChange={(e) => setIdSucursal(e.target.value)}
                  disabled={!puedeCambiarSucursal}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 font-bold text-[#392F33] outline-none focus:ring-2 focus:ring-[#E5AFC0] disabled:bg-[#F8F4F5]"
                >
                  <option value="">Seleccionar</option>
                  {sucursales.map((item) => (
                    <option key={item.id_sucursal} value={item.id_sucursal}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-[#8B7A80]">
                  Caja actual
                </span>
                <select
                  value={idCaja}
                  onChange={(e) => setIdCaja(e.target.value)}
                  disabled={!puedeCambiarCaja}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 font-bold text-[#392F33] outline-none focus:ring-2 focus:ring-[#E5AFC0] disabled:bg-[#F8F4F5]"
                >
                  <option value="">Seleccionar</option>
                  {cajas.map((item) => (
                    <option key={item.id_caja} value={item.id_caja}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </section>

        {!sesionAbierta && idCaja && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            La caja seleccionada no tiene una sesión abierta. Puedes consultar ventas, pero no podrás confirmar el cambio hasta abrir caja.
          </div>
        )}

        {!venta && (
          <section
            id="seleccion-venta-cambio"
            className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
                <CalendarDays size={21} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">
                  Paso 1
                </p>
                <h2 className="text-lg font-black text-[#392F33]">
                  Seleccionar la venta
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                  Busca por día y reconoce la compra por la hora, las prendas y el total.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[auto_minmax(190px,260px)_1fr]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => seleccionarFechaRapida(0)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    fechaVenta === obtenerFechaRelativa(0)
                      ? 'border-[#B85F7D] bg-[#FFF0F4] text-[#A84E6C]'
                      : 'border-[#E8DCE1] bg-white text-[#6F5D64]'
                  }`}
                >
                  Hoy
                </button>

                <button
                  type="button"
                  onClick={() => seleccionarFechaRapida(-1)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                    fechaVenta === obtenerFechaRelativa(-1)
                      ? 'border-[#B85F7D] bg-[#FFF0F4] text-[#A84E6C]'
                      : 'border-[#E8DCE1] bg-white text-[#6F5D64]'
                  }`}
                >
                  Ayer
                </button>
              </div>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#9A858D]">
                  Elegir fecha
                </span>
                <input
                  type="date"
                  value={fechaVenta}
                  max={fechaLocalISO()}
                  onChange={(e) => {
                    limpiarOperacion({ conservarVentasDia: false });
                    setFechaVenta(e.target.value);
                  }}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] px-4 py-3 font-bold text-[#392F33] outline-none focus:ring-2 focus:ring-[#E5AFC0]"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wide text-[#9A858D]">
                  Filtrar las ventas de ese día
                </span>
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#B8A6AC]"
                  />
                  <input
                    value={filtroVentas}
                    onChange={(e) => setFiltroVentas(e.target.value)}
                    placeholder="Producto, talla, color, monto..."
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] py-3 pl-11 pr-4 font-bold text-[#392F33] outline-none placeholder:text-[#B8A6AC] focus:ring-2 focus:ring-[#E5AFC0]"
                  />
                </div>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F4EAED] pt-4">
              <div>
                <p className="font-black text-[#392F33]">
                  Ventas del{' '}
                  {new Date(`${fechaVenta}T12:00:00`).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                  {ventasDiaFiltradas.length}{' '}
                  {ventasDiaFiltradas.length === 1 ? 'venta encontrada' : 'ventas encontradas'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => cargarVentasDelDia()}
                disabled={cargandoVentasDia}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FFF5F7] px-3 text-xs font-black text-[#B85F7D] disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={cargandoVentasDia ? 'animate-spin' : ''}
                />
                Actualizar
              </button>
            </div>

            {cargandoVentasDia ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm font-black text-[#9A858D]">
                <Loader2 size={20} className="animate-spin text-[#B85F7D]" />
                Cargando ventas...
              </div>
            ) : ventasDiaFiltradas.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-[#E8DCE1] bg-[#FFFCFD] px-5 py-10 text-center">
                <CalendarDays className="mx-auto text-[#C6B3BA]" size={30} />
                <p className="mt-3 font-black text-[#6F5D64]">
                  No encontramos ventas
                </p>
                <p className="mt-1 text-xs font-semibold text-[#A08C93]">
                  Cambia la fecha o limpia el filtro para consultar otras compras.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {ventasDiaFiltradas.map((item) => {
                  const productos = Array.isArray(item.productos)
                    ? item.productos
                    : [];
                  const productosVisibles = productos.slice(0, 4);
                  const restantes = Math.max(productos.length - productosVisibles.length, 0);
                  const seleccionando =
                    Number(ventaSeleccionando) === Number(item.id_venta);

                  return (
                    <article
                      key={item.id_venta}
                      className="overflow-hidden rounded-[1.6rem] border border-[#F0E2E7] bg-[#FFFCFD]"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-[#F4EAED] bg-white px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
                            <Clock size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-lg font-black text-[#392F33]">
                              {formatoHora(item.fecha_venta)}
                            </p>
                            <p className="truncate text-xs font-semibold text-[#9A858D]">
                              {item.usuario_original || 'Cajero'} ·{' '}
                              {item.caja_original || 'Caja'}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-black uppercase tracking-wide text-[#A08C93]">
                            Total
                          </p>
                          <p className="text-xl font-black text-[#B85F7D]">
                            {formatoMoneda(item.total)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase text-[#9A858D]">
                            {item.metodo_pago || 'Sin método'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 p-3">
                        {productosVisibles.map((producto, indice) => {
                          const imagen = resolverUrlImagenVariante(
                            producto.imagen_referencia
                          );

                          return (
                            <div
                              key={`${item.id_venta}-${producto.id_detalle || indice}`}
                              className="flex items-center gap-3 rounded-2xl bg-white p-2.5"
                            >
                              <div className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF5F7]">
                                {imagen ? (
                                  <img
                                    src={imagen}
                                    alt={producto.producto}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <ImageOff
                                    size={18}
                                    className="text-[#C8B7BD]"
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black text-[#392F33]">
                                  {producto.producto}
                                </p>

                                {(producto.nombre_variante ||
                                  producto.talla ||
                                  producto.color ||
                                  producto.tono) && (
                                  <p className="mt-0.5 truncate text-[11px] font-bold text-[#8B7A80]">
                                    {obtenerDescripcionVariante(producto)}
                                  </p>
                                )}

                                <p className="mt-1 text-[11px] font-semibold text-[#A08C93]">
                                  {formatoNumero(producto.cantidad)} ×{' '}
                                  {formatoMoneda(producto.precio_unitario)}
                                </p>
                              </div>

                              <span className="shrink-0 text-xs font-black text-[#745D8A]">
                                {formatoNumero(producto.cantidad)} pza.
                              </span>
                            </div>
                          );
                        })}

                        {restantes > 0 && (
                          <p className="px-2 text-xs font-bold text-[#9A858D]">
                            + {restantes}{' '}
                            {restantes === 1 ? 'prenda adicional' : 'prendas adicionales'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-[#F4EAED] bg-white px-4 py-3">
                        <div>
                          <p className="text-xs font-bold text-[#8B7A80]">
                            {formatoNumero(item.cantidad_prendas || 0)} prendas
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => seleccionarVenta(item)}
                          disabled={Boolean(ventaSeleccionando)}
                          className={`${CLASE_BOTON} bg-[#B85F7D] text-white shadow-lg shadow-[#B85F7D]/15`}
                        >
                          {seleccionando ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <ChevronRight size={17} />
                          )}
                          Seleccionar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}


        {venta && (
          <>
            <section
              id="detalle-venta-cambio"
              className="scroll-mt-4 rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#8E596B]">
                    Venta encontrada
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#392F33]">
                    Venta de las {formatoHora(venta.fecha_venta)}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[#8B7A80]">
                    {formatoFecha(venta.fecha_venta)} · {venta.caja_original || 'Caja'} · {venta.usuario_original || 'Usuario'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="rounded-2xl bg-[#FFF5F7] px-4 py-3 text-left sm:text-right">
                    <p className="text-xs font-bold text-[#9A858D]">Total original</p>
                    <p className="text-xl font-black text-[#B85F7D]">{formatoMoneda(venta.total)}</p>
                    <p className="mt-0.5 text-[10px] font-black uppercase text-[#A08C93]">
                      {venta.metodo_pago || 'Sin método'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={elegirOtraVenta}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8DCE1] bg-white px-3 py-2 text-xs font-black text-[#745D8A]"
                  >
                    <RotateCcw size={15} />
                    Elegir otra venta
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ArrowDownToLine size={21} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Paso 2</p>
                  <h2 className="text-lg font-black text-[#392F33]">Prendas que regresa el cliente</h2>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {productosVenta.map((item) => {
                  const disponible = Number(item.cantidad_disponible || 0);
                  const cantidad = Number(item.cantidad_devolver || 0);
                  const imagen = resolverUrlImagenVariante(item.imagen_referencia);

                  return (
                    <div
                      key={item.id_detalle}
                      className={`rounded-3xl border p-3 sm:p-4 ${
                        cantidad > 0
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-[#F0E2E7] bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF5F7] sm:h-28 sm:w-24">
                          {imagen ? (
                            <img
                              src={imagen}
                              alt={item.producto}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <ImageOff size={22} className="text-[#C8B7BD]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="font-black text-[#392F33]">{item.producto}</p>
                              {item.id_variante && (
                                <p className="mt-0.5 text-xs font-bold text-[#8B7A80]">
                                  {obtenerDescripcionVariante(item)}
                                </p>
                              )}
                              <p className="mt-1 text-xs font-semibold text-[#A08C93]">
                                Compró {formatoNumero(item.cantidad)} · Ya procesado {formatoNumero(item.cantidad_procesada)} · Disponible {formatoNumero(disponible)}
                              </p>
                            </div>

                            <div className="shrink-0 text-left sm:text-right">
                              <p className="text-[10px] font-black uppercase tracking-wide text-[#9A858D]">Valor reconocido</p>
                              <p className="text-lg font-black text-emerald-700">
                                {formatoMoneda(item.precio_reconocido_unitario)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={cantidad <= 0}
                              onClick={() => cambiarCantidadEntrada(item.id_detalle, cantidad - 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DCE1] bg-white text-[#7B6870] disabled:opacity-40"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={disponible}
                              value={cantidad}
                              onChange={(e) => cambiarCantidadEntrada(item.id_detalle, e.target.value)}
                              className="h-9 w-20 rounded-xl border border-[#E8DCE1] bg-white text-center font-black text-[#392F33] outline-none"
                            />
                            <button
                              type="button"
                              disabled={cantidad >= disponible || disponible <= 0}
                              onClick={() => cambiarCantidadEntrada(item.id_detalle, cantidad + 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DCE1] bg-white text-[#7B6870] disabled:opacity-40"
                            >
                              <Plus size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={disponible <= 0}
                              onClick={() => cambiarCantidadEntrada(item.id_detalle, disponible)}
                              className="rounded-xl bg-[#FFF0F4] px-3 py-2 text-xs font-black text-[#A84E6C] disabled:opacity-40"
                            >
                              Todo
                            </button>

                            {cantidad > 0 && (
                              <label className="ml-auto inline-flex items-center gap-2 text-xs font-bold text-[#6F5D64]">
                                <input
                                  type="checkbox"
                                  checked={item.reintegrar_stock !== false}
                                  onChange={(e) =>
                                    setProductosVenta((actual) =>
                                      actual.map((fila) =>
                                        Number(fila.id_detalle) === Number(item.id_detalle)
                                          ? { ...fila, reintegrar_stock: e.target.checked }
                                          : fila
                                      )
                                    )
                                  }
                                  className="h-4 w-4 accent-[#B85F7D]"
                                />
                                Reintegrar a stock
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                <span className="text-sm font-black text-emerald-800">Crédito reconocido</span>
                <span className="text-xl font-black text-emerald-700">{formatoMoneda(totalDevuelto)}</span>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
                  <ArrowUpFromLine size={21} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">Paso 3</p>
                  <h2 className="text-lg font-black text-[#392F33]">Prendas que se lleva</h2>
                  <p className="text-xs font-semibold text-[#9A858D]">Puede llevar una, dos o más prendas.</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#B8A6AC]"
                  />

                  <input
                    value={buscarProducto}
                    onChange={(e) => {
                      setBuscarProducto(e.target.value);
                      if (String(e.target.value || '').trim().length >= 2) {
                        setAutocompletePrendasAbierto(true);
                      }
                    }}
                    onFocus={() => {
                      if (
                        String(buscarProducto || '').trim().length >= 2 &&
                        resultadosProductos.length > 0
                      ) {
                        setAutocompletePrendasAbierto(true);
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setAutocompletePrendasAbierto(false);
                      }, 160);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarPrendasNuevas();
                      }

                      if (e.key === 'Escape') {
                        setAutocompletePrendasAbierto(false);
                      }
                    }}
                    placeholder="Escribe producto, código, talla, color..."
                    autoComplete="off"
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] py-3 pl-11 pr-12 font-bold text-[#392F33] outline-none transition placeholder:text-[#B8A6AC] focus:border-[#DDA9BA] focus:ring-2 focus:ring-[#E5AFC0]"
                  />

                  {buscandoProducto && (
                    <Loader2
                      size={18}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#B85F7D]"
                    />
                  )}

                  {autocompletePrendasAbierto &&
                    String(buscarProducto || '').trim().length >= 2 && (
                      <div
                        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[420px] overflow-y-auto rounded-2xl border border-[#EEDFE4] bg-white p-2 shadow-[0_22px_55px_rgba(91,54,67,0.18)]"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {buscandoProducto && resultadosProductos.length === 0 ? (
                          <div className="flex items-center justify-center gap-2 px-4 py-5 text-sm font-bold text-[#9A858D]">
                            <Loader2 size={18} className="animate-spin text-[#B85F7D]" />
                            Buscando prendas...
                          </div>
                        ) : resultadosProductos.length === 0 ? (
                          <div className="px-4 py-5 text-center">
                            <Package className="mx-auto text-[#C6B3BA]" size={24} />
                            <p className="mt-2 text-sm font-black text-[#6F5D64]">
                              Sin coincidencias
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#A08C93]">
                              Prueba con otro nombre, talla, color o código.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {resultadosProductos.slice(0, 10).map((producto) => {
                              const variantesDisponibles = (producto.variantes || []).filter(
                                (variante) => Number(variante.stock_actual || 0) > 0
                              );

                              const rutaImagen =
                                producto.imagen_referencia ||
                                variantesDisponibles.find((variante) => variante.imagen_referencia)
                                  ?.imagen_referencia ||
                                null;

                              const imagen = resolverUrlImagenVariante(rutaImagen);

                              return (
                                <button
                                  key={producto.id_producto}
                                  type="button"
                                  onClick={() => seleccionarProductoDesdeAutocomplete(producto)}
                                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#FFF4F7] focus:bg-[#FFF4F7] focus:outline-none"
                                >
                                  <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF5F7]">
                                    {imagen ? (
                                      <img
                                        src={imagen}
                                        alt={producto.producto}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <ImageOff size={18} className="text-[#C8B7BD]" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-[#392F33]">
                                      {producto.producto}
                                    </p>

                                    <p className="mt-0.5 truncate text-[11px] font-semibold text-[#9A858D]">
                                      {producto.marca || producto.categoria || 'Producto'}
                                      {variantesDisponibles.length > 0
                                        ? ` · ${variantesDisponibles.length} ${
                                            variantesDisponibles.length === 1
                                              ? 'variante'
                                              : 'variantes'
                                          }`
                                        : ''}
                                    </p>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold">
                                      <span className="text-[#B85F7D]">
                                        {formatoMoneda(obtenerPrecioDesdeProducto(producto))}
                                      </span>
                                      <span className="text-[#745D8A]">
                                        {formatoNumero(producto.stock_actual)} disp.
                                      </span>
                                    </div>
                                  </div>

                                  <ChevronRight
                                    size={17}
                                    className="shrink-0 text-[#C4AEB6]"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <button
                  type="button"
                  onClick={buscarPrendasNuevas}
                  disabled={buscandoProducto}
                  className={`${CLASE_BOTON} bg-[#392F33] text-white`}
                >
                  {buscandoProducto ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                  Buscar prendas
                </button>
              </div>

              <p className="mt-2 px-1 text-[11px] font-semibold text-[#A08C93]">
                El autocompletado aparece desde 2 caracteres. Al seleccionar un producto,
                podrás elegir su variante si corresponde.
              </p>

              <div className="mt-5 space-y-3">
                {salidas.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#E8DCE1] bg-[#FFFCFD] px-5 py-8 text-center">
                    <Package className="mx-auto text-[#C6B3BA]" size={28} />
                    <p className="mt-2 font-black text-[#6F5D64]">No hay prendas nuevas agregadas</p>
                    <p className="mt-1 text-xs font-semibold text-[#A08C93]">
                      Si solo devolverás dinero, puedes dejar esta sección vacía.
                    </p>
                  </div>
                ) : (
                  salidas.map((item) => {
                    const imagen = resolverUrlImagenVariante(item.imagen_referencia);
                    return (
                      <div key={item.clave} className="rounded-3xl border border-[#F0E2E7] bg-[#FFFCFD] p-3 sm:p-4">
                        <div className="flex gap-3">
                          <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF5F7]">
                            {imagen ? (
                              <img src={imagen} alt={item.producto} className="h-full w-full object-contain" />
                            ) : (
                              <ImageOff size={20} className="text-[#C8B7BD]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-black text-[#392F33]">{item.producto}</p>
                                {item.nombre_variante && (
                                  <p className="mt-0.5 text-xs font-bold text-[#8B7A80]">{item.nombre_variante}</p>
                                )}
                                {item.lote && (
                                  <p className="mt-0.5 text-[10px] font-semibold text-[#A08C93]">Lote {item.lote}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setSalidas((actual) => actual.filter((fila) => fila.clave !== item.clave))}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => cambiarCantidadSalida(item.clave, -1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DCE1] bg-white"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="min-w-8 text-center font-black text-[#392F33]">{formatoNumero(item.cantidad)}</span>
                                <button
                                  type="button"
                                  disabled={Number(item.cantidad) >= Number(item.stock_disponible)}
                                  onClick={() => cambiarCantidadSalida(item.clave, 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8DCE1] bg-white disabled:opacity-40"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>

                              <div className="text-right">
                                <p className="text-xs font-bold text-[#9A858D]">{formatoMoneda(item.precio_venta)} c/u</p>
                                <p className="text-lg font-black text-[#B85F7D]">
                                  {formatoMoneda(Number(item.precio_venta) * Number(item.cantidad))}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#FFF0F4] px-4 py-3">
                <span className="text-sm font-black text-[#8E596B]">Valor de prendas nuevas</span>
                <span className="text-xl font-black text-[#B85F7D]">{formatoMoneda(totalNuevo)}</span>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Banknote size={21} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-amber-700">Paso 4</p>
                  <h2 className="text-lg font-black text-[#392F33]">Diferencia y efectivo</h2>
                  <p className="text-xs font-semibold text-[#9A858D]">
                    El sistema sugiere la diferencia, pero el cajero puede registrar el acuerdo real.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ResumenCard label="Regresa" valor={totalDevuelto} />
                <ResumenCard label="Se lleva" valor={totalNuevo} />
                <ResumenCard
                  label="Diferencia sugerida"
                  valor={diferenciaCalculada}
                  destacado
                />
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setAjusteManual(true);
                    setTipoEfectivo('SIN_MOVIMIENTO');
                    setMontoEfectivo('0');
                  }}
                  className={`rounded-3xl border p-4 text-left transition ${
                    tipoEfectivo === 'SIN_MOVIMIENTO'
                      ? 'border-[#B85F7D] bg-[#FFF0F4] ring-2 ring-[#F3CAD7]'
                      : 'border-[#F0E2E7] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-[#392F33]">
                    <CheckCircle2 size={18} /> Sin efectivo
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#9A858D]">Intercambio directo.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAjusteManual(true);
                    setTipoEfectivo('ENTRADA');
                    if (Number(montoEfectivo || 0) <= 0) setMontoEfectivo(String(Math.abs(diferenciaCalculada || 0).toFixed(2)));
                  }}
                  className={`rounded-3xl border p-4 text-left transition ${
                    tipoEfectivo === 'ENTRADA'
                      ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100'
                      : 'border-[#F0E2E7] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-emerald-800">
                    <ArrowDownToLine size={18} /> Cliente paga extra
                  </div>
                  <p className="mt-1 text-xs font-semibold text-emerald-700/70">El efectivo entra a la caja actual.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAjusteManual(true);
                    setTipoEfectivo('SALIDA');
                    if (Number(montoEfectivo || 0) <= 0) setMontoEfectivo(String(Math.abs(diferenciaCalculada || 0).toFixed(2)));
                  }}
                  className={`rounded-3xl border p-4 text-left transition ${
                    tipoEfectivo === 'SALIDA'
                      ? 'border-red-300 bg-red-50 ring-2 ring-red-100'
                      : 'border-[#F0E2E7] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-red-700">
                    <ArrowUpFromLine size={18} /> Entregar al cliente
                  </div>
                  <p className="mt-1 text-xs font-semibold text-red-600/70">El efectivo sale de la caja actual.</p>
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-[#8B7A80]">Monto real de efectivo</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={tipoEfectivo === 'SIN_MOVIMIENTO'}
                    value={montoEfectivo}
                    onChange={(e) => {
                      setAjusteManual(true);
                      setMontoEfectivo(e.target.value);
                    }}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] px-4 py-3 font-black text-[#392F33] outline-none disabled:bg-[#F4F1F2]"
                  />
                </label>
                <button
                  type="button"
                  onClick={usarDiferenciaSugerida}
                  className={`${CLASE_BOTON} self-end border border-[#E8DCE1] bg-white text-[#745D8A]`}
                >
                  <RefreshCw size={16} /> Usar sugerencia
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-[#8B7A80]">Motivo</span>
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] px-4 py-3 font-bold text-[#392F33] outline-none"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-[#8B7A80]">Observaciones</span>
                  <input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] px-4 py-3 font-bold text-[#392F33] outline-none"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={confirmarOperacion}
                disabled={guardando || entradasSeleccionadas.length === 0}
                className={`${CLASE_BOTON} mt-5 w-full bg-[#B85F7D] py-4 text-base text-white shadow-xl shadow-[#B85F7D]/20`}
              >
                {guardando ? <Loader2 size={20} className="animate-spin" /> : <ArrowRightLeft size={20} />}
                {salidas.length > 0 ? 'Confirmar cambio' : 'Confirmar devolución'}
              </button>
            </section>

            {historialVenta.length > 0 && (
              <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6">
                <div className="flex items-center gap-3">
                  <History size={20} className="text-[#745D8A]" />
                  <h2 className="font-black text-[#392F33]">Movimientos previos de esta venta</h2>
                </div>
                <div className="mt-3 space-y-2">
                  {historialVenta.map((item) => (
                    <HistorialItem key={item.id_cambio} item={item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0EBF6] text-[#745D8A]">
                <History size={19} />
              </div>
              <div>
                <h2 className="font-black text-[#392F33]">Cambios recientes</h2>
                <p className="text-xs font-semibold text-[#9A858D]">Últimos movimientos de la sucursal.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={cargarHistorialGeneral}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5F7] text-[#B85F7D]"
              title="Actualizar"
            >
              <RefreshCw size={17} className={cargandoHistorial ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {cargandoHistorial ? (
              <div className="py-8 text-center text-sm font-bold text-[#9A858D]">Cargando...</div>
            ) : historialGeneral.length === 0 ? (
              <div className="py-8 text-center text-sm font-bold text-[#9A858D]">Aún no hay movimientos.</div>
            ) : (
              historialGeneral.map((item) => <HistorialItem key={item.id_cambio} item={item} mostrarVenta />)
            )}
          </div>
        </section>
      </div>

      {productoVariantes && (
        <ModalVariantes
          producto={productoVariantes}
          onClose={() => setProductoVariantes(null)}
          onSeleccionar={seleccionarVarianteNueva}
        />
      )}

      {productoLotes && (
        <ModalLotes
          producto={productoLotes.producto}
          variante={productoLotes.variante}
          lotes={lotesDisponibles}
          cargando={cargandoLotes}
          onClose={() => {
            setProductoLotes(null);
            setLotesDisponibles([]);
          }}
          onSeleccionar={(lote) =>
            agregarSalidaCarrito(
              construirSalida(productoLotes.producto, productoLotes.variante, lote)
            )
          }
          onFEFO={() =>
            agregarSalidaCarrito(
              construirSalida(productoLotes.producto, productoLotes.variante, null)
            )
          }
        />
      )}
    </div>
  );
}

function ResumenCard({ label, valor, destacado = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${destacado ? 'border-[#E3BCC9] bg-[#FFF0F4]' : 'border-[#F0E2E7] bg-[#FFFCFD]'}`}>
      <p className="text-xs font-bold text-[#9A858D]">{label}</p>
      <p className={`mt-1 text-xl font-black ${destacado ? 'text-[#B85F7D]' : 'text-[#392F33]'}`}>
        {formatoMoneda(valor)}
      </p>
    </div>
  );
}

function HistorialItem({ item, mostrarVenta = false }) {
  return (
    <div className="rounded-2xl border border-[#F0E2E7] bg-[#FFFCFD] px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-[#392F33]">{item.folio}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
            {mostrarVenta && item.folio_venta ? `Venta ${item.folio_venta} · ` : ''}
            {formatoFecha(item.fecha_movimiento)} · {item.usuario || 'Usuario'}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-bold text-[#8B7A80]">
            {item.tipo_movimiento_efectivo === 'ENTRADA'
              ? 'Entró a caja'
              : item.tipo_movimiento_efectivo === 'SALIDA'
                ? 'Salió de caja'
                : 'Sin efectivo'}
          </p>
          <p className="font-black text-[#B85F7D]">{formatoMoneda(item.monto_efectivo)}</p>
        </div>
      </div>
    </div>
  );
}

function ModalVariantes({ producto, onClose, onSeleccionar }) {
  const variantes = (producto?.variantes || []).filter(
    (variante) => Number(variante.stock_actual || 0) > 0
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#392F33]/55 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[2rem] sm:shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F4EAED] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">Seleccionar variante</p>
            <h3 className="truncate text-xl font-black text-[#392F33]">{producto?.producto}</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#A84E6C]">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {variantes.map((variante) => {
              const imagen = resolverUrlImagenVariante(variante.imagen_referencia);
              const precio = obtenerPrecioSalida(producto, variante);

              return (
                <button
                  key={variante.id_variante}
                  type="button"
                  onClick={() => onSeleccionar(producto, variante)}
                  className="overflow-hidden rounded-3xl border border-[#E8DCE1] bg-white text-left transition hover:border-[#C9B4CC] hover:shadow-md"
                >
                  <div className="flex h-[42vh] max-h-[360px] min-h-[230px] items-center justify-center bg-[#FFF7F9] p-2 sm:h-64">
                    {imagen ? (
                      <img src={imagen} alt={obtenerDescripcionVariante(variante)} className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff size={34} className="text-[#C8B7BD]" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-[#392F33]">{obtenerDescripcionVariante(variante)}</p>
                        <p className="mt-1 text-xs font-semibold text-[#9A858D]">{formatoNumero(variante.stock_actual)} disponibles</p>
                      </div>
                      <p className="shrink-0 text-lg font-black text-[#B85F7D]">{formatoMoneda(precio.precio_final)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalLotes({ producto, variante, lotes, cargando, onClose, onSeleccionar, onFEFO }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#392F33]/55 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F4EAED] px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#745D8A]">Seleccionar lote</p>
            <h3 className="font-black text-[#392F33]">{producto?.producto}</h3>
            {variante && <p className="text-xs font-semibold text-[#9A858D]">{obtenerDescripcionVariante(variante)}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0EBF6] text-[#745D8A]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <button
            type="button"
            onClick={onFEFO}
            className="mb-3 w-full rounded-2xl border border-[#E3BCC9] bg-[#FFF0F4] px-4 py-3 text-left"
          >
            <p className="font-black text-[#A84E6C]">Usar FEFO automático</p>
            <p className="mt-0.5 text-xs font-semibold text-[#9A6678]">El backend descontará primero el lote con caducidad más próxima.</p>
          </button>

          {cargando ? (
            <div className="py-8 text-center"><Loader2 className="mx-auto animate-spin text-[#B85F7D]" /></div>
          ) : lotes.length === 0 ? (
            <div className="py-8 text-center text-sm font-bold text-[#9A858D]">No hay lotes con stock.</div>
          ) : (
            <div className="space-y-2">
              {lotes.map((lote) => (
                <button
                  key={lote.id_lote}
                  type="button"
                  onClick={() => onSeleccionar(lote)}
                  className="w-full rounded-2xl border border-[#F0E2E7] bg-white p-4 text-left transition hover:bg-[#FFF9FA]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-[#392F33]">Lote {lote.lote || lote.id_lote}</p>
                      <p className="mt-1 text-xs font-semibold text-[#9A858D]">Caducidad: {lote.fecha_caducidad || 'Sin fecha'}</p>
                    </div>
                    <span className="rounded-full bg-[#F0EBF6] px-3 py-1 text-xs font-black text-[#745D8A]">{formatoNumero(lote.stock_actual)} disp.</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}