import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  RefreshCw,
  X,
  Save,
  Camera,
  Loader2,
  Layers3,
  Boxes,
  CalendarClock,
  BadgeCheck,
  Tags,
  ScanBarcode,
  Sparkles,
} from 'lucide-react';

import api from '../../api/axios';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';

const configuracionVariantesInicial = {
  talla: false,
  color: false,
  tono: false,
  genero: false,
  presentacion: false,
  material: false,
  modelo: false,
  aroma: false,
  capacidad: false,
  // Especial: el precio pertenece a la variante, pero no forma parte de su identidad.
  precio: false,
  personalizados: [],
};

const tiposVariantesDisponibles = [
  { clave: 'talla', titulo: 'Talla / medida', detalle: 'XS, S, M, L, 24, 25, 26...' },
  { clave: 'color', titulo: 'Color', detalle: 'Negro, blanco, azul, rosa...' },
  { clave: 'tono', titulo: 'Tono', detalle: 'Tonos de maquillaje o cosméticos' },
  { clave: 'genero', titulo: 'Género / línea', detalle: 'Hombre, mujer, unisex, niño...' },
  { clave: 'presentacion', titulo: 'Presentación', detalle: 'Pieza, set, frasco, paquete...' },
  { clave: 'material', titulo: 'Material', detalle: 'Algodón, piel, mezclilla...' },
  { clave: 'modelo', titulo: 'Modelo / estilo', detalle: 'Slim, clásico, deportivo...' },
  { clave: 'aroma', titulo: 'Aroma / fragancia', detalle: 'Floral, cítrico, vainilla...' },
  { clave: 'capacidad', titulo: 'Capacidad / volumen', detalle: '30 ml, 50 ml, 100 ml...' },
  {
    clave: 'precio',
    titulo: 'Precio por variante',
    detalle: 'Cada variante podrá manejar su propio precio de venta.',
    especial: true,
  },
];

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
    ...configuracionVariantesInicial,
    ...tiposVariantesDisponibles.reduce((acc, item) => {
      acc[item.clave] = esVerdadero(origen[item.clave]);
      return acc;
    }, {}),
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

const crearClaveAtributo = (texto) => {
  return String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
};

const formInicial = {
  codigo_barras: '',
  nombre: '',
  descripcion: '',
  id_categoria: '',
  presentacion: '',
  precio_compra: '',
  precio_venta: '',
  usa_variantes: false,
  configuracion_variantes: { ...configuracionVariantesInicial },
  controla_lotes: false,
  controla_caducidad: false,
  activo: true,
};

const esVerdadero = (valor) => {
  return valor === true || valor === 'true' || valor === 1 || valor === '1';
};

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [idCategoriaFiltro, setIdCategoriaFiltro] = useState('');

  const [buscar, setBuscar] = useState('');
  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState(-1);
  const [idProductoSeleccionado, setIdProductoSeleccionado] = useState('');
  const solicitudSugerenciasRef = useRef(0);

  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [mostrarCategorias, setMostrarCategorias] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  const [form, setForm] = useState(formInicial);
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  const [nuevoAtributoVariante, setNuevoAtributoVariante] = useState('');

  // =========================================================
  // CARGA DE DATOS
  // =========================================================

  const cargarCategorias = async () => {
    try {
      const { data } = await api.get('/categorias');

      if (data.ok) {
        setCategorias(data.categorias || []);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las categorías.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  const cargarProductos = async ({
    termino = buscar,
    idProducto = idProductoSeleccionado,
  } = {}) => {
    try {
      setCargando(true);

      const params = new URLSearchParams();
      const texto = String(termino || '').trim();
      const idProductoNumerico = Number(idProducto || 0);

      if (Number.isInteger(idProductoNumerico) && idProductoNumerico > 0) {
        params.append('id_producto', String(idProductoNumerico));
      } else if (texto) {
        params.append('buscar', texto);
      }

      const query = params.toString();
      const { data } = await api.get(query ? `/productos?${query}` : '/productos');

      if (data.ok) {
        setProductos(data.productos || []);
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
          'No se pudieron cargar los productos.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // BUSCADOR
  // =========================================================

  const limpiarSoloCampoBusqueda = () => {
    setBuscar('');
    setIdProductoSeleccionado('');
    setSugerenciasProductos([]);
    setCargandoSugerencias(false);
    setMostrarSugerencias(false);
    setIndiceSugerencia(-1);
  };

  const limpiarFiltrosProductos = async () => {
    solicitudSugerenciasRef.current += 1;

    limpiarSoloCampoBusqueda();
    setIdCategoriaFiltro('');

    await cargarProductos({
      termino: '',
      idProducto: null,
    });
  };

  const buscarSugerenciasProductos = async (termino) => {
    const texto = String(termino || '').trim();

    if (texto.length < 2) {
      setCargandoSugerencias(false);
      setSugerenciasProductos([]);
      setMostrarSugerencias(false);
      setIndiceSugerencia(-1);
      return;
    }

    const solicitudActual = solicitudSugerenciasRef.current + 1;
    solicitudSugerenciasRef.current = solicitudActual;

    try {
      setCargandoSugerencias(true);
      setMostrarSugerencias(true);

      const params = new URLSearchParams();
      params.append('buscar', texto);
      params.append('autocomplete', '1');
      params.append('limit', '8');

      const { data } = await api.get(`/productos?${params.toString()}`);

      if (solicitudActual !== solicitudSugerenciasRef.current) return;

      if (data.ok) {
        setSugerenciasProductos(data.productos || []);
      } else {
        setSugerenciasProductos([]);
      }

      setIndiceSugerencia(-1);
    } catch (error) {
      if (solicitudActual !== solicitudSugerenciasRef.current) return;

      console.error('Error al buscar sugerencias de productos:', error);
      setSugerenciasProductos([]);
    } finally {
      if (solicitudActual === solicitudSugerenciasRef.current) {
        setCargandoSugerencias(false);
      }
    }
  };

  const seleccionarSugerenciaProducto = (producto) => {
    const idProducto = Number(producto?.id_producto || 0);

    if (!Number.isInteger(idProducto) || idProducto <= 0) return;

    solicitudSugerenciasRef.current += 1;

    setBuscar(producto.nombre || producto.producto || '');
    setIdProductoSeleccionado(idProducto);
    setCargandoSugerencias(false);
    setSugerenciasProductos([]);
    setMostrarSugerencias(false);
    setIndiceSugerencia(-1);
  };

  const ejecutarBusquedaProductos = async ({ producto = null } = {}) => {
    solicitudSugerenciasRef.current += 1;

    const productoSeleccionado = producto || null;

    const idProducto = productoSeleccionado
      ? Number(productoSeleccionado.id_producto || 0)
      : Number(idProductoSeleccionado || 0);

    const termino = productoSeleccionado
      ? productoSeleccionado.nombre || productoSeleccionado.producto || ''
      : buscar;

    setCargandoSugerencias(false);
    setSugerenciasProductos([]);
    setMostrarSugerencias(false);
    setIndiceSugerencia(-1);

    const consultaExitosa = await cargarProductos({
      termino,
      idProducto:
        Number.isInteger(idProducto) && idProducto > 0 ? idProducto : null,
    });

    if (consultaExitosa) {
      limpiarSoloCampoBusqueda();
    }
  };

  const manejarCambioBusqueda = (valor) => {
    solicitudSugerenciasRef.current += 1;

    setBuscar(valor);
    setIdProductoSeleccionado('');
    setIndiceSugerencia(-1);

    if (String(valor || '').trim().length >= 2) {
      setCargandoSugerencias(true);
      setMostrarSugerencias(true);
    } else {
      setCargandoSugerencias(false);
      setSugerenciasProductos([]);
      setMostrarSugerencias(false);
    }
  };

  // =========================================================
  // EFECTOS
  // =========================================================

  useEffect(() => {
    cargarCategorias();
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const texto = String(buscar || '').trim();

    if (idProductoSeleccionado || texto.length < 2) {
      return undefined;
    }

    const temporizador = setTimeout(() => {
      buscarSugerenciasProductos(texto);
    }, 300);

    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, idProductoSeleccionado]);

  // =========================================================
  // MODAL PRODUCTO
  // =========================================================

  const abrirNuevo = () => {
    setForm({
      ...formInicial,
      configuracion_variantes: { ...configuracionVariantesInicial },
    });
    setBusquedaCategoria('');
    setMostrarCategorias(false);
    setNuevoAtributoVariante('');
    setModoEdicion(false);
    setProductoEditando(null);
    setModalAbierto(true);
  };

  const abrirEditar = (producto) => {
    setProductoEditando(producto);
    setModoEdicion(true);

    setForm({
      codigo_barras: producto.codigo_barras || '',
      nombre: producto.nombre || producto.producto || '',
      descripcion: producto.descripcion || '',
      id_categoria: producto.id_categoria || '',
      presentacion: producto.presentacion || '',
      precio_compra:
        producto.precio_compra ??
        producto.precio_compra_base ??
        '',
      precio_venta:
        producto.precio_venta ??
        producto.precio_venta_base ??
        '',
      usa_variantes: esVerdadero(producto.usa_variantes),
      configuracion_variantes: normalizarConfiguracionVariantes(
        producto.configuracion_variantes
      ),
      controla_lotes: esVerdadero(producto.controla_lotes),
      controla_caducidad: esVerdadero(producto.controla_caducidad),
      activo: esVerdadero(producto.activo),
    });

    setBusquedaCategoria(producto.categoria || '');
    setMostrarCategorias(false);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModoEdicion(false);
    setProductoEditando(null);
    setForm({
      ...formInicial,
      configuracion_variantes: { ...configuracionVariantesInicial },
    });
    setNuevoAtributoVariante('');
    setBusquedaCategoria('');
    setMostrarCategorias(false);
    setEscanerAbierto(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => {
      const siguiente = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      /*
       * Si un producto controla caducidad necesariamente debe controlar lotes,
       * porque la fecha de caducidad pertenece al lote.
       */
      if (name === 'controla_caducidad' && checked) {
        siguiente.controla_lotes = true;
      }

      /*
       * Si se desactiva el control de lotes también se desactiva caducidad.
       */
      if (name === 'controla_lotes' && !checked) {
        siguiente.controla_caducidad = false;
      }

      /*
       * Al desactivar variantes limpiamos la configuración para evitar que
       * queden atributos antiguos asociados al producto.
       */
      if (name === 'usa_variantes' && !checked) {
        siguiente.configuracion_variantes = {
          ...configuracionVariantesInicial,
        };
      }

      return siguiente;
    });
  };

  const alternarTipoVariante = (clave) => {
    setForm((prev) => ({
      ...prev,
      configuracion_variantes: {
        ...prev.configuracion_variantes,
        [clave]: !prev.configuracion_variantes?.[clave],
      },
    }));
  };

  const agregarAtributoPersonalizado = () => {
    const etiqueta = String(nuevoAtributoVariante || '').trim();
    const clave = crearClaveAtributo(etiqueta);

    if (!etiqueta || !clave) return;

    const clavesReservadas = new Set(
      tiposVariantesDisponibles.map((item) => item.clave)
    );

    if (clavesReservadas.has(clave)) {
      Swal.fire({
        icon: 'info',
        title: 'Atributo disponible',
        text: 'Ese atributo ya existe entre las opciones predeterminadas.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    const yaExiste = (form.configuracion_variantes?.personalizados || []).some(
      (item) => item.clave === clave
    );

    if (yaExiste) {
      Swal.fire({
        icon: 'info',
        title: 'Atributo repetido',
        text: 'Ese atributo personalizado ya fue agregado.',
        confirmButtonColor: '#B85F7D',
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      configuracion_variantes: {
        ...prev.configuracion_variantes,
        personalizados: [
          ...(prev.configuracion_variantes?.personalizados || []),
          { clave, etiqueta },
        ],
      },
    }));

    setNuevoAtributoVariante('');
  };

  const eliminarAtributoPersonalizado = (clave) => {
    setForm((prev) => ({
      ...prev,
      configuracion_variantes: {
        ...prev.configuracion_variantes,
        personalizados: (
          prev.configuracion_variantes?.personalizados || []
        ).filter((item) => item.clave !== clave),
      },
    }));
  };

  const validarForm = () => {
    if (!form.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre obligatorio',
        text: 'Ingresa el nombre del producto.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (form.precio_compra !== '' && Number(form.precio_compra) < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Precio inválido',
        text: 'El precio de compra no puede ser negativo.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (form.precio_venta === '' || Number(form.precio_venta) < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Precio inválido',
        text: 'Ingresa un precio de venta válido.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (form.usa_variantes) {
      const tieneTipoConfigurado = tiposVariantesDisponibles.some(
        (item) => Boolean(form.configuracion_variantes?.[item.clave])
      );
      const tienePersonalizados =
        (form.configuracion_variantes?.personalizados || []).length > 0;

      if (!tieneTipoConfigurado && !tienePersonalizados) {
        Swal.fire({
          icon: 'warning',
          title: 'Configura las variantes',
          text: 'Selecciona al menos una opción para las variantes, por ejemplo talla, color, presentación o precio por variante.',
          confirmButtonColor: '#B85F7D',
        });
        return false;
      }
    }

    return true;
  };

  const guardarProducto = async (e) => {
    e.preventDefault();

    if (!validarForm()) return;

    try {
      setGuardando(true);

      const payload = {
        codigo_barras: form.codigo_barras.trim() || null,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        id_categoria: form.id_categoria ? Number(form.id_categoria) : null,
        presentacion: form.presentacion.trim() || null,

        /*
         * Se conservan los nombres actuales de precio_compra y precio_venta
         * para no romper el controller mientras terminamos la transición.
         */
        precio_compra: form.precio_compra ? Number(form.precio_compra) : 0,
        precio_venta: Number(form.precio_venta),

        usa_variantes: Boolean(form.usa_variantes),
        configuracion_variantes: form.usa_variantes
          ? normalizarConfiguracionVariantes(form.configuracion_variantes)
          : { ...configuracionVariantesInicial },
        controla_lotes: Boolean(form.controla_lotes),
        controla_caducidad: Boolean(form.controla_caducidad),
        activo: Boolean(form.activo),
      };

      let respuesta;

      if (modoEdicion) {
        respuesta = await api.put(
          `/productos/${productoEditando.id_producto}`,
          payload
        );
      } else {
        respuesta = await api.post('/productos', payload);
      }

      if (respuesta.data.ok) {
        await Swal.fire({
          icon: 'success',
          title: modoEdicion ? 'Producto actualizado' : 'Producto creado',
          text: respuesta.data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        cerrarModal();

        await cargarProductos({
          termino: '',
          idProducto: null,
        });
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar el producto.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setGuardando(false);
    }
  };

  const desactivarProducto = async (producto) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar producto?',
      text: `Se desactivará: ${producto.nombre || producto.producto}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B85F7D',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(`/productos/${producto.id_producto}`);

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Producto desactivado',
          timer: 1200,
          showConfirmButton: false,
        });

        await cargarProductos({
          termino: '',
          idProducto: null,
        });
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar el producto.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  // =========================================================
  // HELPERS
  // =========================================================

  const formatoMoneda = (valor) => {
    const numero = Number(valor || 0);

    return numero.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  };

  const productosFiltrados = useMemo(() => {
    if (!idCategoriaFiltro) {
      return productos;
    }

    return productos.filter(
      (producto) =>
        Number(producto.id_categoria) === Number(idCategoriaFiltro)
    );
  }, [productos, idCategoriaFiltro]);

  const totalActivos = productosFiltrados.filter((producto) =>
    esVerdadero(producto.activo)
  ).length;

  const totalInactivos = productosFiltrados.filter(
    (producto) => !esVerdadero(producto.activo)
  ).length;

  const totalVariantes = productosFiltrados.filter((producto) =>
    esVerdadero(producto.usa_variantes)
  ).length;

  const totalConLotes = productosFiltrados.filter((producto) =>
    esVerdadero(producto.controla_lotes)
  ).length;

  const categoriaSeleccionada = categorias.find(
    (cat) => Number(cat.id_categoria) === Number(form.id_categoria)
  );

  const categoriasFiltradas = categorias.filter((cat) =>
    cat.nombre
      ?.toLowerCase()
      .includes(busquedaCategoria.trim().toLowerCase())
  );

  const seleccionarCategoria = (cat) => {
    setForm((prev) => ({
      ...prev,
      id_categoria: cat ? cat.id_categoria : '',
    }));

    setBusquedaCategoria(cat ? cat.nombre : '');
    setMostrarCategorias(false);
  };

  const obtenerTiposVariantesProducto = (producto) => {
    if (!esVerdadero(producto?.usa_variantes)) return [];

    const config = normalizarConfiguracionVariantes(
      producto?.configuracion_variantes
    );

    const etiquetas = tiposVariantesDisponibles
      .filter((item) => config[item.clave])
      .map((item) => item.titulo);

    const personalizados = (config.personalizados || []).map(
      (item) => item.etiqueta
    );

    return [...etiquetas, ...personalizados];
  };

  const manejarCodigoDetectado = (codigo) => {
    setForm((prev) => ({
      ...prev,
      codigo_barras: codigo,
    }));

    setEscanerAbierto(false);

    Swal.fire({
      icon: 'success',
      title: 'Código escaneado',
      text: codigo,
      timer: 1300,
      showConfirmButton: false,
    });
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6 pb-8">
      {/* =======================================================
          ENCABEZADO
      ======================================================= */}

      <section className="relative z-30 overflow-visible rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_15px_45px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#FCEEF2] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#B85F7D]">
              <Package size={25} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#B85F7D]">
                <Sparkles size={13} />
                Catálogo retail
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#33292D] sm:text-3xl">
                Productos
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#8A757D]">
                Administra el catálogo de ropa, cosméticos y demás artículos de tus sucursales.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.24)] transition hover:-translate-y-0.5 hover:bg-[#A95270] hover:shadow-[0_16px_32px_rgba(184,95,125,0.28)]"
          >
            <Plus size={20} />
            Nuevo producto
          </button>
        </div>

        {/* FILTROS */}
        <div className="relative mt-6 grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_auto_auto]">
          <div className="min-w-0">
            <select
              value={idCategoriaFiltro}
              onChange={(e) => setIdCategoriaFiltro(e.target.value)}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#5A474E] outline-none transition focus:border-[#D58AA2] focus:ring-4 focus:ring-[#FBEAF0]"
              aria-label="Filtrar productos por categoría"
            >
              <option value="">Todas las categorías</option>

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

          <div className="relative z-50 min-w-0">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
              size={19}
            />

            <input
              value={buscar}
              onChange={(e) => manejarCambioBusqueda(e.target.value)}
              onFocus={() => {
                if (String(buscar || '').trim().length >= 2) {
                  setMostrarSugerencias(true);
                }
              }}
              onBlur={() => {
                window.setTimeout(() => {
                  setMostrarSugerencias(false);
                  setIndiceSugerencia(-1);
                }, 160);
              }}
              onKeyDown={(e) => {
                const totalSugerencias = sugerenciasProductos.length;

                if (
                  e.key === 'ArrowDown' &&
                  mostrarSugerencias &&
                  totalSugerencias > 0
                ) {
                  e.preventDefault();

                  setIndiceSugerencia((indice) =>
                    indice < totalSugerencias - 1 ? indice + 1 : 0
                  );

                  return;
                }

                if (
                  e.key === 'ArrowUp' &&
                  mostrarSugerencias &&
                  totalSugerencias > 0
                ) {
                  e.preventDefault();

                  setIndiceSugerencia((indice) =>
                    indice > 0 ? indice - 1 : totalSugerencias - 1
                  );

                  return;
                }

                if (e.key === 'Enter') {
                  e.preventDefault();

                  const productoPorEnter =
                    mostrarSugerencias &&
                    indiceSugerencia >= 0 &&
                    sugerenciasProductos[indiceSugerencia]
                      ? sugerenciasProductos[indiceSugerencia]
                      : null;

                  ejecutarBusquedaProductos({
                    producto: productoPorEnter,
                  });

                  return;
                }

                if (e.key === 'Escape') {
                  setMostrarSugerencias(false);
                  setIndiceSugerencia(-1);
                }
              }}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-12 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder="Buscar por nombre, código, categoría o presentación..."
              autoComplete="off"
            />

            {cargandoSugerencias && (
              <Loader2
                size={19}
                className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#B85F7D]"
              />
            )}

            {mostrarSugerencias && String(buscar || '').trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-2xl border border-[#EEDFE4] bg-white shadow-[0_20px_50px_rgba(98,62,74,0.14)]">
                {cargandoSugerencias ? (
                  <div className="flex items-center gap-3 px-4 py-4 text-sm font-semibold text-[#8A757D]">
                    <Loader2 size={18} className="animate-spin text-[#B85F7D]" />
                    Buscando productos...
                  </div>
                ) : sugerenciasProductos.length === 0 ? (
                  <div className="px-4 py-4 text-sm font-semibold text-[#8A757D]">
                    No se encontraron productos.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto py-2">
                    {sugerenciasProductos.map((producto, indice) => {
                      const seleccionado = indice === indiceSugerencia;

                      const detalle = [
                        producto.codigo_barras || 'Sin código',
                        producto.categoria,
                        producto.presentacion,
                      ]
                        .filter(Boolean)
                        .join(' · ');

                      return (
                        <button
                          key={producto.id_producto}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            seleccionarSugerenciaProducto(producto);
                          }}
                          className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition ${
                            seleccionado
                              ? 'bg-[#FBEAF0] text-[#9E4966]'
                              : 'text-[#5A474E] hover:bg-[#FFF8FA]'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {producto.nombre ||
                                producto.producto ||
                                'Producto sin nombre'}
                            </p>

                            <p className="mt-0.5 truncate text-xs font-semibold text-[#9B858D]">
                              {detalle || 'Sin información adicional'}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                              esVerdadero(producto.activo)
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {esVerdadero(producto.activo)
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>
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
            onClick={ejecutarBusquedaProductos}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 lg:w-auto"
          >
            <RefreshCw
              size={18}
              className={cargando ? 'animate-spin' : ''}
            />
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>

          <button
            type="button"
            onClick={limpiarFiltrosProductos}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F8EDF1] px-5 py-3 text-sm font-black text-[#8E596B] transition hover:bg-[#F4DFE6] disabled:opacity-60 lg:w-auto"
          >
            <X size={18} />
            Limpiar
          </button>
        </div>

        {/* RESUMEN */}
        <div className="relative mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <ResumenCard
            titulo="Activos"
            valor={totalActivos}
            detalle="Disponibles para operación"
            icono={BadgeCheck}
            claseIcono="bg-[#FBEAF0] text-[#B85F7D]"
          />

          <ResumenCard
            titulo="Inactivos"
            valor={totalInactivos}
            detalle="Ocultos o desactivados"
            icono={Trash2}
            claseIcono="bg-slate-100 text-slate-600"
          />

          <ResumenCard
            titulo="Con variantes"
            valor={totalVariantes}
            detalle="Tallas, tonos o colores"
            icono={Layers3}
            claseIcono="bg-[#F0EBF6] text-[#826A9A]"
          />

          <ResumenCard
            titulo="Con lotes"
            valor={totalConLotes}
            detalle="Control de lote/caducidad"
            icono={Boxes}
            claseIcono="bg-[#FFF3E9] text-[#B97748]"
          />
        </div>
      </section>

      {/* =======================================================
          TABLA
      ======================================================= */}

      <section className="relative z-0 overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_15px_45px_rgba(118,76,91,0.05)]">
        <div className="border-b border-[#F3E8EB] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#B85F7D]">
              <Tags size={19} />
            </div>

            <div>
              <h2 className="font-black text-[#3D3035]">
                Catálogo de productos
              </h2>

              <p className="mt-0.5 text-xs text-[#9B858D]">
                {productosFiltrados.length} producto(s) en la vista actual
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
              <tr>
                <Th>Producto</Th>
                <Th>Código</Th>
                <Th>Categoría</Th>
                <Th>Presentación</Th>
                <Th>Control</Th>
                <Th align="right">Compra</Th>
                <Th align="right">Venta</Th>
                <Th align="center">Estado</Th>
                <Th align="center">Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-5 py-12 text-center text-[#8A757D]"
                  >
                    <div className="flex items-center justify-center gap-2 font-bold">
                      <Loader2
                        size={20}
                        className="animate-spin text-[#B85F7D]"
                      />
                      Cargando productos...
                    </div>
                  </td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-5 py-12 text-center text-[#8A757D]"
                  >
                    {idCategoriaFiltro
                      ? 'No hay productos en la categoría seleccionada.'
                      : 'No hay productos registrados.'}
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => (
                  <tr
                    key={producto.id_producto}
                    className="transition hover:bg-[#FFFAFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#B85F7D]">
                          <Package size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-[#46373D]">
                            {producto.nombre || producto.producto}
                          </p>

                          {producto.descripcion && (
                            <p className="mt-1 max-w-[320px] truncate text-xs text-[#9B858D]">
                              {producto.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#766168]">
                      {producto.codigo_barras || '—'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      {producto.categoria || 'Sin categoría'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      {producto.presentacion || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[270px] flex-wrap gap-1.5">
                        {esVerdadero(producto.usa_variantes) && (
                          <div className="space-y-1.5">
                            <BadgeRetail
                              icono={Layers3}
                              texto="Variantes"
                              clase="bg-[#F0EBF6] text-[#745D8A]"
                            />

                            {obtenerTiposVariantesProducto(producto).length > 0 && (
                              <p className="max-w-[230px] text-[10px] font-semibold leading-relaxed text-[#9B858D]">
                                {obtenerTiposVariantesProducto(producto).join(' · ')}
                              </p>
                            )}
                          </div>
                        )}

                        {esVerdadero(producto.controla_lotes) && (
                          <BadgeRetail
                            icono={Boxes}
                            texto="Lotes"
                            clase="bg-[#FFF3E9] text-[#A9673D]"
                          />
                        )}

                        {esVerdadero(producto.controla_caducidad) && (
                          <BadgeRetail
                            icono={CalendarClock}
                            texto="Caducidad"
                            clase="bg-[#FFF0F0] text-[#B65F66]"
                          />
                        )}

                        {!esVerdadero(producto.usa_variantes) &&
                          !esVerdadero(producto.controla_lotes) &&
                          !esVerdadero(producto.controla_caducidad) && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                              Simple
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-[#766168]">
                      {formatoMoneda(
                        producto.precio_compra ??
                          producto.precio_compra_base
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-[#A84E6C]">
                      {formatoMoneda(
                        producto.precio_venta ??
                          producto.precio_venta_base
                      )}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                          esVerdadero(producto.activo)
                            ? 'bg-[#FBEAF0] text-[#A84E6C]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {esVerdadero(producto.activo)
                          ? 'Activo'
                          : 'Inactivo'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(producto)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#A84E6C] transition hover:bg-[#F6DCE5]"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => desactivarProducto(producto)}
                          disabled={!esVerdadero(producto.activo)}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#33272C]/50 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#B85F7D]">
                  <Package size={13} />
                  {modoEdicion ? 'Edición' : 'Nuevo registro'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034] sm:text-2xl">
                  {modoEdicion ? 'Editar producto' : 'Nuevo producto'}
                </h2>

                <p className="mt-1 text-sm text-[#8A757D]">
                  Captura la información comercial y el tipo de control de inventario.
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
              onSubmit={guardarProducto}
              className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                {/* Nombre */}
                <Campo label="Nombre *">
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ej. Playera básica cuello redondo"
                  />
                </Campo>

                {/* Código */}
                <Campo label="Código de barras">
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <ScanBarcode
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                      />

                      <input
                        name="codigo_barras"
                        value={form.codigo_barras}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="750..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setEscanerAbierto(true)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-4 py-3 font-black text-white transition hover:bg-[#A95270]"
                      title="Escanear código de barras"
                    >
                      <Camera size={19} />
                      <span className="hidden sm:inline">Escanear</span>
                    </button>
                  </div>

                  {form.usa_variantes && (
                    <p className="mt-2 text-xs leading-relaxed text-[#9B858D]">
                      Si cada talla, color o tono tiene su propio código, posteriormente lo registraremos en las variantes.
                    </p>
                  )}
                </Campo>

                {/* Categoría */}
                <div className="relative">
                  <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                    Categoría
                  </label>

                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]"
                    />

                    <input
                      type="text"
                      value={
                        mostrarCategorias
                          ? busquedaCategoria
                          : categoriaSeleccionada?.nombre ||
                            busquedaCategoria
                      }
                      onChange={(e) => {
                        setBusquedaCategoria(e.target.value);
                        setMostrarCategorias(true);

                        if (e.target.value.trim() === '') {
                          setForm((prev) => ({
                            ...prev,
                            id_categoria: '',
                          }));
                        }
                      }}
                      onFocus={() => {
                        setBusquedaCategoria(
                          categoriaSeleccionada?.nombre || ''
                        );
                        setMostrarCategorias(true);
                      }}
                      placeholder="Buscar categoría..."
                      className={`${inputClass} pl-11 pr-10`}
                    />

                    {form.id_categoria && (
                      <button
                        type="button"
                        onClick={() => seleccionarCategoria(null)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AD919A] transition hover:text-red-500"
                        title="Quitar categoría"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  {mostrarCategorias && (
                    <div className="absolute z-[9999] mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-[#EEDFE4] bg-white shadow-[0_18px_45px_rgba(98,62,74,0.15)]">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          seleccionarCategoria(null);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-semibold text-[#806A72] transition hover:bg-[#FFF8FA]"
                      >
                        Sin categoría
                      </button>

                      {categoriasFiltradas.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-[#9B858D]">
                          No se encontraron categorías.
                        </div>
                      ) : (
                        categoriasFiltradas.map((cat) => (
                          <button
                            key={cat.id_categoria}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              seleccionarCategoria(cat);
                            }}
                            className={`w-full px-4 py-3 text-left text-sm transition ${
                              Number(form.id_categoria) ===
                              Number(cat.id_categoria)
                                ? 'bg-[#FBEAF0] font-black text-[#A84E6C]'
                                : 'font-semibold text-[#66535A] hover:bg-[#FFF8FA]'
                            }`}
                          >
                            {cat.nombre}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Presentación */}
                <Campo label="Presentación">
                  <input
                    name="presentacion"
                    value={form.presentacion}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Ej. 100 ml, pieza, set, caja..."
                  />
                </Campo>

                {/* Compra */}
                <Campo label="Precio compra">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="precio_compra"
                    value={form.precio_compra}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </Campo>

                {/* Venta */}
                <Campo label="Precio venta *">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="precio_venta"
                    value={form.precio_venta}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="0.00"
                  />
                </Campo>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <Campo label="Descripción">
                    <textarea
                      name="descripcion"
                      value={form.descripcion}
                      onChange={handleChange}
                      rows="3"
                      className={`${inputClass} resize-none`}
                      placeholder="Descripción opcional del producto"
                    />
                  </Campo>
                </div>

                {/* CONFIGURACIÓN INVENTARIO */}
                <div className="md:col-span-2">
                  <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-[#FFFAFB] p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#B85F7D]">
                        <Boxes size={19} />
                      </div>

                      <div>
                        <h3 className="font-black text-[#49383F]">
                          Control del producto
                        </h3>

                        <p className="mt-1 text-xs leading-relaxed text-[#927B84]">
                          Define sus variantes y la trazabilidad que necesitará al manejar existencias.
                        </p>
                      </div>
                    </div>

                    {/* TIPO DE INVENTARIO */}
                    <div className="mt-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#A18891]">
                        Estructura del inventario
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <OpcionControl
                          name="usa_variantes"
                          checked={form.usa_variantes}
                          onChange={handleChange}
                          icono={Layers3}
                          titulo="Producto con variantes"
                          detalle="Cada combinación tendrá su propio SKU, código y stock."
                        />

                        <OpcionControl
                          name="controla_lotes"
                          checked={form.controla_lotes}
                          onChange={handleChange}
                          icono={Boxes}
                          titulo="Control por lotes"
                          detalle="Identifica entradas, existencias y movimientos por lote."
                        />

                        <OpcionControl
                          name="controla_caducidad"
                          checked={form.controla_caducidad}
                          onChange={handleChange}
                          icono={CalendarClock}
                          titulo="Control de caducidad"
                          detalle="Registra vencimiento y alertas para cada lote."
                        />
                      </div>
                    </div>

                    {/* DIMENSIONES DE VARIANTES */}
                    {form.usa_variantes && (
                      <div className="mt-5 rounded-[1.25rem] border border-[#E9DCE1] bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-[#513F46]">
                              ¿Qué cambia entre una variante y otra?
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#9A838C]">
                              Selecciona todos los atributos que aplican. Después, al agregar inventario, solo se pedirán estos campos.
                            </p>
                          </div>

                          <span className="w-fit rounded-full bg-[#FFF1F5] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#A84E6C]">
                            Configuración dinámica
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {tiposVariantesDisponibles.map((tipo) => {
                            const activo = Boolean(
                              form.configuracion_variantes?.[tipo.clave]
                            );

                            return (
                              <button
                                key={tipo.clave}
                                type="button"
                                onClick={() => alternarTipoVariante(tipo.clave)}
                                className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                                  activo
                                    ? 'border-[#E7BAC8] bg-[#FFF1F5]'
                                    : 'border-[#EEE2E6] bg-[#FFFCFD] hover:border-[#E6C7D1]'
                                }`}
                              >
                                <span
                                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                    activo
                                      ? 'bg-[#B85F7D] text-white'
                                      : 'bg-[#F8EDF1] text-[#A1848E]'
                                  }`}
                                >
                                  <Tags size={15} />
                                </span>

                                <span className="min-w-0">
                                  <span
                                    className={`block text-xs font-black ${
                                      activo ? 'text-[#A84E6C]' : 'text-[#5D4A51]'
                                    }`}
                                  >
                                    {tipo.titulo}
                                  </span>
                                  <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-[#9B858D]">
                                    {tipo.detalle}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 rounded-2xl bg-[#FFFAFB] p-3.5">
                          <p className="text-xs font-black text-[#5D4A51]">
                            Otro atributo
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-[#9B858D]">
                            Para características especiales como acabado, colección, compatibilidad o cualquier otro dato.
                          </p>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <input
                              type="text"
                              value={nuevoAtributoVariante}
                              onChange={(e) => setNuevoAtributoVariante(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  agregarAtributoPersonalizado();
                                }
                              }}
                              className={`${inputClass} flex-1`}
                              placeholder="Ej. Acabado, colección, compatibilidad..."
                            />
                            <button
                              type="button"
                              onClick={agregarAtributoPersonalizado}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F5E6EB] px-4 py-3 text-xs font-black text-[#9E536B] transition hover:bg-[#EFD7DF]"
                            >
                              <Plus size={16} />
                              Agregar
                            </button>
                          </div>

                          {(form.configuracion_variantes?.personalizados || []).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {form.configuracion_variantes.personalizados.map((item) => (
                                <span
                                  key={item.clave}
                                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#755F67] ring-1 ring-[#EADCE1]"
                                >
                                  {item.etiqueta}
                                  <button
                                    type="button"
                                    onClick={() => eliminarAtributoPersonalizado(item.clave)}
                                    className="text-[#B85F7D] hover:text-[#8E405B]"
                                    aria-label={`Eliminar ${item.etiqueta}`}
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TRAZABILIDAD */}
                    {(form.controla_lotes || form.controla_caducidad) && (
                      <div className="mt-4 rounded-2xl border border-[#F3D6DE] bg-[#FFF3F6] px-4 py-3 text-xs font-semibold leading-relaxed text-[#916070]">
                        {form.controla_caducidad
                          ? 'La caducidad se registra por lote; por eso el control de lotes permanece activado automáticamente.'
                          : 'Los lotes se administrarán al registrar entradas de inventario. Un mismo producto o variante podrá tener varios lotes.'}
                      </div>
                    )}

                    {modoEdicion && (
                      <div className="mt-4 border-t border-[#EFE1E6] pt-4">
                        <OpcionControl
                          name="activo"
                          checked={form.activo}
                          onChange={handleChange}
                          icono={BadgeCheck}
                          titulo="Producto activo"
                          detalle="Disponible para inventario, movimientos y venta."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#F3E7EA] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-2xl bg-[#F8EDF1] px-5 py-3 font-black text-[#80606B] transition hover:bg-[#F2DDE4]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.22)] transition hover:bg-[#A95270] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}

                  {guardando ? 'Guardando...' : 'Guardar producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        abierto={escanerAbierto}
        titulo="Escanear código de barras"
        descripcion="Apunta la cámara al código de barras del producto."
        onClose={() => setEscanerAbierto(false)}
        onDetected={manejarCodigoDetectado}
      />

      <style>
        {`
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}
      </style>
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-[#5D4A51]">
        {label}
      </label>

      {children}
    </div>
  );
}

function Th({ children, align = 'left' }) {
  const alineacion =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left';

  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#9B858D] ${alineacion}`}
    >
      {children}
    </th>
  );
}

function BadgeRetail({ icono: Icono, texto, clase }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${clase}`}
    >
      <Icono size={11} />
      {texto}
    </span>
  );
}

function ResumenCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  claseIcono,
}) {
  return (
    <div className="rounded-[1.35rem] border border-[#F1E5E9] bg-[#FFFCFD] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-[#9C858E]">
            {titulo}
          </p>

          <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#3E3136] sm:text-3xl">
            {valor}
          </p>

          <p className="mt-1 text-[11px] font-semibold text-[#A18B93]">
            {detalle}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${claseIcono}`}
        >
          <Icono size={19} />
        </div>
      </div>
    </div>
  );
}

function OpcionControl({
  name,
  checked,
  onChange,
  icono: Icono,
  titulo,
  detalle,
}) {
  return (
    <label
      className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
        checked
          ? 'border-[#E7BAC8] bg-[#FFF1F5]'
          : 'border-[#EEE2E6] bg-white hover:border-[#E6C7D1] hover:bg-[#FFFCFD]'
      }`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />

      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
          checked
            ? 'bg-[#B85F7D] text-white'
            : 'bg-[#F8EDF1] text-[#A1848E] group-hover:text-[#B85F7D]'
        }`}
      >
        <Icono size={17} />
      </span>

      <span className="min-w-0">
        <span
          className={`block text-xs font-black ${
            checked ? 'text-[#A84E6C]' : 'text-[#5D4A51]'
          }`}
        >
          {titulo}
        </span>

        <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-[#9B858D]">
          {detalle}
        </span>
      </span>
    </label>
  );
}
  