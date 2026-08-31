import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ReceiptText,
  Search,
  RefreshCw,
  Eye,
  X,
  Store,
  Wallet,
  Package,
  Boxes,
  CreditCard,
  Banknote,
  FileText,
  Undo2,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

/*
 * Cambia modoPrueba a false únicamente cuando haya impresora física.
 * Una reimpresión siempre se envía con no_abrir_caja: true.
 */
const CONFIGURACION_IMPRESION_LOCAL = {
  url: 'http://localhost:3030',
  apiKey: 'shaddai-printer-2026',
  modoPrueba: true,
};

const API_IMPRESION_LOCAL = CONFIGURACION_IMPRESION_LOCAL.url;
const PRINTER_KEY = CONFIGURACION_IMPRESION_LOCAL.apiKey;
const MODO_PRUEBA_TICKET = CONFIGURACION_IMPRESION_LOCAL.modoPrueba;

const normalizarBooleanoTicket = (valor, valorDefault = true) => {
  if (valor === undefined || valor === null) return valorDefault;
  if (typeof valor === 'boolean') return valor;

  const texto = String(valor).trim().toLowerCase();

  if (['false', '0', 'no', 'n'].includes(texto)) return false;
  if (['true', '1', 'si', 'sí', 's'].includes(texto)) return true;

  return Boolean(valor);
};

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
   * Para correos largos se intenta dividir después de @, conservando todos
   * los caracteres y evitando que la API local los recorte.
   */
  const posicionArroba = texto.indexOf('@');

  if (posicionArroba > 0) {
    const usuarioCorreo = texto.slice(0, posicionArroba + 1);
    const dominioCorreo = texto.slice(posicionArroba + 1);

    if (
      longitudTextoTicketLocal(usuarioCorreo) <= ancho &&
      longitudTextoTicketLocal(dominioCorreo) <= ancho
    ) {
      return [usuarioCorreo, dominioCorreo];
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

    /*
     * Para dominios, URLs y códigos se busca un separador cercano al final
     * de la línea antes de aplicar un corte rígido.
     */
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
   * Ajusta separadores como "-----" al ancho físico exacto del ticket.
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
 * La API local antigua no agrega el RFC a /vista-previa-ticket.
 * El sistema lo inserta únicamente en el texto mostrado en el modal.
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

  const saltoLinea = contenidoOriginal.includes('\r\n')
    ? '\r\n'
    : '\n';

  let lineas = contenidoOriginal
    .replace(/\r\n/g, '\n')
    .split('\n');

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

    return normalizarComparacion(texto).includes(
      rfcNormalizado
    );
  };

  if (!mostrarRfc || !rfcLimpio) {
    return lineas
      .filter((linea) => !esLineaRfc(linea))
      .join(saltoLinea);
  }

  if (lineas.some((linea) => esLineaRfc(linea))) {
    return contenidoOriginal;
  }

  const ancho = obtenerAnchoTicketLocal(configuracion);

  const centrarLinea = (valor = '') => {
    const texto = cortarTextoTicketLocal(
      String(valor || '').trim(),
      0,
      ancho
    );

    const espacios = Math.max(
      Math.floor(
        (ancho - longitudTextoTicketLocal(texto)) / 2
      ),
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

  const obtenerPrefijoComparable = (valor = '') =>
    String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase()
      .split(' ')
      .filter(Boolean)
      .slice(0, 3)
      .join('');

  const prefijoDireccion = obtenerPrefijoComparable(
    direccionConfigurada
  );

  const telefonoNormalizado = normalizarComparacion(
    telefonoConfigurado
  );

  let indiceInsercion = -1;

  if (prefijoDireccion) {
    indiceInsercion = lineas.findIndex((linea) =>
      normalizarComparacion(linea).includes(
        prefijoDireccion
      )
    );
  }

  if (indiceInsercion < 0 && telefonoNormalizado) {
    indiceInsercion = lineas.findIndex((linea) => {
      const normalizada = normalizarComparacion(linea);

      return (
        normalizada.includes(telefonoNormalizado) ||
        /^\s*TEL(?:EFONO)?[\s.:]/i.test(
          String(linea || '')
        )
      );
    });
  }

  if (indiceInsercion < 0) {
    indiceInsercion = lineas.findIndex(
      (linea, indice) =>
        indice > 0 &&
        /^\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(
          String(linea || '')
        )
    );
  }

  if (indiceInsercion < 0) {
    indiceInsercion = lineas.findIndex(
      (linea, indice) =>
        indice > 0 && !String(linea || '').trim()
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

export default function Ventas() {
  const { usuario } = useAuth();

  const puedeCambiarSucursal = esSuperAdmin(usuario);

  const [sucursales, setSucursales] = useState([]);
  const [ventas, setVentas] = useState([]);

  const [detalleVenta, setDetalleVenta] = useState(null);
  const [detalleProductos, setDetalleProductos] = useState([]);
  const [detalleLotes, setDetalleLotes] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);

  const [ticketPrevisualizado, setTicketPrevisualizado] = useState('');
  const [cargandoTicket, setCargandoTicket] = useState(false);
  const [reimprimiendoTicket, setReimprimiendoTicket] = useState(false);

  const [idSucursal, setIdSucursal] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [cargando, setCargando] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalTicket, setModalTicket] = useState(false);

  const [modalDevolucion, setModalDevolucion] = useState(false);
  const [ventaDevolucion, setVentaDevolucion] = useState(null);
  const [devolucionProductos, setDevolucionProductos] = useState([]);
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [observacionesDevolucion, setObservacionesDevolucion] = useState('');
  const [guardandoDevolucion, setGuardandoDevolucion] = useState(false);

  const sucursalActual = useMemo(() => {
    return sucursales.find((s) => Number(s.id_sucursal) === Number(idSucursal));
  }, [sucursales, idSucursal]);

  const resumen = useMemo(() => {
    const ventasValidas = ventas.filter((venta) => venta.estado !== 'DEVUELTA');

    const totalVentas = ventasValidas.length;

    const totalImporte = ventasValidas.reduce((acc, venta) => {
      return acc + Number(venta.total || 0);
    }, 0);

    const efectivo = ventasValidas
      .filter((v) => v.metodo_pago === 'EFECTIVO')
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const tarjeta = ventasValidas
      .filter((v) => v.metodo_pago === 'TARJETA')
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const transferencia = ventasValidas
      .filter((v) => v.metodo_pago === 'TRANSFERENCIA')
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const devoluciones = ventas
      .filter((venta) => venta.estado === 'DEVUELTA')
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    return {
      totalVentas,
      totalImporte,
      efectivo,
      tarjeta,
      transferencia,
      devoluciones,
    };
  }, [ventas]);

  const totalEstimadoDevolucion = useMemo(() => {
    if (!ventaDevolucion) return 0;

    const subtotalSeleccionado = devolucionProductos.reduce((acc, producto) => {
      const cantidad = Number(producto.cantidad_devolver || 0);
      const cantidadVendida = Number(producto.cantidad || 0);
      const subtotalProducto = Number(producto.subtotal || 0);

      if (cantidad <= 0 || cantidadVendida <= 0) return acc;

      const precioProporcional = subtotalProducto / cantidadVendida;
      return acc + precioProporcional * cantidad;
    }, 0);

    const subtotalVenta = Number(ventaDevolucion.subtotal || 0);
    const totalVenta = Number(ventaDevolucion.total || 0);
    const factorTotal = subtotalVenta > 0 ? totalVenta / subtotalVenta : 1;

    return Number((subtotalSeleccionado * factorTotal).toFixed(2));
  }, [devolucionProductos, ventaDevolucion]);

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

  const etiquetasAtributosVariante = {
    talla: 'Talla',
    color: 'Color',
    tono: 'Tono',
    genero: 'Género',
    presentacion: 'Presentación',
    material: 'Material',
    modelo: 'Modelo',
    aroma: 'Aroma',
    capacidad: 'Capacidad',
  };

  const normalizarAtributosVariante = (valor) => {
    if (!valor) return {};
    if (typeof valor === 'object' && !Array.isArray(valor)) return valor;

    try {
      const convertido = JSON.parse(valor);
      return convertido && typeof convertido === 'object' && !Array.isArray(convertido)
        ? convertido
        : {};
    } catch {
      return {};
    }
  };

  const obtenerAtributosVisiblesVariante = (item = {}) => {
    if (!item?.id_variante && !item?.nombre_variante) return [];

    const atributosJson = normalizarAtributosVariante(item.atributos_variante);
    const valores = [];
    const clavesAgregadas = new Set();

    const agregar = (clave, valor, etiquetaPersonalizada = null) => {
      const texto = String(valor ?? '').trim();
      if (!texto || texto.toLowerCase() === 'null' || clavesAgregadas.has(clave)) return;

      clavesAgregadas.add(clave);
      valores.push({
        clave,
        etiqueta:
          etiquetaPersonalizada ||
          etiquetasAtributosVariante[clave] ||
          clave
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letra) => letra.toUpperCase()),
        valor: texto,
      });
    };

    agregar('talla', item.talla);
    agregar('color', item.color);
    agregar('tono', item.tono);
    agregar('presentacion', item.presentacion_variante);

    Object.entries(atributosJson).forEach(([clave, valor]) => {
      if (['talla', 'color', 'tono', 'presentacion'].includes(clave)) return;
      agregar(clave, valor);
    });

    return valores;
  };

  const obtenerEtiquetaVariante = (item = {}) => {
    if (!item?.id_variante && !item?.nombre_variante) return '';

    const nombre = String(item.nombre_variante || '').trim();
    if (nombre && nombre.toLowerCase() !== 'pieza') return nombre;

    const atributos = obtenerAtributosVisiblesVariante(item);
    if (atributos.length > 0) {
      return atributos.map((atributo) => atributo.valor).join(' · ');
    }

    return nombre || `Variante #${item.id_variante}`;
  };

  const obtenerCodigoVarianteVenta = (item = {}) => {
    return (
      item.codigo_barras_variante ||
      item.sku_variante ||
      item.codigo_barras ||
      '—'
    );
  };

  const iconoMetodo = (metodo) => {
    if (metodo === 'EFECTIVO') return <Banknote size={17} />;
    if (metodo === 'TARJETA') return <CreditCard size={17} />;
    return <FileText size={17} />;
  };

  const badgeEstado = (estado) => {
    if (estado === 'COMPLETADA') {
      return 'bg-[#FBEAF0] text-[#A84E6C]';
    }

    if (estado === 'DEVUELTA') {
      return 'bg-red-100 text-red-700';
    }

    if (estado === 'DEVUELTA_PARCIAL') {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-[#F8EDF1] text-[#766168]';
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

  const cargarVentas = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (idSucursal) {
        params.append('sucursal', idSucursal);
      }

      if (fechaInicio) {
        params.append('fecha_inicio', `${fechaInicio} 00:00:00`);
      }

      if (fechaFin) {
        params.append('fecha_fin', `${fechaFin} 23:59:59`);
      }

      const { data } = await api.get(`/ventas?${params.toString()}`);

      if (data.ok) {
        setVentas(data.ventas || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las ventas.',
      });
    } finally {
      setCargando(false);
    }
  };

  const verDetalleVenta = async (idVenta) => {
    try {
      setCargandoDetalle(true);
      setModalDetalle(true);

      const { data } = await api.get(`/ventas/${idVenta}`);

      if (data.ok) {
        setDetalleVenta(data.venta);
        setDetalleProductos(data.detalle || []);
        setDetalleLotes(data.lotes || []);
        setDetallePagos(data.pagos || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cargar el detalle de la venta.',
      });

      setModalDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setModalDetalle(false);
    setDetalleVenta(null);
    setDetalleProductos([]);
    setDetalleLotes([]);
    setDetallePagos([]);
    setTicketPrevisualizado('');
  };

  const abrirDevolucionVenta = async (idVenta) => {
    try {
      setCargandoDetalle(true);

      const { data } = await api.get(`/ventas/${idVenta}/devolucion-info`);

      if (data.ok) {
        setVentaDevolucion(data.venta);

        const productosPreparados = (data.productos || []).map((producto) => ({
          ...producto,
          cantidad_devolver: '',
        }));

        setDevolucionProductos(productosPreparados);
        setMotivoDevolucion('');
        setObservacionesDevolucion('');
        setModalDevolucion(true);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir devolución',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cargar la información de devolución.',
      });
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarModalDevolucion = () => {
    setModalDevolucion(false);
    setVentaDevolucion(null);
    setDevolucionProductos([]);
    setMotivoDevolucion('');
    setObservacionesDevolucion('');
  };

  const cambiarCantidadDevolucion = (idDetalle, valor) => {
    const cantidad = valor === '' ? '' : Math.max(Number(valor || 0), 0);

    setDevolucionProductos((prev) =>
      prev.map((producto) => {
        if (Number(producto.id_detalle) !== Number(idDetalle)) {
          return producto;
        }

        const disponible = Number(producto.cantidad_disponible_devolver || 0);
        const cantidadFinal =
          cantidad === '' ? '' : Math.min(Number(cantidad), disponible);

        return {
          ...producto,
          cantidad_devolver: cantidadFinal,
        };
      })
    );
  };

  const aplicarDevolucion = async () => {
    if (!ventaDevolucion) return;

    const productosSeleccionados = devolucionProductos
      .filter((producto) => Number(producto.cantidad_devolver || 0) > 0)
      .map((producto) => ({
        id_detalle: producto.id_detalle,
        cantidad: Number(producto.cantidad_devolver),
      }));

    if (productosSeleccionados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin productos',
        text: 'Selecciona al menos un producto para devolver.',
      });
      return;
    }

    if (!motivoDevolucion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Motivo obligatorio',
        text: 'Ingresa el motivo de la devolución.',
      });
      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Aplicar devolución?',
      html: `
        <div style="text-align:left">
          <p><b>Venta:</b> ${ventaDevolucion.folio}</p>
          <p><b>Método original:</b> ${ventaDevolucion.metodo_pago}</p>
          <p><b>Monto estimado:</b> ${formatoMoneda(totalEstimadoDevolucion)}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar devolución',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setGuardandoDevolucion(true);

      const { data } = await api.post(
        `/ventas/${ventaDevolucion.id_venta}/devolver`,
        {
          motivo: motivoDevolucion.trim(),
          observaciones: observacionesDevolucion.trim() || null,
          productos: productosSeleccionados,
        }
      );

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Devolución aplicada',
          text: data.mensaje,
          timer: 1500,
          showConfirmButton: false,
        });

        cerrarModalDevolucion();
        await cargarVentas();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo aplicar la devolución.',
      });
    } finally {
      setGuardandoDevolucion(false);
    }
  };

  const obtenerConfiguracionTicketParaImpresion = async (idSucursalVenta) => {
    try {
      const { data } = await api.get('/configuracion-ticket', {
        params:
          Number(idSucursalVenta) > 0
            ? { id_sucursal: Number(idSucursalVenta) }
            : {},
      });

      if (!data?.ok) {
        throw new Error(
          data?.mensaje || 'No se pudo obtener la configuración del ticket.'
        );
      }

      return data?.configuracion?.configuracion || null;
    } catch (error) {
      console.warn(
        'No se pudo cargar la configuración del ticket para la reimpresión:',
        error
      );

      return null;
    }
  };

  const construirDatosReimpresion = () => {
    if (!detalleVenta) return null;

    const idSucursalVenta = Number(
      detalleVenta.id_sucursal || idSucursal || 0
    );

    const sucursalVenta =
      sucursales.find(
        (sucursal) =>
          Number(sucursal.id_sucursal) === idSucursalVenta
      ) || sucursalActual;

    const productos = detalleProductos.map((item) => {
      const loteRelacionado =
        detalleLotes.find((lote) => {
          const mismoProducto =
            Number(lote.id_producto || 0) === Number(item.id_producto || 0);

          const mismoLote =
            !item.id_lote ||
            !lote.id_lote ||
            Number(lote.id_lote) === Number(item.id_lote);

          return mismoProducto && mismoLote;
        }) || null;

      const etiquetaVariante = obtenerEtiquetaVariante(item);

      return {
        id_producto: item.id_producto,
        id_variante: item.id_variante || null,
        id_lote: item.id_lote || loteRelacionado?.id_lote || null,
        nombre: etiquetaVariante
          ? `${item.producto || item.nombre || 'Producto'} · ${etiquetaVariante}`
          : item.producto || item.nombre || 'Producto',
        nombre_producto: item.producto || item.nombre || 'Producto',
        nombre_variante: item.nombre_variante || null,
        sku_variante: item.sku_variante || null,
        codigo_barras:
          item.codigo_barras_variante || item.codigo_barras || null,
        codigo_barras_variante: item.codigo_barras_variante || null,
        atributos_variante: item.atributos_variante || {},
        talla: item.talla || null,
        color: item.color || null,
        tono: item.tono || null,
        presentacion_variante: item.presentacion_variante || null,
        cantidad: Number(item.cantidad || 0),
        precio_unitario: Number(item.precio_unitario || 0),
        precio_venta: Number(item.precio_unitario || 0),
        descuento: Number(item.descuento || 0),
        subtotal: Number(item.subtotal || 0),
        lote: item.lote || loteRelacionado?.lote || null,
        fecha_caducidad:
          item.fecha_caducidad ||
          loteRelacionado?.fecha_caducidad ||
          null,
      };
    });

    const pagos = detallePagos.length > 0
      ? detallePagos.map((pago) => ({
          metodo_pago: pago.metodo_pago,
          monto: Number(pago.monto || 0),
          referencia: pago.referencia || null,
        }))
      : [
          {
            metodo_pago: detalleVenta.metodo_pago || 'EFECTIVO',
            monto: Number(detalleVenta.total || 0),
            referencia: null,
          },
        ];

    return {
      venta: {
        ...detalleVenta,
        id_sucursal: idSucursalVenta || detalleVenta.id_sucursal || null,

        sucursal:
          detalleVenta.sucursal ||
          sucursalVenta?.nombre ||
          sucursalVenta?.nombre_sucursal ||
          '',

        nombre_sucursal:
          detalleVenta.nombre_sucursal ||
          detalleVenta.sucursal ||
          sucursalVenta?.nombre ||
          sucursalVenta?.nombre_sucursal ||
          '',

        direccion_sucursal:
          detalleVenta.direccion_sucursal ||
          sucursalVenta?.direccion ||
          sucursalVenta?.domicilio ||
          '',

        telefono_sucursal:
          detalleVenta.telefono_sucursal ||
          sucursalVenta?.telefono ||
          sucursalVenta?.telefono_contacto ||
          '',

        productos,
        pagos,
      },

      resumen: {
        subtotal: Number(detalleVenta.subtotal || 0),
        subtotal_sin_descuento: Number(
          detalleVenta.subtotal_sin_descuento ||
          detalleVenta.subtotal ||
          0
        ),
        descuento_ofertas: Number(detalleVenta.descuento_ofertas || 0),
        descuento: Number(detalleVenta.descuento || 0),
        impuesto: Number(detalleVenta.impuesto || 0),
        total: Number(detalleVenta.total || 0),
        monto_recibido: Number(detalleVenta.monto_recibido || 0),
        cambio: Number(detalleVenta.cambio || 0),
        pagos,
      },

      /*
       * Esta bandera evita que una reimpresión abra la caja registradora.
       * Requiere el pequeño ajuste indicado en server.js.
       */
      no_abrir_caja: true,
      reimpresion: true,
    };
  };

  const prepararDatosReimpresion = async () => {
    const datosTicket = construirDatosReimpresion();

    if (!datosTicket?.venta) {
      throw new Error(
        'No se encontraron datos suficientes para reimprimir.'
      );
    }

    const configuracionConsultada =
      await obtenerConfiguracionTicketParaImpresion(
        datosTicket.venta.id_sucursal
      );

    const configuracionTicket =
      configuracionConsultada || {};

    const ventaTicket = datosTicket.venta || {};

    /*
     * Igual que en el POS, la configuración del ticket tiene prioridad sobre
     * los datos generales almacenados en la tabla de sucursales.
     */
    const nombreSucursalTicket = String(
      ventaTicket.nombre_sucursal ||
      ventaTicket.sucursal ||
      sucursalActual?.nombre ||
      sucursalActual?.nombre_sucursal ||
      ''
    ).trim();

    const direccionTicket = String(
      configuracionTicket.direccion ||
      ventaTicket.direccion_sucursal ||
      sucursalActual?.direccion ||
      sucursalActual?.domicilio ||
      ''
    ).trim();

    const telefonoTicket = String(
      configuracionTicket.telefono ||
      ventaTicket.telefono_sucursal ||
      sucursalActual?.telefono ||
      sucursalActual?.telefono_contacto ||
      ''
    ).trim();

    const rfcTicket = String(
      configuracionTicket.rfc ||
      ventaTicket.rfc ||
      ventaTicket.rfc_sucursal ||
      sucursalActual?.rfc ||
      sucursalActual?.rfc_sucursal ||
      ''
    ).trim();

    const mostrarRfcTicket = normalizarBooleanoTicket(
      configuracionTicket.mostrar_rfc ??
      ventaTicket.mostrar_rfc,
      true
    );

    const anchoTicketLocal = obtenerAnchoTicketLocal(
      configuracionTicket
    );

    /*
     * El encabezado y el pie se dividen antes de enviarlos para evitar que la
     * API local recorte correos, URLs o palabras largas. La misma preparación
     * se utiliza para vista previa y para la impresión física.
     */
    const encabezadoTicketPreparado =
      prepararLineasConfiguracionTicketLocal(
        configuracionTicket.encabezado || [],
        anchoTicketLocal
      );

    const pieTicketPreparado =
      prepararLineasConfiguracionTicketLocal(
        configuracionTicket.pie_ticket || [],
        anchoTicketLocal
      );

    const configuracionTicketFinal = {
      ...configuracionTicket,
      encabezado: encabezadoTicketPreparado,
      pie_ticket: pieTicketPreparado,
      rfc: rfcTicket,
      mostrar_rfc: mostrarRfcTicket,
      direccion: direccionTicket,
      telefono: telefonoTicket,
    };

    return {
      ...datosTicket,

      /*
       * Compatibilidad con las distintas versiones de la API local.
       */
      rfc: rfcTicket,
      rfc_sucursal: rfcTicket,
      mostrar_rfc: mostrarRfcTicket,

      venta: {
        ...ventaTicket,
        sucursal: nombreSucursalTicket,
        nombre_sucursal: nombreSucursalTicket,
        direccion_sucursal: direccionTicket,
        telefono_sucursal: telefonoTicket,
        rfc: rfcTicket,
        rfc_sucursal: rfcTicket,
        mostrar_rfc: mostrarRfcTicket,
      },

      configuracion_ticket: configuracionTicketFinal,

      /*
       * Una reimpresión jamás debe abrir la caja registradora.
       */
      no_abrir_caja: true,
      reimpresion: true,
    };
  };

  const llamarApiImpresionLocal = async (endpoint, datosTicket) => {
    const response = await fetch(`${API_IMPRESION_LOCAL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-printer-key': PRINTER_KEY,
      },
      body: JSON.stringify(datosTicket),
    });

    let data = {};

    try {
      data = await response.json();
    } catch (_) {
      data = {};
    }

    if (!response.ok || !data.ok) {
      throw new Error(
        data.message ||
        data.mensaje ||
        'No se pudo procesar la reimpresión del ticket.'
      );
    }

    return data;
  };

  const cargarVistaPreviaTicket = async () => {
    try {
      setCargandoTicket(true);

      const datosTicket = await prepararDatosReimpresion();

      const data = await llamarApiImpresionLocal(
        '/vista-previa-ticket',
        datosTicket
      );

      const ticketOriginal = String(data.ticket || '');

      const configuracionTicket =
        datosTicket.configuracion_ticket || {};

      const ticket = ajustarRfcVistaPreviaLocal({
        ticket: ticketOriginal,
        rfc:
          configuracionTicket.rfc ||
          datosTicket.venta?.rfc ||
          datosTicket.rfc ||
          '',
        mostrarRfc: normalizarBooleanoTicket(
          configuracionTicket.mostrar_rfc ??
          datosTicket.venta?.mostrar_rfc ??
          datosTicket.mostrar_rfc,
          true
        ),
        configuracion: configuracionTicket,
      });

      if (!ticket.trim()) {
        throw new Error(
          'La API local no devolvió el contenido de la vista previa.'
        );
      }

      setTicketPrevisualizado(ticket);
      return true;
    } catch (error) {
      console.error('Error al generar vista previa de reimpresión:', error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo generar el ticket',
        text:
          error.message ||
          'Verifica que la API local de impresión esté abierta.',
      });

      return false;
    } finally {
      setCargandoTicket(false);
    }
  };

  const abrirTicket = async () => {
    if (!detalleVenta) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin venta',
        text: 'Primero carga el detalle de una venta.',
      });
      return;
    }

    setTicketPrevisualizado('');
    setModalTicket(true);

    await cargarVistaPreviaTicket();
  };

  const cerrarTicket = () => {
    if (cargandoTicket || reimprimiendoTicket) return;

    setModalTicket(false);
    setTicketPrevisualizado('');
  };

  const reimprimirTicket = async () => {
    try {
      setReimprimiendoTicket(true);

      /*
       * En modo de pruebas actualiza la misma vista previa.
       * Con modoPrueba: false, envía el ticket a la impresora local.
       */
      if (MODO_PRUEBA_TICKET) {
        await cargarVistaPreviaTicket();
        return;
      }

      const datosTicket = await prepararDatosReimpresion();

      await llamarApiImpresionLocal(
        '/imprimir-ticket',
        datosTicket
      );

      Swal.fire({
        icon: 'success',
        title: 'Ticket reimpreso',
        text: 'El ticket fue enviado a la impresora sin abrir la caja.',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error al reimprimir ticket:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error de reimpresión',
        text:
          error.message ||
          'No se pudo reimprimir el ticket. Verifica que la API local esté abierta.',
      });
    } finally {
      setReimprimiendoTicket(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarSucursales();
    }
  }, [usuario]);

  useEffect(() => {
    if (idSucursal) {
      cargarVentas();
    }
  }, [idSucursal]);

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 sm:space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#B85F7D]">
              <ReceiptText size={24} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#B85F7D]">
                <Sparkles size={13} />
                Historial comercial
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Ventas
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                Consulta operaciones, métodos de pago, productos vendidos,
                lotes, devoluciones y tickets por sucursal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cargarVentas}
            disabled={!idSucursal || cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {cargando ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} />
            )}
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Sucursal
            </label>

            {puedeCambiarSucursal ? (
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}
                className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
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
              <div className="w-full min-w-0 truncate rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] px-4 py-3 text-sm font-bold text-[#66535A]">
                {sucursalActual?.nombre ||
                  sucursales[0]?.nombre ||
                  'Sucursal asignada'}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Fecha inicio
            </label>

            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
            />
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Fecha fin
            </label>

            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={cargarVentas}
              disabled={!idSucursal || cargando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.22)] transition hover:-translate-y-0.5 hover:bg-[#A95270] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={18} />
              Buscar
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <VentaKpi
          titulo="Ventas"
          valor={resumen.totalVentas}
          detalle={sucursalActual?.nombre || 'Sucursal asignada'}
          icono={ReceiptText}
          claseIcono="bg-[#FBEAF0] text-[#B85F7D]"
        />

        <VentaKpi
          titulo="Total vendido"
          valor={formatoMoneda(resumen.totalImporte)}
          detalle="Importe acumulado"
          icono={Wallet}
          claseIcono="bg-[#FFF1F5] text-[#A84E6C]"
        />

        <VentaKpi
          titulo="Efectivo"
          valor={formatoMoneda(resumen.efectivo)}
          detalle="Cobrado en efectivo"
          icono={Banknote}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <VentaKpi
          titulo="Tarjeta"
          valor={formatoMoneda(resumen.tarjeta)}
          detalle="Pagos con tarjeta"
          icono={CreditCard}
          claseIcono="bg-[#F0EBF6] text-[#765D8D]"
        />

        <VentaKpi
          titulo="Transferencia"
          valor={formatoMoneda(resumen.transferencia)}
          detalle="Pagos bancarios"
          icono={FileText}
          claseIcono="bg-amber-50 text-amber-700"
        />

        <VentaKpi
          titulo="Devoluciones"
          valor={formatoMoneda(resumen.devoluciones)}
          detalle="Ventas devueltas"
          icono={Undo2}
          claseIcono="bg-red-50 text-red-700"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#B85F7D]">
              <TrendingUp size={12} />
              Operaciones registradas
            </div>

            <h2 className="mt-3 text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
              Listado de ventas
            </h2>

            <p className="mt-1 text-sm text-[#8C777F]">
              Consulta ventas, productos, pagos, lotes y devoluciones.
            </p>
          </div>

          <span className="shrink-0 rounded-full bg-[#FBEAF0] px-3 py-1.5 text-xs font-black text-[#A84E6C]">
            {ventas.length} venta(s)
          </span>
        </div>

        <div className="md:hidden p-4 space-y-3">
          {cargando ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8C777F] font-semibold">
              Cargando ventas...
            </div>
          ) : ventas.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8C777F] font-semibold">
              No hay ventas registradas.
            </div>
          ) : (
            ventas.map((venta) => (
              <article
                key={venta.id_venta}
                className="rounded-2xl border border-[#F0E4E8] p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)] bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#43353A] break-words">
                      {venta.folio}
                    </p>
                    <p className="text-xs text-[#AA939B] mt-1">
                      ID #{venta.id_venta}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${badgeEstado(
                      venta.estado
                    )}`}
                  >
                    {venta.estado}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-[#FFFAFB] p-3">
                  <p className="text-xs text-[#8C777F]">Fecha</p>
                  <p className="font-semibold text-[#66535A]">
                    {formatoFecha(venta.fecha_venta)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F] flex items-center gap-1">
                      <Store size={15} />
                      Sucursal / Caja
                    </p>
                    <p className="font-bold text-[#43353A] mt-1 break-words">
                      {venta.sucursal}
                    </p>
                    <p className="text-xs text-[#8C777F] break-words">
                      {venta.caja} · Sesión #{venta.id_sesion}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F]">Usuario</p>
                    <p className="font-semibold text-[#66535A] break-words">
                      {venta.usuario || '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-[#F8EDF1] text-[#66535A]">
                    {iconoMetodo(venta.metodo_pago)}
                    {venta.metodo_pago}
                  </span>

                  <span className="inline-flex text-xs font-bold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#A84E6C]">
                    Total: {formatoMoneda(venta.total)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F]">Subtotal</p>
                    <p className="font-bold text-[#66535A]">
                      {formatoMoneda(venta.subtotal)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs text-red-700">Descuento</p>
                    <p className="font-bold text-red-700">
                      -{formatoMoneda(venta.descuento)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FFF2F5] p-3">
                    <p className="text-xs text-[#A84E6C]">Total</p>
                    <p className="font-bold text-[#8F405C]">
                      {formatoMoneda(venta.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => verDetalleVenta(venta.id_venta)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#F0EBF6] text-[#765D8D] hover:bg-[#E8E0F0] font-bold transition"
                  >
                    <Eye size={18} />
                    Ver detalle
                  </button>

                  {['COMPLETADA', 'DEVUELTA_PARCIAL'].includes(venta.estado) && (
                    <button
                      onClick={() => abrirDevolucionVenta(venta.id_venta)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold transition"
                    >
                      <Undo2 size={18} />
                      Devolver
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead className="bg-[#FFFAFB] border-b border-[#F0E4E8]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Folio
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Fecha
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Sucursal / Caja
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Usuario
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8C777F] uppercase">
                  Método
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8C777F] uppercase">
                  Subtotal
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8C777F] uppercase">
                  Descuento
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8C777F] uppercase">
                  Total
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase">
                  Estado
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8C777F] uppercase sticky right-0 bg-[#FFFAFB] shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] z-10">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td colSpan="10" className="px-5 py-10 text-center text-[#8C777F]">
                    Cargando ventas...
                  </td>
                </tr>
              ) : ventas.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-10 text-center text-[#8C777F]">
                    No hay ventas registradas.
                  </td>
                </tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id_venta} className="hover:bg-[#FFFAFB]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#43353A]">
                        {venta.folio}
                      </p>
                      <p className="text-xs text-[#AA939B] mt-1">
                        ID #{venta.id_venta}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      {formatoFecha(venta.fecha_venta)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <Store
                          size={17}
                          className="text-[#AA939B] mt-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#43353A]">
                            {venta.sucursal}
                          </p>
                          <p className="text-xs text-[#8C777F]">
                            {venta.caja} · Sesión #{venta.id_sesion}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      {venta.usuario}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-[#F8EDF1] text-[#66535A]">
                        {iconoMetodo(venta.metodo_pago)}
                        {venta.metodo_pago}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-[#766168]">
                      {formatoMoneda(venta.subtotal)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-red-600">
                      -{formatoMoneda(venta.descuento)}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-[#A84E6C]">
                      {formatoMoneda(venta.total)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${badgeEstado(
                          venta.estado
                        )}`}
                      >
                        {venta.estado}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)]">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => verDetalleVenta(venta.id_venta)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F0EBF6] text-[#765D8D] hover:bg-[#E8E0F0] font-bold transition"
                        >
                          <Eye size={17} />
                          Ver
                        </button>

                        {['COMPLETADA', 'DEVUELTA_PARCIAL'].includes(venta.estado) && (
                          <button
                            onClick={() => abrirDevolucionVenta(venta.id_venta)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold transition"
                          >
                            <Undo2 size={17} />
                            Devolver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalDetalle && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm"
            onClick={cerrarDetalle}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Detalle de venta
                </h2>
                <p className="text-sm text-[#8C777F] break-words">
                  {detalleVenta?.folio || 'Cargando...'}
                </p>
              </div>

              <button
                onClick={cerrarDetalle}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh]">
              {cargandoDetalle ? (
                <div className="text-center py-10 text-[#8C777F]">
                  Cargando detalle...
                </div>
              ) : detalleVenta ? (
                <div className="space-y-6">
                  <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                      <p className="text-sm text-[#8C777F]">Fecha</p>
                      <p className="font-bold text-[#43353A] mt-1 break-words">
                        {formatoFecha(detalleVenta.fecha_venta)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                      <p className="text-sm text-[#8C777F]">Sucursal</p>
                      <p className="font-bold text-[#43353A] mt-1 break-words">
                        {detalleVenta.sucursal}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                      <p className="text-sm text-[#8C777F]">Caja</p>
                      <p className="font-bold text-[#43353A] mt-1 break-words">
                        {detalleVenta.caja} · Sesión #{detalleVenta.id_sesion}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                      <p className="text-sm text-[#8C777F]">Cajero</p>
                      <p className="font-bold text-[#43353A] mt-1 break-words">
                        {detalleVenta.usuario}
                      </p>
                    </div>
                  </section>

                  <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-[#FFF2F5] p-4 min-w-0">
                      <p className="text-sm text-[#A84E6C]">Total</p>
                      <p className="text-2xl font-bold text-[#8F405C] mt-1 break-words">
                        {formatoMoneda(detalleVenta.total)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#F0EBF6] p-4 min-w-0">
                      <p className="text-sm text-[#765D8D]">Método</p>
                      <p className="font-bold text-[#624A78] mt-1 break-words">
                        {detalleVenta.metodo_pago}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                      <p className="text-sm text-[#8C777F]">Recibido</p>
                      <p className="font-bold text-[#43353A] mt-1 break-words">
                        {formatoMoneda(detalleVenta.monto_recibido)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                      <p className="text-sm text-[#8C777F]">Cambio</p>
                      <p className="font-bold text-[#43353A] mt-1 break-words">
                        {formatoMoneda(detalleVenta.cambio)}
                      </p>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="text-[#A84E6C] shrink-0" size={22} />
                      <h3 className="text-lg font-bold text-[#43353A]">
                        Productos vendidos
                      </h3>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-[#F0E4E8]">
                      <table className="w-full min-w-[850px]">
                        <thead className="bg-[#FFFAFB]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                              Producto
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                              Código
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                              Cantidad
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                              Precio
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                              Descuento
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                              Subtotal
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-[#F5EAED]">
                          {detalleProductos.length === 0 ? (
                            <tr>
                              <td
                                colSpan="6"
                                className="px-4 py-8 text-center text-[#8C777F]"
                              >
                                No hay productos asociados.
                              </td>
                            </tr>
                          ) : (
                            detalleProductos.map((item) => {
                              const etiquetaVariante = obtenerEtiquetaVariante(item);
                              const atributosVariante = obtenerAtributosVisiblesVariante(item);

                              return (
                                <tr key={item.id_detalle}>
                                  <td className="px-4 py-3">
                                    <p className="font-bold text-[#43353A]">
                                      {item.producto}
                                    </p>

                                    {item.id_variante && (
                                      <div className="mt-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="rounded-full bg-[#F0EBF6] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#765D8D]">
                                            Variante
                                          </span>
                                          <span className="text-xs font-black text-[#765D8D]">
                                            {etiquetaVariante}
                                          </span>
                                        </div>

                                        {atributosVariante.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-semibold text-[#8C777F]">
                                            {atributosVariante.map((atributo) => (
                                              <span key={`${item.id_detalle}-${atributo.clave}`}>
                                                {atributo.etiqueta}: {atributo.valor}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-[#766168]">
                                  <p className="font-semibold">
                                    {obtenerCodigoVarianteVenta(item)}
                                  </p>
                                  {item.sku_variante && (
                                    <p className="mt-0.5 text-[11px] text-[#9A858D]">
                                      SKU: {item.sku_variante}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right font-bold">
                                  {formatoNumero(item.cantidad)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {formatoMoneda(item.precio_unitario)}
                                </td>
                                <td className="px-4 py-3 text-right text-red-600">
                                  -{formatoMoneda(item.descuento)}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-[#A84E6C]">
                                  {formatoMoneda(item.subtotal)}
                                </td>
                              </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Boxes className="shrink-0 text-[#765D8D]" size={22} />
                      <h3 className="text-lg font-bold text-[#43353A]">
                        Lotes utilizados
                      </h3>
                    </div>

                    {detalleLotes.length === 0 ? (
                      <div className="rounded-2xl bg-[#FFFAFB] p-5 text-center text-[#8C777F]">
                        No hay lotes asociados a esta venta.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-[#F0E4E8]">
                        <table className="w-full min-w-[900px]">
                          <thead className="bg-[#FFFAFB]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                                Producto
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                                Lote
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                                Caducidad
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                                Cantidad
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                                Stock anterior
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                                Stock nuevo
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-[#F5EAED]">
                            {detalleLotes.map((lote) => (
                              <tr key={lote.id_movimiento}>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-[#43353A]">
                                    {lote.producto}
                                  </p>
                                  {lote.id_variante && (
                                    <p className="mt-1 text-xs font-black text-[#765D8D]">
                                      {obtenerEtiquetaVariante(lote)}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[#766168]">
                                  {lote.lote || '—'}
                                </td>
                                <td className="px-4 py-3 text-[#766168]">
                                  {lote.fecha_caducidad
                                    ? new Date(lote.fecha_caducidad).toLocaleDateString('es-MX')
                                    : 'Sin fecha'}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-red-700">
                                  {formatoNumero(lote.cantidad)}
                                </td>
                                <td className="px-4 py-3 text-right text-[#766168]">
                                  {formatoNumero(lote.stock_anterior)}
                                </td>
                                <td className="px-4 py-3 text-right text-[#A84E6C] font-bold">
                                  {formatoNumero(lote.stock_nuevo)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="flex flex-col sm:flex-row justify-end gap-3">
                    {['COMPLETADA', 'DEVUELTA_PARCIAL'].includes(
                      detalleVenta.estado
                    ) && (
                        <button
                          onClick={() => abrirDevolucionVenta(detalleVenta.id_venta)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition"
                        >
                          <Undo2 size={19} />
                          Devolver
                        </button>
                      )}

                  {/*  <button
                      onClick={abrirTicket}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#44353B] hover:bg-[#35292E] text-white font-bold transition"
                    >
                      <ReceiptText size={19} />
                      Ver ticket
                    </button>
                     */}
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {modalDevolucion && ventaDevolucion && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/65 backdrop-blur-sm"
            onClick={cerrarModalDevolucion}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Devolución de venta
                </h2>
                <p className="text-sm text-[#8C777F] break-words">
                  {ventaDevolucion.folio} · {ventaDevolucion.metodo_pago}
                </p>
              </div>

              <button
                onClick={cerrarModalDevolucion}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[72vh] space-y-5">
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-[#FFFAFB] p-4">
                  <p className="text-sm text-[#8C777F]">Total venta</p>
                  <p className="text-xl font-bold text-[#43353A]">
                    {formatoMoneda(ventaDevolucion.total)}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">Monto a devolver</p>
                  <p className="text-xl font-bold text-amber-800">
                    {formatoMoneda(totalEstimadoDevolucion)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F0EBF6] p-4">
                  <p className="text-sm text-[#765D8D]">Método original</p>
                  <p className="text-xl font-bold text-[#624A78]">
                    {ventaDevolucion.metodo_pago}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFFAFB] p-4">
                  <p className="text-sm text-[#8C777F]">Ya devuelto</p>
                  <p className="text-xl font-bold text-[#43353A]">
                    {formatoMoneda(ventaDevolucion.monto_devuelto)}
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-[#43353A] mb-3">
                  Productos disponibles para devolución
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-[#F0E4E8]">
                  <table className="w-full min-w-[850px]">
                    <thead className="bg-[#FFFAFB]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                          Lote
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                          Vendido
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                          Ya devuelto
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                          Disponible
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-[#8C777F] uppercase">
                          A devolver
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F5EAED]">
                      {devolucionProductos.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            className="px-4 py-8 text-center text-[#8C777F]"
                          >
                            No hay productos disponibles para devolución.
                          </td>
                        </tr>
                      ) : (
                        devolucionProductos.map((producto) => {
                          const disponible = Number(
                            producto.cantidad_disponible_devolver || 0
                          );

                          return (
                            <tr key={producto.id_detalle}>
                              <td className="px-4 py-3">
                                <p className="font-bold text-[#43353A]">
                                  {producto.producto}
                                </p>

                                {producto.id_variante && (
                                  <div className="mt-1">
                                    <p className="text-xs font-black text-[#765D8D]">
                                      {obtenerEtiquetaVariante(producto)}
                                    </p>
                                    <p className="text-[11px] text-[#9A858D]">
                                      Variante #{producto.id_variante}
                                    </p>
                                  </div>
                                )}

                                <p className="mt-1 text-xs text-[#8C777F]">
                                  Código: {obtenerCodigoVarianteVenta(producto)}
                                </p>
                                {producto.sku_variante && (
                                  <p className="text-[11px] text-[#9A858D]">
                                    SKU: {producto.sku_variante}
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-3 text-[#766168]">
                                {producto.lote || 'Sin lote'}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold">
                                {formatoNumero(producto.cantidad)}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-amber-700">
                                {formatoNumero(producto.cantidad_devuelta)}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-[#A84E6C]">
                                {formatoNumero(disponible)}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={disponible}
                                  step="1"
                                  disabled={disponible <= 0}
                                  value={producto.cantidad_devolver}
                                  onChange={(e) =>
                                    cambiarCantidadDevolucion(
                                      producto.id_detalle,
                                      e.target.value
                                    )
                                  }
                                  className="w-28 rounded-xl border border-[#EEDFE4] bg-[#FFFBFC] px-3 py-2 text-center font-bold text-[#5D4A51] outline-none transition focus:border-[#D79B67] focus:ring-4 focus:ring-amber-100 disabled:bg-[#F8EDF1]"
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Motivo *
                  </label>
                  <textarea
                    rows="3"
                    value={motivoDevolucion}
                    onChange={(e) => setMotivoDevolucion(e.target.value)}
                    className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D79B67] focus:ring-4 focus:ring-amber-100"
                    placeholder="Ej. Cliente devolvió el producto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows="3"
                    value={observacionesDevolucion}
                    onChange={(e) => setObservacionesDevolucion(e.target.value)}
                    className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D79B67] focus:ring-4 focus:ring-amber-100"
                    placeholder="Opcional"
                  />
                </div>
              </section>

              {ventaDevolucion.metodo_pago !== 'EFECTIVO' && (
                <div className="rounded-2xl bg-[#F0EBF6] border border-[#E4DBEC] p-4 text-sm text-[#624A78]">
                  Esta devolución corresponde a un pago por{' '}
                  {ventaDevolucion.metodo_pago}. Se registrará para control, pero
                  no debe disminuir el efectivo físico de caja.
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 py-5 border-t border-[#F0E4E8] flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={cerrarModalDevolucion}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] text-[#66535A] font-bold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={aplicarDevolucion}
                disabled={guardandoDevolucion || totalEstimadoDevolucion <= 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition disabled:opacity-60"
              >
                <Undo2 size={19} />
                {guardandoDevolucion ? 'Aplicando...' : 'Aplicar devolución'}
              </button>
            </div>
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

      {modalTicket && detalleVenta && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/65 backdrop-blur-sm"
            onClick={cerrarTicket}
          />

          <div className="relative flex h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[92dvh] sm:rounded-[2rem] my-auto">
            <div className="shrink-0 px-4 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  {MODO_PRUEBA_TICKET
                    ? 'Vista previa de reimpresión'
                    : 'Reimpresión de ticket'}
                </h2>

                <p className="text-sm text-[#8C777F] break-words">
                  {detalleVenta.folio}
                </p>

                <p className="mt-1 text-xs text-[#AA939B]">
                  {MODO_PRUEBA_TICKET
                    ? 'Generado por la API local. No se imprime ni abre caja.'
                    : 'Se enviará a la impresora local sin abrir la caja.'}
                </p>
              </div>

              <button
                onClick={cerrarTicket}
                disabled={cargandoTicket || reimprimiendoTicket}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-200 p-4 sm:p-6">
              {cargandoTicket ? (
                <div className="flex min-h-[360px] items-center justify-center">
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-[#766168] shadow-[0_12px_40px_rgba(118,76,91,0.05)]">
                    <Loader2 className="animate-spin text-[#A84E6C]" size={21} />
                    Generando ticket desde la API local...
                  </div>
                </div>
              ) : ticketPrevisualizado ? (
                <pre className="mx-auto w-fit min-w-[290px] max-w-full overflow-x-auto bg-white px-4 py-5 font-mono text-[12px] leading-[1.4] text-slate-900 shadow-lg whitespace-pre">
                  {ticketPrevisualizado}
                </pre>
              ) : (
                <div className="rounded-2xl bg-white p-8 text-center text-sm text-[#8C777F] shadow-[0_12px_40px_rgba(118,76,91,0.05)]">
                  No se pudo generar la vista previa del ticket.
                </div>
              )}
            </div>

            <div className="shrink-0 px-4 py-5 border-t border-[#F0E4E8] flex flex-col justify-end gap-3 sm:flex-row sm:px-6">
              <button
                onClick={cerrarTicket}
                disabled={cargandoTicket || reimprimiendoTicket}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] text-[#66535A] font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cerrar
              </button>

              <button
                onClick={reimprimirTicket}
                disabled={
                  cargandoTicket ||
                  reimprimiendoTicket ||
                  !ticketPrevisualizado
                }
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B85F7D] hover:bg-[#A95270] text-white font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reimprimiendoTicket ? (
                  <Loader2 className="animate-spin" size={19} />
                ) : MODO_PRUEBA_TICKET ? (
                  <RefreshCw size={19} />
                ) : (
                  <ReceiptText size={19} />
                )}

                {reimprimiendoTicket
                  ? MODO_PRUEBA_TICKET
                    ? 'Actualizando...'
                    : 'Reimprimiendo...'
                  : MODO_PRUEBA_TICKET
                    ? 'Actualizar vista previa'
                    : 'Reimprimir ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VentaKpi({
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

      <p className="mt-1 break-words text-2xl font-black tracking-[-0.035em] text-[#3A2F33]">
        {valor}
      </p>

      <p className="mt-2 truncate text-[11px] font-semibold text-[#AA939B]">
        {detalle}
      </p>
    </div>
  );
}

