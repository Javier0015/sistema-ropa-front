import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Boxes,
  Search,
  Pencil,
  RefreshCw,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  History,
  X,
  Save,
  Package,
  Warehouse,
  Loader2,
  FileSpreadsheet,
  Sparkles,
  MoreHorizontal,
  CalendarClock,
  Layers3,
  MapPin,
  BadgeDollarSign,
  Eye,
  Camera,
  ImagePlus,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

const formAsignarInicial = {
  id_sucursal: '',
  id_producto: '',
  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // id_proveedor: '',
  stock_inicial: '',
  stock_minimo: '',
  ubicacion: '',
  lote: '',
  fecha_caducidad: '',
  precio_compra: '',
  observaciones: '',
  variantes: [],
};

const formMovimientoInicial = {
  id_sucursal: '',
  id_producto: '',
  id_variante: '',
  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // id_proveedor: '',
  id_lote: '',
  tipo_movimiento: 'ENTRADA',
  cantidad: '',
  stock_minimo: '',
  ubicacion: '',
  lote: '',
  fecha_caducidad: '',
  precio_compra: '',
  referencia: '',
  observaciones: '',
};

const formEditarLoteInicial = {
  id_lote: '',
  id_variante: '',
  nombre_variante: '',
  // SKU DESHABILITADO TEMPORALMENTE
  // sku: '',
  codigo_barras_variante: '',
  precio_venta_variante: '',
  atributos_variante: {},
  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // id_proveedor: '',
  lote: '',
  fecha_caducidad: '',
  precio_compra: '',
  ubicacion: '',
  stock_actual: '',
  observaciones_stock: '',
};

const tiposMovimiento = [
  { value: 'ENTRADA', label: 'Entrada', tipo: 'entrada' },
  { value: 'SALIDA', label: 'Salida', tipo: 'salida' },
  { value: 'AJUSTE_POSITIVO', label: 'Ajuste positivo', tipo: 'entrada' },
  { value: 'AJUSTE_NEGATIVO', label: 'Ajuste negativo', tipo: 'salida' },
  { value: 'MERMA', label: 'Merma', tipo: 'salida' },
  { value: 'CADUCIDAD', label: 'Caducidad', tipo: 'salida' },
  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // { value: 'DEVOLUCION_PROVEEDOR', label: 'Devolución proveedor', tipo: 'salida' },
];

const movimientosEntrada = tiposMovimiento
  .filter((tipo) => tipo.tipo === 'entrada')
  .map((tipo) => tipo.value);

const movimientosSalida = tiposMovimiento
  .filter((tipo) => tipo.tipo === 'salida')
  .map((tipo) => tipo.value);

const movimientosConLoteExistente = [
  'SALIDA',
  'AJUSTE_NEGATIVO',
  'MERMA',
  'CADUCIDAD',
  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // 'DEVOLUCION_PROVEEDOR',
  'DEVOLUCION_CLIENTE',
];

const movimientosBajaTotalLote = ['CADUCIDAD'];

const movimientosPermitenNuevoLote = [
  'ENTRADA',
  'AJUSTE_POSITIVO',
];

const normalizarTexto = (valor) => {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const esVerdadero = (valor) => {
  return valor === true || valor === 'true' || valor === 1 || valor === '1';
};

const configuracionVariantesDefault = {
  talla: false,
  color: false,
  tono: false,
  genero: false,
  presentacion: false,
  material: false,
  modelo: false,
  aroma: false,
  capacidad: false,
  precio: false,
  personalizados: [],
};

const definicionesVariantes = {
  talla: {
    etiqueta: 'Talla / medida',
    placeholder: 'Ej. CH, M, G, 26, 28',
  },
  color: {
    etiqueta: 'Color',
    placeholder: 'Ej. Negro, Rosa, Azul marino',
  },
  tono: {
    etiqueta: 'Tono',
    placeholder: 'Ej. 05 Nude, Claro, Oscuro',
  },
  genero: {
    etiqueta: 'Género / línea',
    placeholder: 'Selecciona...',
    tipo: 'select',
    opciones: ['Hombre', 'Mujer', 'Unisex', 'Niño', 'Niña'],
  },
  presentacion: {
    etiqueta: 'Presentación',
    placeholder: 'Ej. Pieza, caja, set',
  },
  material: {
    etiqueta: 'Material',
    placeholder: 'Ej. Algodón, piel, poliéster',
  },
  modelo: {
    etiqueta: 'Modelo / estilo',
    placeholder: 'Ej. Slim, clásico, deportivo',
  },
  aroma: {
    etiqueta: 'Aroma',
    placeholder: 'Ej. Floral, cítrico, vainilla',
  },
  capacidad: {
    etiqueta: 'Capacidad / volumen',
    placeholder: 'Ej. 50 ml, 100 ml, 500 g',
  },
};

const normalizarConfiguracionVariantes = (valor) => {
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
    ...configuracionVariantesDefault,
    ...origen,
    personalizados: Array.isArray(origen.personalizados)
      ? origen.personalizados
        .map((item) => ({
          clave: String(item?.clave || '').trim(),
          etiqueta: String(item?.etiqueta || '').trim(),
        }))
        .filter((item) => item.clave && item.etiqueta)
      : [],
  };
};

const obtenerCamposVariantes = (configuracion) => {
  const config = normalizarConfiguracionVariantes(configuracion);

  const camposBase = Object.entries(definicionesVariantes)
    .filter(([clave]) => esVerdadero(config[clave]))
    .map(([clave, definicion]) => ({
      clave,
      ...definicion,
    }));

  const personalizados = (config.personalizados || []).map((item) => ({
    clave: item.clave,
    etiqueta: item.etiqueta,
    placeholder: `Ej. ${item.etiqueta}`,
  }));

  return [...camposBase, ...personalizados];
};

let consecutivoVarianteTemporal = 0;

const crearVarianteInventario = (campos = [], precioVentaBase = '') => {
  consecutivoVarianteTemporal += 1;

  const atributos = {};
  campos.forEach((campo) => {
    atributos[campo.clave] = '';
  });

  return {
    id_temporal: `var-${Date.now()}-${consecutivoVarianteTemporal}`,
    nombre_variante: '',
    // SKU DESHABILITADO TEMPORALMENTE
    // sku: '',
    codigo_barras: '',
    precio_venta:
      precioVentaBase !== undefined &&
        precioVentaBase !== null &&
        precioVentaBase !== ''
        ? String(precioVentaBase)
        : '',
    stock_inicial: '',
    imagen_archivo: null,
    imagen_preview: '',
    atributos,
  };
};

const obtenerNombreVariante = (variante, campos = []) => {
  const nombreManual = String(variante?.nombre_variante || '').trim();

  if (nombreManual) return nombreManual;

  const partes = campos
    .map((campo) => String(variante?.atributos?.[campo.clave] || '').trim())
    .filter(Boolean);

  if (partes.length > 0) {
    return partes.join(' · ');
  }

  /*
   * Cuando el precio es la única configuración de variante no existen
   * atributos estructurales (talla, color, etc.). En ese caso utilizamos
   * el precio como etiqueta visible de la variante.
   */
  const precio = Number(variante?.precio_venta);

  if (
    variante?.precio_venta !== undefined &&
    variante?.precio_venta !== null &&
    variante?.precio_venta !== '' &&
    Number.isFinite(precio) &&
    precio >= 0
  ) {
    return `Precio $${precio.toFixed(2)}`;
  }

  return 'Variante';
};

const obtenerEtiquetaVarianteGuardada = (variante) => {
  if (!variante) return 'Variante';

  const atributos =
    variante.atributos &&
      typeof variante.atributos === 'object' &&
      !Array.isArray(variante.atributos)
      ? variante.atributos
      : {};

  return (
    variante.nombre_variante ||
    [
      variante.talla,
      variante.color,
      variante.tono,
      variante.presentacion,
      atributos.genero,
      atributos.material,
      atributos.modelo,
      atributos.aroma,
      atributos.capacidad,
    ]
      .filter(Boolean)
      .join(' · ') ||
    // SKU DESHABILITADO TEMPORALMENTE
    // variante.sku ||
    `Variante #${variante.id_variante || ''}`
  );
};

function ProductoSearchSelect({
  name,
  value,
  opciones = [],
  placeholder = 'Buscar producto...',
  emptyText = 'No se encontraron productos.',
  disabled = false,
  onChange,
  getValue,
  getTitle,
  getSubtitle,
  getRightText,
}) {
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);

  const productoSeleccionado = useMemo(() => {
    return opciones.find(
      (item) => String(getValue(item)) === String(value)
    );
  }, [opciones, value, getValue]);

  useEffect(() => {
    if (productoSeleccionado) {
      setTextoBusqueda(getTitle(productoSeleccionado));
    } else if (!value) {
      setTextoBusqueda('');
    }
  }, [productoSeleccionado, value, getTitle]);

  const opcionesFiltradas = useMemo(() => {
    const texto = normalizarTexto(textoBusqueda);

    if (!texto) {
      return opciones.slice(0, 25);
    }

    return opciones
      .filter((item) => {
        const busqueda = normalizarTexto([
          getTitle(item),
          getSubtitle?.(item),
          getRightText?.(item),
          item.codigo_barras,
          item.codigo,
          item.marca,
          item.presentacion,
          item.categoria,
        ].filter(Boolean).join(' '));

        return busqueda.includes(texto);
      })
      .slice(0, 25);
  }, [textoBusqueda, opciones, getTitle, getSubtitle, getRightText]);

  const seleccionarProducto = (item) => {
    const nuevoValor = getValue(item);

    onChange({
      target: {
        name,
        value: nuevoValor,
      },
    });

    setTextoBusqueda(getTitle(item));
    setAbierto(false);
  };

  const limpiarSeleccion = () => {
    onChange({
      target: {
        name,
        value: '',
      },
    });

    setTextoBusqueda('');
    setAbierto(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="absolute left-4 top-3.5 text-[#B09CA3]"
          size={20}
        />

        <input
          type="text"
          value={textoBusqueda}
          disabled={disabled}
          onChange={(e) => {
            setTextoBusqueda(e.target.value);
            setAbierto(true);

            if (value) {
              onChange({
                target: {
                  name,
                  value: '',
                },
              });
            }
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setAbierto(false);
            }
          }}
          className="w-full min-w-0 pl-12 pr-12 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white disabled:bg-[#FFF9FA] disabled:cursor-not-allowed"
          placeholder={placeholder}
        />

        {(textoBusqueda || value) && !disabled && (
          <button
            type="button"
            onClick={limpiarSeleccion}
            className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF9FA] text-[#8B7A80] hover:bg-[#F7EEF1]"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {abierto && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-2xl border border-[#EEDFE4] bg-white shadow-2xl shadow-[#392F33]/10">
          {opcionesFiltradas.length === 0 ? (
            <div className="px-4 py-3 text-sm font-semibold text-[#8B7A80]">
              {emptyText}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-2">
              {opcionesFiltradas.map((item) => {
                const itemValue = getValue(item);
                const seleccionado = String(itemValue) === String(value);

                return (
                  <button
                    key={itemValue}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      seleccionarProducto(item);
                    }}
                    className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition ${seleccionado
                      ? 'bg-[#FFF2F5] text-[#9E4966]'
                      : 'hover:bg-[#FFFAFB] text-[#5B4950]'
                      }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {getTitle(item)}
                      </p>

                      {getSubtitle && (
                        <p className="mt-0.5 text-xs font-semibold text-[#8B7A80]">
                          {getSubtitle(item)}
                        </p>
                      )}
                    </div>

                    {getRightText && (
                      <span className="shrink-0 rounded-full bg-[#FFF9FA] px-3 py-1 text-xs font-black text-[#755F67]">
                        {getRightText(item)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Inventario() {
  const { usuario } = useAuth();

  const puedeCambiarSucursal = esSuperAdmin(usuario);
  const puedeGestionarInventario = esSuperAdmin(usuario);

  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // const [proveedores, setProveedores] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [bajoStock, setBajoStock] = useState([]);

  const [lotes, setLotes] = useState([]);
  const [caducidadProxima, setCaducidadProxima] = useState([]);
  const [productoLotes, setProductoLotes] = useState(null);

  const [idSucursal, setIdSucursal] = useState('');
  const [buscar, setBuscar] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [idProductoBusqueda, setIdProductoBusqueda] = useState('');
  const [sugerenciasInventario, setSugerenciasInventario] = useState([]);
  const [cargandoSugerenciasInventario, setCargandoSugerenciasInventario] = useState(false);
  const [mostrandoSugerenciasInventario, setMostrandoSugerenciasInventario] = useState(false);
  const [indiceSugerenciaInventario, setIndiceSugerenciaInventario] = useState(-1);

  const solicitudSugerenciasInventarioRef = useRef(0);
  const ignorarSiguienteSugerenciaRef = useRef(false);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [cargando, setCargando] = useState(false);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalMovimientos, setModalMovimientos] = useState(false);
  const [modalBajoStock, setModalBajoStock] = useState(false);

  const [modalLotes, setModalLotes] = useState(false);
  const [modalCaducidad, setModalCaducidad] = useState(false);
  const [modalEditarLote, setModalEditarLote] = useState(false);
  const [productoAcciones, setProductoAcciones] = useState(null);

  const [formAsignar, setFormAsignar] = useState(formAsignarInicial);
  const [formMovimiento, setFormMovimiento] = useState(formMovimientoInicial);
  const [formEditarLote, setFormEditarLote] = useState(formEditarLoteInicial);
  const [loteEditando, setLoteEditando] = useState(null);

  const sucursalActual = useMemo(() => {
    return sucursales.find((s) => Number(s.id_sucursal) === Number(idSucursal));
  }, [sucursales, idSucursal]);

  const categoriasInventario = useMemo(() => {
    const categoriasUnicas = new Map();

    inventario.forEach((item) => {
      const categoria = String(item.categoria || 'Sin categoría').trim();

      categoriasUnicas.set(normalizarTexto(categoria), categoria);
    });

    return Array.from(categoriasUnicas.values()).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );
  }, [inventario]);

  const inventarioFiltrado = useMemo(() => {
    if (!categoriaSeleccionada) {
      return inventario;
    }

    const categoriaNormalizada = normalizarTexto(categoriaSeleccionada);

    return inventario.filter((item) => {
      const categoriaProducto = normalizarTexto(
        item.categoria || 'Sin categoría'
      );

      return categoriaProducto === categoriaNormalizada;
    });
  }, [inventario, categoriaSeleccionada]);

  const obtenerEtiquetaVarianteConPrecio = (variante) => {
    if (!variante) return 'Variante';

    const etiquetaBase = obtenerEtiquetaVarianteGuardada(variante);
    const precio =
      variante.precio_venta !== null &&
        variante.precio_venta !== undefined &&
        variante.precio_venta !== ''
        ? ` · ${formatoMoneda(variante.precio_venta)}`
        : '';

    const stock = ` · Stock: ${formatoNumero(variante.stock_actual || 0)}`;

    return `${etiquetaBase}${precio}${stock}`;
  };

  const productosSinInventario = useMemo(() => {
    const productosInventario = new Set(
      inventario.map((item) => Number(item.id_producto))
    );

    return productos.filter((producto) => {
      if (!producto.activo) return false;

      const yaTieneInventario = productosInventario.has(
        Number(producto.id_producto)
      );

      // Los productos simples solo se asignan una vez.
      // Los productos con variantes pueden volver a abrirse para
      // incorporar nuevas combinaciones o sumar stock por variante.
      return !yaTieneInventario || esVerdadero(producto.usa_variantes);
    });
  }, [productos, inventario]);

  const productoAsignacionSeleccionado = useMemo(() => {
    return productos.find(
      (producto) =>
        Number(producto.id_producto) === Number(formAsignar.id_producto)
    );
  }, [productos, formAsignar.id_producto]);

  const inventarioAsignacionExistente = useMemo(() => {
    return inventario.find(
      (item) =>
        Number(item.id_producto) === Number(formAsignar.id_producto)
    );
  }, [inventario, formAsignar.id_producto]);

  const asignacionUsaVariantes = esVerdadero(
    productoAsignacionSeleccionado?.usa_variantes
  );

  const asignacionControlaLotes = esVerdadero(
    productoAsignacionSeleccionado?.controla_lotes
  );

  const asignacionControlaCaducidad = esVerdadero(
    productoAsignacionSeleccionado?.controla_caducidad
  );

  const configuracionVariantesAsignacion = useMemo(
    () =>
      normalizarConfiguracionVariantes(
        productoAsignacionSeleccionado?.configuracion_variantes
      ),
    [productoAsignacionSeleccionado]
  );

  const camposVariantesAsignacion = useMemo(
    () => obtenerCamposVariantes(configuracionVariantesAsignacion),
    [configuracionVariantesAsignacion]
  );

  const asignacionUsaPrecioPorVariante = esVerdadero(
    configuracionVariantesAsignacion?.precio
  );

  const productoMovimientoSeleccionado = useMemo(() => {
    return (
      inventario.find(
        (item) =>
          Number(item.id_producto) === Number(formMovimiento.id_producto)
      ) ||
      productos.find(
        (item) =>
          Number(item.id_producto) === Number(formMovimiento.id_producto)
      ) ||
      null
    );
  }, [inventario, productos, formMovimiento.id_producto]);

  const movimientoUsaVariantes = esVerdadero(
    productoMovimientoSeleccionado?.usa_variantes
  );

  const variantesMovimientoDisponibles = useMemo(() => {
    return Array.isArray(productoMovimientoSeleccionado?.variantes)
      ? productoMovimientoSeleccionado.variantes
      : [];
  }, [productoMovimientoSeleccionado]);

  const varianteMovimientoSeleccionada = useMemo(() => {
    return variantesMovimientoDisponibles.find(
      (variante) =>
        Number(variante.id_variante) === Number(formMovimiento.id_variante)
    );
  }, [variantesMovimientoDisponibles, formMovimiento.id_variante]);

  const stockInicialVariantes = useMemo(() => {
    return (formAsignar.variantes || []).reduce(
      (total, variante) => total + Number(variante.stock_inicial || 0),
      0
    );
  }, [formAsignar.variantes]);

  const resumen = useMemo(() => {
    const totalProductos = inventarioFiltrado.length;

    const productosBajoStock = inventarioFiltrado.filter(
      (item) => item.bajo_stock
    ).length;

    const totalUnidades = inventarioFiltrado.reduce(
      (acc, item) => acc + Number(item.stock_actual || 0),
      0
    );

    const totalLotes = inventarioFiltrado.reduce(
      (acc, item) => acc + Number(item.total_lotes || 0),
      0
    );

    const productosConVariantes = inventarioFiltrado.filter((item) =>
      esVerdadero(item.usa_variantes)
    ).length;

    const valorInventario = inventarioFiltrado.reduce((acc, item) => {
      return (
        acc +
        Number(item.stock_actual || 0) * Number(item.precio_compra || 0)
      );
    }, 0);

    const valorVentaEstimado = inventarioFiltrado.reduce((acc, item) => {
      return (
        acc +
        Number(item.stock_actual || 0) * Number(item.precio_venta || 0)
      );
    }, 0);

    return {
      totalProductos,
      productosBajoStock,
      totalUnidades,
      totalLotes,
      productosConVariantes,
      valorInventario,
      valorVentaEstimado,
    };
  }, [inventarioFiltrado]);

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
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getProductoNombre = (idProducto) => {
    const producto = productos.find(
      (p) => Number(p.id_producto) === Number(idProducto)
    );

    return producto?.nombre || '';
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

  const cargarProductos = async () => {
    try {
      const { data } = await api.get('/productos?activos=true');

      if (data.ok) {
        setProductos(data.productos || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los productos.',
      });
    }
  };

  /* PROVEEDOR DESHABILITADO TEMPORALMENTE
  const cargarProveedores = async () => {
    try {
      const { data } = await api.get('/proveedores?activos=true');

      if (data.ok) {
        setProveedores(data.proveedores || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los proveedores.',
      });
    }
  };
  */

  const cargarInventario = async ({
    texto = null,
    idProducto = undefined,
  } = {}) => {
    if (!idSucursal) return false;

    try {
      setCargando(true);

      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);

      const textoBusqueda = String(texto ?? buscar ?? '').trim();
      const productoSeleccionado = String(
        idProducto !== undefined ? idProducto : idProductoBusqueda ?? ''
      ).trim();

      if (productoSeleccionado) {
        params.append('id_producto', productoSeleccionado);
      } else if (textoBusqueda) {
        params.append('buscar', textoBusqueda);
      }

      const { data } = await api.get(`/inventario?${params.toString()}`);

      if (data.ok) {
        setInventario(data.inventario || []);
        return true;
      }

      return false;
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cargar el inventario.',
      });

      return false;
    } finally {
      setCargando(false);
    }
  };

  const buscarSugerenciasInventario = async (termino) => {
    const texto = String(termino || '').trim();

    if (!idSucursal || texto.length < 2) {
      solicitudSugerenciasInventarioRef.current += 1;
      setSugerenciasInventario([]);
      setCargandoSugerenciasInventario(false);
      setMostrandoSugerenciasInventario(false);
      setIndiceSugerenciaInventario(-1);
      return;
    }

    const idSolicitud = ++solicitudSugerenciasInventarioRef.current;

    try {
      setCargandoSugerenciasInventario(true);

      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);
      params.append('buscar', texto);
      params.append('autocomplete', '1');
      params.append('limit', '8');

      const { data } = await api.get(`/inventario?${params.toString()}`);

      /*
       * Ignora respuestas anteriores si el usuario siguió escribiendo antes
       * de que terminara la solicitud.
       */
      if (idSolicitud !== solicitudSugerenciasInventarioRef.current) return;

      const lista = data?.ok ? data.inventario || [] : [];

      setSugerenciasInventario(lista.slice(0, 8));
      setMostrandoSugerenciasInventario(true);
      setIndiceSugerenciaInventario(-1);
    } catch (error) {
      if (idSolicitud !== solicitudSugerenciasInventarioRef.current) return;

      console.error('Error al buscar sugerencias de inventario:', error);
      setSugerenciasInventario([]);
    } finally {
      if (idSolicitud === solicitudSugerenciasInventarioRef.current) {
        setCargandoSugerenciasInventario(false);
      }
    }
  };

  const limpiarSoloBusquedaInventario = () => {
    solicitudSugerenciasInventarioRef.current += 1;

    setBuscar('');
    setIdProductoBusqueda('');
    setSugerenciasInventario([]);
    setMostrandoSugerenciasInventario(false);
    setCargandoSugerenciasInventario(false);
    setIndiceSugerenciaInventario(-1);
  };

  const seleccionarSugerenciaInventario = (item) => {
    if (!item?.id_producto) return;

    const nombreProducto = item.producto || item.nombre || '';

    // Evita que al colocar el texto vuelva a abrir sugerencias.
    ignorarSiguienteSugerenciaRef.current = true;

    setBuscar(nombreProducto);
    setIdProductoBusqueda(String(item.id_producto));
    setSugerenciasInventario([]);
    setMostrandoSugerenciasInventario(false);
    setCargandoSugerenciasInventario(false);
    setIndiceSugerenciaInventario(-1);

    // Ya no se consulta aquí.
  };

  const buscarInventarioYMovimientos = async ({
    itemSeleccionado = null,
  } = {}) => {
    solicitudSugerenciasInventarioRef.current += 1;

    const nombreProducto = itemSeleccionado
      ? itemSeleccionado.producto || itemSeleccionado.nombre || ''
      : buscar;

    const idProducto = itemSeleccionado
      ? itemSeleccionado.id_producto
      : idProductoBusqueda;

    setMostrandoSugerenciasInventario(false);
    setIndiceSugerenciaInventario(-1);
    setSugerenciasInventario([]);
    setCargandoSugerenciasInventario(false);

    const consultaExitosa = await cargarInventario({
      texto: nombreProducto,
      idProducto: idProducto || '',
    });

    if (modalMovimientos) {
      await cargarMovimientos();
    }

    if (consultaExitosa) {
      limpiarSoloBusquedaInventario();
    }
  };


  const cargarBajoStock = async () => {
    if (!idSucursal) return;

    try {
      const { data } = await api.get(
        `/inventario/bajo-stock?sucursal=${idSucursal}`
      );

      if (data.ok) {
        setBajoStock(data.productos_bajo_stock || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (modalMovimientos) {
      cargarMovimientos();
    }
  }, [fechaInicio, fechaFin]);

  const cargarMovimientos = async () => {
    if (!idSucursal) return;

    try {
      setCargandoMovimientos(true);

      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);

      if (fechaInicio) {
        params.append('fecha_inicio', fechaInicio);
      }

      if (fechaFin) {
        params.append('fecha_fin', fechaFin);
      }

      const { data } = await api.get(
        `/inventario/movimientos?${params.toString()}`
      );

      if (data.ok) {
        setMovimientos(data.movimientos || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los movimientos de inventario.',
      });
    } finally {
      setCargandoMovimientos(false);
    }
  };

  const limpiarFiltros = async () => {
    solicitudSugerenciasInventarioRef.current += 1;
    setBuscar('');
    setCategoriaSeleccionada('');
    setIdProductoBusqueda('');
    setSugerenciasInventario([]);
    setMostrandoSugerenciasInventario(false);
    setCargandoSugerenciasInventario(false);
    setIndiceSugerenciaInventario(-1);
    setFechaInicio('');
    setFechaFin('');

    if (!idSucursal) return;

    try {
      setCargando(true);

      const paramsInventario = new URLSearchParams();
      paramsInventario.append('sucursal', idSucursal);

      const { data } = await api.get(
        `/inventario?${paramsInventario.toString()}`
      );

      if (data.ok) {
        setInventario(data.inventario || []);
      }

      if (modalMovimientos) {
        setCargandoMovimientos(true);

        const paramsMovimientos = new URLSearchParams();
        paramsMovimientos.append('sucursal', idSucursal);

        const movimientosResponse = await api.get(
          `/inventario/movimientos?${paramsMovimientos.toString()}`
        );

        if (movimientosResponse.data.ok) {
          setMovimientos(movimientosResponse.data.movimientos || []);
        }
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron limpiar los filtros.',
      });
    } finally {
      setCargando(false);
      setCargandoMovimientos(false);
    }
  };

  const cargarLotesProducto = async (idProducto = null) => {
    if (!idSucursal) return [];

    try {
      const params = new URLSearchParams();
      params.append('sucursal', idSucursal);

      if (idProducto) {
        params.append('producto', idProducto);
      }

      const { data } = await api.get(`/inventario/lotes?${params.toString()}`);

      if (data.ok) {
        setLotes(data.lotes || []);
        return data.lotes || [];
      }

      return [];
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los lotes.',
      });

      return [];
    }
  };

  const cargarCaducidadProxima = async () => {
    if (!idSucursal) return;

    try {
      const { data } = await api.get(
        `/inventario/caducidad-proxima?sucursal=${idSucursal}&dias=90`
      );

      if (data.ok) {
        setCaducidadProxima(data.productos_caducidad || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la caducidad próxima.',
      });
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarSucursales();
      cargarProductos();
      // PROVEEDOR DESHABILITADO TEMPORALMENTE
      // cargarProveedores();
    }
  }, [usuario]);

  useEffect(() => {
    /*
     * Al cambiar de sucursal conservamos el texto escrito, pero dejamos de
     * usar cualquier ID seleccionado de la sucursal anterior.
     */
    setCategoriaSeleccionada('');
    setIdProductoBusqueda('');
    solicitudSugerenciasInventarioRef.current += 1;
    setSugerenciasInventario([]);
    setMostrandoSugerenciasInventario(false);
    setCargandoSugerenciasInventario(false);
    setIndiceSugerenciaInventario(-1);

    if (idSucursal) {
      cargarInventario({ idProducto: '' });
      cargarBajoStock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSucursal]);

  useEffect(() => {
    const texto = String(buscar || '').trim();

    if (ignorarSiguienteSugerenciaRef.current) {
      ignorarSiguienteSugerenciaRef.current = false;
      return;
    }

    if (!idSucursal || texto.length < 2) {
      solicitudSugerenciasInventarioRef.current += 1;
      setSugerenciasInventario([]);
      setMostrandoSugerenciasInventario(false);
      setCargandoSugerenciasInventario(false);
      setIndiceSugerenciaInventario(-1);
      return;
    }

    /*
     * Muestra el loader de inmediato y espera 300 ms antes de consultar,
     * igual que el patrón del POS.
     */
    setMostrandoSugerenciasInventario(true);
    setCargandoSugerenciasInventario(true);
    setIndiceSugerenciaInventario(-1);

    const temporizador = setTimeout(() => {
      buscarSugerenciasInventario(texto);
    }, 300);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, idSucursal]);

  useEffect(() => {
    const cargarLotesParaMovimiento = async () => {
      if (
        modalMovimiento &&
        formMovimiento.id_producto &&
        movimientosConLoteExistente.includes(formMovimiento.tipo_movimiento)
      ) {
        await cargarLotesProducto(formMovimiento.id_producto);
      }
    };

    cargarLotesParaMovimiento();
  }, [modalMovimiento, formMovimiento.id_producto, formMovimiento.tipo_movimiento]);

  const abrirAsignar = () => {
    if (!idSucursal) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona una sucursal',
        text: 'Primero selecciona la sucursal donde asignarás inventario.',
      });
      return;
    }

    setFormAsignar({
      ...formAsignarInicial,
      id_sucursal: idSucursal,
    });

    setModalAsignar(true);
  };

  const abrirMovimiento = async (item = null, tipo = 'ENTRADA') => {
    if (!idSucursal) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona una sucursal',
        text: 'Primero selecciona una sucursal.',
      });
      return;
    }

    const nuevoForm = {
      ...formMovimientoInicial,
      id_sucursal: idSucursal,
      id_producto: item?.id_producto || '',
      tipo_movimiento: tipo,
      stock_minimo: item?.stock_minimo || '',
      ubicacion: item?.ubicacion || '',
    };

    setFormMovimiento(nuevoForm);

    if (item?.id_producto && movimientosConLoteExistente.includes(tipo)) {
      await cargarLotesProducto(item.id_producto);
    } else {
      setLotes([]);
    }

    setModalMovimiento(true);
  };

  const abrirBajaLote = async (loteItem, tipo = 'CADUCIDAD') => {
    if (!idSucursal) return;

    const productoInventario = inventario.find(
      (item) => Number(item.id_producto) === Number(loteItem.id_producto)
    );

    const nuevoForm = {
      ...formMovimientoInicial,
      id_sucursal: idSucursal,
      id_producto: loteItem.id_producto || productoInventario?.id_producto || '',
      id_variante: loteItem.id_variante || '',
      id_lote: loteItem.id_lote || '',
      // PROVEEDOR DESHABILITADO TEMPORALMENTE
      // id_proveedor: loteItem.id_proveedor || '',
      tipo_movimiento: tipo,
      cantidad: loteItem.stock_actual || '',
      stock_minimo: productoInventario?.stock_minimo || '',
      ubicacion: productoInventario?.ubicacion || '',
      lote: loteItem.lote || '',
      fecha_caducidad: loteItem.fecha_caducidad
        ? String(loteItem.fecha_caducidad).slice(0, 10)
        : '',
      precio_compra: loteItem.precio_compra || '',
      referencia: tipo === 'CADUCIDAD' ? `BAJA-CADUCIDAD-${loteItem.lote || ''}` : '',
      observaciones:
        tipo === 'CADUCIDAD'
          ? 'Baja de lote por caducidad'
          : '',
    };

    setFormMovimiento(nuevoForm);
    await cargarLotesProducto(loteItem.id_producto);

    setModalCaducidad(false);
    setModalLotes(false);
    setModalMovimiento(true);
  };

  const abrirEditarLote = (loteItem) => {
    setLoteEditando(loteItem);

    const camposVariante = obtenerCamposVariantes(
      productoLotes?.configuracion_variantes
    );

    let atributosOrigen = loteItem?.atributos;

    if (
      typeof atributosOrigen === 'string' &&
      atributosOrigen.trim()
    ) {
      try {
        atributosOrigen = JSON.parse(atributosOrigen);
      } catch {
        atributosOrigen = {};
      }
    }

    if (
      !atributosOrigen ||
      typeof atributosOrigen !== 'object' ||
      Array.isArray(atributosOrigen)
    ) {
      atributosOrigen = {};
    }

    const atributosVariante = {};

    camposVariante.forEach((campo) => {
      atributosVariante[campo.clave] = String(
        loteItem?.[campo.clave] ??
        atributosOrigen?.[campo.clave] ??
        ''
      );
    });

    const nombreGeneradoActual = camposVariante
      .map((campo) =>
        String(
          atributosVariante?.[campo.clave] || ''
        ).trim()
      )
      .filter(Boolean)
      .join(' · ');

    const nombreGuardado = String(
      loteItem.nombre_variante || ''
    ).trim();

    const nombreAlternativo =
      nombreGuardado &&
        nombreGuardado !== nombreGeneradoActual
        ? nombreGuardado
        : '';

    setFormEditarLote({
      id_lote: loteItem.id_lote || '',
      id_variante: loteItem.id_variante || '',
      nombre_variante: nombreAlternativo,
      // SKU DESHABILITADO TEMPORALMENTE
      // sku: loteItem.sku || '',
      codigo_barras_variante:
        loteItem.codigo_barras_variante || '',
      precio_venta_variante:
        loteItem.precio_venta_variante !== null &&
          loteItem.precio_venta_variante !== undefined
          ? String(loteItem.precio_venta_variante)
          : '',
      atributos_variante: atributosVariante,
      // PROVEEDOR DESHABILITADO TEMPORALMENTE
      // id_proveedor: loteItem.id_proveedor || '',
      lote: loteItem.lote || '',
      fecha_caducidad: loteItem.fecha_caducidad
        ? String(loteItem.fecha_caducidad).slice(0, 10)
        : '',
      precio_compra: loteItem.precio_compra || '',
      ubicacion: loteItem.ubicacion || productoLotes?.ubicacion || '',
      stock_actual:
        loteItem.stock_actual !== null && loteItem.stock_actual !== undefined
          ? String(loteItem.stock_actual)
          : '',
      observaciones_stock: '',
    });

    setModalEditarLote(true);
  };

  const cerrarModalEditarLote = () => {
    setModalEditarLote(false);
    setLoteEditando(null);
    setFormEditarLote(formEditarLoteInicial);
  };

  const handleEditarLoteChange = (e) => {
    const { name, value } = e.target;

    setFormEditarLote((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const actualizarAtributoVarianteEditarLote = (clave, valor) => {
    setFormEditarLote((prev) => ({
      ...prev,
      atributos_variante: {
        ...(prev.atributos_variante || {}),
        [clave]: valor,
      },
    }));
  };

  const guardarEditarLote = async (e) => {
    e.preventDefault();

    if (!loteEditando?.id_lote) {
      Swal.fire({
        icon: 'warning',
        title: 'Lote no seleccionado',
        text: 'Selecciona un lote válido para editar.',
      });
      return;
    }

    if (!formEditarLote.lote.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Lote obligatorio',
        text: 'Ingresa el número o clave del lote.',
      });
      return;
    }

    const editaVariante =
      esVerdadero(productoLotes?.usa_variantes) &&
      Boolean(loteEditando?.id_variante);

    const configuracionVarianteEdicion =
      normalizarConfiguracionVariantes(
        productoLotes?.configuracion_variantes
      );

    const camposVarianteEdicion = editaVariante
      ? obtenerCamposVariantes(
        productoLotes?.configuracion_variantes
      )
      : [];

    if (editaVariante) {
      const atributosIncompletos =
        camposVarianteEdicion.filter(
          (campo) =>
            !String(
              formEditarLote.atributos_variante?.[
              campo.clave
              ] || ''
            ).trim()
        );

      if (atributosIncompletos.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Variante incompleta',
          text: `Completa: ${atributosIncompletos
            .map((campo) => campo.etiqueta)
            .join(', ')}.`,
        });
        return;
      }

      if (
        esVerdadero(configuracionVarianteEdicion.precio) &&
        (
          formEditarLote.precio_venta_variante === '' ||
          !Number.isFinite(
            Number(formEditarLote.precio_venta_variante)
          ) ||
          Number(formEditarLote.precio_venta_variante) < 0
        )
      ) {
        Swal.fire({
          icon: 'warning',
          title: 'Precio de variante inválido',
          text: 'Captura un precio de venta válido para la variante.',
        });
        return;
      }
    }

    if (
      formEditarLote.precio_compra !== '' &&
      Number(formEditarLote.precio_compra) < 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Precio inválido',
        text: 'El precio de compra no puede ser negativo.',
      });
      return;
    }

    const stockLote = Number(formEditarLote.stock_actual);

    if (
      formEditarLote.stock_actual === '' ||
      !Number.isFinite(stockLote) ||
      stockLote < 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Stock inválido',
        text: 'El stock del lote debe ser un número igual o mayor a cero.',
      });
      return;
    }

    try {
      setGuardando(true);

      const atributosVariantePayload = {};

      camposVarianteEdicion.forEach((campo) => {
        atributosVariantePayload[campo.clave] =
          String(
            formEditarLote.atributos_variante?.[
            campo.clave
            ] || ''
          ).trim();
      });

      const variantePayload = editaVariante
        ? {
          id_variante: Number(loteEditando.id_variante),
          nombre_variante:
            String(
              formEditarLote.nombre_variante || ''
            ).trim() || null,
          // SKU DESHABILITADO TEMPORALMENTE
          // sku:
          //   String(formEditarLote.sku || '').trim() ||
          //   null,
          codigo_barras:
            String(
              formEditarLote.codigo_barras_variante || ''
            ).trim() || null,
          atributos: atributosVariantePayload,
          ...(esVerdadero(
            configuracionVarianteEdicion.precio
          )
            ? {
              precio_venta: Number(
                formEditarLote.precio_venta_variante
              ),
            }
            : {}),
        }
        : null;

      const payload = {
        variante: variantePayload,
        // PROVEEDOR DESHABILITADO TEMPORALMENTE
        // id_proveedor: formEditarLote.id_proveedor
        //   ? Number(formEditarLote.id_proveedor)
        //   : null,
        lote: formEditarLote.lote.trim(),
        fecha_caducidad: formEditarLote.fecha_caducidad || null,
        precio_compra: formEditarLote.precio_compra
          ? Number(formEditarLote.precio_compra)
          : 0,
        ubicacion: formEditarLote.ubicacion.trim() || null,
        stock_actual: stockLote,
        observaciones: formEditarLote.observaciones_stock.trim() || null,
      };

      const { data } = await api.put(
        `/inventario/lotes/${loteEditando.id_lote}`,
        payload
      );

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Lote actualizado',
          text: data.mensaje || 'La información del lote se actualizó correctamente.',
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModalEditarLote();

        if (productoLotes?.id_producto) {
          await cargarLotesProducto(productoLotes.id_producto);
        }

        await cargarInventario();
        await cargarBajoStock();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo actualizar el lote.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const abrirLotes = async (item) => {
    setProductoLotes(item);
    await cargarLotesProducto(item.id_producto);
    setModalLotes(true);
  };

  const abrirCaducidad = async () => {
    await cargarCaducidadProxima();
    setModalCaducidad(true);
  };

  const abrirBajoStock = async () => {
    await cargarBajoStock();
    setModalBajoStock(true);
  };

  const abrirMovimientos = async () => {
    await cargarMovimientos();
    setModalMovimientos(true);
  };

  const cerrarModalAsignar = () => {
    setModalAsignar(false);
    setFormAsignar(formAsignarInicial);
  };

  const cerrarModalMovimiento = () => {
    setModalMovimiento(false);
    setFormMovimiento(formMovimientoInicial);
    setLotes([]);
  };

  const handleAsignarChange = (e) => {
    const { name, value } = e.target;

    setFormAsignar((prev) => {
      if (name === 'id_producto') {
        const productoSeleccionado = productos.find(
          (producto) => Number(producto.id_producto) === Number(value)
        );

        const usaVariantes = esVerdadero(productoSeleccionado?.usa_variantes);
        const configuracionVariantesProducto = normalizarConfiguracionVariantes(
          productoSeleccionado?.configuracion_variantes
        );
        const camposVariantes = obtenerCamposVariantes(
          configuracionVariantesProducto
        );
        const usaPrecioPorVariante = esVerdadero(
          configuracionVariantesProducto?.precio
        );

        return {
          ...formAsignarInicial,
          id_sucursal: prev.id_sucursal || idSucursal,
          id_producto: value,
          precio_compra:
            productoSeleccionado?.precio_compra !== null &&
              productoSeleccionado?.precio_compra !== undefined
              ? String(productoSeleccionado.precio_compra)
              : '',
          variantes:
            usaVariantes && (camposVariantes.length > 0 || usaPrecioPorVariante)
              ? [
                crearVarianteInventario(
                  camposVariantes,
                  productoSeleccionado?.precio_venta ?? ''
                ),
              ]
              : [],
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const agregarVarianteAsignacion = () => {
    setFormAsignar((prev) => ({
      ...prev,
      variantes: [
        ...(prev.variantes || []),
        crearVarianteInventario(
          camposVariantesAsignacion,
          productoAsignacionSeleccionado?.precio_venta ?? ''
        ),
      ],
    }));
  };

  const actualizarVarianteAsignacion = (idTemporal, campo, valor) => {
    setFormAsignar((prev) => ({
      ...prev,
      variantes: (prev.variantes || []).map((variante) =>
        variante.id_temporal === idTemporal
          ? { ...variante, [campo]: valor }
          : variante
      ),
    }));
  };

  const actualizarAtributoVarianteAsignacion = (
    idTemporal,
    clave,
    valor
  ) => {
    setFormAsignar((prev) => ({
      ...prev,
      variantes: (prev.variantes || []).map((variante) =>
        variante.id_temporal === idTemporal
          ? {
            ...variante,
            atributos: {
              ...(variante.atributos || {}),
              [clave]: valor,
            },
          }
          : variante
      ),
    }));
  };

  const eliminarVarianteAsignacion = (idTemporal) => {
    setFormAsignar((prev) => ({
      ...prev,
      variantes: (prev.variantes || []).filter(
        (variante) => variante.id_temporal !== idTemporal
      ),
    }));
  };

  const seleccionarImagenVarianteAsignacion = (idTemporal, archivo) => {
    if (!archivo) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(archivo.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'Imagen no válida',
        text: 'Usa una imagen JPG, PNG o WEBP.',
      });
      return;
    }

    if (archivo.size > 12 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Imagen demasiado grande',
        text: 'La fotografía debe pesar máximo 12 MB.',
      });
      return;
    }

    const lector = new FileReader();

    lector.onload = () => {
      setFormAsignar((prev) => ({
        ...prev,
        variantes: (prev.variantes || []).map((variante) =>
          variante.id_temporal === idTemporal
            ? {
              ...variante,
              imagen_archivo: archivo,
              imagen_preview: String(lector.result || ''),
            }
            : variante
        ),
      }));
    };

    lector.onerror = () => {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo leer la imagen',
        text: 'Intenta tomar o seleccionar nuevamente la fotografía.',
      });
    };

    lector.readAsDataURL(archivo);
  };

  const quitarImagenVarianteAsignacion = (idTemporal) => {
    setFormAsignar((prev) => ({
      ...prev,
      variantes: (prev.variantes || []).map((variante) =>
        variante.id_temporal === idTemporal
          ? {
            ...variante,
            imagen_archivo: null,
            imagen_preview: '',
          }
          : variante
      ),
    }));
  };

  const handleMovimientoChange = (e) => {
    const { name, value } = e.target;

    setFormMovimiento((prev) => {
      const cambios = {
        ...prev,
        [name]: value,
      };

      if (name === 'id_producto') {
        cambios.id_variante = '';
        cambios.id_lote = '';
        // PROVEEDOR DESHABILITADO TEMPORALMENTE
        // cambios.id_proveedor = '';
        cambios.cantidad = '';
        cambios.lote = '';
        cambios.fecha_caducidad = '';
        cambios.precio_compra = '';
      }

      if (name === 'id_variante') {
        cambios.id_lote = '';
        // PROVEEDOR DESHABILITADO TEMPORALMENTE
        // cambios.id_proveedor = '';
        cambios.lote = '';
        cambios.fecha_caducidad = '';
        cambios.precio_compra = '';
      }

      if (name === 'tipo_movimiento') {
        cambios.id_lote = '';
        // PROVEEDOR DESHABILITADO TEMPORALMENTE
        // cambios.id_proveedor = '';
        cambios.cantidad = '';
        cambios.lote = '';
        cambios.fecha_caducidad = '';
        cambios.precio_compra = '';
      }

      if (name === 'id_lote') {
        const loteSeleccionado = lotes.find(
          (lote) => Number(lote.id_lote) === Number(value)
        );

        if (loteSeleccionado) {
          cambios.id_variante =
            loteSeleccionado.id_variante || cambios.id_variante || '';
          // PROVEEDOR DESHABILITADO TEMPORALMENTE
          // cambios.id_proveedor = loteSeleccionado.id_proveedor || '';
          cambios.lote = loteSeleccionado.lote || '';
          cambios.fecha_caducidad = loteSeleccionado.fecha_caducidad
            ? String(loteSeleccionado.fecha_caducidad).slice(0, 10)
            : '';
          cambios.precio_compra = loteSeleccionado.precio_compra || '';

          if (movimientosBajaTotalLote.includes(prev.tipo_movimiento)) {
            cambios.cantidad = loteSeleccionado.stock_actual || '';
          }
        } else {
          // PROVEEDOR DESHABILITADO TEMPORALMENTE
          // cambios.id_proveedor = '';
          cambios.lote = '';
          cambios.fecha_caducidad = '';
          cambios.precio_compra = '';
        }
      }

      return cambios;
    });
  };

  const asignarInventario = async (e) => {
    e.preventDefault();

    if (!formAsignar.id_producto) {
      Swal.fire({
        icon: 'warning',
        title: 'Producto obligatorio',
        text: 'Selecciona un producto.',
      });
      return;
    }

    let stockInicial = 0;
    let variantesPayload = [];

    if (asignacionUsaVariantes) {
      /*
       * Precio por variante puede ser la única identidad configurada.
       * Solo bloqueamos cuando no existe ningún atributo estructural NI precio.
       */
      if (
        !camposVariantesAsignacion.length &&
        !asignacionUsaPrecioPorVariante
      ) {
        Swal.fire({
          icon: 'warning',
          title: 'Configuración incompleta',
          text: 'El producto usa variantes, pero no tiene atributos ni precio por variante configurados.',
        });
        return;
      }

      if (!formAsignar.variantes?.length) {
        Swal.fire({
          icon: 'warning',
          title: 'Agrega una variante',
          text: 'Este producto está configurado para manejar variantes.',
        });
        return;
      }

      const variantesInvalidas = formAsignar.variantes.filter((variante) => {
        const atributosCompletos = camposVariantesAsignacion.every((campo) =>
          Boolean(String(variante.atributos?.[campo.clave] || '').trim())
        );

        const cantidad = Number(variante.stock_inicial);

        const precioVenta = Number(variante.precio_venta);
        const precioValido =
          !asignacionUsaPrecioPorVariante ||
          (
            variante.precio_venta !== '' &&
            Number.isFinite(precioVenta) &&
            precioVenta >= 0
          );

        return (
          !atributosCompletos ||
          variante.stock_inicial === '' ||
          !Number.isFinite(cantidad) ||
          cantidad < 0 ||
          !precioValido
        );
      });

      if (variantesInvalidas.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Revisa las variantes',
          text: asignacionUsaPrecioPorVariante
            ? camposVariantesAsignacion.length > 0
              ? 'Completa los atributos, la cantidad y un precio de venta válido para cada variante.'
              : 'Captura una cantidad y un precio de venta válido para cada variante.'
            : 'Completa todos los atributos configurados y captura una cantidad válida en cada variante.',
        });
        return;
      }

      const clavesVariantes = formAsignar.variantes.map((variante) => {
        const claveAtributos = normalizarTexto(
          camposVariantesAsignacion
            .map((campo) => variante.atributos?.[campo.clave])
            .join('|')
        );

        if (claveAtributos) {
          return `atributos:${claveAtributos}`;
        }

        /*
         * Si no hay talla/color/etc., el precio es la identidad de la variante.
         * Así $100 y $200 son variantes distintas, pero dos filas de $100
         * sí se consideran duplicadas.
         */
        if (asignacionUsaPrecioPorVariante) {
          const precio = Number(variante.precio_venta);
          return Number.isFinite(precio)
            ? `precio:${precio.toFixed(2)}`
            : `precio:${String(variante.precio_venta || '').trim()}`;
        }

        return 'sin-identidad';
      });

      const tieneDuplicadas =
        new Set(clavesVariantes).size !== clavesVariantes.length;

      if (tieneDuplicadas) {
        Swal.fire({
          icon: 'warning',
          title: 'Variantes duplicadas',
          text:
            camposVariantesAsignacion.length === 0 && asignacionUsaPrecioPorVariante
              ? 'Hay dos variantes con el mismo precio. Usa un precio diferente para identificar cada variante.'
              : 'Hay dos filas con la misma combinación de atributos.',
        });
        return;
      }

      variantesPayload = formAsignar.variantes.map((variante) => {
        const atributos = {};

        camposVariantesAsignacion.forEach((campo) => {
          atributos[campo.clave] =
            String(variante.atributos?.[campo.clave] || '').trim();
        });

        return {
          nombre_variante: obtenerNombreVariante(
            variante,
            camposVariantesAsignacion
          ),
          // SKU DESHABILITADO TEMPORALMENTE
          // sku: String(variante.sku || '').trim() || null,
          codigo_barras: String(variante.codigo_barras || '').trim() || null,
          precio_venta: asignacionUsaPrecioPorVariante
            ? Number(variante.precio_venta)
            : null,
          stock_inicial: Number(variante.stock_inicial || 0),
          talla: atributos.talla || null,
          color: atributos.color || null,
          tono: atributos.tono || null,
          presentacion: atributos.presentacion || null,
          atributos,
        };
      });

      stockInicial = variantesPayload.reduce(
        (total, variante) => total + Number(variante.stock_inicial || 0),
        0
      );
    } else {
      if (
        formAsignar.stock_inicial === '' ||
        Number(formAsignar.stock_inicial) < 0
      ) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock inválido',
          text: 'El stock inicial no puede ser negativo.',
        });
        return;
      }

      stockInicial = Number(formAsignar.stock_inicial || 0);
    }

    if (
      asignacionControlaLotes &&
      stockInicial > 0 &&
      !String(formAsignar.lote || '').trim()
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Lote obligatorio',
        text: 'Este producto controla lotes. Captura el lote de entrada.',
      });
      return;
    }

    if (
      asignacionControlaCaducidad &&
      stockInicial > 0 &&
      !formAsignar.fecha_caducidad
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Caducidad obligatoria',
        text: 'Este producto controla caducidad. Captura la fecha de vencimiento.',
      });
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        id_sucursal: Number(formAsignar.id_sucursal),
        id_producto: Number(formAsignar.id_producto),
        // PROVEEDOR DESHABILITADO TEMPORALMENTE
        // id_proveedor: formAsignar.id_proveedor
        //   ? Number(formAsignar.id_proveedor)
        //   : null,
        stock_inicial: stockInicial,
        stock_minimo: Number(formAsignar.stock_minimo || 0),
        ubicacion: formAsignar.ubicacion || null,
        lote: asignacionControlaLotes ? formAsignar.lote || null : null,
        fecha_caducidad: asignacionControlaCaducidad
          ? formAsignar.fecha_caducidad || null
          : null,
        precio_compra: formAsignar.precio_compra
          ? Number(formAsignar.precio_compra)
          : 0,
        observaciones: formAsignar.observaciones || null,
        usa_variantes: asignacionUsaVariantes,
        variantes: asignacionUsaVariantes ? variantesPayload : [],
      };

      const { data } = await api.post('/inventario/asignar', payload);

      if (data.ok) {
        let imagenesFallidas = 0;
        let imagenesSubidas = 0;

        if (asignacionUsaVariantes) {
          const variantesGuardadas = Array.isArray(data.variantes)
            ? data.variantes
            : [];

          for (let indice = 0; indice < formAsignar.variantes.length; indice += 1) {
            const varianteLocal = formAsignar.variantes[indice];
            const archivo = varianteLocal?.imagen_archivo;

            if (!archivo) continue;

            const idVariante = Number(variantesGuardadas[indice]?.id_variante || 0);

            if (!Number.isInteger(idVariante) || idVariante <= 0) {
              imagenesFallidas += 1;
              continue;
            }

            try {
              const formData = new FormData();
              formData.append('imagen', archivo);

              await api.post(
                `/inventario/variantes/${idVariante}/imagen`,
                formData
              );

              imagenesSubidas += 1;
            } catch (errorImagen) {
              console.error(
                `No se pudo guardar la imagen de la variante ${idVariante}:`,
                errorImagen
              );
              imagenesFallidas += 1;
            }
          }
        }

        if (imagenesFallidas > 0) {
          await Swal.fire({
            icon: 'warning',
            title: 'Inventario guardado',
            text: `${data.mensaje}. Se guardaron ${imagenesSubidas} imagen(es), pero ${imagenesFallidas} no pudieron subirse.`,
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Inventario asignado',
            text:
              imagenesSubidas > 0
                ? `${data.mensaje}. ${imagenesSubidas} imagen(es) de referencia guardadas.`
                : data.mensaje,
            timer: 1600,
            showConfirmButton: false,
          });
        }

        cerrarModalAsignar();
        cargarInventario();
        cargarBajoStock();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo asignar el inventario.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();

    if (!formMovimiento.id_producto) {
      Swal.fire({
        icon: 'warning',
        title: 'Producto obligatorio',
        text: 'Selecciona un producto.',
      });
      return;
    }

    if (movimientoUsaVariantes && !formMovimiento.id_variante) {
      Swal.fire({
        icon: 'warning',
        title: 'Variante obligatoria',
        text: 'Selecciona la variante que recibirá o descontará este movimiento.',
      });
      return;
    }

    if (
      formMovimiento.cantidad === '' ||
      Number(formMovimiento.cantidad) <= 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Cantidad inválida',
        text: 'La cantidad debe ser mayor a cero.',
      });
      return;
    }

    if (
      formMovimiento.tipo_movimiento === 'DEVOLUCION_CLIENTE' &&
      !formMovimiento.id_lote
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Lote obligatorio',
        text: 'Para devolución de cliente selecciona el lote al que regresará el producto.',
      });
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        id_sucursal: Number(formMovimiento.id_sucursal),
        id_producto: Number(formMovimiento.id_producto),
        id_variante: formMovimiento.id_variante
          ? Number(formMovimiento.id_variante)
          : null,
        // PROVEEDOR DESHABILITADO TEMPORALMENTE
        // id_proveedor: formMovimiento.id_proveedor
        //   ? Number(formMovimiento.id_proveedor)
        //   : null,
        id_lote: formMovimiento.id_lote
          ? Number(formMovimiento.id_lote)
          : undefined,
        tipo_movimiento: formMovimiento.tipo_movimiento,
        cantidad: Number(formMovimiento.cantidad),
        stock_minimo:
          formMovimiento.stock_minimo === ''
            ? undefined
            : Number(formMovimiento.stock_minimo),
        ubicacion: formMovimiento.ubicacion || undefined,
        lote: formMovimiento.lote || null,
        fecha_caducidad: formMovimiento.fecha_caducidad || null,
        precio_compra: formMovimiento.precio_compra
          ? Number(formMovimiento.precio_compra)
          : undefined,
        referencia: formMovimiento.referencia || null,
        observaciones: formMovimiento.observaciones || null,
      };

      const { data } = await api.post('/inventario/ajustar', payload);

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Inventario actualizado',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModalMovimiento();
        cargarInventario();
        cargarBajoStock();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo actualizar el inventario.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const darBajaCaducidad = async (item) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Dar de baja este lote?',
      html: `
        <div style="text-align:left">
          <p><b>Producto:</b> ${item.producto}</p>
          <p><b>Lote:</b> ${item.lote}</p>
          <p><b>Caducidad:</b> ${item.fecha_caducidad
          ? new Date(item.fecha_caducidad).toLocaleDateString('es-MX')
          : 'Sin fecha'
        }</p>
          <p><b>Stock a dar de baja:</b> ${formatoNumero(item.stock_actual)}</p>
        </div>
      `,
      input: 'textarea',
      inputLabel: 'Observaciones',
      inputPlaceholder: 'Ej. Producto caducado retirado del anaquel',
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.post('/inventario/baja-caducidad', {
        id_sucursal: Number(item.id_sucursal),
        id_producto: Number(item.id_producto),
        id_lote: Number(item.id_lote),
        observaciones:
          confirmacion.value ||
          'Baja por caducidad desde módulo de inventario',
      });

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Lote dado de baja',
          text: data.mensaje,
          timer: 1500,
          showConfirmButton: false,
        });

        await cargarInventario();
        await cargarBajoStock();
        await cargarCaducidadProxima();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo dar de baja el lote.',
      });
    }
  };

  // PROVEEDOR DESHABILITADO TEMPORALMENTE
  // const requiereProveedorMovimiento = movimientosPermitenNuevoLote.includes(
  //   formMovimiento.tipo_movimiento
  // );

  const exportarInventarioExcel = async () => {
    if (!idSucursal) {
      Swal.fire({
        icon: 'warning',
        title: 'Selecciona una sucursal',
        text: 'Primero selecciona la sucursal que deseas exportar.',
      });

      return;
    }

    if (!inventarioFiltrado.length) {
      Swal.fire({
        icon: 'info',
        title: 'Sin información',
        text: 'No hay productos disponibles para exportar.',
      });

      return;
    }

    try {
      const nombreSucursal =
        sucursalActual?.nombre || `Sucursal ${idSucursal}`;

      const nombreCategoria =
        categoriaSeleccionada || 'Todas las categorías';

      const fechaActual = new Date();

      const fechaExportacion = fechaActual.toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      const workbook = new ExcelJS.Workbook();

      workbook.creator = 'Moda & Belleza';
      workbook.company = 'Moda & Belleza';
      workbook.created = fechaActual;
      workbook.modified = fechaActual;

      const worksheet = workbook.addWorksheet('Inventario', {
        views: [
          {
            state: 'frozen',
            ySplit: 7,
          },
        ],
        pageSetup: {
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          paperSize: 9,
          margins: {
            left: 0.25,
            right: 0.25,
            top: 0.5,
            bottom: 0.5,
            header: 0.2,
            footer: 0.2,
          },
        },
      });

      /*
       * Encabezado general
       */
      worksheet.mergeCells('A1:B4');
      worksheet.mergeCells('C1:H2');
      worksheet.mergeCells('C3:H3');
      worksheet.mergeCells('C4:H4');

      const celdaMarca = worksheet.getCell('C1');

      celdaMarca.value = 'MODA & BELLEZA';
      celdaMarca.font = {
        name: 'Arial',
        size: 22,
        bold: true,
        color: {
          argb: 'FFFFFFFF',
        },
      };

      celdaMarca.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      celdaMarca.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFB85F7D',
        },
      };

      const celdaTitulo = worksheet.getCell('C3');

      celdaTitulo.value = 'REPORTE DE INVENTARIO';
      celdaTitulo.font = {
        name: 'Arial',
        size: 15,
        bold: true,
        color: {
          argb: 'FF0F172A',
        },
      };

      celdaTitulo.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      celdaTitulo.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFFFF1F5',
        },
      };

      const celdaSucursal = worksheet.getCell('C4');

      celdaSucursal.value =
        `${nombreSucursal} · Categoría: ${nombreCategoria} · Generado el ${fechaExportacion}`;

      celdaSucursal.font = {
        name: 'Arial',
        size: 11,
        italic: true,
        color: {
          argb: 'FF475569',
        },
      };

      celdaSucursal.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      /*
       * Identidad del reporte.
       * Por ahora usamos una marca tipográfica para no depender de un logo
       * heredado del sistema anterior.
       */
      const celdaMarcaVisual = worksheet.getCell('A1');

      celdaMarcaVisual.value = 'MODA &\\nBELLEZA';
      celdaMarcaVisual.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      celdaMarcaVisual.font = {
        name: 'Arial',
        bold: true,
        size: 16,
        color: {
          argb: 'FFB85F7D',
        },
      };

      celdaMarcaVisual.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFFFF1F5',
        },
      };

      worksheet.getRow(1).height = 28;
      worksheet.getRow(2).height = 28;
      worksheet.getRow(3).height = 24;
      worksheet.getRow(4).height = 24;
      worksheet.getRow(5).height = 8;

      /*
       * Resumen
       */
      const stockTotal = inventarioFiltrado.reduce(
        (total, item) => total + Number(item.stock_actual || 0),
        0
      );

      worksheet.mergeCells('A6:B6');
      worksheet.mergeCells('C6:D6');
      worksheet.mergeCells('E6:F6');
      worksheet.mergeCells('G6:H6');

      const resumenCeldas = [
        {
          celda: 'A6',
          texto: `Productos: ${resumen.totalProductos}`,
        },
        {
          celda: 'C6',
          texto: `Bajo stock: ${resumen.productosBajoStock}`,
        },
        {
          celda: 'E6',
          texto: `Stock total: ${stockTotal.toLocaleString('es-MX')}`,
        },
        {
          celda: 'G6',
          texto: `Sucursal: ${nombreSucursal}`,
        },
      ];

      resumenCeldas.forEach(({ celda, texto }) => {
        const cell = worksheet.getCell(celda);

        cell.value = texto;

        cell.font = {
          name: 'Arial',
          bold: true,
          size: 10,
          color: {
            argb: 'FF0F172A',
          },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFF1F5F9',
          },
        };

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: 'FFCBD5E1',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: 'FFCBD5E1',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: 'FFCBD5E1',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: 'FFCBD5E1',
            },
          },
        };
      });

      worksheet.getRow(6).height = 32;

      /*
       * Encabezados de la tabla
       */
      const encabezados = [
        'Producto',
        'Código',
        'Categoría',
        'Ubicación',
        'Próxima caducidad',
        'Stock',
        'Mínimo',
        'Precio venta',
      ];

      const filaEncabezado = worksheet.getRow(7);

      encabezados.forEach((titulo, indice) => {
        const cell = filaEncabezado.getCell(indice + 1);

        cell.value = titulo;

        cell.font = {
          name: 'Arial',
          bold: true,
          size: 10,
          color: {
            argb: 'FFFFFFFF',
          },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFB85F7D',
          },
        };

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
        };
      });

      filaEncabezado.height = 38;

      /*
       * Datos del inventario
       */
      inventarioFiltrado.forEach((item, index) => {
        const stockActual = Number(item.stock_actual || 0);
        const stockMinimo = Number(item.stock_minimo || 0);
        const precioVenta = Number(item.precio_venta || 0);

        const fechaCaducidad = item.proxima_caducidad
          ? new Date(item.proxima_caducidad)
          : null;

        const fila = worksheet.addRow([
          item.producto || '',
          item.codigo_barras || '',
          item.categoria || '',
          item.ubicacion || '',
          fechaCaducidad,
          stockActual,
          stockMinimo,
          precioVenta,
        ]);

        fila.height = 25;

        fila.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          cell.font = {
            name: 'Arial',
            size: 10,
            color: {
              argb: 'FF334155',
            },
          };

          cell.alignment = {
            vertical: 'middle',
            horizontal: [5, 6, 7, 8].includes(columnNumber)
              ? 'center'
              : 'left',
            wrapText: [1, 3].includes(columnNumber),
          };

          cell.border = {
            top: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
            left: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
            bottom: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
            right: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
          };

          if (index % 2 !== 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: {
                argb: 'FFF8FAFC',
              },
            };
          }
        });

        /*
         * Formatos de columnas
         */
        fila.getCell(5).numFmt = 'dd/mm/yyyy';
        fila.getCell(6).numFmt = '#,##0.00';
        fila.getCell(7).numFmt = '#,##0.00';
        fila.getCell(8).numFmt = '"$"#,##0.00';

        /*
         * Resaltar bajo stock
         */
        if (item.bajo_stock) {
          fila.getCell(6).font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: {
              argb: 'FF92400E',
            },
          };

          fila.getCell(6).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: 'FFFEF3C7',
            },
          };
        }

        /*
         * Resaltar caducidad próxima
         */
        if (item.caducidad_proxima) {
          fila.getCell(5).font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: {
              argb: 'FFB91C1C',
            },
          };

          fila.getCell(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
              argb: 'FFFEE2E2',
            },
          };
        }
      });

      /*
       * Anchos de columnas
       */
      const anchosColumnas = [
        38, // Producto
        21, // Código
        25, // Categoría
        18, // Ubicación
        21, // Próxima caducidad
        14, // Stock
        14, // Mínimo
        18, // Precio venta
      ];

      anchosColumnas.forEach((ancho, index) => {
        worksheet.getColumn(index + 1).width = ancho;
      });

      /*
       * Filtro automático
       */
      worksheet.autoFilter = {
        from: {
          row: 7,
          column: 1,
        },
        to: {
          row: 7,
          column: encabezados.length,
        },
      };

      /*
       * Configuración de impresión
       */
      worksheet.pageSetup.printTitlesRow = '7:7';
      worksheet.pageSetup.printArea = `A1:H${worksheet.rowCount}`;

      /*
       * Pie del reporte
       */
      const filaFinal = worksheet.rowCount + 2;

      worksheet.mergeCells(`A${filaFinal}:H${filaFinal}`);

      /* const celdaPie = worksheet.getCell(`A${filaFinal}`);
   
       celdaPie.value =
         '';
   
       celdaPie.font = {
         name: 'Arial',
         italic: true,
         size: 9,
         color: {
           argb: 'FF64748B',
         },
       };
   
       celdaPie.alignment = {
         horizontal: 'center',
         vertical: 'middle',
       };*/

      /*
       * Hoja de resumen
       */
      const hojaResumen = workbook.addWorksheet('Resumen');

      hojaResumen.columns = [
        {
          header: 'Concepto',
          key: 'concepto',
          width: 35,
        },
        {
          header: 'Valor',
          key: 'valor',
          width: 35,
        },
      ];

      hojaResumen.addRows([
        {
          concepto: 'Sistema',
          valor: 'Moda & Belleza',
        },
        {
          concepto: 'Sucursal',
          valor: nombreSucursal,
        },
        {
          concepto: 'Categoría',
          valor: nombreCategoria,
        },
        {
          concepto: 'Productos en inventario',
          valor: resumen.totalProductos,
        },
        {
          concepto: 'Productos con bajo stock',
          valor: resumen.productosBajoStock,
        },
        {
          concepto: 'Stock total',
          valor: stockTotal,
        },
        {
          concepto: 'Valor estimado de venta',
          valor: resumen.valorVentaEstimado,
        },
        {
          concepto: 'Fecha de exportación',
          valor: fechaExportacion,
        },
      ]);

      hojaResumen.getRow(1).eachCell((cell) => {
        cell.font = {
          name: 'Arial',
          bold: true,
          color: {
            argb: 'FFFFFFFF',
          },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFB85F7D',
          },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: 'FFA95270',
            },
          },
        };
      });

      hojaResumen.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = {
            name: 'Arial',
            size: 10,
            color: {
              argb: 'FF334155',
            },
          };

          cell.border = {
            top: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
            left: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
            bottom: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
            right: {
              style: 'thin',
              color: {
                argb: 'FFE2E8F0',
              },
            },
          };
        });
      });

      hojaResumen.getCell('B8').numFmt = '"$"#,##0.00';

      /*
       * Crear archivo
       */
      const buffer = await workbook.xlsx.writeBuffer();

      const archivo = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const nombreSeguro = nombreSucursal
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

      const fechaArchivo = fechaActual
        .toISOString()
        .slice(0, 10);

      saveAs(
        archivo,
        `inventario_${nombreSeguro}_${fechaArchivo}.xlsx`
      );
    } catch (error) {
      console.error('Error al exportar inventario:', error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo exportar',
        text:
          error.message ||
          'Ocurrió un error al generar el archivo de Excel.',
      });
    }
  };

  return (
    <div className="w-full max-w-full overflow-visible space-y-5 sm:space-y-6 pb-8">
      <section className="relative z-30 overflow-visible rounded-[2rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_16px_48px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#F7DCE4]/65 blur-3xl" />
          <div className="absolute -bottom-24 left-[25%] h-52 w-52 rounded-full bg-[#FCEEF2]/65 blur-3xl" />
          <div className="absolute right-[25%] top-8 h-20 w-20 rounded-full border border-[#EACAD4]/45" />
        </div>

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.05rem] bg-[#FBEAF0] text-[#B85F7D]">
              <Boxes size={24} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#B85F7D]">
                <Sparkles size={13} />
                Control de inventario
              </div>

              <h1 className="mt-3 break-words text-2xl font-black tracking-[-0.03em] text-[#382D31] sm:text-3xl">
                Inventario
              </h1>

              <p className="mt-1 text-sm leading-relaxed text-[#8A757D] sm:text-base">
                Administra existencias por sucursal, lotes, entradas, salidas, ajustes y niveles mínimos.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={abrirAsignar}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.18)] transition hover:bg-[#A95270]"
            >
              <Plus size={19} />
              Agregar inventario
            </button>

            <details className="relative w-full sm:w-auto">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-2xl border border-[#EEDFE4] bg-[#FFF9FA] px-5 py-3 font-black text-[#755F67] transition hover:bg-[#FFF0F4] hover:text-[#B85F7D]">
                <MoreHorizontal size={19} />
                Más
              </summary>

              <div className="absolute right-0 top-[calc(100%+8px)] z-[90] grid w-full min-w-[230px] gap-1 rounded-2xl border border-[#F0E2E7] bg-white p-2 shadow-2xl shadow-[#392F33]/10 sm:w-64">
                <button
                  type="button"
                  onClick={abrirBajoStock}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#5B4950] transition hover:bg-amber-50 hover:text-amber-700"
                >
                  <AlertTriangle size={17} />
                  Bajo stock
                </button>

                <button
                  type="button"
                  onClick={abrirCaducidad}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#5B4950] transition hover:bg-red-50 hover:text-red-700"
                >
                  <AlertTriangle size={17} />
                  Caducidad
                </button>

                <button
                  type="button"
                  onClick={abrirMovimientos}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#5B4950] transition hover:bg-[#FFF0F4] hover:text-[#B85F7D]"
                >
                  <History size={17} />
                  Historial de movimientos
                </button>

                <button
                  type="button"
                  onClick={exportarInventarioExcel}
                  disabled={!idSucursal || cargando || inventarioFiltrado.length === 0}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#5B4950] transition hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FileSpreadsheet size={17} />
                  Exportar Excel
                </button>
              </div>
            </details>
          </div>
        </div>

        <div className="relative z-40 mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">
                {sucursalActual?.nombre || 'Inventario'}
              </p>
              <p className="text-sm font-semibold text-[#8B7A80]">
                Busca una prenda o filtra por categoría.
              </p>
            </div>

            {puedeCambiarSucursal && (
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value)}
                className="min-w-[190px] rounded-2xl border border-[#EEDFE4] bg-white px-4 py-2.5 text-sm font-bold text-[#5B4950] outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
              >
                <option value="">Selecciona sucursal</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div className="relative z-[60] min-w-0">
              <Search
                className="absolute left-4 top-3.5 text-[#B6A3AA]"
                size={20}
              />

              <input
                value={buscar}
                onChange={(e) => {
                  setBuscar(e.target.value);
                  setIdProductoBusqueda('');
                }}
                onFocus={() => {
                  if (String(buscar || '').trim().length >= 2) {
                    setMostrandoSugerenciasInventario(true);
                  }
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setMostrandoSugerenciasInventario(false);
                    setIndiceSugerenciaInventario(-1);
                  }, 150);
                }}
                onKeyDown={(e) => {
                  const haySugerencias =
                    mostrandoSugerenciasInventario &&
                    sugerenciasInventario.length > 0;

                  if (e.key === 'ArrowDown' && haySugerencias) {
                    e.preventDefault();
                    setIndiceSugerenciaInventario((indice) =>
                      indice >= sugerenciasInventario.length - 1 ? 0 : indice + 1
                    );
                    return;
                  }

                  if (e.key === 'ArrowUp' && haySugerencias) {
                    e.preventDefault();
                    setIndiceSugerenciaInventario((indice) =>
                      indice <= 0 ? sugerenciasInventario.length - 1 : indice - 1
                    );
                    return;
                  }

                  if (e.key === 'Escape') {
                    setMostrandoSugerenciasInventario(false);
                    setIndiceSugerenciaInventario(-1);
                    return;
                  }

                  if (e.key === 'Enter') {
                    e.preventDefault();

                    const itemSeleccionado =
                      haySugerencias && indiceSugerenciaInventario >= 0
                        ? sugerenciasInventario[indiceSugerenciaInventario]
                        : null;

                    buscarInventarioYMovimientos({ itemSeleccionado });
                  }
                }}
                className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-12 text-sm font-semibold text-[#4A3A40] outline-none focus:bg-white focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                placeholder="Buscar producto..."
                autoComplete="off"
                aria-label="Buscar en inventario"
                aria-expanded={mostrandoSugerenciasInventario}
                aria-controls="sugerencias-inventario"
              />

              {cargandoSugerenciasInventario ? (
                <Loader2
                  className="absolute right-4 top-3.5 animate-spin text-[#B85F7D]"
                  size={20}
                />
              ) : (
                (buscar || categoriaSeleccionada) && (
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#A84E6C] transition hover:bg-[#F9E1E8]"
                    title="Limpiar búsqueda"
                  >
                    <X size={16} />
                  </button>
                )
              )}

              {mostrandoSugerenciasInventario &&
                String(buscar || '').trim().length >= 2 && (
                  <div
                    id="sugerencias-inventario"
                    className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-2xl border border-[#EEDFE4] bg-white shadow-2xl shadow-[#392F33]/10"
                  >
                    {cargandoSugerenciasInventario ? (
                      <div className="flex items-center gap-3 px-4 py-4 text-sm font-semibold text-[#8B7A80]">
                        <Loader2 size={19} className="animate-spin text-[#B85F7D]" />
                        Buscando productos...
                      </div>
                    ) : sugerenciasInventario.length === 0 ? (
                      <div className="px-4 py-4 text-sm font-semibold text-[#8B7A80]">
                        No se encontraron productos en esta sucursal.
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto py-2">
                        {sugerenciasInventario.map((item, index) => {
                          const seleccionado =
                            index === indiceSugerenciaInventario;

                          return (
                            <button
                              key={item.id_inventario || item.id_producto}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                seleccionarSugerenciaInventario(item);
                              }}
                              className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition ${seleccionado
                                ? 'bg-[#FFF2F5] text-[#9E4966]'
                                : 'text-[#5B4950] hover:bg-[#FFFAFB]'
                                }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">
                                  {item.producto || item.nombre || 'Producto sin nombre'}
                                </p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-[#9A858D]">
                                  {[
                                    item.codigo_barras || 'Sin código',
                                    item.marca,
                                    item.presentacion,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              </div>

                              <span className="shrink-0 rounded-full bg-[#FFF2F5] px-3 py-1 text-xs font-black text-[#B85F7D]">
                                {formatoNumero(item.stock_actual)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>

            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              disabled={!idSucursal || inventario.length === 0}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 text-sm font-bold text-[#5B4950] outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0] disabled:cursor-not-allowed disabled:bg-[#F8F2F4]"
            >
              <option value="">Todas las categorías</option>
              {categoriasInventario.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={buscarInventarioYMovimientos}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 text-sm font-black text-white transition hover:bg-[#A95270]"
            >
              <Search size={18} />
              Buscar
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="rounded-3xl border border-[#F0E2E7] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
              <Package size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#8B7A80]">Productos</p>
              <p className="text-2xl font-black text-[#392F33]">{resumen.totalProductos}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#A28D95]">
                {resumen.productosConVariantes} con variantes
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#F0E2E7] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F2EEF8] text-[#7E67A0]">
              <Boxes size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#8B7A80]">Unidades</p>
              <p className="text-2xl font-black text-[#392F33]">{formatoNumero(resumen.totalUnidades)}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#A28D95]">Stock total</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#F0E2E7] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF6E9] text-[#B97842]">
              <CalendarClock size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#8B7A80]">Lotes</p>
              <p className="text-2xl font-black text-[#392F33]">{resumen.totalLotes}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#A28D95]">Registrados</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#F0E2E7] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <BadgeDollarSign size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#8B7A80]">Valor costo</p>
              <p className="truncate text-lg font-black text-[#392F33]">{formatoMoneda(resumen.valorInventario)}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-[#A28D95]">Inventario actual</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={abrirBajoStock}
          className="col-span-2 rounded-3xl border border-amber-200 bg-amber-50/70 p-4 text-left shadow-sm transition hover:bg-amber-50 xl:col-span-1"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-700">Bajo stock</p>
              <p className="text-2xl font-black text-[#392F33]">{resumen.productosBajoStock}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-amber-700/70">Requieren atención</p>
            </div>
          </div>
        </button>
      </section>

      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-[#F0E2E7] overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7]">
          <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
            Productos en inventario
          </h2>
          <p className="text-sm text-[#8B7A80]">
            Existencias, ubicación, caducidad y acciones por producto.
          </p>
        </div>

        <div className="md:hidden p-4 space-y-3">
          {cargando ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8B7A80] font-semibold">
              Cargando inventario...
            </div>
          ) : inventarioFiltrado.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8B7A80] font-semibold">
              {categoriaSeleccionada
                ? 'No hay productos que coincidan con la categoría seleccionada.'
                : 'No hay productos con inventario asignado en esta sucursal.'}
            </div>
          ) : (
            inventarioFiltrado.map((item) => (
              <article
                key={item.id_inventario}
                className={`rounded-3xl border p-4 shadow-sm ${item.bajo_stock
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-[#F0E2E7] bg-white'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-black text-[#392F33]">
                      {item.producto}
                    </p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#8B7A80]">
                      {[item.categoria, item.marca, item.presentacion]
                        .filter(Boolean)
                        .join(' · ') || 'Sin datos adicionales'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {esVerdadero(item.usa_variantes) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F2EEF8] px-2.5 py-1 text-[10px] font-black text-[#745D8A]">
                          <Layers3 size={11} /> Variantes
                        </span>
                      )}
                      {(esVerdadero(item.controla_lotes) || Number(item.total_lotes || 0) > 0) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF6E9] px-2.5 py-1 text-[10px] font-black text-[#A9673D]">
                          <Boxes size={11} /> {Number(item.total_lotes || 0)} lote(s)
                        </span>
                      )}
                      {item.codigo_barras && (
                        <span className="rounded-full bg-[#FFF9FA] px-2.5 py-1 text-[10px] font-black text-[#806B73]">
                          {item.codigo_barras}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-[#FFF0F4] px-3 py-2 text-right">
                    <p className="text-[10px] font-black uppercase text-[#A08790]">
                      Stock
                    </p>
                    <p className="text-xl font-black text-[#B85F7D]">
                      {formatoNumero(item.stock_actual)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-[10px] font-black uppercase text-[#A08790]">Compra / Venta</p>
                    <p className="mt-1 text-xs font-bold text-[#755F67]">{formatoMoneda(item.precio_compra)}</p>
                    <p className="text-base font-black text-[#B85F7D]">{formatoMoneda(item.precio_venta)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-[10px] font-black uppercase text-[#A08790]">Mínimo / Ubicación</p>
                    <p className="mt-1 text-sm font-black text-[#392F33]">Mín. {formatoNumero(item.stock_minimo)}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[#8B7A80]">
                      {item.ubicacion || 'Sin ubicación'}
                    </p>
                  </div>
                </div>

                {item.bajo_stock && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-800">
                    <AlertTriangle size={12} /> Bajo stock
                  </div>
                )}

                {item.proxima_caducidad && item.caducidad_proxima && (
                  <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    Caducidad próxima:{' '}
                    {new Date(item.proxima_caducidad).toLocaleDateString('es-MX')}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirMovimiento(item, 'ENTRADA')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-4 py-3 text-sm font-black text-white transition hover:bg-[#A95270]"
                  >
                    <ArrowDownCircle size={18} /> Entrada
                  </button>

                  {(esVerdadero(item.controla_lotes) || Number(item.total_lotes || 0) > 0) && (
                    <button
                      type="button"
                      onClick={() => abrirLotes(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F0DFC8] bg-[#FFF8EE] px-4 py-3 text-sm font-black text-[#9A623C] transition hover:bg-[#FFF1DE]"
                    >
                      <Boxes size={18} /> Lotes
                    </button>
                  )}

                  {puedeGestionarInventario && (
                    <button
                      type="button"
                      onClick={() => setProductoAcciones(item)}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EEDFE4] bg-[#FFF9FA] px-4 py-3 text-sm font-black text-[#755F67] transition hover:bg-[#FFF0F4] hover:text-[#B85F7D]"
                    >
                      <MoreHorizontal size={18} /> Más acciones
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="bg-[#FFFAFB] border-b border-[#F0E2E7]">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8B7A80] uppercase">
                  Producto
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8B7A80] uppercase">
                  Código
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8B7A80] uppercase">
                  Detalle
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8B7A80] uppercase">
                  Control / Lotes
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-[#8B7A80] uppercase">
                  Ubicación / Caducidad
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8B7A80] uppercase">
                  Stock
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8B7A80] uppercase">
                  Mínimo
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-[#8B7A80] uppercase">
                  Compra / Venta
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8B7A80] uppercase">
                  Estado
                </th>
                <th className="px-5 py-4 text-center text-xs font-bold text-[#8B7A80] uppercase sticky right-0 bg-[#FFFAFB] shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] z-10">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F4E8EB]">
              {cargando ? (
                <tr>
                  <td colSpan="10" className="px-5 py-10 text-center text-[#8B7A80]">
                    Cargando inventario...
                  </td>
                </tr>
              ) : inventarioFiltrado.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-10 text-center text-[#8B7A80]">
                    {categoriaSeleccionada
                      ? 'No hay productos que coincidan con la categoría seleccionada.'
                      : 'No hay productos con inventario asignado en esta sucursal.'}
                  </td>
                </tr>
              ) : (
                inventarioFiltrado.map((item) => (
                  <tr
                    key={item.id_inventario}
                    className={
                      item.bajo_stock
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-[#FFFAFB]'
                    }
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#392F33]">
                        {item.producto}
                      </p>
                      <p className="text-xs text-[#8B7A80] mt-1">
                        {item.marca || 'Sin marca'} ·{' '}
                        {item.presentacion || 'Sin presentación'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#755F67]">
                      {item.codigo_barras || '—'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#755F67]">
                      <p className="font-bold text-[#5B4950]">{item.categoria || 'Sin categoría'}</p>
                      <p className="mt-1 text-xs text-[#9A858D]">{item.marca || 'Sin marca'} · {item.presentacion || 'Sin presentación'}</p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[210px] flex-wrap gap-1.5">
                        {esVerdadero(item.usa_variantes) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F2EEF8] px-2.5 py-1 text-[10px] font-black text-[#745D8A]">
                            <Layers3 size={11} /> Variantes
                          </span>
                        )}
                        {(esVerdadero(item.controla_lotes) || Number(item.total_lotes || 0) > 0) && (
                          <button
                            type="button"
                            onClick={() => abrirLotes(item)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#FFF6E9] px-2.5 py-1 text-[10px] font-black text-[#A9673D] transition hover:bg-[#FFECCE]"
                            title="Ver y editar lotes"
                          >
                            <Boxes size={11} /> {Number(item.total_lotes || 0)} lote(s)
                          </button>
                        )}
                        {esVerdadero(item.controla_caducidad) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700">
                            <CalendarClock size={11} /> Caducidad
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      <p className="inline-flex items-center gap-1 font-semibold text-[#755F67]">
                        <MapPin size={13} /> {item.ubicacion || 'Sin ubicación'}
                      </p>
                      <p className="mt-1 text-xs">
                        {item.proxima_caducidad ? (
                          <span className={`font-bold ${item.caducidad_proxima ? 'text-red-700' : 'text-[#8B7A80]'}`}>
                            Cad.: {new Date(item.proxima_caducidad).toLocaleDateString('es-MX')}
                          </span>
                        ) : (
                          <span className="text-[#B09CA3]">Sin caducidad próxima</span>
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <span className="text-lg font-bold text-[#392F33]">
                        {formatoNumero(item.stock_actual)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-[#755F67]">
                      {formatoNumero(item.stock_minimo)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <p className="text-xs font-semibold text-[#8B7A80]">{formatoMoneda(item.precio_compra)}</p>
                      <p className="mt-0.5 font-black text-[#B85F7D]">{formatoMoneda(item.precio_venta)}</p>
                    </td>

                    <td className="px-5 py-4 text-center">
                      {item.bajo_stock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                          <AlertTriangle size={13} />
                          Bajo stock
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#B85F7D]">
                          Correcto
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.18)]">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirMovimiento(item, 'ENTRADA')}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFF2F5] px-3 py-2 text-xs font-black text-[#B85F7D] transition hover:bg-[#FBEAF0]"
                        >
                          <ArrowDownCircle size={17} />
                          Entrada
                        </button>

                        {(esVerdadero(item.controla_lotes) || Number(item.total_lotes || 0) > 0) && (
                          <button
                            type="button"
                            onClick={() => abrirLotes(item)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFF8EE] px-3 py-2 text-xs font-black text-[#9A623C] transition hover:bg-[#FFF1DE]"
                            title="Ver y editar lotes"
                          >
                            <Eye size={16} /> Lotes
                          </button>
                        )}

                        {puedeGestionarInventario && (
                          <button
                            type="button"
                            onClick={() => setProductoAcciones(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFFAFB] text-[#755F67] transition hover:bg-[#F7EEF1] hover:text-[#B85F7D]"
                            title="Más acciones"
                          >
                            <MoreHorizontal size={18} />
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

      {productoAcciones && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:items-center">
          <button
            type="button"
            aria-label="Cerrar acciones"
            className="fixed inset-0 bg-[#392F33]/45 backdrop-blur-sm"
            onClick={() => setProductoAcciones(null)}
          />

          <div className="relative z-[96] w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#F0E2E7] px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[#B85F7D]">
                  Gestionar inventario
                </p>
                <h3 className="mt-1 truncate text-lg font-black text-[#392F33]">
                  {productoAcciones.producto}
                </h3>
                <p className="text-sm font-semibold text-[#8B7A80]">
                  Stock actual: {formatoNumero(productoAcciones.stock_actual)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProductoAcciones(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#A84E6C]"
              >
                <X size={19} />
              </button>
            </div>

            <div className="grid gap-2 p-4">
              <button
                type="button"
                onClick={() => {
                  const item = productoAcciones;
                  setProductoAcciones(null);
                  abrirMovimiento(item, 'SALIDA');
                }}
                className="flex items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left font-black text-red-700 transition hover:bg-red-100"
              >
                <ArrowUpCircle size={19} />
                Registrar salida
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = productoAcciones;
                  setProductoAcciones(null);
                  abrirMovimiento(item, 'AJUSTE_POSITIVO');
                }}
                className="flex items-center gap-3 rounded-2xl bg-[#FFF0F4] px-4 py-3 text-left font-black text-[#A84E6C] transition hover:bg-[#F9E1E8]"
              >
                <RefreshCw size={18} />
                Ajustar existencia
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = productoAcciones;
                  setProductoAcciones(null);
                  abrirLotes(item);
                }}
                className="flex items-center gap-3 rounded-2xl bg-[#FFFAFB] px-4 py-3 text-left font-black text-[#755F67] transition hover:bg-[#F7EEF1]"
              >
                <Package size={18} />
                Ver lotes
              </button>
            </div>
          </div>
        </div>
      )}
      {modalAsignar && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#392F33]/60 backdrop-blur-sm"
            onClick={cerrarModalAsignar}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF2F5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#B85F7D]">
                  <Boxes size={13} />
                  Inventario inicial
                </div>
                <h2 className="mt-2 text-lg sm:text-xl font-bold text-[#392F33]">
                  Asignar stock inicial
                </h2>
                <p className="text-sm text-[#8B7A80] break-words">
                  Sucursal: {sucursalActual?.nombre || 'Sin sucursal'}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalAsignar}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={asignarInventario}>
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[72vh] overflow-y-auto">
                <div className="md:col-span-2 min-w-0">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Producto *
                  </label>

                  <ProductoSearchSelect
                    name="id_producto"
                    value={formAsignar.id_producto}
                    opciones={productosSinInventario}
                    placeholder="Buscar producto por nombre o código..."
                    emptyText="No hay productos disponibles para asignar."
                    onChange={handleAsignarChange}
                    getValue={(producto) => producto.id_producto}
                    getTitle={(producto) => producto.nombre || 'Producto sin nombre'}
                    getSubtitle={(producto) =>
                      [
                        producto.codigo_barras || 'Sin código',
                        producto.marca,
                        producto.presentacion,
                        producto.categoria,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }
                    getRightText={(producto) =>
                      esVerdadero(producto.usa_variantes)
                        ? 'Con variantes'
                        : 'Simple'
                    }
                  />

                  {productosSinInventario.length === 0 && (
                    <p className="text-sm text-amber-700 mt-2">
                      Todos los productos activos ya tienen inventario asignado en
                      esta sucursal.
                    </p>
                  )}
                </div>

                {productoAsignacionSeleccionado && (
                  <div className="md:col-span-2 rounded-2xl border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-black text-[#49383F] truncate">
                          {productoAsignacionSeleccionado.nombre}
                        </p>
                        <p className="mt-1 text-xs text-[#927B84]">
                          {[productoAsignacionSeleccionado.categoria, productoAsignacionSeleccionado.marca, productoAsignacionSeleccionado.presentacion]
                            .filter(Boolean)
                            .join(' · ') || 'Sin información adicional'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${asignacionUsaVariantes
                          ? 'bg-[#F0EBF6] text-[#745D8A]'
                          : 'bg-slate-100 text-slate-600'
                          }`}>
                          {asignacionUsaVariantes ? 'Variantes' : 'Simple'}
                        </span>

                        {asignacionControlaLotes && (
                          <span className="rounded-full bg-[#FFF3E9] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#A9673D]">
                            Lotes
                          </span>
                        )}

                        {asignacionControlaCaducidad && (
                          <span className="rounded-full bg-[#FFF0F0] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#B65F66]">
                            Caducidad
                          </span>
                        )}
                      </div>
                    </div>

                    {inventarioAsignacionExistente && asignacionUsaVariantes && (
                      <div className="mt-3 rounded-xl border border-[#E8DCE1] bg-white px-3 py-2 text-xs font-semibold text-[#7E6770]">
                        Este producto ya existe en la sucursal con{' '}
                        <span className="font-black text-[#A84E6C]">
                          {formatoNumero(inventarioAsignacionExistente.stock_actual)}
                        </span>{' '}
                        unidad(es). Las variantes que captures se agregarán al inventario actual.
                      </div>
                    )}
                  </div>
                )}

                {asignacionUsaVariantes && (
                  <div className="md:col-span-2 rounded-[1.5rem] border border-[#E8DCE1] bg-white overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-[#F0E2E7] bg-[#FFFAFB] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-black text-[#49383F]">
                          Variantes del producto
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-[#927B84]">
                          El formulario usa exactamente los atributos que configuraste en el producto.
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {camposVariantesAsignacion.map((campo) => (
                            <span
                              key={campo.clave}
                              className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#8E596B] ring-1 ring-[#EEDFE4]"
                            >
                              {campo.etiqueta}
                            </span>
                          ))}

                          {asignacionUsaPrecioPorVariante && (
                            <span className="rounded-full bg-[#FBEAF0] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#A84E6C] ring-1 ring-[#E6C6D1]">
                              Precio por variante
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={agregarVarianteAsignacion}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-2.5 text-sm font-black text-[#A84E6C] transition hover:bg-[#F6DCE5]"
                      >
                        <Plus size={17} />
                        Agregar variante
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {(formAsignar.variantes || []).length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#DCCBD1] bg-[#FFFDFD] px-4 py-8 text-center">
                          <p className="font-bold text-[#67545B]">
                            Aún no hay variantes capturadas.
                          </p>
                          <p className="mt-1 text-xs text-[#927B84]">
                            Agrega por lo menos una variante para continuar.
                          </p>
                          <button
                            type="button"
                            onClick={agregarVarianteAsignacion}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#B85F7D] px-4 py-2.5 text-sm font-black text-white"
                          >
                            <Plus size={16} />
                            Agregar variante
                          </button>
                        </div>
                      ) : (
                        formAsignar.variantes.map((variante, indice) => (
                          <div
                            key={variante.id_temporal}
                            className="rounded-2xl border border-[#F0E2E7] bg-[#FFFCFD] p-4"
                          >
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-[#49383F]">
                                  Variante {indice + 1}
                                </p>
                                <p className="mt-0.5 text-xs text-[#927B84]">
                                  {obtenerNombreVariante(variante, camposVariantesAsignacion)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  eliminarVarianteAsignacion(variante.id_temporal)
                                }
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                                title="Eliminar variante"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              {camposVariantesAsignacion.map((campo) => (
                                <div key={`${variante.id_temporal}-${campo.clave}`}>
                                  <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                    {campo.etiqueta} *
                                  </label>

                                  {campo.tipo === 'select' ? (
                                    <select
                                      value={variante.atributos?.[campo.clave] || ''}
                                      onChange={(e) =>
                                        actualizarAtributoVarianteAsignacion(
                                          variante.id_temporal,
                                          campo.clave,
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                    >
                                      <option value="">Selecciona...</option>
                                      {(campo.opciones || []).map((opcion) => (
                                        <option key={opcion} value={opcion}>
                                          {opcion}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      value={variante.atributos?.[campo.clave] || ''}
                                      onChange={(e) =>
                                        actualizarAtributoVarianteAsignacion(
                                          variante.id_temporal,
                                          campo.clave,
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                      placeholder={campo.placeholder || campo.etiqueta}
                                    />
                                  )}
                                </div>
                              ))}

                              <div>
                                <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                  Nombre alternativo
                                </label>
                                <input
                                  value={variante.nombre_variante}
                                  onChange={(e) =>
                                    actualizarVarianteAsignacion(
                                      variante.id_temporal,
                                      'nombre_variante',
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                  placeholder="Opcional; se genera automáticamente"
                                />
                              </div>

                              {/* SKU DESHABILITADO TEMPORALMENTE
                              <div>
                                <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                  SKU
                                </label>
                                <input
                                  value={variante.sku}
                                  onChange={(e) =>
                                    actualizarVarianteAsignacion(
                                      variante.id_temporal,
                                      'sku',
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                  placeholder="Opcional"
                                />
                              </div>
                              */}

                              <div>
                                <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                  Código de barras
                                </label>
                                <input
                                  value={variante.codigo_barras}
                                  onChange={(e) =>
                                    actualizarVarianteAsignacion(
                                      variante.id_temporal,
                                      'codigo_barras',
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                  placeholder="Opcional"
                                />
                              </div>

                              {asignacionUsaPrecioPorVariante && (
                                <div>
                                  <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                    Precio de venta *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={variante.precio_venta}
                                    onChange={(e) =>
                                      actualizarVarianteAsignacion(
                                        variante.id_temporal,
                                        'precio_venta',
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm font-black text-[#A84E6C] outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                    placeholder="0.00"
                                  />
                                  <p className="mt-1 text-[10px] font-semibold text-[#9B858D]">
                                    Este precio se respetará al vender esta variante.
                                  </p>
                                </div>
                              )}

                              <div>
                                <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                  Cantidad inicial *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={variante.stock_inicial}
                                  onChange={(e) =>
                                    actualizarVarianteAsignacion(
                                      variante.id_temporal,
                                      'stock_inicial',
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm font-black text-[#49383F] outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                  placeholder="0"
                                />
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-dashed border-[#E7D4DB] bg-white p-3 sm:p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-wide text-[#745D8A]">
                                    Imagen de referencia
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-[#927B84]">
                                    Opcional. Se mostrará en el POS para identificar visualmente esta variante.
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#B85F7D] px-3.5 py-2.5 text-xs font-black text-white transition hover:bg-[#A95270]">
                                    <Camera size={16} />
                                    Tomar foto
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      capture="environment"
                                      className="hidden"
                                      onChange={(e) => {
                                        seleccionarImagenVarianteAsignacion(
                                          variante.id_temporal,
                                          e.target.files?.[0] || null
                                        );
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>

                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E7D4DB] bg-[#FFF9FA] px-3.5 py-2.5 text-xs font-black text-[#745D8A] transition hover:bg-[#F7EEF1]">
                                    <ImagePlus size={16} />
                                    Subir imagen
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        seleccionarImagenVarianteAsignacion(
                                          variante.id_temporal,
                                          e.target.files?.[0] || null
                                        );
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              {variante.imagen_preview && (
                                <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-[#FFFAFB] p-3 sm:flex-row sm:items-center">
                                  <img
                                    src={variante.imagen_preview}
                                    alt={`Referencia de ${obtenerNombreVariante(
                                      variante,
                                      camposVariantesAsignacion
                                    )}`}
                                    className="h-32 w-full rounded-xl border border-[#EEDFE4] object-cover sm:h-28 sm:w-36"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black text-[#49383F]">
                                      {variante.imagen_archivo?.name || 'Fotografía capturada'}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#927B84]">
                                      Esta es la imagen que verá el cajero al seleccionar la variante.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        quitarImagenVarianteAsignacion(variante.id_temporal)
                                      }
                                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                                    >
                                      <X size={14} />
                                      Quitar imagen
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-[#F0E2E7] bg-[#FFFAFB] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-semibold text-[#927B84]">
                        El stock general del producto será la suma de todas las variantes.
                      </p>
                      <div className="rounded-full bg-[#FBEAF0] px-4 py-2 text-sm font-black text-[#A84E6C]">
                        Total inicial: {formatoNumero(stockInicialVariantes)}
                      </div>
                    </div>
                  </div>
                )}

                {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Proveedor
                  </label>
                  <select
                    name="id_proveedor"
                    value={formAsignar.id_proveedor}
                    onChange={handleAsignarChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white"
                  >
                    <option value="">Sin proveedor / Inventario inicial</option>
                    {proveedores.map((proveedor) => (
                      <option
                        key={proveedor.id_proveedor}
                        value={proveedor.id_proveedor}
                      >
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                */}

                {!asignacionUsaVariantes && (
                  <div>
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      Stock inicial *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="stock_inicial"
                      value={formAsignar.stock_inicial}
                      onChange={handleAsignarChange}
                      className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                      placeholder="0"
                    />
                  </div>
                )}

                {asignacionUsaVariantes && (
                  <div>
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      Stock inicial total
                    </label>
                    <div className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] bg-[#FFF9FA] font-black text-[#A84E6C]">
                      {formatoNumero(stockInicialVariantes)}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="stock_minimo"
                    value={formAsignar.stock_minimo}
                    onChange={handleAsignarChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Ubicación
                  </label>
                  <input
                    name="ubicacion"
                    value={formAsignar.ubicacion}
                    onChange={handleAsignarChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Anaquel A1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Precio compra
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="precio_compra"
                    value={formAsignar.precio_compra}
                    onChange={handleAsignarChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="0.00"
                  />
                </div>

                {asignacionControlaLotes && (
                  <div>
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      Lote
                    </label>
                    <input
                      name="lote"
                      value={formAsignar.lote}
                      onChange={handleAsignarChange}
                      className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                      placeholder="Ej. PAR-2026-A"
                    />
                  </div>
                )}

                {asignacionControlaCaducidad && (
                  <div>
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      Fecha de caducidad
                    </label>
                    <input
                      type="date"
                      name="fecha_caducidad"
                      value={formAsignar.fecha_caducidad}
                      onChange={handleAsignarChange}
                      className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Observaciones
                  </label>
                  <input
                    name="observaciones"
                    value={formAsignar.observaciones}
                    onChange={handleAsignarChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Carga inicial"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-6 py-5 flex flex-col gap-3 border-t border-[#F0E2E7] sm:flex-row sm:items-center sm:justify-between">
                {asignacionUsaVariantes ? (
                  <p className="text-xs font-semibold text-[#8B7A80]">
                    Se enviarán {formAsignar.variantes?.length || 0} variante(s) con un total de {formatoNumero(stockInicialVariantes)} pieza(s).
                  </p>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B85F7D] hover:bg-[#A95270] text-white font-bold transition disabled:opacity-60"
                >
                  {guardando ? (
                    <Loader2 size={19} className="animate-spin" />
                  ) : (
                    <Save size={19} />
                  )}
                  {guardando ? 'Guardando...' : 'Guardar inventario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#392F33]/60 backdrop-blur-sm"
            onClick={cerrarModalMovimiento}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
                  Movimiento de inventario
                </h2>
                <p className="text-sm text-[#8B7A80] break-words">
                  {getProductoNombre(formMovimiento.id_producto) ||
                    'Selecciona un producto'}
                </p>
              </div>

              <button
                onClick={cerrarModalMovimiento}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarMovimiento}>
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Producto *
                  </label>
                  <ProductoSearchSelect
                    name="id_producto"
                    value={formMovimiento.id_producto}
                    opciones={inventario}
                    placeholder="Buscar producto en inventario..."
                    emptyText="No se encontraron productos en inventario."
                    onChange={handleMovimientoChange}
                    getValue={(item) => item.id_producto}
                    getTitle={(item) => item.producto || item.nombre || 'Producto sin nombre'}
                    getSubtitle={(item) =>
                      [
                        item.codigo_barras || 'Sin código',
                        item.marca,
                        item.presentacion,
                        item.categoria,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    }
                    getRightText={(item) => `Stock: ${formatoNumero(item.stock_actual)}`}
                  />
                </div>

                {movimientoUsaVariantes && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      Variante *
                    </label>
                    <select
                      name="id_variante"
                      value={formMovimiento.id_variante}
                      onChange={handleMovimientoChange}
                      className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white"
                    >
                      <option value="">Selecciona la variante...</option>
                      {variantesMovimientoDisponibles.map((variante) => (
                        <option key={variante.id_variante} value={variante.id_variante}>
                          {obtenerEtiquetaVarianteConPrecio(variante)}
                        </option>
                      ))}
                    </select>

                    {varianteMovimientoSeleccionada && (
                      <p className="mt-1 text-xs font-semibold text-[#8B7A80]">
                      
                        {varianteMovimientoSeleccionada.codigo_barras || '—'} ·
                        Stock de variante:{' '}
                        {formatoNumero(varianteMovimientoSeleccionada.stock_actual)}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Tipo de movimiento *
                  </label>
                  <select
                    name="tipo_movimiento"
                    value={formMovimiento.tipo_movimiento}
                    onChange={handleMovimientoChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white"
                  >
                    {tiposMovimiento.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                {requiereProveedorMovimiento && (
                  <div>
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      Proveedor
                    </label>
                    <select
                      name="id_proveedor"
                      value={formMovimiento.id_proveedor}
                      onChange={handleMovimientoChange}
                      className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white"
                    >
                      <option value="">Sin proveedor</option>
                      {proveedores.map((proveedor) => (
                        <option
                          key={proveedor.id_proveedor}
                          value={proveedor.id_proveedor}
                        >
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                */}

                {movimientosConLoteExistente.includes(formMovimiento.tipo_movimiento) && (
                  <div>
                    <label className="block text-sm font-bold text-[#5B4950] mb-2">
                      {movimientosEntrada.includes(formMovimiento.tipo_movimiento)
                        ? 'Lote recibido'
                        : 'Lote de salida'}
                    </label>
                    <select
                      name="id_lote"
                      value={formMovimiento.id_lote}
                      onChange={handleMovimientoChange}
                      className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white"
                    >
                      <option value="">
                        {movimientosSalida.includes(formMovimiento.tipo_movimiento)
                          ? 'Automático FEFO'
                          : 'Selecciona lote'}
                      </option>
                      {lotes
                        .filter(
                          (l) =>
                            Number(l.id_producto) ===
                            Number(formMovimiento.id_producto)
                        )
                        .filter(
                          (l) =>
                            !movimientoUsaVariantes ||
                            !formMovimiento.id_variante ||
                            Number(l.id_variante) ===
                            Number(formMovimiento.id_variante)
                        )
                        .filter((l) => Number(l.stock_actual) > 0)
                        .map((loteItem) => (
                          <option key={loteItem.id_lote} value={loteItem.id_lote}>
                            {movimientoUsaVariantes && loteItem.id_variante
                              ? `${obtenerEtiquetaVarianteGuardada(loteItem)} · `
                              : ''}
                            {loteItem.lote} · Stock:{' '}
                            {formatoNumero(loteItem.stock_actual)} · Cad:{' '}
                            {loteItem.fecha_caducidad
                              ? new Date(loteItem.fecha_caducidad).toLocaleDateString(
                                'es-MX'
                              )
                              : 'Sin fecha'}
                          </option>
                        ))}
                    </select>
                    {movimientosSalida.includes(formMovimiento.tipo_movimiento) ? (
                      <p className="text-xs text-[#8B7A80] mt-1">
                        Si no seleccionas lote, el sistema descontará primero el lote
                        que caduca antes.
                      </p>
                    ) : (
                      <p className="text-xs text-[#8B7A80] mt-1">
                        Para devolución de cliente, selecciona el lote donde regresará
                        el medicamento. Al elegirlo se llenan caducidad y precio.
                      </p>
                    )}

                    {formMovimiento.id_lote && (
                      <div className="mt-3 rounded-2xl bg-[#FFFAFB] border border-[#F0E2E7] p-4 text-sm">
                        <p className="font-bold text-[#5B4950]">
                          Lote seleccionado: {formMovimiento.lote || '—'}
                        </p>
                        <p className="text-[#8B7A80] mt-1">
                          {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                          Proveedor:{' '}
                          <span className="font-semibold text-[#5B4950]">
                            {proveedores.find((p) => Number(p.id_proveedor) === Number(formMovimiento.id_proveedor))?.nombre || 'Sin proveedor'}
                          </span>
                          <br />
                          */}
                          Caducidad:{' '}
                          <span className="font-semibold text-[#5B4950]">
                            {formMovimiento.fecha_caducidad
                              ? new Date(formMovimiento.fecha_caducidad).toLocaleDateString('es-MX')
                              : 'Sin fecha'}
                          </span>{' '}
                          · Precio compra:{' '}
                          <span className="font-semibold text-[#5B4950]">
                            {formatoMoneda(formMovimiento.precio_compra)}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="cantidad"
                    value={formMovimiento.cantidad}
                    onChange={handleMovimientoChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="0"
                  />
                </div>

                {movimientosPermitenNuevoLote.includes(formMovimiento.tipo_movimiento) && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-[#5B4950] mb-2">
                        Lote
                      </label>
                      <input
                        name="lote"
                        value={formMovimiento.lote}
                        onChange={handleMovimientoChange}
                        className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                        placeholder="Ej. PAR-2026-B"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#5B4950] mb-2">
                        Fecha de caducidad
                      </label>
                      <input
                        type="date"
                        name="fecha_caducidad"
                        value={formMovimiento.fecha_caducidad}
                        onChange={handleMovimientoChange}
                        className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#5B4950] mb-2">
                        Precio compra lote
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="precio_compra"
                        value={formMovimiento.precio_compra}
                        onChange={handleMovimientoChange}
                        className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                        placeholder="0.00"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="stock_minimo"
                    value={formMovimiento.stock_minimo}
                    onChange={handleMovimientoChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Ubicación
                  </label>
                  <input
                    name="ubicacion"
                    value={formMovimiento.ubicacion}
                    onChange={handleMovimientoChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Anaquel A1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Referencia
                  </label>
                  <input
                    name="referencia"
                    value={formMovimiento.referencia}
                    onChange={handleMovimientoChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="COMPRA-001, AJUSTE-001..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Observaciones
                  </label>
                  <input
                    name="observaciones"
                    value={formMovimiento.observaciones}
                    onChange={handleMovimientoChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Motivo del movimiento"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-6 py-5 flex justify-end border-t border-[#F0E2E7]">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B85F7D] hover:bg-[#A95270] text-white font-bold transition disabled:opacity-60"
                >
                  <Save size={19} />
                  {guardando ? 'Guardando...' : 'Guardar movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalLotes && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#392F33]/60 backdrop-blur-sm"
            onClick={() => setModalLotes(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
                  Lotes del producto
                </h2>
                <p className="text-sm text-[#8B7A80] break-words">
                  {productoLotes?.producto || 'Producto'}
                </p>
              </div>

              <button
                onClick={() => setModalLotes(false)}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
              {lotes.length > 0 && (
                <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <p className="text-[10px] font-black uppercase text-[#9A858D]">Lotes</p>
                    <p className="mt-1 text-xl font-black text-[#392F33]">{lotes.length}</p>
                  </div>
                  <div className="rounded-2xl border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <p className="text-[10px] font-black uppercase text-[#9A858D]">Stock en lotes</p>
                    <p className="mt-1 text-xl font-black text-[#392F33]">
                      {formatoNumero(lotes.reduce((acc, item) => acc + Number(item.stock_actual || 0), 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <p className="text-[10px] font-black uppercase text-[#9A858D]">Valor costo</p>
                    <p className="mt-1 text-base font-black text-[#392F33]">
                      {formatoMoneda(lotes.reduce((acc, item) => acc + Number(item.stock_actual || 0) * Number(item.precio_compra || 0), 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#F0E2E7] bg-[#FFFAFB] p-4">
                    <p className="text-[10px] font-black uppercase text-[#9A858D]">Ubicación</p>
                    <p className="mt-1 truncate text-sm font-black text-[#392F33]">{productoLotes?.ubicacion || 'Sin ubicación'}</p>
                  </div>
                </div>
              )}

              {lotes.length === 0 ? (
                <div className="text-center py-10 text-[#8B7A80]">
                  No hay lotes registrados para este producto.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px]">
                    <thead className="bg-[#FFFAFB] border-b border-[#F0E2E7]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Variante
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Lote
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Caducidad
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Precio compra
                        </th>
                        {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Proveedor
                        </th>
                        */}
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Compra
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-[#8B7A80] uppercase">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Entrada
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-[#8B7A80] uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F4E8EB]">
                      {lotes.map((loteItem) => (
                        <tr key={loteItem.id_lote}>
                          <td className="px-4 py-3 text-[#755F67]">
                            {loteItem.id_variante
                              ? obtenerEtiquetaVarianteGuardada(loteItem)
                              : 'General'}
                          </td>

                          <td className="px-4 py-3 font-bold text-[#392F33]">
                            {loteItem.lote}
                          </td>

                          <td className="px-4 py-3 text-[#755F67]">
                            {loteItem.fecha_caducidad
                              ? new Date(loteItem.fecha_caducidad).toLocaleDateString(
                                'es-MX'
                              )
                              : 'Sin fecha'}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-[#392F33]">
                            {formatoNumero(loteItem.stock_actual)}
                          </td>

                          <td className="px-4 py-3 text-right text-[#755F67]">
                            {formatoMoneda(loteItem.precio_compra)}
                          </td>

                          {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                          <td className="px-4 py-3 text-[#755F67]">
                            {loteItem.proveedor || 'Sin proveedor'}
                          </td>
                          */}

                          <td className="px-4 py-3 text-[#755F67]">
                            {loteItem.folio_compra || '—'}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {loteItem.caducado ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                                Caducado
                              </span>
                            ) : loteItem.caducidad_proxima ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                                Por caducar
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#B85F7D]">
                                Vigente
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-[#755F67]">
                            {formatoFecha(loteItem.fecha_entrada)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => abrirEditarLote(loteItem)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#FFF0F4] text-[#A84E6C] hover:bg-[#F9E1E8] font-bold transition"
                                title="Editar lote"
                              >
                                <Pencil size={16} />
                                Editar
                              </button>

                              {Number(loteItem.stock_actual) > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => abrirBajaLote(loteItem, 'CADUCIDAD')}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold transition"
                                  title="Dar de baja lote"
                                >
                                  Dar de baja
                                </button>
                              ) : (
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF9FA] text-[#8B7A80]">
                                  Sin stock
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalEditarLote && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={cerrarModalEditarLote}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
                  Editar lote
                </h2>
                <p className="text-sm text-[#8B7A80] break-words">
                  {productoLotes?.producto || loteEditando?.producto || 'Producto'}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalEditarLote}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarEditarLote}>
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
                <div className="md:col-span-2 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-amber-800 text-sm">
                  <p className="font-bold">Nota</p>
                  <p>
                    Puedes editar la información de la variante asociada, los datos administrativos,
                    la ubicación y el stock del lote. La variante conserva el mismo identificador,
                    por lo que los movimientos y ventas relacionados siguen apuntando al mismo registro.
                  </p>
                </div>

                {esVerdadero(productoLotes?.usa_variantes) &&
                  loteEditando?.id_variante && (
                    <div className="md:col-span-2 rounded-2xl border border-[#E8DCE1] bg-[#FFFAFB] p-4 sm:p-5">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-black text-[#49383F]">
                          Variante asociada
                        </p>
                        <p className="text-xs font-semibold leading-relaxed text-[#927B84]">
                          Edita los atributos de esta variante. Los cambios se reflejarán en todos los lotes y existencias que usan la misma variante.
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {obtenerCamposVariantes(
                          productoLotes?.configuracion_variantes
                        ).map((campo) => (
                          <div key={`editar-lote-variante-${campo.clave}`}>
                            <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                              {campo.etiqueta} *
                            </label>

                            {campo.tipo === 'select' ? (
                              <select
                                value={
                                  formEditarLote.atributos_variante?.[
                                  campo.clave
                                  ] || ''
                                }
                                onChange={(e) =>
                                  actualizarAtributoVarianteEditarLote(
                                    campo.clave,
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                              >
                                <option value="">Selecciona...</option>
                                {(campo.opciones || []).map((opcion) => (
                                  <option key={opcion} value={opcion}>
                                    {opcion}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={
                                  formEditarLote.atributos_variante?.[
                                  campo.clave
                                  ] || ''
                                }
                                onChange={(e) =>
                                  actualizarAtributoVarianteEditarLote(
                                    campo.clave,
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                placeholder={
                                  campo.placeholder || campo.etiqueta
                                }
                              />
                            )}
                          </div>
                        ))}

                        <div>
                          <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                            Nombre alternativo
                          </label>
                          <input
                            name="nombre_variante"
                            value={formEditarLote.nombre_variante}
                            onChange={handleEditarLoteChange}
                            className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                            placeholder="Opcional; se genera con los atributos"
                          />
                        </div>

                        {/* SKU DESHABILITADO TEMPORALMENTE
                        <div>
                          <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                            SKU
                          </label>
                          <input
                            name="sku"
                            value={formEditarLote.sku}
                            onChange={handleEditarLoteChange}
                            className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                            placeholder="Opcional"
                          />
                        </div>
                        */}

                        <div>
                          <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                            Código de barras
                          </label>
                          <input
                            name="codigo_barras_variante"
                            value={formEditarLote.codigo_barras_variante}
                            onChange={handleEditarLoteChange}
                            className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                            placeholder="Opcional"
                          />
                        </div>

                        {esVerdadero(
                          normalizarConfiguracionVariantes(
                            productoLotes?.configuracion_variantes
                          ).precio
                        ) && (
                            <div>
                              <label className="mb-1.5 block text-xs font-black text-[#6F5962]">
                                Precio de venta *
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                name="precio_venta_variante"
                                value={
                                  formEditarLote.precio_venta_variante
                                }
                                onChange={handleEditarLoteChange}
                                className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3.5 py-2.5 text-sm font-black text-[#49383F] outline-none focus:border-[#D48BA2] focus:ring-2 focus:ring-[#FBEAF0]"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Lote *
                  </label>
                  <input
                    name="lote"
                    value={formEditarLote.lote}
                    onChange={handleEditarLoteChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Ej. PAR-2026-A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Fecha de caducidad
                  </label>
                  <input
                    type="date"
                    name="fecha_caducidad"
                    value={formEditarLote.fecha_caducidad}
                    onChange={handleEditarLoteChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Precio compra lote
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="precio_compra"
                    value={formEditarLote.precio_compra}
                    onChange={handleEditarLoteChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Stock actual del lote
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="stock_actual"
                    value={formEditarLote.stock_actual}
                    onChange={handleEditarLoteChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    name="ubicacion"
                    value={formEditarLote.ubicacion}
                    onChange={handleEditarLoteChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2]"
                    placeholder="Ej. Anaquel A-03"
                  />
                </div>

                {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Proveedor
                  </label>
                  <select
                    name="id_proveedor"
                    value={formEditarLote.id_proveedor}
                    onChange={handleEditarLoteChange}
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] bg-white"
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option
                        key={proveedor.id_proveedor}
                        value={proveedor.id_proveedor}
                      >
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                */}

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#5B4950] mb-2">
                    Motivo del ajuste de stock
                  </label>
                  <textarea
                    name="observaciones_stock"
                    value={formEditarLote.observaciones_stock}
                    onChange={handleEditarLoteChange}
                    rows="3"
                    className="w-full px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#FBEAF0] focus:border-[#D48BA2] resize-none"
                    placeholder="Ej. Se realizó conteo físico y se corrigió la existencia."
                  />
                </div>

                <div className="md:col-span-2 rounded-2xl bg-[#FFFAFB] border border-[#F0E2E7] p-4 text-sm text-[#755F67]">
                  <p>
                    <span className="font-bold text-[#5B4950]">
                      Compra relacionada:
                    </span>{' '}
                    {loteEditando?.folio_compra || '—'}
                  </p>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-5 flex justify-end border-t border-[#F0E2E7]">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B85F7D] hover:bg-[#A95270] text-white font-bold transition disabled:opacity-60"
                >
                  <Save size={19} />
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCaducidad && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#392F33]/60 backdrop-blur-sm"
            onClick={() => setModalCaducidad(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
                  Caducidad próxima
                </h2>
                <p className="text-sm text-[#8B7A80]">
                  Productos caducados o próximos a caducar en 90 días.
                </p>
              </div>

              <button
                onClick={() => setModalCaducidad(false)}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
              {caducidadProxima.length === 0 ? (
                <div className="text-center py-10 text-[#8B7A80]">
                  No hay productos próximos a caducar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-[#FFFAFB] border-b border-[#F0E2E7]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Lote
                        </th>
                        {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Proveedor
                        </th>
                        */}
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Caducidad
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-[#8B7A80] uppercase">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-[#8B7A80] uppercase">
                          Acción
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F4E8EB]">
                      {caducidadProxima.map((item) => (
                        <tr key={item.id_lote}>
                          <td className="px-4 py-3 font-bold text-[#392F33]">
                            {item.producto}
                          </td>

                          <td className="px-4 py-3 text-[#755F67]">
                            {item.lote}
                          </td>

                          {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                          <td className="px-4 py-3 text-[#755F67]">
                            {item.proveedor || 'Sin proveedor'}
                          </td>
                          */}

                          <td className="px-4 py-3 font-bold text-red-700">
                            {item.fecha_caducidad
                              ? new Date(item.fecha_caducidad).toLocaleDateString(
                                'es-MX'
                              )
                              : 'Sin fecha'}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-[#392F33]">
                            {formatoNumero(item.stock_actual)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {item.estado_caducidad === 'CADUCADO' ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                                Caducado
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                                Por caducar
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => abrirBajaLote(item, 'CADUCIDAD')}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold transition"
                            >
                              Dar de baja
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalBajoStock && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#392F33]/60 backdrop-blur-sm"
            onClick={() => setModalBajoStock(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
                  Productos con bajo stock
                </h2>
                <p className="text-sm text-[#8B7A80]">
                  Productos cuyo stock actual es menor o igual al mínimo.
                </p>
              </div>

              <button
                onClick={() => setModalBajoStock(false)}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
              {bajoStock.length === 0 ? (
                <div className="text-center py-10 text-[#8B7A80]">
                  No hay productos con bajo stock.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-[#FFFAFB] border-b border-[#F0E2E7]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Categoría
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Mínimo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Ubicación
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F4E8EB]">
                      {bajoStock.map((item) => (
                        <tr key={item.id_inventario}>
                          <td className="px-4 py-3 font-bold text-[#392F33]">
                            {item.producto}
                          </td>
                          <td className="px-4 py-3 text-[#755F67]">
                            {item.categoria || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">
                            {formatoNumero(item.stock_actual)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#755F67]">
                            {formatoNumero(item.stock_minimo)}
                          </td>
                          <td className="px-4 py-3 text-[#755F67]">
                            {item.ubicacion || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalMovimientos && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#392F33]/60 backdrop-blur-sm"
            onClick={() => setModalMovimientos(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E2E7] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#392F33]">
                  Movimientos de inventario
                </h2>
                <p className="text-sm text-[#8B7A80]">
                  Historial de entradas, salidas, ajustes y ventas.
                </p>
              </div>

              <button
                onClick={() => setModalMovimientos(false)}
                className="w-10 h-10 rounded-2xl bg-[#FFF9FA] hover:bg-[#F7EEF1] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-[#F0E2E7] bg-[#FFF9FA] px-4 py-3 sm:px-6">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
                <div className="min-w-0">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#9A858D]">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3 py-2 text-sm font-bold text-[#5B4950] outline-none focus:ring-2 focus:ring-[#FBEAF0]"
                  />
                </div>

                <div className="min-w-0">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#9A858D]">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full rounded-xl border border-[#EEDFE4] bg-white px-3 py-2 text-sm font-bold text-[#5B4950] outline-none focus:ring-2 focus:ring-[#FBEAF0]"
                  />
                </div>

                {(fechaInicio || fechaFin) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFechaInicio('');
                      setFechaFin('');
                    }}
                    className="col-span-2 rounded-xl bg-[#FFF0F4] px-3 py-2 text-xs font-black text-[#A84E6C] sm:col-span-1"
                  >
                    Quitar fechas
                  </button>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
              {cargandoMovimientos ? (
                <div className="text-center py-10 text-[#8B7A80]">
                  Cargando movimientos...
                </div>
              ) : movimientos.length === 0 ? (
                <div className="text-center py-10 text-[#8B7A80]">
                  No hay movimientos registrados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead className="bg-[#FFFAFB] border-b border-[#F0E2E7]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Anterior
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#8B7A80] uppercase">
                          Nuevo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Referencia
                        </th>
                        {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Proveedor
                        </th>
                        */}
                        <th className="px-4 py-3 text-left text-xs font-bold text-[#8B7A80] uppercase">
                          Usuario
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F4E8EB]">
                      {movimientos.map((mov) => (
                        <tr key={mov.id_movimiento}>
                          <td className="px-4 py-3 text-sm text-[#755F67]">
                            {formatoFecha(mov.fecha_movimiento)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#392F33]">
                            {mov.producto}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF9FA] text-[#5B4950]">
                              {mov.tipo_movimiento}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#392F33]">
                            {formatoNumero(mov.cantidad)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#755F67]">
                            {formatoNumero(mov.stock_anterior)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#B85F7D] font-bold">
                            {formatoNumero(mov.stock_nuevo)}
                          </td>
                          <td className="px-4 py-3 text-[#755F67]">
                            {mov.referencia || '—'}
                          </td>
                          {/* PROVEEDOR DESHABILITADO TEMPORALMENTE
                          <td className="px-4 py-3 text-[#755F67]">
                            {mov.proveedor || '—'}
                          </td>
                          */}
                          <td className="px-4 py-3 text-[#755F67]">
                            {mov.usuario || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
