import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ShoppingCart,
  Search,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  ReceiptText,
  Package,
  Wallet,
  X,
  Barcode,
  UserCheck,
  Coins,
  BadgePercent,
  Loader2,
  CheckCircle,
  Mail,
  Layers3,
} from 'lucide-react';

import BarcodeScannerModal from '../../components/BarcodeScannerModal';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

const PAGOS_MIXTOS_INICIALES = {
  EFECTIVO: '',
  TARJETA: '',
  TRANSFERENCIA: '',
  PUNTOS: '',
};

const METODOS_PAGO_POS = [
  { id: 'EFECTIVO', label: 'Efectivo', icono: Banknote },
  { id: 'TARJETA', label: 'Tarjeta', icono: CreditCard },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icono: Wallet },
  { id: 'PUNTOS', label: 'Puntos', icono: Coins },
];

const DIAS_ALERTA_CADUCIDAD_POS = 30;

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

const esCorreoValido = (correo = '') => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim());
};

const escaparHtmlSeguro = (valor = '') => {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const normalizarFechaLocal = (fecha) => {
  if (!fecha) return null;

  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return null;

  valor.setHours(0, 0, 0, 0);
  return valor;
};

const obtenerEstadoCaducidadLote = (fechaCaducidad) => {
  const fecha = normalizarFechaLocal(fechaCaducidad);

  if (!fecha) {
    return {
      estado: 'SIN_CADUCIDAD',
      caducado: false,
      proximoCaducar: false,
      diasRestantes: null,
      label: 'Sin caducidad',
      cardClass: 'border-[#F0E2E7] bg-white',
      badgeClass: 'bg-[#F7EEF1] text-[#806D74]',
    };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffMs = fecha.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return {
      estado: 'CADUCADO',
      caducado: true,
      proximoCaducar: false,
      diasRestantes,
      label: 'Caducado',
      cardClass: 'border-red-200 bg-red-50',
      badgeClass: 'bg-red-100 text-red-700',
    };
  }

  if (diasRestantes <= DIAS_ALERTA_CADUCIDAD_POS) {
    return {
      estado: 'PROXIMO_CADUCAR',
      caducado: false,
      proximoCaducar: true,
      diasRestantes,
      label: `Por caducar en ${diasRestantes} día(s)`,
      cardClass: 'border-amber-200 bg-amber-50',
      badgeClass: 'bg-amber-100 text-amber-800',
    };
  }

  return {
    estado: 'VIGENTE',
    caducado: false,
    proximoCaducar: false,
    diasRestantes,
    label: 'Vigente',
    cardClass: 'border-emerald-200 bg-white',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  };
};


const configuracionVariantesPOSDefault = {
  talla: false,
  color: false,
  tono: false,
  genero: false,
  presentacion: false,
  material: false,
  modelo: false,
  aroma: false,
  capacidad: false,
  personalizados: [],
};

const normalizarConfiguracionVariantesPOS = (valor) => {
  let origen = valor;

  if (typeof origen === 'string') {
    try {
      origen = JSON.parse(origen);
    } catch {
      origen = {};
    }
  }

  if (!origen || typeof origen !== 'object' || Array.isArray(origen)) {
    origen = {};
  }

  return {
    ...configuracionVariantesPOSDefault,
    ...origen,
    personalizados: Array.isArray(origen.personalizados)
      ? origen.personalizados
      : [],
  };
};

const etiquetasAtributosPOS = {
  talla: 'Talla / medida',
  color: 'Color',
  tono: 'Tono',
  genero: 'Género / línea',
  presentacion: 'Presentación',
  material: 'Material',
  modelo: 'Modelo / estilo',
  aroma: 'Aroma',
  capacidad: 'Capacidad / volumen',
};

const obtenerDetalleVariantePOS = (producto, variante) => {
  const configuracion = normalizarConfiguracionVariantesPOS(
    producto?.configuracion_variantes
  );

  const atributos =
    variante?.atributos &&
    typeof variante.atributos === 'object' &&
    !Array.isArray(variante.atributos)
      ? variante.atributos
      : {};

  const clavesBase = [
    'talla',
    'color',
    'tono',
    'genero',
    'presentacion',
    'material',
    'modelo',
    'aroma',
    'capacidad',
  ].filter((clave) => configuracion[clave]);

  const personalizados = (configuracion.personalizados || [])
    .map((item) => ({
      clave: String(item?.clave || '').trim(),
      etiqueta: String(item?.etiqueta || '').trim(),
    }))
    .filter((item) => item.clave && item.etiqueta);

  const detalles = [
    ...clavesBase.map((clave) => ({
      clave,
      etiqueta: etiquetasAtributosPOS[clave] || clave,
      valor: variante?.[clave] ?? atributos?.[clave] ?? '',
    })),
    ...personalizados.map((item) => ({
      clave: item.clave,
      etiqueta: item.etiqueta,
      valor: atributos?.[item.clave] ?? variante?.[item.clave] ?? '',
    })),
  ].filter((item) => String(item.valor || '').trim());

  if (detalles.length > 0) return detalles;

  return [
    { clave: 'talla', etiqueta: 'Talla', valor: variante?.talla },
    { clave: 'color', etiqueta: 'Color', valor: variante?.color },
    { clave: 'tono', etiqueta: 'Tono', valor: variante?.tono },
  ].filter((item) => String(item.valor || '').trim());
};

export default function POS() {
  const { usuario } = useAuth();

  const puedeCambiarSucursal = esSuperAdmin(usuario);
  const puedeCambiarCaja = esSuperAdmin(usuario);

  const [sucursales, setSucursales] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [idSucursal, setIdSucursal] = useState('');
  const [idCaja, setIdCaja] = useState('');
  const [sesionAbierta, setSesionAbierta] = useState(null);

  const [buscar, setBuscar] = useState('');
  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [cargandoSugerenciasProductos, setCargandoSugerenciasProductos] = useState(false);
  const [mostrandoSugerenciasProductos, setMostrandoSugerenciasProductos] = useState(false);

  const [carrito, setCarrito] = useState([]);

  const [scannerAbierto, setScannerAbierto] = useState(false);
  const [scannerTipo, setScannerTipo] = useState(null);

  // En móvil el carrito se abre como una hoja inferior para mantener
  // la pantalla de productos limpia y enfocada en la venta.
  const [carritoMovilAbierto, setCarritoMovilAbierto] = useState(false);

  const [codigoTarjeta, setCodigoTarjeta] = useState('');
  const [tarjetaPuntos, setTarjetaPuntos] = useState(null);
  const [buscandoTarjeta, setBuscandoTarjeta] = useState(false);

  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [pagoMixtoActivo, setPagoMixtoActivo] = useState(false);
  const [pagosMixtos, setPagosMixtos] = useState(PAGOS_MIXTOS_INICIALES);
  const [cobrarImpuesto, setCobrarImpuesto] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const [ventaFinalizada, setVentaFinalizada] = useState(null);
  const [configuracionPuntos, setConfiguracionPuntos] = useState(null);

  const [configuracionCorreoSmtp, setConfiguracionCorreoSmtp] = useState(null);
  const [cargandoConfiguracionCorreo, setCargandoConfiguracionCorreo] = useState(false);
  const [enviarTicketDigital, setEnviarTicketDigital] = useState(false);

  const [modalVariantesProducto, setModalVariantesProducto] = useState(false);
  const [productoSeleccionadoVariantes, setProductoSeleccionadoVariantes] = useState(null);

  const [modalLotesProducto, setModalLotesProducto] = useState(false);
  const [productoSeleccionadoLotes, setProductoSeleccionadoLotes] = useState(null);
  const [lotesProducto, setLotesProducto] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);

  const sucursalActual = useMemo(() => {
    return sucursales.find((s) => Number(s.id_sucursal) === Number(idSucursal));
  }, [sucursales, idSucursal]);

  const cajaActual = useMemo(() => {
    return cajas.find((c) => Number(c.id_caja) === Number(idCaja));
  }, [cajas, idCaja]);

  const correoTicketDigital = String(tarjetaPuntos?.correo || '')
    .trim()
    .toLowerCase();

  const tieneCorreoTicketDigital = esCorreoValido(correoTicketDigital);
  const servicioCorreoActivo = Boolean(configuracionCorreoSmtp?.activo);
  const puedeEnviarTicketDigital = tieneCorreoTicketDigital && servicioCorreoActivo;

  const esValorActivo = (valor) => {
    return valor === true || valor === 'true' || valor === 1 || valor === '1';
  };

  const tieneOfertaActiva = (producto) => {
    return (
      esValorActivo(producto.tiene_oferta) ||
      Number(producto.id_oferta || 0) > 0 ||
      Number(producto.porcentaje_descuento || 0) > 0
    );
  };

  const productoControlaLotes = (producto) => {
    return (
      esValorActivo(producto?.controla_lotes) ||
      esValorActivo(producto?.usa_lotes) ||
      esValorActivo(producto?.maneja_lotes)
    );
  };

  const productoUsaVariantes = (producto) => {
    return esValorActivo(producto?.usa_variantes);
  };

  const construirProductoConVariante = (producto, variante) => {
    const precioVariante =
      variante?.precio_venta !== undefined &&
      variante?.precio_venta !== null &&
      variante?.precio_venta !== ''
        ? Number(variante.precio_venta)
        : Number(producto?.precio_venta || 0);

    const porcentaje = Number(producto?.porcentaje_descuento || 0);
    const tieneOferta = tieneOfertaActiva(producto);

    const descuentoUnitario = tieneOferta
      ? Number((precioVariante * (porcentaje / 100)).toFixed(2))
      : 0;

    const precioConDescuento = tieneOferta
      ? Number((precioVariante - descuentoUnitario).toFixed(2))
      : precioVariante;

    const detalle = obtenerDetalleVariantePOS(producto, variante);

    return {
      ...producto,
      id_variante: Number(variante.id_variante),
      nombre_variante:
        variante.nombre_variante ||
        detalle.map((item) => item.valor).filter(Boolean).join(' · ') ||
        `Variante ${variante.id_variante}`,
      sku: variante.sku || null,
      codigo_barras_variante: variante.codigo_barras || null,
      codigo_barras: variante.codigo_barras || producto.codigo_barras || null,
      talla: variante.talla || variante.atributos?.talla || null,
      color: variante.color || variante.atributos?.color || null,
      tono: variante.tono || variante.atributos?.tono || null,
      presentacion:
        variante.presentacion ||
        variante.atributos?.presentacion ||
        producto.presentacion ||
        null,
      atributos_variante:
        variante.atributos &&
        typeof variante.atributos === 'object' &&
        !Array.isArray(variante.atributos)
          ? variante.atributos
          : {},
      detalle_variante: detalle,
      stock_actual: Number(variante.stock_actual || 0),
      stock_minimo: Number(variante.stock_minimo || 0),
      precio_venta: precioVariante,
      precio_con_descuento: precioConDescuento,
      descuento_unitario: descuentoUnitario,
    };
  };

  const obtenerPrecioFinalProducto = (producto) => {
    if (tieneOfertaActiva(producto)) {
      return Number(producto.precio_con_descuento || producto.precio_venta || 0);
    }
    return Number(producto.precio_venta || 0);
  };

  const obtenerDescuentoUnitarioProducto = (producto) => {
    if (!tieneOfertaActiva(producto)) return 0;
    return Number(producto.descuento_unitario || 0);
  };

  const obtenerPorcentajeDescuentoProducto = (producto) => {
    if (!tieneOfertaActiva(producto)) return 0;
    return Number(producto.porcentaje_descuento || 0);
  };

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

  const formatoFechaCorta = (fecha) => {
    if (!fecha) return 'Sin caducidad';
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return 'Sin caducidad';
    return valor.toLocaleDateString('es-MX');
  };

  const obtenerKeyCarrito = (producto, idLote = null) => {
    const idVariante = Number(producto?.id_variante || 0);
    const idProducto = Number(producto?.id_producto || 0);
    const base = idVariante > 0 ? `V${idVariante}` : `P${idProducto}`;
    return `${base}-${idLote ? Number(idLote) : 'SIN_LOTE'}`;
  };

  const porcentajeClientePuntos = Number(configuracionPuntos?.porcentaje_cliente || 0);
  const puntosClienteActivo =
    configuracionPuntos?.puntos_cliente_activo === true ||
    configuracionPuntos?.puntos_cliente_activo === 'true';

  const resumen = useMemo(() => {
    const subtotalSinDescuento = carrito.reduce((acc, item) => {
      return acc + Number(item.cantidad) * Number(item.precio_original || item.precio_venta || 0);
    }, 0);

    const descuentoOfertas = carrito.reduce((acc, item) => {
      return acc + Number(item.cantidad) * Number(item.descuento_unitario || 0);
    }, 0);

    const subtotal = carrito.reduce((acc, item) => {
      return acc + Number(item.cantidad) * Number(item.precio_venta || 0);
    }, 0);

    const baseGravable = Math.max(subtotal, 0);
    const impuesto = cobrarImpuesto ? baseGravable * 0.16 : 0;
    const total = Math.max(baseGravable + impuesto, 0);

    const esPagoConPuntos = !pagoMixtoActivo && metodoPago === 'PUNTOS';
    const puntosEstimados =
      tarjetaPuntos && puntosClienteActivo && !esPagoConPuntos
        ? Number((total * (porcentajeClientePuntos / 100)).toFixed(2))
        : 0;

    const puntosDisponibles = Number(tarjetaPuntos?.puntos_actuales || 0);
    const puntosNecesarios = Number(total.toFixed(2));
    const puntosFaltantes = Math.max(puntosNecesarios - puntosDisponibles, 0);
    const puedePagarConPuntos =
      esPagoConPuntos && tarjetaPuntos && puntosDisponibles >= puntosNecesarios;

    const recibido = Number(montoRecibido || 0);
    const cambio = metodoPago === 'EFECTIVO' ? recibido - total : 0;

    return {
      subtotal,
      subtotalSinDescuento,
      descuentoOfertas,
      impuesto,
      total,
      recibido,
      cambio,
      puntosEstimados,
      puntosDisponibles,
      puntosNecesarios,
      puntosFaltantes,
      puedePagarConPuntos,
    };
  }, [
    carrito,
    cobrarImpuesto,
    montoRecibido,
    metodoPago,
    pagoMixtoActivo,
    tarjetaPuntos,
    puntosClienteActivo,
    porcentajeClientePuntos,
  ]);

  const resumenPagosMixtos = useMemo(() => {
    const efectivo = Number(pagosMixtos.EFECTIVO || 0);
    const tarjeta = Number(pagosMixtos.TARJETA || 0);
    const transferencia = Number(pagosMixtos.TRANSFERENCIA || 0);
    const puntos = Number(pagosMixtos.PUNTOS || 0);

    const totalNoEfectivo = tarjeta + transferencia + puntos;
    const totalPagado = efectivo + totalNoEfectivo;
    const pendiente = Math.max(Number((resumen.total - totalPagado).toFixed(2)), 0);
    const excedenteNoEfectivo = Math.max(Number((totalNoEfectivo - resumen.total).toFixed(2)), 0);
    const pendienteAntesDeEfectivo = Math.max(Number((resumen.total - totalNoEfectivo).toFixed(2)), 0);
    const cambio = Math.max(Number((efectivo - pendienteAntesDeEfectivo).toFixed(2)), 0);

    const pagos = [
      { metodo_pago: 'EFECTIVO', monto: efectivo },
      { metodo_pago: 'TARJETA', monto: tarjeta },
      { metodo_pago: 'TRANSFERENCIA', monto: transferencia },
      { metodo_pago: 'PUNTOS', monto: puntos },
    ].filter((pago) => Number(pago.monto || 0) > 0);

    return {
      efectivo,
      tarjeta,
      transferencia,
      puntos,
      totalNoEfectivo,
      totalPagado,
      pendiente,
      excedenteNoEfectivo,
      cambio,
      pagos,
    };
  }, [pagosMixtos, resumen.total]);

  const actualizarPagoMixto = (metodo, valor) => {
    const valorLimpio = Number(valor || 0) < 0 ? '0' : valor;

    if (metodo === 'PUNTOS' && valorLimpio && !tarjetaPuntos) {
      Swal.fire({
        icon: 'warning',
        title: 'Tarjeta requerida',
        text: 'Para usar puntos primero debes vincular una tarjeta de puntos.',
      });
      return;
    }

    setPagosMixtos((prev) => ({ ...prev, [metodo]: valorLimpio }));
  };

  const alternarPagoMixto = () => {
    setPagoMixtoActivo((activo) => {
      const nuevoEstado = !activo;

      if (nuevoEstado) {
        setMetodoPago('EFECTIVO');
        setMontoRecibido('');
        setPagosMixtos({
          ...PAGOS_MIXTOS_INICIALES,
          EFECTIVO: resumen.total > 0 ? String(Number(resumen.total.toFixed(2))) : '',
        });
      } else {
        setPagosMixtos(PAGOS_MIXTOS_INICIALES);
      }

      return nuevoEstado;
    });
  };

  const cargarConfiguracionPuntos = async () => {
    try {
      const { data } = await api.get('/configuracion-puntos');
      if (data.ok) setConfiguracionPuntos(data.configuracion);
    } catch (error) {
      console.error('Error al cargar configuración de puntos:', error);
    }
  };

  const cargarConfiguracionCorreoTicket = async () => {
    const idSucursalNumerico = Number(idSucursal);

    if (!Number.isInteger(idSucursalNumerico) || idSucursalNumerico <= 0) {
      setConfiguracionCorreoSmtp(null);
      setEnviarTicketDigital(false);
      return;
    }

    try {
      setCargandoConfiguracionCorreo(true);

      const { data } = await api.get('/configuracion-correo-smtp', {
        params: { id_sucursal: idSucursalNumerico },
      });

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || 'No se pudo cargar la configuración de correo para la sucursal.'
        );
      }

      setConfiguracionCorreoSmtp(data.configuracion || null);
    } catch (error) {
      console.warn('No se pudo cargar la configuración de correo para ticket digital:', error);
      setConfiguracionCorreoSmtp(null);
      setEnviarTicketDigital(false);
    } finally {
      setCargandoConfiguracionCorreo(false);
    }
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
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las sucursales.' });
    }
  };

  const cargarCajas = async () => {
    if (!idSucursal) return;

    try {
      const { data } = await api.get(`/caja/cajas?sucursal=${idSucursal}`);

      if (data.ok) {
        const cajasActivas = (data.cajas || []).filter((caja) => caja.activo);
        setCajas(cajasActivas);

        if (puedeCambiarCaja) {
          setIdCaja((cajaAnterior) => {
            const sigueDisponible = cajasActivas.some(
              (caja) => Number(caja.id_caja) === Number(cajaAnterior)
            );
            return sigueDisponible ? cajaAnterior : String(cajasActivas[0]?.id_caja || '');
          });
          return;
        }

        setIdCaja(String(cajasActivas[0]?.id_caja || ''));
      }
    } catch (error) {
      console.error(error);
      setCajas([]);
      setIdCaja('');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.mensaje || 'No se pudieron cargar las cajas.',
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
      if (data.ok) setSesionAbierta(data.sesion_abierta);
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo consultar la sesión de caja.' });
    }
  };

  const cargarInventario = async (busquedaManual = null) => {
    if (!idSucursal) return;

    try {
      setCargando(true);
      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      const terminoBusqueda = String(busquedaManual ?? buscar ?? '').trim();
      if (terminoBusqueda) params.append('buscar', terminoBusqueda);

      const { data } = await api.get(`/inventario?${params.toString()}`);
      if (data.ok) {
        const productosConStock = (data.inventario || []).filter(
          (item) => Number(item.stock_actual) > 0
        );
        setInventario(productosConStock);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el inventario.' });
    } finally {
      setCargando(false);
    }
  };

  const buscarSugerenciasProductos = async (termino) => {
    const texto = String(termino || '').trim();

    if (!idSucursal || texto.length < 2) {
      setSugerenciasProductos([]);
      setMostrandoSugerenciasProductos(false);
      return;
    }

    try {
      setCargandoSugerenciasProductos(true);

      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      params.append('buscar', texto);
      params.append('limit', '8');
      params.append('autocomplete', '1');

      const { data } = await api.get(`/inventario?${params.toString()}`);

      if (data.ok) {
        const lista = data.inventario || data.productos || data.resultados || [];
        const productosConStock = lista
          .filter((item) => Number(item.stock_actual || item.stock || 0) > 0)
          .slice(0, 8);

        setSugerenciasProductos(productosConStock);
        setMostrandoSugerenciasProductos(true);
      } else {
        setSugerenciasProductos([]);
      }
    } catch (error) {
      console.error('Error al buscar sugerencias de productos:', error);
      setSugerenciasProductos([]);
    } finally {
      setCargandoSugerenciasProductos(false);
    }
  };

  const cargarLotesProductoPOS = async (producto) => {
    if (!idSucursal || !producto?.id_producto) return [];

    try {
      setCargandoLotes(true);
      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      params.append('producto', producto.id_producto);
      if (producto.id_variante) params.append('variante', producto.id_variante);

      const { data } = await api.get(`/inventario/lotes?${params.toString()}`);

      if (data.ok) {
        return (data.lotes || []).filter((lote) => {
          const tieneStock = Number(lote.stock_actual || 0) > 0;
          if (!tieneStock) return false;

          if (producto.id_variante) {
            return Number(lote.id_variante || 0) === Number(producto.id_variante);
          }

          return !lote.id_variante;
        });
      }

      return [];
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.mensaje || 'No se pudieron cargar los lotes del producto.',
      });
      return [];
    } finally {
      setCargandoLotes(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarSucursales();
      cargarConfiguracionPuntos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  useEffect(() => {
    if (idSucursal) {
      setIdCaja('');
      setSesionAbierta(null);
      setCarrito([]);
      setTarjetaPuntos(null);
      setCodigoTarjeta('');
      setEnviarTicketDigital(false);
      setConfiguracionCorreoSmtp(null);
      setMetodoPago('EFECTIVO');
      setMontoRecibido('');
      setPagoMixtoActivo(false);
      setPagosMixtos(PAGOS_MIXTOS_INICIALES);
      cargarCajas();
      cargarInventario();
      cargarConfiguracionCorreoTicket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSucursal]);

  useEffect(() => {
    if (!tarjetaPuntos || !tieneCorreoTicketDigital || !servicioCorreoActivo) {
      setEnviarTicketDigital(false);
      return;
    }

    if (configuracionCorreoSmtp?.enviar_ticket_automatico) {
      setEnviarTicketDigital(true);
    }
  }, [
    tarjetaPuntos?.id_tarjeta,
    tarjetaPuntos?.correo,
    tieneCorreoTicketDigital,
    servicioCorreoActivo,
    configuracionCorreoSmtp?.enviar_ticket_automatico,
  ]);

  useEffect(() => {
    if (idCaja) cargarSesionAbierta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCaja]);

  useEffect(() => {
    const texto = String(buscar || '').trim();

    if (!texto || texto.length < 2) {
      setSugerenciasProductos([]);
      setMostrandoSugerenciasProductos(false);
      return;
    }

    const temporizador = setTimeout(() => {
      buscarSugerenciasProductos(texto);
    }, 300);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, idSucursal]);

  const refrescarTodo = async () => {
    await cargarConfiguracionPuntos();
    await cargarConfiguracionCorreoTicket();
    await cargarCajas();
    await cargarSesionAbierta();
    await cargarInventario();
  };

  const crearItemCarrito = (producto, { lote = null, cantidad = 1 } = {}) => {
    const precioOriginal = Number(producto.precio_venta || 0);
    const precioFinal = obtenerPrecioFinalProducto(producto);
    const descuentoUnitario = obtenerDescuentoUnitarioProducto(producto);
    const porcentajeDescuento = obtenerPorcentajeDescuentoProducto(producto);
    const tieneOferta = tieneOfertaActiva(producto);
    const idLote = lote?.id_lote ? Number(lote.id_lote) : null;
    const stockDisponible = Number(lote?.stock_actual ?? producto.stock_actual ?? 0);

    return {
      key_carrito: obtenerKeyCarrito(producto, idLote),
      id_producto: Number(producto.id_producto),
      id_variante: producto.id_variante ? Number(producto.id_variante) : null,
      id_lote: idLote,
      lote: lote?.lote || null,
      fecha_caducidad: lote?.fecha_caducidad || null,
      stock_lote: idLote ? stockDisponible : null,
      nombre: producto.producto || producto.nombre,
      nombre_variante: producto.nombre_variante || null,
      sku: producto.sku || null,
      codigo_barras: producto.codigo_barras,
      categoria: producto.categoria,
      marca: producto.marca || null,
      presentacion: producto.presentacion || null,
      talla: producto.talla || null,
      color: producto.color || null,
      tono: producto.tono || null,
      atributos_variante: producto.atributos_variante || {},
      detalle_variante: producto.detalle_variante || [],
      precio_original: precioOriginal,
      precio_venta: precioFinal,
      tiene_oferta: tieneOferta,
      id_oferta: producto.id_oferta || null,
      oferta_nombre: producto.oferta_nombre || producto.nombre_oferta || null,
      porcentaje_descuento: porcentajeDescuento,
      descuento_unitario: descuentoUnitario,
      stock_actual: stockDisponible,
      cantidad: Math.max(Number(cantidad || 1), 1),
      controla_lotes: productoControlaLotes(producto),
    };
  };

  const agregarItemCarrito = (nuevoItem) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.key_carrito === nuevoItem.key_carrito);

      if (existe) {
        const nuevaCantidad = Number(existe.cantidad || 0) + Number(nuevoItem.cantidad || 1);

        if (nuevaCantidad > Number(existe.stock_actual || 0)) {
          Swal.fire({
            icon: 'warning',
            title: 'Stock insuficiente',
            text: `Solo hay ${formatoNumero(existe.stock_actual)} pieza(s) disponibles.`,
          });
          return prev;
        }

        return prev.map((item) =>
          item.key_carrito === nuevoItem.key_carrito
            ? { ...item, cantidad: nuevaCantidad }
            : item
        );
      }

      return [...prev, nuevoItem];
    });
  };

  const agregarProductoSinLote = (producto) => {
    const stockDisponible = Number(producto.stock_actual || 0);

    if (stockDisponible <= 0) {
      Swal.fire({ icon: 'warning', title: 'Sin stock', text: 'Este producto no tiene stock disponible.' });
      return;
    }

    agregarItemCarrito(crearItemCarrito(producto));
    setBuscar('');
    setSugerenciasProductos([]);
    setMostrandoSugerenciasProductos(false);

    Swal.fire({
      icon: 'success',
      title: 'Producto agregado',
      timer: 850,
      showConfirmButton: false,
    });
  };

  const abrirModalLotesParaProducto = async (producto) => {
    if (!sesionAbierta) {
      Swal.fire({ icon: 'warning', title: 'Caja no abierta', text: 'Primero abre una caja para poder vender.' });
      return;
    }

    if (Number(producto.stock_actual || 0) <= 0) {
      Swal.fire({ icon: 'warning', title: 'Sin stock', text: 'Este producto no tiene stock disponible.' });
      return;
    }

    if (!productoControlaLotes(producto)) {
      agregarProductoSinLote(producto);
      return;
    }

    const lotesDisponibles = await cargarLotesProductoPOS(producto);

    if (lotesDisponibles.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin lotes disponibles',
        text: 'El producto controla lotes, pero no tiene lotes activos con existencia.',
      });
      return;
    }

    setProductoSeleccionadoLotes(producto);
    setLotesProducto(lotesDisponibles);
    setModalLotesProducto(true);
  };

  const cerrarModalVariantesProducto = () => {
    setModalVariantesProducto(false);
    setProductoSeleccionadoVariantes(null);
  };

  const seleccionarVariantePOS = async (producto, variante) => {
    if (!producto || !variante) return;

    const productoConVariante = construirProductoConVariante(
      producto,
      variante
    );

    if (Number(productoConVariante.stock_actual || 0) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Variante sin stock',
        text: 'La variante seleccionada ya no tiene existencia disponible.',
      });
      return;
    }

    cerrarModalVariantesProducto();
    await abrirModalLotesParaProducto(productoConVariante);
  };

  const agregarAlCarrito = async (producto) => {
    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'Caja no abierta',
        text: 'Primero abre una caja para poder vender.',
      });
      return;
    }

    if (productoUsaVariantes(producto)) {
      const variantesDisponibles = (producto.variantes || []).filter(
        (variante) => Number(variante.stock_actual || 0) > 0
      );

      if (variantesDisponibles.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin variantes disponibles',
          text: 'Este producto usa variantes, pero ninguna tiene stock disponible en esta sucursal.',
        });
        return;
      }

      setProductoSeleccionadoVariantes({
        ...producto,
        variantes: variantesDisponibles,
      });
      setModalVariantesProducto(true);
      return;
    }

    await abrirModalLotesParaProducto(producto);
  };

  const agregarProductoConLote = (producto, loteItem, cantidadManual = 1) => {
    if (!producto || !loteItem) return;

    const estadoCaducidad = obtenerEstadoCaducidadLote(loteItem.fecha_caducidad);

    if (estadoCaducidad.caducado) {
      Swal.fire({
        icon: 'error',
        title: 'Lote caducado',
        text: `El lote ${loteItem.lote || 'seleccionado'} ya caducó y no puede venderse.`,
      });
      return;
    }

    const stockDisponible = Number(loteItem.stock_actual || 0);
    const cantidadAgregar = Math.max(Number(cantidadManual || 1), 1);

    if (cantidadAgregar > stockDisponible) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock insuficiente',
        text: `Solo hay ${formatoNumero(stockDisponible)} pieza(s) disponibles en este lote.`,
      });
      return;
    }

    agregarItemCarrito(crearItemCarrito(producto, { lote: loteItem, cantidad: cantidadAgregar }));

    setModalLotesProducto(false);
    setProductoSeleccionadoLotes(null);
    setLotesProducto([]);
    setBuscar('');
    setSugerenciasProductos([]);
    setMostrandoSugerenciasProductos(false);

    Swal.fire({
      icon: 'success',
      title: 'Producto agregado',
      text: 'El producto se agregó al carrito con el lote seleccionado.',
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const cerrarModalLotesProducto = () => {
    setModalLotesProducto(false);
    setProductoSeleccionadoLotes(null);
    setLotesProducto([]);
  };

  const aumentarCantidad = (keyCarrito) => {
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.key_carrito !== keyCarrito) return item;

        const stockMaximo = Number(item.stock_actual || 0);
        const actual = Number(item.cantidad || 0);

        if (actual >= stockMaximo) {
          Swal.fire({
            icon: 'warning',
            title: 'Stock insuficiente',
            text: `Solo hay ${formatoNumero(stockMaximo)} pieza(s) disponibles.`,
          });
          return item;
        }

        return { ...item, cantidad: actual + 1 };
      })
    );
  };

  const disminuirCantidad = (keyCarrito) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.key_carrito === keyCarrito
            ? { ...item, cantidad: Number(item.cantidad) - 1 }
            : item
        )
        .filter((item) => Number(item.cantidad) > 0)
    );
  };

  const cambiarCantidadManual = (keyCarrito, valor) => {
    const cantidadNueva = Number(valor);
    if (cantidadNueva < 0) return;

    setCarrito((prev) =>
      prev.map((item) => {
        if (item.key_carrito !== keyCarrito) return item;

        const stockMaximo = Number(item.stock_actual || 0);
        const cantidadFinal = Math.min(cantidadNueva, stockMaximo);

        if (cantidadNueva > stockMaximo) {
          Swal.fire({
            icon: 'warning',
            title: 'Stock insuficiente',
            text: `Solo hay ${formatoNumero(stockMaximo)} pieza(s) disponibles.`,
          });
        }

        return { ...item, cantidad: cantidadFinal };
      })
    );
  };

  const quitarDelCarrito = (keyCarrito) => {
    setCarrito((prev) => prev.filter((item) => item.key_carrito !== keyCarrito));
  };

  const limpiarVenta = () => {
    setCarrito([]);
    setMetodoPago('EFECTIVO');
    setMontoRecibido('');
    setPagoMixtoActivo(false);
    setPagosMixtos(PAGOS_MIXTOS_INICIALES);
    setCobrarImpuesto(false);
    setVentaFinalizada(null);
    setTarjetaPuntos(null);
    setCodigoTarjeta('');
    setEnviarTicketDigital(false);
  };

  const seleccionarMetodoPago = (metodo) => {
    if (pagoMixtoActivo) return;

    if (metodo === 'PUNTOS' && !tarjetaPuntos) {
      Swal.fire({
        icon: 'warning',
        title: 'Tarjeta requerida',
        text: 'Para pagar con puntos primero debes vincular una tarjeta de puntos.',
      });
      return;
    }

    setMetodoPago(metodo);
    if (metodo !== 'EFECTIVO') setMontoRecibido('');
  };

  const buscarTarjetaPuntos = async (codigoManual = null) => {
    const codigo = String(codigoManual || codigoTarjeta || '').trim();

    if (!codigo) {
      Swal.fire({
        icon: 'warning',
        title: 'Código requerido',
        text: 'Escanea la tarjeta o escribe el teléfono del cliente.',
      });
      return;
    }

    try {
      setBuscandoTarjeta(true);
      const { data } = await api.get(`/tarjetas-puntos/codigo/${encodeURIComponent(codigo)}`);

      if (data.ok) {
        if (!data.tarjeta.activo) {
          Swal.fire({
            icon: 'warning',
            title: 'Tarjeta inactiva',
            text: 'Esta tarjeta no puede acumular ni usar puntos.',
          });
          return;
        }

        setTarjetaPuntos(data.tarjeta);
        setCodigoTarjeta(data.tarjeta.codigo_barras);
        setEnviarTicketDigital(false);

        Swal.fire({
          icon: 'success',
          title: 'Tarjeta vinculada',
          text: `${data.tarjeta.nombre_cliente} · ${formatoNumero(data.tarjeta.puntos_actuales)} puntos actuales`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error(error);
      setTarjetaPuntos(null);
      setEnviarTicketDigital(false);
      Swal.fire({
        icon: 'error',
        title: 'Tarjeta no encontrada',
        text: error.response?.data?.mensaje || 'No se encontró una tarjeta con ese código o teléfono.',
      });
    } finally {
      setBuscandoTarjeta(false);
    }
  };

  const quitarTarjetaPuntos = () => {
    setTarjetaPuntos(null);
    setCodigoTarjeta('');
    setEnviarTicketDigital(false);
    setPagosMixtos((prev) => ({ ...prev, PUNTOS: '' }));
    if (metodoPago === 'PUNTOS') setMetodoPago('EFECTIVO');
  };

  const cobrarVenta = async () => {
    if (!sesionAbierta) {
      Swal.fire({ icon: 'warning', title: 'Caja no abierta', text: 'Primero debes abrir una caja.' });
      return;
    }

    if (carrito.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Carrito vacío', text: 'Agrega al menos un producto a la venta.' });
      return;
    }

    if (resumen.total <= 0) {
      Swal.fire({ icon: 'warning', title: 'Total inválido', text: 'El total de la venta debe ser mayor a cero.' });
      return;
    }

    const pagosParaEnviar = pagoMixtoActivo ? resumenPagosMixtos.pagos : [];
    const totalPagadoMixto = Number(resumenPagosMixtos.totalPagado.toFixed(2));
    const cambioMixto = Number(resumenPagosMixtos.cambio.toFixed(2));
    const totalAPagar = Number(resumen.total.toFixed(2));
    const ticketDigitalSolicitado = Boolean(
      enviarTicketDigital && puedeEnviarTicketDigital
    );

    if (pagoMixtoActivo) {
      if (pagosParaEnviar.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Pagos requeridos', text: 'Captura al menos un método de pago.' });
        return;
      }

      if (resumenPagosMixtos.excedenteNoEfectivo > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Monto no válido',
          text: 'Tarjeta, transferencia y puntos no pueden exceder el total.',
        });
        return;
      }

      if (totalPagadoMixto < totalAPagar) {
        Swal.fire({
          icon: 'warning',
          title: 'Pago incompleto',
          text: `Faltan ${formatoMoneda(resumenPagosMixtos.pendiente)} para cubrir el total.`,
        });
        return;
      }

      if (resumenPagosMixtos.puntos > 0 && !tarjetaPuntos) {
        Swal.fire({ icon: 'warning', title: 'Tarjeta requerida', text: 'Vincula una tarjeta para usar puntos.' });
        return;
      }

      if (
        resumenPagosMixtos.puntos > 0 &&
        Number(tarjetaPuntos?.puntos_actuales || 0) < resumenPagosMixtos.puntos
      ) {
        Swal.fire({ icon: 'warning', title: 'Puntos insuficientes', text: 'El cliente no tiene puntos suficientes.' });
        return;
      }
    } else {
      if (metodoPago === 'EFECTIVO' && resumen.recibido < resumen.total) {
        Swal.fire({ icon: 'warning', title: 'Monto insuficiente', text: 'El monto recibido no cubre el total.' });
        return;
      }

      if (metodoPago === 'PUNTOS' && !tarjetaPuntos) {
        Swal.fire({ icon: 'warning', title: 'Tarjeta requerida', text: 'Vincula una tarjeta para pagar con puntos.' });
        return;
      }

      if (
        metodoPago === 'PUNTOS' &&
        Number(tarjetaPuntos?.puntos_actuales || 0) < Number(resumen.total || 0)
      ) {
        Swal.fire({ icon: 'warning', title: 'Puntos insuficientes', text: 'El cliente no tiene puntos suficientes.' });
        return;
      }
    }

    const detallePagosHtml = pagoMixtoActivo
      ? `
        <hr style="margin:10px 0" />
        <p><b>Pago mixto:</b></p>
        ${pagosParaEnviar
          .map((pago) => `<p>${pago.metodo_pago}: <b>${formatoMoneda(pago.monto)}</b></p>`)
          .join('')}
        <p><b>Total pagado:</b> ${formatoMoneda(totalPagadoMixto)}</p>
        <p><b>Cambio:</b> ${formatoMoneda(cambioMixto)}</p>
      `
      : `
        <p><b>Método:</b> ${metodoPago === 'PUNTOS' ? 'Pagar con puntos' : metodoPago}</p>
        ${metodoPago === 'EFECTIVO'
          ? `<p><b>Recibido:</b> ${formatoMoneda(resumen.recibido)}</p><p><b>Cambio:</b> ${formatoMoneda(resumen.cambio)}</p>`
          : ''}
      `;

    const detalleTicketDigitalHtml = ticketDigitalSolicitado
      ? `
        <hr style="margin:10px 0" />
        <p><b>Ticket digital:</b> se enviará a ${escaparHtmlSeguro(correoTicketDigital)}</p>
      `
      : '';

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Cobrar venta?',
      html: `
        <div style="text-align:left">
          <p><b>Productos:</b> ${carrito.length}</p>
          <p><b>Total:</b> ${formatoMoneda(resumen.total)}</p>
          ${resumen.descuentoOfertas > 0
            ? `<p><b>Descuento por ofertas:</b> -${formatoMoneda(resumen.descuentoOfertas)}</p>`
            : ''}
          <p><b>IVA:</b> ${cobrarImpuesto ? `Aplicado (${formatoMoneda(resumen.impuesto)})` : 'No aplicado'}</p>
          ${detallePagosHtml}
          ${detalleTicketDigitalHtml}
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, cobrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B85F7D',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setCobrando(true);

      const metodoPagoFinal = pagoMixtoActivo ? 'MIXTO' : metodoPago;
      const montoRecibidoFinal = pagoMixtoActivo
        ? totalPagadoMixto
        : metodoPago === 'EFECTIVO'
          ? Number(montoRecibido || 0)
          : resumen.total;

      const payload = {
        id_sucursal: Number(idSucursal),
        id_caja: Number(idCaja),
        id_sesion: Number(sesionAbierta.id_sesion),
        id_tarjeta_puntos: tarjetaPuntos ? Number(tarjetaPuntos.id_tarjeta) : null,
        metodo_pago: metodoPagoFinal,
        monto_recibido: montoRecibidoFinal,
        pagos: pagoMixtoActivo ? pagosParaEnviar : undefined,
        enviar_ticket_digital: ticketDigitalSolicitado,
        descuento: 0,
        descuento_ofertas: Number(resumen.descuentoOfertas || 0),
        subtotal_sin_descuento: Number(resumen.subtotalSinDescuento || 0),
        impuesto: Number(resumen.impuesto || 0),
        productos: carrito.map((item) => ({
          id_producto: Number(item.id_producto),
          id_variante: item.id_variante ? Number(item.id_variante) : null,
          id_lote: item.id_lote ? Number(item.id_lote) : null,
          cantidad: Number(item.cantidad),
          precio_unitario: Number(item.precio_venta),
          precio_original: Number(item.precio_original || item.precio_venta || 0),
          porcentaje_descuento: Number(item.porcentaje_descuento || 0),
          descuento_unitario: Number(item.descuento_unitario || 0),
          id_oferta: item.id_oferta ? Number(item.id_oferta) : null,
        })),
      };

      const { data } = await api.post('/ventas', payload);

      if (data.ok) {
        setVentaFinalizada(data);

        const ticketDigitalResultado =
          data?.venta?.ticket_digital || data?.resumen?.ticket_digital || null;

        const detalleTicketDigitalResultadoHtml = ticketDigitalResultado?.solicitado
          ? ticketDigitalResultado.enviado
            ? `
              <hr style="margin:10px 0" />
              <p><b>Ticket digital:</b> enviado correctamente a ${escaparHtmlSeguro(
                ticketDigitalResultado.correo_destino || correoTicketDigital
              )}.</p>
            `
            : `
              <hr style="margin:10px 0" />
              <p><b>Ticket digital:</b> la venta se registró, pero no se pudo enviar.</p>
              <p style="font-size:12px;color:#92400e">${escaparHtmlSeguro(
                ticketDigitalResultado.mensaje || 'Revisa la configuración de correo.'
              )}</p>
            `
          : '';

        const resultadoAlerta = await Swal.fire({
          icon: 'success',
          title: 'Venta registrada',
          html: `
            <div style="text-align:left">
              <p><b>Folio:</b> ${data.venta.folio}</p>
              <p><b>Total:</b> ${formatoMoneda(data.resumen?.total || 0)}</p>
              <p><b>Método:</b> ${pagoMixtoActivo ? 'MIXTO' : metodoPago}</p>
              ${pagoMixtoActivo
                ? `<p><b>Pagado:</b> ${formatoMoneda(totalPagadoMixto)}</p><p><b>Cambio:</b> ${formatoMoneda(cambioMixto)}</p>`
                : metodoPago !== 'PUNTOS'
                  ? `<p><b>Cambio:</b> ${formatoMoneda(data.resumen?.cambio || 0)}</p>`
                  : ''}
              ${detalleTicketDigitalResultadoHtml}
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Imprimir ticket',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#B85F7D',
          cancelButtonColor: '#8B7A80',
        });

        if (resultadoAlerta.isConfirmed) await imprimirTicketPOS(data);

        setCarrito([]);
        setMontoRecibido('');
        setPagoMixtoActivo(false);
        setPagosMixtos(PAGOS_MIXTOS_INICIALES);
        setCobrarImpuesto(false);
        setTarjetaPuntos(null);
        setCodigoTarjeta('');
        setEnviarTicketDigital(false);
        setMetodoPago('EFECTIVO');

        await cargarConfiguracionPuntos();
        await cargarInventario();
        await cargarSesionAbierta();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error al vender',
        text: error.response?.data?.mensaje || 'No se pudo registrar la venta.',
      });
    } finally {
      setCobrando(false);
    }
  };

  const CONFIGURACION_IMPRESION_LOCAL = {
    url: 'http://localhost:3030',
    apiKey: 'shaddai-printer-2026',

    /*
     * true  = solo genera y muestra la vista previa del ticket.
     * false = envía el ticket a la impresora local y abre caja si corresponde.
     */
    modoPrueba: false,
  };

  const API_IMPRESION_LOCAL = CONFIGURACION_IMPRESION_LOCAL.url;
  const PRINTER_KEY = CONFIGURACION_IMPRESION_LOCAL.apiKey;
  const MODO_PRUEBA_TICKET = CONFIGURACION_IMPRESION_LOCAL.modoPrueba;

  /*
   * Evita que los caracteres especiales del ticket se interpreten como HTML
   * al mostrar la vista previa dentro de SweetAlert.
   */
  const escaparHtmlTicket = (texto = '') =>
    String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');


  const obtenerAnchoTicketLocal = (configuracion = {}) => {
    const formato = String(
      configuracion?.formato_ticket || '58mm_30'
    ).toLowerCase();

    return formato.includes('80') || formato.includes('48')
      ? 48
      : 30;
  };

  const longitudTextoTicketLocal = (valor = '') =>
    Array.from(String(valor || '')).length;

  const cortarTextoTicketLocal = (
    valor = '',
    inicio = 0,
    fin = undefined
  ) =>
    Array.from(String(valor || '')).slice(inicio, fin).join('');

  const dividirTokenLargoTicketLocal = (
    token = '',
    ancho = 30
  ) => {
    const texto = String(token || '');

    if (!texto) return [''];

    if (longitudTextoTicketLocal(texto) <= ancho) {
      return [texto];
    }

    /*
     * Los correos se dividen preferentemente después de @ para mantenerlos
     * legibles y conservar todos sus caracteres en tickets de 58 mm.
     */
    const posicionArroba = texto.indexOf('@');

    if (posicionArroba > 0) {
      const usuario = texto.slice(0, posicionArroba + 1);
      const dominio = texto.slice(posicionArroba + 1);

      if (
        longitudTextoTicketLocal(usuario) <= ancho &&
        longitudTextoTicketLocal(dominio) <= ancho
      ) {
        return [usuario, dominio];
      }
    }

    const partes = [];
    let restante = texto;

    while (longitudTextoTicketLocal(restante) > ancho) {
      const ventana = cortarTextoTicketLocal(
        restante,
        0,
        ancho
      );

      let puntoCorte = -1;

      for (
        let indice = ventana.length - 1;
        indice >= 0;
        indice -= 1
      ) {
        if (
          ['/', '.', '-', '_', '@'].includes(ventana[indice])
        ) {
          puntoCorte = indice + 1;
          break;
        }
      }

      if (puntoCorte < Math.floor(ancho * 0.45)) {
        puntoCorte = ancho;
      }

      partes.push(
        cortarTextoTicketLocal(restante, 0, puntoCorte)
      );

      restante = cortarTextoTicketLocal(
        restante,
        puntoCorte
      );
    }

    if (restante) partes.push(restante);

    return partes;
  };

  const envolverLineaTicketLocal = (
    linea = '',
    ancho = 30
  ) => {
    const texto = String(linea ?? '')
      .replace(/\r/g, '')
      .trim();

    if (!texto) return [''];

    /*
     * Los separadores se ajustan a una sola línea del ancho físico.
     */
    if (/^([-=_*])\1{2,}$/.test(texto)) {
      return [texto[0].repeat(ancho)];
    }

    const tokens = texto
      .split(/\s+/)
      .flatMap((token) =>
        dividirTokenLargoTicketLocal(token, ancho)
      );

    const lineas = [];
    let actual = '';

    for (const token of tokens) {
      const candidato = actual
        ? `${actual} ${token}`
        : token;

      if (
        longitudTextoTicketLocal(candidato) <= ancho
      ) {
        actual = candidato;
        continue;
      }

      if (actual) lineas.push(actual);
      actual = token;
    }

    if (actual) lineas.push(actual);

    return lineas.length ? lineas : [''];
  };

  const prepararLineasConfiguracionTicketLocal = (
    valor,
    ancho = 30
  ) => {
    const lineas = Array.isArray(valor)
      ? valor
      : String(valor ?? '')
          .replace(/\r\n/g, '\n')
          .split('\n');

    return lineas.flatMap((linea) =>
      envolverLineaTicketLocal(linea, ancho)
    );
  };


  /*
   * Ajusta únicamente el texto mostrado por el POS en modo prueba.
   * Esto permite reflejar el RFC y su interruptor aunque una versión antigua
   * de la API local no los agregue a /vista-previa-ticket.
   *
   * La impresión física no se modifica: continúa usando la respuesta normal
   * de /imprimir-ticket.
   */
  const ajustarRfcVistaPreviaLocal = ({
    ticket = '',
    rfc = '',
    mostrarRfc = true,
    configuracion = {},
  }) => {
    const contenidoOriginal = String(ticket || '');
    const rfcLimpio = String(rfc || '').trim();

    if (!contenidoOriginal.trim()) return contenidoOriginal;

    const saltoLinea = contenidoOriginal.includes('\r\n') ? '\r\n' : '\n';
    let lineas = contenidoOriginal.replace(/\r\n/g, '\n').split('\n');

    const normalizarComparacion = (valor = '') =>
      String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]/gu, '')
        .toUpperCase();

    const rfcNormalizado = normalizarComparacion(rfcLimpio);

    const esLineaRfc = (linea = '') => {
      const texto = String(linea || '').trim();

      if (/^RFC\s*:/i.test(texto)) return true;

      if (!rfcNormalizado) return false;

      return normalizarComparacion(texto).includes(rfcNormalizado);
    };

    /*
     * Cuando el interruptor está apagado, quitamos cualquier RFC que pudiera
     * haber agregado la API local.
     */
    if (!mostrarRfc || !rfcLimpio) {
      return lineas
        .filter((linea) => !esLineaRfc(linea))
        .join(saltoLinea);
    }

    /*
     * Evita duplicarlo si una versión futura de la API ya empieza a enviarlo.
     */
    if (lineas.some((linea) => esLineaRfc(linea))) {
      return contenidoOriginal;
    }

    const formato = String(
      configuracion?.formato_ticket || '58mm_30'
    ).toLowerCase();

    const ancho = formato.includes('80') || formato.includes('48')
      ? 48
      : 30;

    const centrarLinea = (valor = '') => {
      const texto = String(valor || '').trim().slice(0, ancho);
      const espacios = Math.max(
        Math.floor((ancho - texto.length) / 2),
        0
      );

      return `${' '.repeat(espacios)}${texto}`;
    };

    const direccionConfigurada = String(
      configuracion?.direccion || ''
    ).trim();

    const telefonoConfigurado = String(
      configuracion?.telefono || ''
    ).trim();

    const obtenerPrefijoComparable = (valor = '') => {
      const palabras = String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
        .split(' ')
        .filter(Boolean)
        .slice(0, 3);

      return palabras.join('');
    };

    const prefijoDireccion = obtenerPrefijoComparable(
      direccionConfigurada
    );

    const telefonoNormalizado = normalizarComparacion(
      telefonoConfigurado
    );

    /*
     * Orden esperado:
     * nombre -> encabezado adicional -> RFC -> dirección -> teléfono.
     *
     * Primero intentamos insertar justo antes de la dirección configurada.
     */
    let indiceInsercion = -1;

    if (prefijoDireccion) {
      indiceInsercion = lineas.findIndex((linea) => {
        const normalizada = normalizarComparacion(linea);
        return normalizada.includes(prefijoDireccion);
      });
    }

    /*
     * Si no se localiza la dirección, se coloca antes del teléfono.
     */
    if (indiceInsercion < 0 && telefonoNormalizado) {
      indiceInsercion = lineas.findIndex((linea) => {
        const normalizada = normalizarComparacion(linea);

        return (
          normalizada.includes(telefonoNormalizado) ||
          /^\s*TEL(?:EFONO)?[\s.:]/i.test(String(linea || ''))
        );
      });
    }

    /*
     * Como último respaldo, se inserta antes del primer bloque de fecha.
     */
    if (indiceInsercion < 0) {
      indiceInsercion = lineas.findIndex((linea, indice) => {
        if (indice <= 0) return false;

        return /^\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(
          String(linea || '')
        );
      });
    }

    /*
     * Si tampoco hay fecha, se agrega al final del encabezado, antes del
     * primer renglón vacío disponible.
     */
    if (indiceInsercion < 0) {
      indiceInsercion = lineas.findIndex(
        (linea, indice) => indice > 0 && !String(linea || '').trim()
      );
    }

    if (indiceInsercion < 0) {
      indiceInsercion = lineas.length;
    }

    lineas.splice(
      indiceInsercion,
      0,
      centrarLinea(`RFC: ${rfcLimpio}`)
    );

    return lineas.join(saltoLinea);
  };

  /*
   * Obtiene la configuración activa para la sucursal que realizó la venta.
   * Si la sucursal no tiene configuración propia, el backend devuelve la global.
   * Si ocurre un error, el ticket sigue usando la configuración local de respaldo
   * definida en el driver de impresión.
   */
  /*
   * Convierte las distintas estructuras posibles de /configuracion-ticket
   * en el objeto final utilizado por la API local de impresión.
   */
  const normalizarConfiguracionTicket = (valor) => {
    if (!valor) return null;

    let configuracion = valor;

    if (typeof configuracion === 'string') {
      try {
        configuracion = JSON.parse(configuracion);
      } catch (error) {
        console.warn(
          'La configuración del ticket no contiene un JSON válido:',
          error
        );
        return null;
      }
    }

    if (
      !configuracion ||
      typeof configuracion !== 'object' ||
      Array.isArray(configuracion)
    ) {
      return null;
    }

    /*
     * Algunas respuestas llegan como:
     * { configuracion: { configuracion: {...} } }
     * y otras directamente como:
     * { configuracion: {...} }
     */
    if (
      Object.prototype.hasOwnProperty.call(configuracion, 'configuracion') &&
      configuracion.configuracion !== configuracion
    ) {
      const configuracionInterna = normalizarConfiguracionTicket(
        configuracion.configuracion
      );

      if (configuracionInterna) return configuracionInterna;
    }

    return configuracion;
  };

  /*
   * Obtiene la configuración guardada en la pantalla Configuración del ticket.
   * Esa configuración tiene prioridad sobre los datos generales de sucursales.
   */
  const obtenerConfiguracionTicketParaImpresion = async (datosTicket = {}) => {
    const idSucursalVenta = Number(
      datosTicket?.venta?.id_sucursal ||
      datosTicket?.venta?.idSucursal ||
      idSucursal ||
      0
    );

    const configuracionIncluidaEnVenta = normalizarConfiguracionTicket(
      datosTicket?.configuracion_ticket
    );

    try {
      const { data } = await api.get('/configuracion-ticket', {
        params:
          idSucursalVenta > 0
            ? { id_sucursal: idSucursalVenta }
            : {},
      });

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || 'No se pudo obtener la configuración del ticket.'
        );
      }

      const configuracionConsultada = normalizarConfiguracionTicket(
        data?.configuracion
      );

      return configuracionConsultada || configuracionIncluidaEnVenta || null;
    } catch (error) {
      console.warn(
        'No se pudo consultar /configuracion-ticket. Se usará la configuración incluida en la venta:',
        error
      );

      return configuracionIncluidaEnVenta || null;
    }
  };

  const imprimirTicketPOS = async (ventaData = null) => {
    const datosTicket = ventaData || ventaFinalizada;

    if (!datosTicket?.venta) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin venta',
        text: 'No hay una venta reciente para generar el ticket.',
      });
      return;
    }

    try {
      Swal.fire({
        title: MODO_PRUEBA_TICKET
          ? 'Generando vista previa...'
          : 'Imprimiendo ticket...',
        html: `
        <div style="text-align:center">
          <p>
            ${MODO_PRUEBA_TICKET
            ? 'Generando el ticket sin enviarlo a la impresora.'
            : 'Enviando ticket a la impresora local.'
          }
          </p>

          <p style="font-size:13px;color:#64748b;margin-top:6px">
            ${MODO_PRUEBA_TICKET
            ? 'Podrás revisar cómo quedaría el ticket final.'
            : 'No cierres esta ventana hasta que termine la impresión.'
          }
          </p>
        </div>
      `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const configuracionTicket =
        await obtenerConfiguracionTicketParaImpresion(datosTicket);

      const ventaTicket = datosTicket?.venta || {};

      const idSucursalVenta = Number(
        ventaTicket?.id_sucursal ||
        ventaTicket?.idSucursal ||
        idSucursal ||
        0
      );

      /*
       * El nombre de la sucursal se conserva desde la venta. Si la propia
       * configuración define uno, ese valor tiene prioridad.
       */
      const nombreSucursalTicket = String(
        configuracionTicket?.nombre_sucursal ||
        configuracionTicket?.sucursal ||
        ventaTicket?.nombre_sucursal ||
        ventaTicket?.sucursal ||
        sucursalActual?.nombre ||
        sucursalActual?.nombre_sucursal ||
        sucursalActual?.razon_social ||
        sucursalActual?.sucursal ||
        ''
      ).trim();

      /*
       * La dirección y el teléfono guardados en Configuración del ticket
       * tienen prioridad. Los datos de la tabla sucursales son solo respaldo.
       */
      const direccionTicket = String(
        configuracionTicket?.direccion ||
        configuracionTicket?.direccion_sucursal ||
        ventaTicket?.direccion_sucursal ||
        sucursalActual?.direccion ||
        sucursalActual?.domicilio ||
        ''
      ).trim();

      const telefonoTicket = String(
        configuracionTicket?.telefono ||
        configuracionTicket?.telefono_sucursal ||
        ventaTicket?.telefono_sucursal ||
        sucursalActual?.telefono ||
        sucursalActual?.telefono_contacto ||
        ''
      ).trim();

      /*
       * RFC:
       * La impresión física ya lo lee desde configuracion_ticket, pero algunas
       * versiones de /vista-previa-ticket lo buscan dentro de venta o incluso
       * en la raíz del payload. Se envía en las tres ubicaciones para mantener
       * compatibilidad sin modificar la API local.
       */
      const rfcTicket = String(
        configuracionTicket?.rfc ||
        configuracionTicket?.rfc_sucursal ||
        ventaTicket?.rfc ||
        ventaTicket?.rfc_sucursal ||
        sucursalActual?.rfc ||
        sucursalActual?.rfc_sucursal ||
        ''
      ).trim();

      const mostrarRfcTicket = (() => {
        const valor = configuracionTicket?.mostrar_rfc;

        if (valor === undefined || valor === null) return true;
        if (typeof valor === 'boolean') return valor;

        const texto = String(valor).trim().toLowerCase();

        if (['false', '0', 'no', 'n'].includes(texto)) return false;
        if (['true', '1', 'si', 'sí', 's'].includes(texto)) return true;

        return Boolean(valor);
      })();

      const anchoTicketLocal = obtenerAnchoTicketLocal(
        configuracionTicket || {}
      );

      /*
       * Se preparan las líneas antes de enviarlas. Así una API local antigua
       * que recorta palabras largas recibe el correo ya dividido y no pierde
       * caracteres en la vista previa ni en la impresión física.
       */
      const encabezadoTicketPreparado =
        prepararLineasConfiguracionTicketLocal(
          configuracionTicket?.encabezado || [],
          anchoTicketLocal
        );

      const pieTicketPreparado =
        prepararLineasConfiguracionTicketLocal(
          configuracionTicket?.pie_ticket || [],
          anchoTicketLocal
        );

      /*
       * Conservamos encabezado, pie_ticket, formato_ticket y todos los campos
       * mostrar_*. RFC, dirección y teléfono se normalizan antes de enviarse.
       */
      const configuracionTicketFinal = configuracionTicket
        ? {
          ...configuracionTicket,
          encabezado: encabezadoTicketPreparado,
          pie_ticket: pieTicketPreparado,
          rfc: rfcTicket,
          mostrar_rfc: mostrarRfcTicket,
          direccion: direccionTicket,
          telefono: telefonoTicket,
        }
        : {
          encabezado: encabezadoTicketPreparado,
          pie_ticket: pieTicketPreparado,
          rfc: rfcTicket,
          mostrar_rfc: mostrarRfcTicket,
          direccion: direccionTicket,
          telefono: telefonoTicket,
        };

      const datosParaImprimir = {
        ...datosTicket,

        /*
         * Compatibilidad con versiones de la vista previa local que buscan
         * estos valores directamente en la raíz del JSON.
         */
        rfc: rfcTicket,
        rfc_sucursal: rfcTicket,
        mostrar_rfc: mostrarRfcTicket,

        venta: {
          ...ventaTicket,

          ...(idSucursalVenta > 0
            ? { id_sucursal: idSucursalVenta }
            : {}),

          /*
           * Algunas versiones de la API local leen estos campos desde venta
           * en lugar de configuracion_ticket. Por eso se envían aquí también
           * con los valores provenientes de la configuración del ticket.
           */
          sucursal: nombreSucursalTicket,
          nombre_sucursal: nombreSucursalTicket,
          direccion_sucursal: direccionTicket,
          telefono_sucursal: telefonoTicket,

          rfc: rfcTicket,
          rfc_sucursal: rfcTicket,
          mostrar_rfc: mostrarRfcTicket,
        },

        configuracion_ticket: configuracionTicketFinal,
      };

      const endpoint = MODO_PRUEBA_TICKET
        ? '/vista-previa-ticket'
        : '/imprimir-ticket';

      console.log(
        `Enviando ticket a API local (${MODO_PRUEBA_TICKET ? 'MODO PRUEBA' : 'IMPRESIÓN REAL'}):`,
        datosParaImprimir
      );

      const response = await fetch(
        `${API_IMPRESION_LOCAL}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-printer-key': PRINTER_KEY,
          },
          body: JSON.stringify(datosParaImprimir),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch (_) {
        data = {};
      }

      console.log('Respuesta API local:', data);

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
          data.mensaje ||
          (
            MODO_PRUEBA_TICKET
              ? 'No se pudo generar la vista previa del ticket.'
              : 'No se pudo imprimir el ticket.'
          )
        );
      }

      if (MODO_PRUEBA_TICKET) {
        const ticketGeneradoOriginal = data.ticket || '';

        const ticketGenerado = ajustarRfcVistaPreviaLocal({
          ticket: ticketGeneradoOriginal,
          rfc: rfcTicket,
          mostrarRfc: mostrarRfcTicket,
          configuracion: configuracionTicketFinal,
        });

        if (!ticketGenerado.trim()) {
          throw new Error(
            'La API local no devolvió el contenido de la vista previa.'
          );
        }

        await Swal.fire({
          title: 'Vista previa del ticket',
          width: 560,
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#0369a1',
          html: `
          <div style="
            max-height:540px;
            overflow:auto;
            background:#e2e8f0;
            padding:18px;
            border-radius:12px;
          ">
            <pre style="
              margin:0 auto;
              width:max-content;
              min-width:290px;
              max-width:100%;
              overflow-x:auto;
              padding:18px 14px 28px;
              text-align:left;
              white-space:pre;
              background:#ffffff;
              color:#111827;
              font-family:'Courier New', Courier, monospace;
              font-size:12px;
              line-height:1.4;
              box-shadow:0 8px 20px rgba(15,23,42,.18);
            ">${escaparHtmlTicket(ticketGenerado)}</pre>
          </div>
        `,
        });

        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'Ticket impreso',
        text: 'El ticket se imprimió correctamente.',
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(
        MODO_PRUEBA_TICKET
          ? 'Error al generar vista previa del ticket:'
          : 'Error de impresión local:',
        error
      );

      Swal.fire({
        icon: 'error',
        title: MODO_PRUEBA_TICKET
          ? 'Error en vista previa'
          : 'Error de impresión',
        text:
          error.message ||
          (
            MODO_PRUEBA_TICKET
              ? 'No se pudo generar la vista previa. Verifica que la API local de impresión esté abierta.'
              : 'No se pudo imprimir el ticket. Verifica que la API local de impresión esté abierta.'
          ),
      });
    }
  };

  const abrirCajaPOS = async () => {
    try {
      const confirmacion = await Swal.fire({
        icon: 'question',
        title: '¿Abrir caja?',
        text: 'Se enviará el comando de apertura a la caja registradora.',
        showCancelButton: true,
        confirmButtonText: 'Sí, abrir caja',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#64748b',
      });

      if (!confirmacion.isConfirmed) return;

      Swal.fire({
        title: 'Abriendo caja...',
        html: `
        <div style="text-align:center">
          <p>Enviando comando a la caja registradora.</p>
        </div>
      `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetch(`${API_IMPRESION_LOCAL}/abrir-caja`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-printer-key': PRINTER_KEY,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'No se pudo abrir la caja');
      }

      Swal.fire({
        icon: 'success',
        title: 'Caja abierta',
        text: 'La caja fue abierta correctamente.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error al abrir caja:', error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la caja',
        text:
          error.message ||
          'Verifica que la app local de impresión esté abierta y que la caja esté conectada.',
      });
    }
  };

  const abrirEscanerProducto = () => {
    setScannerTipo('PRODUCTO');
    setScannerAbierto(true);
  };

  const abrirEscanerTarjeta = () => {
    setScannerTipo('TARJETA');
    setScannerAbierto(true);
  };

  const cerrarEscaner = () => {
    setScannerAbierto(false);
    setScannerTipo(null);
  };

  const alDetectarCodigo = (codigoDetectado) => {
    const codigo = String(codigoDetectado || '').trim();
    if (!codigo) {
      cerrarEscaner();
      return;
    }

    if (scannerTipo === 'PRODUCTO') {
      setBuscar(codigo);
      cerrarEscaner();
      setTimeout(() => cargarInventario(codigo), 150);
      return;
    }

    if (scannerTipo === 'TARJETA') {
      setCodigoTarjeta(codigo);
      cerrarEscaner();
      setTimeout(() => buscarTarjetaPuntos(codigo), 150);
      return;
    }

    cerrarEscaner();
  };


  const seleccionarSugerenciaProducto = async (producto) => {
    if (!producto) return;

    const nombreProducto =
      producto.producto ||
      producto.nombre ||
      producto.descripcion_producto ||
      '';

    setBuscar(nombreProducto);
    setMostrandoSugerenciasProductos(false);
    setSugerenciasProductos([]);

    // Esto deja visible solo el producto seleccionado en la lista principal.
    setInventario([producto]);

    // Esto abre el modal de lotes para agregarlo al carrito.
    await agregarAlCarrito(producto);
  };

  const totalPrendasCarrito = carrito.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  );

  const propsCarrito = {
    carrito,
    tarjetaPuntos,
    codigoTarjeta,
    setCodigoTarjeta,
    buscandoTarjeta,
    buscarTarjetaPuntos,
    abrirEscanerTarjeta,
    quitarTarjetaPuntos,
    metodoPago,
    seleccionarMetodoPago,
    montoRecibido,
    setMontoRecibido,
    pagoMixtoActivo,
    alternarPagoMixto,
    pagosMixtos,
    actualizarPagoMixto,
    resumenPagosMixtos,
    cobrarImpuesto,
    setCobrarImpuesto,
    resumen,
    formatoMoneda,
    formatoNumero,
    formatoFechaCorta,
    aumentarCantidad,
    disminuirCantidad,
    cambiarCantidadManual,
    quitarDelCarrito,
    limpiarVenta,
    cobrarVenta,
    cobrando,
    puntosClienteActivo,
    porcentajeClientePuntos,
    enviarTicketDigital,
    setEnviarTicketDigital,
    correoTicketDigital,
    tieneCorreoTicketDigital,
    puedeEnviarTicketDigital,
    configuracionCorreoSmtp,
    cargandoConfiguracionCorreo,
    sesionAbierta,
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-hidden bg-[#FFF9FA] pb-28 xl:pb-8">
      {/* Encabezado simple: en operación normal solo importa vender. */}
      <section className="rounded-[1.75rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_12px_35px_rgba(125,76,91,0.06)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#B85F7D] text-white shadow-md shadow-[#B85F7D]/20 sm:h-12 sm:w-12">
              <ShoppingCart size={23} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#33292D] sm:text-2xl">
                  Nueva venta
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ${
                    sesionAbierta
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      sesionAbierta ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {sesionAbierta ? 'Lista para vender' : 'Caja cerrada'}
                </span>
              </div>

              <p className="mt-1 truncate text-xs font-semibold text-[#8B7A80] sm:text-sm">
                {sucursalActual?.nombre || 'Sucursal'}
                {cajaActual?.nombre ? ` · ${cajaActual.nombre}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refrescarTodo}
            aria-label="Actualizar punto de venta"
            title="Actualizar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#A84E6C] transition active:scale-95 sm:h-12 sm:w-12"
          >
            <RefreshCw size={19} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* La selección de sucursal/caja sigue existiendo, pero no compite con la venta. */}
        {(puedeCambiarSucursal || puedeCambiarCaja) && (
          <details className="mt-3 overflow-hidden rounded-2xl border border-[#F2E5E9] bg-[#FFFBFC]">
            <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-[#806D74]">
              Configuración del punto de venta
            </summary>

            <div className="grid grid-cols-1 gap-3 border-t border-[#F2E5E9] p-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#9A858D]">
                  Sucursal
                </label>
                {puedeCambiarSucursal ? (
                  <select
                    value={idSucursal}
                    onChange={(e) => setIdSucursal(e.target.value)}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 text-sm font-bold text-[#5F4E55] outline-none focus:ring-2 focus:ring-[#E5AFC0]"
                  >
                    <option value="">Selecciona sucursal</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 text-sm font-black text-[#5F4E55]">
                    {sucursalActual?.nombre || sucursales[0]?.nombre || 'Sucursal asignada'}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-[#9A858D]">
                  Caja
                </label>
                <select
                  value={idCaja}
                  onChange={(e) => setIdCaja(e.target.value)}
                  disabled={!puedeCambiarCaja || cajas.length === 0}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 text-sm font-bold text-[#5F4E55] outline-none focus:ring-2 focus:ring-[#E5AFC0] disabled:cursor-not-allowed disabled:bg-[#F8F2F4]"
                >
                  <option value="">
                    {cajas.length === 0 ? 'No tienes una caja asignada' : 'Selecciona caja'}
                  </option>
                  {cajas.map((caja) => (
                    <option key={caja.id_caja} value={caja.id_caja}>
                      {caja.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </details>
        )}
      </section>

      {!sesionAbierta && (
        <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="flex items-center gap-3">
            <Wallet size={20} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black">Caja cerrada</p>
              <p className="text-xs font-semibold text-amber-800">
                Abre tu sesión desde el módulo Caja para comenzar a vender.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-4">
          {/* Buscador grande y fácil de usar con una mano. */}
          <div className="rounded-[1.75rem] border border-[#F0E2E7] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">
                  Productos
                </p>
                <h2 className="text-lg font-black text-[#33292D] sm:text-xl">
                  ¿Qué vas a vender?
                </h2>
              </div>

              <div className="shrink-0 rounded-2xl bg-[#FFF3F6] px-3 py-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-wide text-[#A08790]">
                  Disponibles
                </p>
                <p className="text-lg font-black leading-none text-[#A84E6C]">
                  {formatoNumero(inventario.length)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_48px_48px] gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="relative min-w-0">
                <Search className="absolute left-4 top-3.5 text-[#B6A3AA]" size={20} />
                <input
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  onFocus={() => {
                    if (sugerenciasProductos.length > 0) {
                      setMostrandoSugerenciasProductos(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setMostrandoSugerenciasProductos(false);
                      cargarInventario(buscar);
                    }
                  }}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-11 pr-4 text-base font-semibold text-[#4A3A40] outline-none focus:bg-white focus:ring-2 focus:ring-[#E5AFC0]"
                  placeholder="Buscar prenda..."
                  autoComplete="off"
                />

                {mostrandoSugerenciasProductos && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-[#F0E2E7] bg-white shadow-xl">
                    {cargandoSugerenciasProductos ? (
                      <div className="flex items-center gap-2 p-4 text-sm font-bold text-[#8B7A80]">
                        <Loader2 size={17} className="animate-spin" />
                        Buscando...
                      </div>
                    ) : sugerenciasProductos.length === 0 ? (
                      <div className="p-4 text-sm text-[#8B7A80]">Sin coincidencias.</div>
                    ) : (
                      sugerenciasProductos.map((producto) => (
                        <button
                          key={`${producto.id_producto}-${producto.id_variante || 'sin-variante'}`}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => seleccionarSugerenciaProducto(producto)}
                          className="flex w-full items-center justify-between gap-3 border-b border-[#F4EAED] px-4 py-3 text-left transition last:border-b-0 active:bg-[#FFF5F7]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[#43363B]">
                              {producto.producto || producto.nombre}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#9A858D]">
                              {[
                                producto.marca,
                                producto.presentacion,
                                producto.color,
                                producto.talla,
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'Producto'}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-black text-[#B85F7D]">
                            {formatoMoneda(obtenerPrecioFinalProducto(producto))}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={abrirEscanerProducto}
                aria-label="Escanear producto"
                title="Escanear producto"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FFF0F4] px-0 text-sm font-black text-[#A84E6C] active:scale-95 sm:px-4"
              >
                <Barcode size={19} />
                <span className="hidden sm:inline">Escanear</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrandoSugerenciasProductos(false);
                  cargarInventario(buscar);
                }}
                aria-label="Buscar producto"
                title="Buscar"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-0 text-sm font-black text-white active:scale-95 sm:px-4"
              >
                <Search size={19} />
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </div>
          </div>

          <ProductosDisponibles
            inventario={inventario}
            cargando={cargando}
            sucursalActual={sucursalActual}
            sesionAbierta={sesionAbierta}
            formatoMoneda={formatoMoneda}
            formatoNumero={formatoNumero}
            tieneOfertaActiva={tieneOfertaActiva}
            productoControlaLotes={productoControlaLotes}
            productoUsaVariantes={productoUsaVariantes}
            agregarAlCarrito={agregarAlCarrito}
          />
        </div>

        {/* En escritorio se mantiene el resumen permanente a la derecha. */}
        <div className="hidden xl:block">
          <CarritoPOS {...propsCarrito} />
        </div>
      </section>

      {ventaFinalizada && (
        <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <CheckCircle size={24} className="shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-sm font-black">Última venta registrada</p>
                <p className="truncate text-xs font-semibold text-emerald-700">
                  {ventaFinalizada.venta?.folio} · {formatoMoneda(ventaFinalizada.resumen?.total)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => imprimirTicketPOS()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm"
            >
              <ReceiptText size={16} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </section>
      )}

      {/* Barra de venta fija en móvil: siempre deja el total a un toque. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EEDFE4] bg-white/95 p-3 shadow-[0_-10px_30px_rgba(72,46,55,0.10)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#9A858D]">
              {totalPrendasCarrito} prenda(s)
            </p>
            <p className="truncate text-xl font-black text-[#33292D]">
              {formatoMoneda(resumen.total)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCarritoMovilAbierto(true)}
            disabled={!sesionAbierta || carrito.length === 0}
            className="inline-flex min-h-12 min-w-[150px] items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#B85F7D]/20 disabled:cursor-not-allowed disabled:bg-[#D8C8CD]"
          >
            <ShoppingCart size={18} />
            {carrito.length === 0 ? 'Sin productos' : 'Ver venta'}
          </button>
        </div>
      </div>

      {/* Hoja inferior de cobro para teléfono. */}
      {carritoMovilAbierto && (
        <div
          className="fixed inset-0 z-[90] bg-[#392F33]/45 backdrop-blur-sm xl:hidden"
          onClick={() => setCarritoMovilAbierto(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-[2rem] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CarritoPOS
              {...propsCarrito}
              modoMovil
              onCerrar={() => setCarritoMovilAbierto(false)}
            />
          </div>
        </div>
      )}

      {modalVariantesProducto && (
        <ModalVariantesProducto
          producto={productoSeleccionadoVariantes}
          onClose={cerrarModalVariantesProducto}
          onSeleccionar={seleccionarVariantePOS}
          formatoMoneda={formatoMoneda}
          formatoNumero={formatoNumero}
          tieneOfertaActiva={tieneOfertaActiva}
        />
      )}

      {modalLotesProducto && (
        <ModalLotesProducto
          producto={productoSeleccionadoLotes}
          lotes={lotesProducto}
          cargando={cargandoLotes}
          onClose={cerrarModalLotesProducto}
          onAgregar={agregarProductoConLote}
          formatoMoneda={formatoMoneda}
          formatoNumero={formatoNumero}
          formatoFechaCorta={formatoFechaCorta}
        />
      )}

      <BarcodeScannerModal
        abierto={scannerAbierto}
        titulo={scannerTipo === 'TARJETA' ? 'Escanear tarjeta de puntos' : 'Escanear producto'}
        descripcion={
          scannerTipo === 'TARJETA'
            ? 'Apunta la cámara al código de la tarjeta del cliente.'
            : 'Apunta la cámara al código de barras del producto.'
        }
        onClose={cerrarEscaner}
        onDetected={alDetectarCodigo}
      />
    </div>
  );
}
function ProductosDisponibles({
  inventario,
  cargando,
  sucursalActual,
  sesionAbierta,
  formatoMoneda,
  formatoNumero,
  tieneOfertaActiva,
  productoControlaLotes,
  productoUsaVariantes,
  agregarAlCarrito,
}) {
  const PRODUCTOS_POR_PAGINA = 12;
  const [paginaActual, setPaginaActual] = useState(1);

  const totalProductos = inventario.length;
  const totalPaginas = Math.max(Math.ceil(totalProductos / PRODUCTOS_POR_PAGINA), 1);
  const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  const fin = inicio + PRODUCTOS_POR_PAGINA;
  const productosPagina = inventario.slice(inicio, fin);

  useEffect(() => {
    setPaginaActual(1);
  }, [inventario]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#F0E2E7] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#F4EAED] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#392F33]">Prendas disponibles</p>
          <p className="truncate text-xs font-semibold text-[#9A858D]">
            {sucursalActual?.nombre || 'Sucursal'}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-xs font-black text-[#A84E6C]">
          {formatoNumero(totalProductos)}
        </span>
      </div>

      <div className="p-3 sm:p-4">
        {cargando ? (
          <EstadoTabla
            icono={<Loader2 size={22} className="animate-spin" />}
            texto="Cargando productos..."
          />
        ) : totalProductos === 0 ? (
          <EstadoTabla texto="No hay productos con stock disponible." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
              {productosPagina.map((item) => (
                <ProductoCard
                  key={`${item.id_inventario || item.id_producto}-${item.id_variante || 'sin-variante'}`}
                  item={item}
                  sesionAbierta={sesionAbierta}
                  formatoMoneda={formatoMoneda}
                  formatoNumero={formatoNumero}
                  tieneOfertaActiva={tieneOfertaActiva}
                  productoControlaLotes={productoControlaLotes}
                  productoUsaVariantes={productoUsaVariantes}
                  agregarAlCarrito={agregarAlCarrito}
                />
              ))}
            </div>

            {totalProductos > PRODUCTOS_POR_PAGINA && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#FFF9FA] p-2.5">
                <p className="text-xs font-bold text-[#8B7A80]">
                  {paginaActual} / {totalPaginas}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaginaActual((pagina) => Math.max(pagina - 1, 1))}
                    disabled={paginaActual === 1}
                    className="min-h-10 rounded-xl border border-[#EEDFE4] bg-white px-3 text-xs font-black text-[#755F67] disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaActual((pagina) => Math.min(pagina + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    className="min-h-10 rounded-xl bg-[#B85F7D] px-3 text-xs font-black text-white disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductoCard({
  item,
  sesionAbierta,
  formatoMoneda,
  formatoNumero,
  tieneOfertaActiva,
  productoControlaLotes,
  productoUsaVariantes,
  agregarAlCarrito,
}) {
  const oferta = tieneOfertaActiva(item);
  const precioFinal = oferta ? item.precio_con_descuento : item.precio_venta;
  const controlaLotes = productoControlaLotes(item);
  const usaVariantes = productoUsaVariantes(item);

  const atributos = [
    item.marca,
    item.presentacion,
    item.color,
    item.talla,
    item.tono,
  ].filter(Boolean);

  return (
    <article className="flex min-h-[190px] min-w-0 flex-col rounded-3xl border border-[#F0E2E7] bg-white p-3 shadow-sm transition active:scale-[0.99] sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#A68F97]">
              {item.categoria || 'Prenda'}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-sm font-black leading-snug text-[#392F33] sm:text-base">
              {item.producto || item.nombre}
            </h3>
          </div>

          {oferta && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">
              -{formatoNumero(item.porcentaje_descuento)}%
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-relaxed text-[#9A858D]">
          {atributos.length > 0 ? atributos.join(' · ') : item.codigo_barras || 'Sin detalles adicionales'}
        </p>

        <div className="mt-3">
          {oferta && (
            <p className="text-[10px] font-bold text-[#B5A1A8] line-through">
              {formatoMoneda(item.precio_venta)}
            </p>
          )}
          <p className="text-xl font-black tracking-tight text-[#B85F7D]">
            {formatoMoneda(precioFinal)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1 rounded-xl bg-[#FFFAFB] px-2 py-1.5 text-[10px] font-black text-[#755F67]">
          <Package size={12} />
          {formatoNumero(item.stock_actual)}
        </span>

        <div className="flex flex-wrap justify-end gap-1.5">
          {usaVariantes && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#F0EBF6] px-2 py-1.5 text-[9px] font-black text-[#745D8A]">
              <Layers3 size={11} />
              {Number(item.total_variantes || item.variantes?.length || 0)} variante(s)
            </span>
          )}

          {controlaLotes && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-[#FFF0F4] px-2 py-1.5 text-[9px] font-black text-[#A84E6C]">
              <Layers3 size={11} />
              Lote
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => agregarAlCarrito(item)}
        disabled={!sesionAbierta}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-[#B85F7D] px-3 py-2.5 text-xs font-black text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#E9DDE1] disabled:text-[#A38F96]"
      >
        <Plus size={17} />
        {usaVariantes
          ? 'Elegir variante'
          : controlaLotes
            ? 'Elegir lote'
            : 'Agregar'}
      </button>
    </article>
  );
}

function EstadoTabla({ texto, icono = null }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-3xl bg-[#FFFAFB] p-6 text-center text-[#8B7A80]">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#B85F7D] shadow-sm">
        {icono || <Package size={22} />}
      </div>
      <p className="text-sm font-black">{texto}</p>
    </div>
  );
}

function CarritoPOS({
  carrito,
  tarjetaPuntos,
  codigoTarjeta,
  setCodigoTarjeta,
  buscandoTarjeta,
  buscarTarjetaPuntos,
  abrirEscanerTarjeta,
  quitarTarjetaPuntos,
  metodoPago,
  seleccionarMetodoPago,
  montoRecibido,
  setMontoRecibido,
  pagoMixtoActivo,
  alternarPagoMixto,
  pagosMixtos,
  actualizarPagoMixto,
  resumenPagosMixtos,
  cobrarImpuesto,
  setCobrarImpuesto,
  resumen,
  formatoMoneda,
  formatoNumero,
  formatoFechaCorta,
  aumentarCantidad,
  disminuirCantidad,
  cambiarCantidadManual,
  quitarDelCarrito,
  limpiarVenta,
  cobrarVenta,
  cobrando,
  puntosClienteActivo,
  porcentajeClientePuntos,
  enviarTicketDigital,
  setEnviarTicketDigital,
  correoTicketDigital,
  tieneCorreoTicketDigital,
  puedeEnviarTicketDigital,
  configuracionCorreoSmtp,
  cargandoConfiguracionCorreo,
  sesionAbierta,
  modoMovil = false,
  onCerrar = null,
}) {
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  const cantidadPrendas = carrito.reduce(
    (total, item) => total + Number(item.cantidad || 0),
    0
  );

  const metodosPrincipales = METODOS_PAGO_POS.filter((metodo) =>
    ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].includes(metodo.id)
  );

  const montosRapidos = useMemo(() => {
    const total = Math.ceil(Number(resumen.total || 0));
    if (total <= 0) return [];

    const candidatos = [total, 50, 100, 200, 500, 1000, 2000];
    return [...new Set(candidatos.filter((monto) => monto >= total))].slice(0, 4);
  }, [resumen.total]);

  return (
    <aside
      className={`min-w-0 overflow-hidden bg-white ${
        modoMovil
          ? 'rounded-t-[2rem]'
          : 'rounded-[1.75rem] border border-[#F0E2E7] shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto'
      }`}
    >
      <div className="bg-[#B85F7D] px-4 py-4 text-white sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70">
              Tu venta
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-black tracking-tight">
                {formatoMoneda(resumen.total)}
              </p>
              <span className="text-xs font-bold text-white/70">
                {cantidadPrendas} prenda(s)
              </span>
            </div>
          </div>

          {modoMovil && onCerrar ? (
            <button
              type="button"
              onClick={onCerrar}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white"
              aria-label="Cerrar venta"
            >
              <X size={20} />
            </button>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <ReceiptText size={20} />
            </div>
          )}
        </div>
      </div>

      <section className="border-b border-[#F4EAED] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#392F33]">Productos</p>
            <p className="text-xs font-semibold text-[#9A858D]">
              Revisa antes de cobrar.
            </p>
          </div>

          {carrito.length > 0 && (
            <button
              type="button"
              onClick={limpiarVenta}
              className="rounded-xl bg-[#FFF0F4] px-3 py-2 text-[11px] font-black text-[#A84E6C]"
            >
              Vaciar
            </button>
          )}
        </div>

        {carrito.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E5D5DA] bg-[#FFFAFB] p-5 text-center">
            <ShoppingCart className="mx-auto text-[#BDA8AF]" size={28} />
            <p className="mt-2 text-sm font-black text-[#5B4950]">Aún no agregas prendas</p>
            <p className="mt-1 text-xs text-[#9A858D]">Toca “Agregar” en un producto.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {carrito.map((item) => (
              <div
                key={item.key_carrito}
                className="rounded-2xl border border-[#F0E2E7] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black text-[#392F33]">
                      {item.nombre}
                    </p>
                    <p className="mt-1 text-xs font-black text-[#B85F7D]">
                      {formatoMoneda(item.precio_venta)} c/u
                    </p>
                    {item.id_variante && (
                      <p className="mt-1 truncate text-[10px] font-black text-[#745D8A]">
                        {item.nombre_variante ||
                          (item.detalle_variante || [])
                            .map((detalle) => detalle.valor)
                            .filter(Boolean)
                            .join(' · ') ||
                          `Variante ${item.id_variante}`}
                      </p>
                    )}
                    {item.id_lote && (
                      <p className="mt-1 truncate text-[10px] font-semibold text-[#9A858D]">
                        Lote {item.lote || '—'} · Cad. {formatoFechaCorta(item.fecha_caducidad)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => quitarDelCarrito(item.key_carrito)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
                    aria-label="Quitar producto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] p-1">
                    <button
                      type="button"
                      onClick={() => disminuirCantidad(item.key_carrito)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#755F67] shadow-sm"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={item.cantidad}
                      onChange={(e) => cambiarCantidadManual(item.key_carrito, e.target.value)}
                      className="h-9 w-12 bg-transparent text-center text-sm font-black text-[#392F33] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => aumentarCantidad(item.key_carrito)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#755F67] shadow-sm"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <p className="text-base font-black text-[#392F33]">
                    {formatoMoneda(Number(item.cantidad || 0) * Number(item.precio_venta || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lo frecuente queda visible. Lo avanzado se mantiene disponible sin saturar. */}
      <section className="border-b border-[#F4EAED] p-4">
        <p className="mb-3 text-sm font-black text-[#392F33]">¿Cómo pagaron?</p>

        {!pagoMixtoActivo && (
          <div className="grid grid-cols-3 gap-2">
            {metodosPrincipales.map((metodo) => {
              const Icono = metodo.icono;
              const activo = metodoPago === metodo.id;

              return (
                <button
                  key={metodo.id}
                  type="button"
                  onClick={() => seleccionarMetodoPago(metodo.id)}
                  className={`flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-[10px] font-black transition sm:text-xs ${
                    activo
                      ? 'bg-[#B85F7D] text-white shadow-md shadow-[#B85F7D]/15'
                      : 'bg-[#FFF0F4] text-[#755F67]'
                  }`}
                >
                  <Icono size={20} />
                  {metodo.label}
                </button>
              );
            })}
          </div>
        )}

        {!pagoMixtoActivo && metodoPago === 'EFECTIVO' && (
          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-[#9A858D]">
              ¿Con cuánto paga?
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-lg font-black text-[#B85F7D]">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] py-3 pl-9 pr-4 text-xl font-black text-[#392F33] outline-none focus:ring-2 focus:ring-[#E5AFC0]"
                placeholder="0.00"
              />
            </div>

            {montosRapidos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {montosRapidos.map((monto) => (
                  <button
                    key={monto}
                    type="button"
                    onClick={() => setMontoRecibido(String(monto))}
                    className="rounded-xl bg-[#FFF0F4] px-1 py-2 text-[10px] font-black text-[#A84E6C] sm:text-xs"
                  >
                    ${formatoNumero(monto)}
                  </button>
                ))}
              </div>
            )}

            <div
              className={`mt-3 rounded-2xl px-4 py-3 ${
                resumen.cambio >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
                {resumen.cambio >= 0 ? 'Cambio' : 'Falta por recibir'}
              </p>
              <p className="text-2xl font-black">
                {formatoMoneda(
                  resumen.cambio >= 0 ? resumen.cambio : Math.abs(resumen.cambio)
                )}
              </p>
            </div>
          </div>
        )}

        {!pagoMixtoActivo && metodoPago === 'PUNTOS' && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${
              resumen.puedePagarConPuntos
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {tarjetaPuntos
              ? resumen.puedePagarConPuntos
                ? `Puntos disponibles: ${formatoNumero(resumen.puntosDisponibles)}`
                : `Faltan ${formatoNumero(resumen.puntosFaltantes)} puntos`
              : 'Vincula una tarjeta para pagar con puntos'}
          </div>
        )}
      </section>

      <section className="border-b border-[#F4EAED] p-4">
        <button
          type="button"
          onClick={() => setMostrarOpciones((actual) => !actual)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#FFFAFB] px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-black text-[#392F33]">Más opciones</p>
            <p className="text-xs font-semibold text-[#9A858D]">
              Cliente, puntos, pago mixto e IVA.
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#A84E6C] shadow-sm">
            {mostrarOpciones ? 'Ocultar' : 'Ver'}
          </span>
        </button>

        {mostrarOpciones && (
          <div className="mt-3 space-y-3">
            <div className="rounded-3xl border border-[#F0E2E7] bg-white p-3">
              <div className="mb-3 flex items-center gap-2">
                <UserCheck size={17} className="text-[#B85F7D]" />
                <p className="text-sm font-black text-[#392F33]">Cliente / puntos</p>
              </div>

              {!tarjetaPuntos ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Barcode className="absolute left-4 top-3.5 text-[#B6A3AA]" size={17} />
                    <input
                      value={codigoTarjeta}
                      onChange={(e) => setCodigoTarjeta(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') buscarTarjetaPuntos();
                      }}
                      className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-[#E5AFC0]"
                      placeholder="Tarjeta o teléfono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => buscarTarjetaPuntos()}
                      disabled={buscandoTarjeta}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-3 text-xs font-black text-white disabled:opacity-60"
                    >
                      {buscandoTarjeta ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Search size={16} />
                      )}
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={abrirEscanerTarjeta}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#FFF0F4] px-3 text-xs font-black text-[#A84E6C]"
                    >
                      <Barcode size={16} />
                      Escanear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{tarjetaPuntos.nombre_cliente}</p>
                      <p className="mt-1 text-xs font-black text-emerald-700">
                        {formatoNumero(tarjetaPuntos.puntos_actuales)} puntos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={quitarTarjetaPuntos}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {puntosClienteActivo && (
                    <p className="mt-2 text-[11px] font-bold text-emerald-700">
                      Esta venta puede generar {formatoNumero(resumen.puntosEstimados)} puntos ({porcentajeClientePuntos}%).
                    </p>
                  )}

                  {!pagoMixtoActivo && (
                    <button
                      type="button"
                      onClick={() => seleccionarMetodoPago('PUNTOS')}
                      className={`mt-3 w-full rounded-2xl px-3 py-2.5 text-xs font-black ${
                        metodoPago === 'PUNTOS'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white text-emerald-800'
                      }`}
                    >
                      {metodoPago === 'PUNTOS' ? 'Pago con puntos seleccionado' : 'Pagar con puntos'}
                    </button>
                  )}

                  <div className="mt-3 rounded-2xl bg-white/70 p-3">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-emerald-700" />
                      <p className="text-xs font-black text-emerald-900">Ticket digital</p>
                    </div>
                    <p className="mt-1 break-all text-[11px] text-emerald-700">
                      {tieneCorreoTicketDigital
                        ? correoTicketDigital
                        : 'El cliente no tiene un correo válido registrado.'}
                    </p>
                    <label className="mt-2 flex items-center gap-2 text-[11px] font-bold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={enviarTicketDigital}
                        onChange={(e) => setEnviarTicketDigital(e.target.checked)}
                        disabled={!puedeEnviarTicketDigital || cargandoConfiguracionCorreo}
                      />
                      Enviar ticket por correo
                    </label>
                    {!configuracionCorreoSmtp?.activo && !cargandoConfiguracionCorreo && (
                      <p className="mt-1 text-[10px] font-semibold text-amber-700">
                        El envío de tickets no está activo para esta sucursal.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#F0E2E7] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#392F33]">Pago mixto</p>
                  <p className="text-xs font-semibold text-[#9A858D]">
                    Combina varios métodos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={alternarPagoMixto}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                    pagoMixtoActivo ? 'bg-[#B85F7D]' : 'bg-[#D8C8CD]'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                      pagoMixtoActivo ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {pagoMixtoActivo && (
                <div className="mt-3 space-y-2">
                  {METODOS_PAGO_POS.map((metodo) => {
                    const Icono = metodo.icono;
                    const deshabilitado = metodo.id === 'PUNTOS' && !tarjetaPuntos;

                    return (
                      <div
                        key={metodo.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#B85F7D]">
                          <Icono size={17} />
                        </div>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          disabled={deshabilitado}
                          value={pagosMixtos[metodo.id] || ''}
                          onChange={(e) => actualizarPagoMixto(metodo.id, e.target.value)}
                          className="w-full rounded-xl border border-[#EEDFE4] bg-[#FFFAFB] px-3 py-2.5 text-sm font-black text-[#392F33] outline-none focus:ring-2 focus:ring-[#E5AFC0] disabled:opacity-50"
                          placeholder={`${metodo.label}: 0.00`}
                        />
                      </div>
                    );
                  })}

                  <div className="space-y-1.5 rounded-2xl bg-[#FFFAFB] p-3">
                    <ResumenLinea
                      label="Total pagado"
                      valor={formatoMoneda(resumenPagosMixtos.totalPagado)}
                    />
                    <ResumenLinea
                      label="Pendiente"
                      valor={formatoMoneda(resumenPagosMixtos.pendiente)}
                      destacado={resumenPagosMixtos.pendiente > 0 ? 'red' : null}
                    />
                    <ResumenLinea
                      label="Cambio"
                      valor={formatoMoneda(resumenPagosMixtos.cambio)}
                      destacado="emerald"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#F0E2E7] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#392F33]">Aplicar IVA 16%</p>
                  <p className="text-xs font-semibold text-[#9A858D]">
                    Solo cuando corresponda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCobrarImpuesto(!cobrarImpuesto)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                    cobrarImpuesto ? 'bg-[#B85F7D]' : 'bg-[#D8C8CD]'
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                      cobrarImpuesto ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="sticky bottom-0 border-t border-[#F0E2E7] bg-white p-4 shadow-[0_-8px_24px_rgba(72,46,55,0.05)]">
        <div className="mb-3 rounded-2xl bg-[#FFFAFB] p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#8B7A80]">Total a cobrar</p>
              {resumen.descuentoOfertas > 0 && (
                <p className="mt-0.5 text-[10px] font-bold text-emerald-700">
                  Ahorras {formatoMoneda(resumen.descuentoOfertas)}
                </p>
              )}
              {cobrarImpuesto && (
                <p className="mt-0.5 text-[10px] font-bold text-[#A84E6C]">
                  Incluye IVA: {formatoMoneda(resumen.impuesto)}
                </p>
              )}
            </div>
            <p className="text-2xl font-black tracking-tight text-[#392F33]">
              {formatoMoneda(resumen.total)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={cobrarVenta}
          disabled={cobrando || carrito.length === 0 || !sesionAbierta}
          className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-4 text-base font-black text-white shadow-lg shadow-[#B85F7D]/20 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#D8C8CD]"
        >
          {cobrando ? (
            <Loader2 size={21} className="animate-spin" />
          ) : (
            <CheckCircle size={21} />
          )}
          {cobrando ? 'Cobrando...' : `Cobrar ${formatoMoneda(resumen.total)}`}
        </button>
      </section>
    </aside>
  );
}

function ResumenLinea({ label, valor, destacado = null }) {
  const color =
    destacado === 'emerald'
      ? 'text-emerald-700'
      : destacado === 'red'
        ? 'text-red-700'
        : 'text-[#392F33]';

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="font-bold text-[#8B7A80]">{label}</span>
      <span className={`font-black ${color}`}>{valor}</span>
    </div>
  );
}


function ModalVariantesProducto({
  producto,
  onClose,
  onSeleccionar,
  formatoMoneda,
  formatoNumero,
  tieneOfertaActiva,
}) {
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const variantes = (producto?.variantes || []).filter(
    (variante) => Number(variante.stock_actual || 0) > 0
  );

  const obtenerNombreVisible = (variante, detalle = []) => {
    return (
      variante?.nombre_variante ||
      detalle
        .map((item) => item.valor)
        .filter(Boolean)
        .join(' · ') ||
      (variante?.precio_venta !== undefined &&
      variante?.precio_venta !== null &&
      variante?.precio_venta !== ''
        ? `Precio ${formatoMoneda(variante.precio_venta)}`
        : `Variante ${variante?.id_variante || ''}`)
    );
  };

  const cerrarConEscape = (e) => {
    if (e.key !== 'Escape') return;

    if (imagenAmpliada) {
      setImagenAmpliada(null);
      return;
    }

    onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagenAmpliada]);

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#392F33]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
        <div className="relative z-[81] flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[2rem]">
          {/* Encabezado compacto y fijo para que en móvil siempre esté accesible. */}
          <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-[#F4EAED] bg-white/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#745D8A] sm:text-xs">
                Variantes disponibles
              </p>
              <h2 className="mt-0.5 text-lg font-black leading-tight text-[#392F33] sm:text-xl">
                Seleccionar variante
              </h2>
              <p className="mt-0.5 text-xs text-[#8B7A80] sm:text-sm">
                Identifica visualmente la prenda y selecciona la correcta.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F0EBF6] text-[#745D8A] transition hover:bg-[#E9E1F0]"
              aria-label="Cerrar selector de variantes"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:p-5">
            {/* Información del producto. En móvil ocupa menos altura. */}
            <div className="rounded-2xl bg-[#FFFAFB] px-4 py-3 sm:p-4">
              <p className="truncate font-black text-[#392F33]">
                {producto?.producto || producto?.nombre || 'Producto'}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-[#9A858D] sm:mt-1 sm:text-xs">
                {producto?.codigo_barras
                  ? `Código general: ${producto.codigo_barras}`
                  : 'Sin código general'}
                {producto?.marca ? ` · ${producto.marca}` : ''}
              </p>
            </div>

            {/*
              En teléfono mantenemos UNA tarjeta por fila para que la foto tenga
              suficiente ancho. En tablet/escritorio regresamos a dos columnas.
            */}
            <div className="mt-3 grid grid-cols-1 gap-4 sm:mt-4 md:grid-cols-2">
              {variantes.length === 0 ? (
                <div className="md:col-span-2">
                  <EstadoTabla texto="No hay variantes con stock disponible." />
                </div>
              ) : (
                variantes.map((variante) => {
                  const detalle = obtenerDetalleVariantePOS(producto, variante);

                  const precioVariante =
                    variante?.precio_venta !== undefined &&
                    variante?.precio_venta !== null &&
                    variante?.precio_venta !== ''
                      ? Number(variante.precio_venta)
                      : Number(producto?.precio_venta || 0);

                  const porcentaje = Number(
                    producto?.porcentaje_descuento || 0
                  );

                  const precioFinal = tieneOfertaActiva(producto)
                    ? Number(
                        (
                          precioVariante -
                          precioVariante * (porcentaje / 100)
                        ).toFixed(2)
                      )
                    : precioVariante;

                  const nombreVisible = obtenerNombreVisible(variante, detalle);
                  const urlImagen = resolverUrlImagenVariante(
                    variante?.imagen_referencia ||
                      variante?.imagen ||
                      variante?.imagen_url ||
                      variante?.foto_referencia ||
                      ''
                  );

                  return (
                    <article
                      key={variante.id_variante}
                      className="overflow-hidden rounded-[1.6rem] border border-[#E8DCE1] bg-white shadow-sm transition md:hover:-translate-y-0.5 md:hover:border-[#C9B4CC] md:hover:shadow-md"
                    >
                      {/* Imagen grande. Se usa contain para no cortar prendas. */}
                      {urlImagen ? (
                        <button
                          type="button"
                          onClick={() =>
                            setImagenAmpliada({
                              url: urlImagen,
                              nombre: nombreVisible,
                            })
                          }
                          className="group relative block w-full overflow-hidden border-b border-[#F4EAED] bg-white text-left"
                          aria-label={`Ampliar imagen de ${nombreVisible}`}
                        >
                          <div className="flex h-[46vh] min-h-[280px] max-h-[430px] w-full items-center justify-center bg-[#FFFDFD] p-2 sm:h-64 sm:min-h-0 sm:max-h-none sm:p-3 md:h-72">
                            <img
                              src={urlImagen}
                              alt={`Referencia de ${nombreVisible}`}
                              className="h-full w-full object-contain object-center transition duration-200 group-active:scale-[0.99] md:group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          </div>

                          <span className="absolute bottom-3 right-3 rounded-full bg-[#392F33]/75 px-3 py-1.5 text-[10px] font-black text-white shadow-lg backdrop-blur-sm">
                            Tocar para ampliar
                          </span>
                        </button>
                      ) : (
                        <div className="flex h-28 items-center justify-center border-b border-[#F4EAED] bg-[#FFFAFB] px-4 text-center sm:h-32">
                          <div>
                            <Package
                              size={30}
                              className="mx-auto text-[#D9C9CF]"
                            />
                            <p className="mt-2 text-xs font-bold text-[#A8959C]">
                              Sin imagen de referencia
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-black leading-tight text-[#392F33]">
                              {nombreVisible}
                            </p>

                            {(variante.sku || variante.codigo_barras) && (
                              <p className="mt-1 truncate text-[10px] font-semibold text-[#9A858D]">
                                {variante.sku ? `SKU ${variante.sku}` : ''}
                                {variante.sku && variante.codigo_barras
                                  ? ' · '
                                  : ''}
                                {variante.codigo_barras
                                  ? `Código ${variante.codigo_barras}`
                                  : ''}
                              </p>
                            )}
                          </div>

                          <span className="shrink-0 rounded-full bg-[#F0EBF6] px-2.5 py-1 text-[10px] font-black text-[#745D8A]">
                            {formatoNumero(variante.stock_actual)} disp.
                          </span>
                        </div>

                        {detalle.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {detalle.map((item) => (
                              <span
                                key={`${variante.id_variante}-${item.clave}`}
                                className="rounded-full bg-[#FFF3F6] px-2.5 py-1 text-[10px] font-black text-[#8E596B]"
                              >
                                {item.etiqueta}: {item.valor}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#F4EAED] pt-3">
                          <div className="min-w-0">
                            {tieneOfertaActiva(producto) &&
                              precioFinal !== precioVariante && (
                                <p className="text-[10px] font-bold text-[#B5A1A8] line-through">
                                  {formatoMoneda(precioVariante)}
                                </p>
                              )}
                            <p className="text-xl font-black leading-none text-[#B85F7D]">
                              {formatoMoneda(precioFinal)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onSeleccionar(producto, variante)}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#745D8A] px-4 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-[0.98] md:hover:bg-[#654F7A]"
                          >
                            Seleccionar
                            <CheckCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visor de imagen a pantalla completa. */}
      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-2 sm:p-6"
          onClick={() => setImagenAmpliada(null)}
        >
          <div
            className="relative flex h-full w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imagenAmpliada.url}
              alt={imagenAmpliada.nombre}
              className="max-h-full max-w-full object-contain"
            />

            <button
              type="button"
              onClick={() => setImagenAmpliada(null)}
              className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top))] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#392F33] shadow-xl"
              aria-label="Cerrar imagen ampliada"
            >
              <X size={22} />
            </button>

            <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] rounded-2xl bg-black/65 px-4 py-3 text-center text-sm font-black text-white backdrop-blur-sm sm:inset-x-auto sm:max-w-lg">
              {imagenAmpliada.nombre}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ModalLotesProducto({
  producto,
  lotes,
  cargando,
  onClose,
  onAgregar,
  formatoMoneda,
  formatoNumero,
  formatoFechaCorta,
}) {
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    setCantidad(1);
  }, [producto?.id_producto, producto?.id_variante]);

  const cantidadNumerica = Math.max(Number(cantidad || 1), 1);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#392F33]/45 p-4 backdrop-blur-sm">
      <div className="relative z-[81] flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F4EAED] px-6 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">Inventario por lote</p>
            <h2 className="text-xl font-black text-[#392F33]">Seleccionar lote</h2>
            <p className="text-sm text-[#8B7A80]">Elige el lote que se descontará de la venta.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#A84E6C]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="rounded-2xl bg-[#FFFAFB] p-4">
            <p className="font-black text-[#392F33]">{producto?.producto || producto?.nombre || 'Producto'}</p>
            <p className="mt-1 text-xs text-[#9A858D]">
              Código: {producto?.codigo_barras || '—'}
              {producto?.marca ? ` · Marca: ${producto.marca}` : ''}
            </p>
            <p className="mt-2 text-sm font-black text-[#B85F7D]">
              {formatoMoneda(producto?.precio_con_descuento || producto?.precio_venta || 0)}
            </p>
          </div>

          <div className="mt-4 max-w-xs">
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#8B7A80]">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] px-4 py-3 font-black text-[#392F33] outline-none focus:ring-2 focus:ring-[#E5AFC0]"
            />
          </div>

          <div className="mt-5 space-y-3">
            {cargando ? (
              <EstadoTabla icono={<Loader2 size={22} className="animate-spin" />} texto="Cargando lotes..." />
            ) : lotes.length === 0 ? (
              <EstadoTabla texto="No hay lotes disponibles." />
            ) : (
              lotes.map((loteItem) => {
                const estado = obtenerEstadoCaducidadLote(loteItem.fecha_caducidad);
                const stock = Number(loteItem.stock_actual || 0);
                const bloqueado = estado.caducado || stock <= 0 || cantidadNumerica > stock;

                return (
                  <div key={loteItem.id_lote} className={`rounded-3xl border p-4 ${estado.cardClass}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[#392F33]">Lote {loteItem.lote || 'Sin número'}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${estado.badgeClass}`}>
                            {estado.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[#8B7A80]">
                          <span>Stock: <b>{formatoNumero(stock)}</b></span>
                          <span>Caducidad: <b>{formatoFechaCorta(loteItem.fecha_caducidad)}</b></span>
                        </div>
                        {cantidadNumerica > stock && (
                          <p className="mt-2 text-xs font-black text-red-600">La cantidad solicitada supera el stock del lote.</p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={bloqueado}
                        onClick={() => onAgregar(producto, loteItem, cantidadNumerica)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#D8C8CD]"
                      >
                        <Plus size={17} />
                        Agregar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
