import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  X,
  Save,
  Trash2,
  Package,
  Truck,
  Store,
  Wallet,
  FileText,
  Calendar,
  Camera,
  Upload,
  Image as ImageIcon,
  Ban,
  Pencil,
  Sparkles,
  Loader2,
  CircleDollarSign,
  BadgeCheck,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

const productoInicial = {
  id_producto: '',
  id_variante: '',
  modo_variante: 'EXISTENTE',
  atributos_variante: {},
  nombre_variante: '',
  sku_variante: '',
  codigo_barras_variante: '',
  cantidad: '',
  precio_compra: '',
  descuento: '',
  lote: '',
  fecha_caducidad: '',
  ubicacion: '',
  observaciones: '',
};

const compraInicial = {
  id_sucursal: '',
  id_proveedor: '',
  id_sesion: '',
  metodo_pago: 'PENDIENTE',
  monto_pagado: '',
  impuesto: '',
  descuento: '',
  observaciones: '',
  total_manual: '',
};

export default function Compras() {
  const { usuario } = useAuth();
  const puedeCambiarSucursal = esSuperAdmin(usuario);

  const [sucursales, setSucursales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [variantesPorProducto, setVariantesPorProducto] = useState({});
  const [cargandoVariantes, setCargandoVariantes] = useState({});
  const [cajas, setCajas] = useState([]);
  const [compras, setCompras] = useState([]);

  const [formCompra, setFormCompra] = useState(compraInicial);
  const [items, setItems] = useState([]);

  const [ticketFile, setTicketFile] = useState(null);
  const [ticketPreview, setTicketPreview] = useState('');

  const [modalCamara, setModalCamara] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [idSucursalFiltro, setIdSucursalFiltro] = useState('');
  const [idProveedorFiltro, setIdProveedorFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [compraEditandoId, setCompraEditandoId] = useState(null);

  const [modalCompra, setModalCompra] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);

  const [detalleCompra, setDetalleCompra] = useState(null);
  const [detalleProductos, setDetalleProductos] = useState([]);
  const [detallePagos, setDetallePagos] = useState([]);

  const sucursalActual = useMemo(() => {
    return sucursales.find(
      (s) => Number(s.id_sucursal) === Number(formCompra.id_sucursal)
    );
  }, [sucursales, formCompra.id_sucursal]);

  const sucursalFiltroActual = useMemo(() => {
    return sucursales.find(
      (s) => Number(s.id_sucursal) === Number(idSucursalFiltro)
    );
  }, [sucursales, idSucursalFiltro]);

  const resumenCompra = useMemo(() => {
    const subtotal = items.reduce((acc, item) => {
      const cantidad = Number(item.cantidad || 0);
      const precio = Number(item.precio_compra || 0);
      const descuentoItem = Number(item.descuento || 0);
      return acc + Math.max(cantidad * precio - descuentoItem, 0);
    }, 0);

    const descuento = Number(formCompra.descuento || 0);
    const impuesto = Number(formCompra.impuesto || 0);
    const totalManual = Number(formCompra.total_manual || 0);

    const total =
      items.length === 0
        ? Math.max(totalManual - descuento + impuesto, 0)
        : Math.max(subtotal - descuento + impuesto, 0);

    const montoPagado = Number(formCompra.monto_pagado || 0);
    const saldo = Math.max(total - montoPagado, 0);

    return {
      subtotal,
      descuento,
      impuesto,
      total,
      montoPagado,
      saldo,
    };
  }, [
    items,
    formCompra.descuento,
    formCompra.impuesto,
    formCompra.monto_pagado,
    formCompra.total_manual,
  ]);

  const resumenGeneral = useMemo(() => {
    const comprasActivas = compras.filter((c) => c.estado !== 'CANCELADA');

    const totalCompras = compras.length;
    const totalImporte = comprasActivas.reduce(
      (acc, compra) => acc + Number(compra.total || 0),
      0
    );
    const totalPagado = comprasActivas.reduce(
      (acc, compra) => acc + Number(compra.monto_pagado || 0),
      0
    );
    const totalSaldo = comprasActivas.reduce(
      (acc, compra) => acc + Number(compra.saldo || 0),
      0
    );
    const pendientes = compras.filter((c) => c.estado === 'PENDIENTE').length;

    return {
      totalCompras,
      totalImporte,
      totalPagado,
      totalSaldo,
      pendientes,
    };
  }, [compras]);

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
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-MX');
  };

  const esVerdadero = (valor) => {
    if (typeof valor === 'boolean') return valor;
    return ['true', '1', 't', 'si', 'sí', 's', 'yes'].includes(
      String(valor ?? '').trim().toLowerCase()
    );
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
    personalizados: [],
  };

  const definicionesVariantes = {
    talla: { etiqueta: 'Talla', placeholder: 'Ej. M, 26, CH' },
    color: { etiqueta: 'Color', placeholder: 'Ej. Negro, Rosa' },
    tono: { etiqueta: 'Tono', placeholder: 'Ej. Nude 03' },
    genero: {
      etiqueta: 'Género',
      tipo: 'select',
      opciones: ['Hombre', 'Mujer', 'Unisex', 'Niño', 'Niña'],
    },
    presentacion: { etiqueta: 'Presentación', placeholder: 'Ej. Pieza, Caja' },
    material: { etiqueta: 'Material', placeholder: 'Ej. Algodón' },
    modelo: { etiqueta: 'Modelo', placeholder: 'Ej. Classic' },
    aroma: { etiqueta: 'Aroma', placeholder: 'Ej. Floral' },
    capacidad: { etiqueta: 'Capacidad', placeholder: 'Ej. 100 ml' },
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

  const obtenerCamposVariantes = (producto) => {
    const config = normalizarConfiguracionVariantes(
      producto?.configuracion_variantes
    );

    const base = Object.keys(definicionesVariantes)
      .filter((clave) => esVerdadero(config[clave]))
      .map((clave) => ({
        clave,
        ...definicionesVariantes[clave],
      }));

    const personalizados = (config.personalizados || []).map((item) => ({
      clave: item.clave,
      etiqueta: item.etiqueta,
      placeholder: `Captura ${item.etiqueta.toLowerCase()}`,
    }));

    return [...base, ...personalizados];
  };

  const itemUsaNuevaVariante = (item, producto) => {
    if (!esVerdadero(producto?.usa_variantes)) return false;
    if (item?.modo_variante === 'NUEVA') return true;

    const variantes = variantesPorProducto[Number(item?.id_producto)] || [];
    return variantes.length === 0 && !item?.id_variante;
  };

  const parsearAtributosVariante = (valor) => {
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

  const obtenerEtiquetaVariante = (variante = {}) => {
    if (!variante?.id_variante) return 'Sin variante';

    const nombre = String(
      variante.etiqueta || variante.variante || variante.nombre_variante || ''
    ).trim();

    if (nombre) return nombre;

    const atributos = parsearAtributosVariante(
      variante.atributos || variante.atributos_variante
    );

    const valores = [
      variante.talla,
      variante.color,
      variante.tono,
      variante.presentacion || variante.presentacion_variante,
      ...Object.values(atributos),
    ]
      .map((valor) => String(valor ?? '').trim())
      .filter(Boolean);

    return [...new Set(valores)].join(' · ') || `Variante #${variante.id_variante}`;
  };

  const obtenerProductoPorId = (idProducto) =>
    productos.find(
      (producto) => Number(producto.id_producto) === Number(idProducto)
    );

  const obtenerVariantesItem = (item) =>
    variantesPorProducto[Number(item?.id_producto)] || [];

  const cargarVariantesProducto = async (
    idProducto,
    idSucursal = formCompra.id_sucursal
  ) => {
    const idProductoNumero = Number(idProducto);

    if (!idProductoNumero) return [];

    setCargandoVariantes((prev) => ({
      ...prev,
      [idProductoNumero]: true,
    }));

    try {
      const params = new URLSearchParams();
      if (idSucursal) params.append('sucursal', idSucursal);

      const { data } = await api.get(
        `/compras/producto/${idProductoNumero}/variantes?${params.toString()}`
      );

      const variantes = data.ok ? data.variantes || [] : [];

      setVariantesPorProducto((prev) => ({
        ...prev,
        [idProductoNumero]: variantes,
      }));

      return variantes;
    } catch (error) {
      console.error(error);

      setVariantesPorProducto((prev) => ({
        ...prev,
        [idProductoNumero]: [],
      }));

      Swal.fire({
        icon: 'error',
        title: 'No se pudieron cargar las variantes',
        text:
          error.response?.data?.mensaje ||
          'No fue posible consultar las variantes del producto.',
      });

      return [];
    } finally {
      setCargandoVariantes((prev) => ({
        ...prev,
        [idProductoNumero]: false,
      }));
    }
  };

  const claseEstadoCompra = (estado) => {
    if (estado === 'PAGADA') return 'bg-[#FBEAF0] text-[#A84E6C]';
    if (estado === 'PARCIAL') return 'bg-[#F0EBF6] text-[#765D8D]';
    if (estado === 'CANCELADA') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  const puedeCancelarCompra = (compra) => {
    return ['PENDIENTE', 'PARCIAL'].includes(compra.estado);
  };

  const obtenerUrlTicket = (url) => {
    if (!url) return '';
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseUrl = apiUrl.replace('/api', '');
    return `${baseUrl}${url}`;
  };

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');

      if (data.ok) {
        const activas = (data.sucursales || []).filter((s) => s.activo);
        const sucursalesPermitidas = filtrarSucursalesPorRol(usuario, activas);

        setSucursales(sucursalesPermitidas);

        if (!idSucursalFiltro) {
          setIdSucursalFiltro(
            obtenerSucursalInicial(usuario, sucursalesPermitidas)
          );
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

  const cargarProveedores = async () => {
    try {
      const { data } = await api.get('/proveedores?activos=true');
      if (data.ok) setProveedores(data.proveedores || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los proveedores.',
      });
    }
  };

  const cargarProductos = async () => {
    try {
      const { data } = await api.get('/productos?activos=true');
      if (data.ok) setProductos(data.productos || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los productos.',
      });
    }
  };

  const cargarCajasYSesion = async (idSucursal) => {
    if (!idSucursal) {
      setCajas([]);
      return;
    }

    try {
      const { data } = await api.get(`/caja/cajas?sucursal=${idSucursal}`);

      if (data.ok) {
        const cajasActivas = (data.cajas || []).filter((c) => c.activo);
        const cajasConSesion = [];

        for (const caja of cajasActivas) {
          const sesionResp = await api.get(
            `/caja/sesion-abierta?id_caja=${caja.id_caja}`
          );

          cajasConSesion.push({
            ...caja,
            sesion_abierta: sesionResp.data?.sesion_abierta || null,
          });
        }

        setCajas(cajasConSesion);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const cargarCompras = async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();

      if (idSucursalFiltro) params.append('sucursal', idSucursalFiltro);
      if (idProveedorFiltro) params.append('proveedor', idProveedorFiltro);
      if (estadoFiltro) params.append('estado', estadoFiltro);
      if (fechaInicio) params.append('fecha_inicio', `${fechaInicio} 00:00:00`);
      if (fechaFin) params.append('fecha_fin', `${fechaFin} 23:59:59`);

      const { data } = await api.get(`/compras?${params.toString()}`);
      if (data.ok) setCompras(data.compras || []);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las compras.',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarSucursales();
      cargarProveedores();
      cargarProductos();
    }
  }, [usuario]);

  useEffect(() => {
    if (idSucursalFiltro) cargarCompras();
  }, [idSucursalFiltro]);

  useEffect(() => {
    return () => detenerCamara();
  }, []);

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) videoRef.current.srcObject = null;
    setCamaraActiva(false);
  };

  const cerrarCamara = (cerrarModal = true) => {
    detenerCamara();
    if (cerrarModal) setModalCamara(false);
    setErrorCamara('');
  };

  const abrirNuevaCompra = async () => {
    const sucursalInicial = obtenerSucursalInicial(usuario, sucursales);

    setCompraEditandoId(null);
    setFormCompra({ ...compraInicial, id_sucursal: sucursalInicial });
    setItems([]);
    setTicketFile(null);
    setTicketPreview('');
    cerrarCamara(false);

    await cargarCajasYSesion(sucursalInicial);
    setModalCompra(true);
  };

  const cerrarModalCompra = () => {
    cerrarCamara(false);
    setModalCompra(false);
    setFormCompra(compraInicial);
    setItems([]);
    setTicketFile(null);
    setTicketPreview('');
    setModalCamara(false);
    setCamaraActiva(false);
    setErrorCamara('');
    setCompraEditandoId(null);
  };

  const handleCompraChange = async (e) => {
    const { name, value } = e.target;
    const nuevoForm = { ...formCompra, [name]: value };

    if (name === 'id_sucursal') {
      nuevoForm.id_sesion = '';
      await cargarCajasYSesion(value);

      const productosConVariantes = [
        ...new Set(
          items
            .map((item) => obtenerProductoPorId(item.id_producto))
            .filter((producto) => producto && esVerdadero(producto.usa_variantes))
            .map((producto) => Number(producto.id_producto))
        ),
      ];

      await Promise.all(
        productosConVariantes.map((idProducto) =>
          cargarVariantesProducto(idProducto, value)
        )
      );
    }

    if (name === 'metodo_pago') {
      if (value === 'PENDIENTE') {
        nuevoForm.monto_pagado = '';
        nuevoForm.id_sesion = '';
      }
      if (value !== 'EFECTIVO') nuevoForm.id_sesion = '';
    }

    setFormCompra(nuevoForm);
  };

  const agregarProducto = () => {
    setItems([...items, { ...productoInicial, atributos_variante: {} }]);
  };

  const quitarProducto = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarItem = (index, campo, valor) => {
    let productoParaCargar = null;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const actualizado = { ...item, [campo]: valor };

        if (campo === 'id_producto') {
          const producto = obtenerProductoPorId(valor);

          actualizado.id_variante = '';
          actualizado.modo_variante = 'EXISTENTE';
          actualizado.atributos_variante = {};
          actualizado.nombre_variante = '';
          actualizado.sku_variante = '';
          actualizado.codigo_barras_variante = '';
          actualizado.lote = '';
          actualizado.fecha_caducidad = '';

          if (producto) {
            actualizado.precio_compra =
              producto.precio_compra && Number(producto.precio_compra) > 0
                ? producto.precio_compra
                : actualizado.precio_compra;

            if (esVerdadero(producto.usa_variantes)) {
              productoParaCargar = producto.id_producto;
            }
          }
        }

        if (campo === 'modo_variante') {
          actualizado.id_variante = '';
          if (valor === 'EXISTENTE') {
            actualizado.atributos_variante = {};
            actualizado.nombre_variante = '';
            actualizado.sku_variante = '';
            actualizado.codigo_barras_variante = '';
          }
        }

        if (campo === 'id_variante') {
          const variante = obtenerVariantesItem(item).find(
            (v) => Number(v.id_variante) === Number(valor)
          );

          if (
            variante?.precio_compra !== undefined &&
            variante?.precio_compra !== null &&
            Number(variante.precio_compra) > 0
          ) {
            actualizado.precio_compra = variante.precio_compra;
          }

          if (variante?.ubicacion_sucursal && !actualizado.ubicacion) {
            actualizado.ubicacion = variante.ubicacion_sucursal;
          }
        }

        return actualizado;
      })
    );

    if (productoParaCargar) {
      cargarVariantesProducto(productoParaCargar).then((variantes) => {
        if (variantes.length === 0) {
          setItems((prev) =>
            prev.map((item, i) =>
              i === index && Number(item.id_producto) === Number(productoParaCargar)
                ? { ...item, modo_variante: 'NUEVA', id_variante: '' }
                : item
            )
          );
        }
      });
    }
  };

  const actualizarAtributoVariante = (index, clave, valor) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              atributos_variante: {
                ...(item.atributos_variante || {}),
                [clave]: valor,
              },
            }
          : item
      )
    );
  };

  const seleccionarTicket = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo no válido',
        text: 'Selecciona una imagen del ticket.',
      });
      return;
    }

    setTicketFile(file);
    setTicketPreview(URL.createObjectURL(file));
  };

  const abrirCamara = async () => {
    try {
      setErrorCamara('');
      setCamaraActiva(false);
      setModalCamara(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorCamara('Este navegador no permite activar la cámara desde la página.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (error) {
            console.error(error);
          }
        }
        setCamaraActiva(true);
      }, 100);
    } catch (error) {
      console.error(error);
      let mensaje =
        'No se pudo acceder a la cámara. Revisa permisos del navegador o que la cámara no esté siendo usada por otra aplicación.';

      if (error.name === 'NotAllowedError') {
        mensaje = 'Permiso de cámara denegado. Permite el acceso a la cámara en el navegador.';
      }
      if (error.name === 'NotFoundError') {
        mensaje = 'No se encontró una cámara disponible en este equipo.';
      }
      if (error.name === 'NotReadableError') {
        mensaje = 'La cámara está siendo usada por otra aplicación o no se puede iniciar.';
      }

      setErrorCamara(mensaje);
      setCamaraActiva(false);
    }
  };

  const capturarFoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      Swal.fire({
        icon: 'warning',
        title: 'Cámara no lista',
        text: 'Espera un momento a que cargue la imagen de la cámara.',
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo capturar la foto.',
          });
          return;
        }

        const file = new File([blob], `ticket-proveedor-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        setTicketFile(file);
        setTicketPreview(URL.createObjectURL(file));
        cerrarCamara(true);
      },
      'image/jpeg',
      0.9
    );
  };

  const quitarTicket = () => {
    setTicketFile(null);
    setTicketPreview('');
  };

  const validarCompra = () => {
    if (!formCompra.id_sucursal) {
      Swal.fire({
        icon: 'warning',
        title: 'Sucursal obligatoria',
        text: 'Selecciona la sucursal donde entrará el inventario.',
      });
      return false;
    }

    if (!formCompra.id_proveedor) {
      Swal.fire({
        icon: 'warning',
        title: 'Proveedor obligatorio',
        text: 'Selecciona un proveedor.',
      });
      return false;
    }

    if (
      formCompra.metodo_pago === 'PENDIENTE' &&
      Number(formCompra.monto_pagado || 0) > 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Compra pendiente',
        text: 'Una compra pendiente no debe tener monto pagado. Cambia el método de pago o deja el monto en cero.',
      });
      return false;
    }

    for (const [index, item] of items.entries()) {
      const filaVacia =
        !item.id_producto &&
        !item.cantidad &&
        !item.precio_compra &&
        !item.descuento &&
        !item.lote &&
        !item.fecha_caducidad &&
        !item.ubicacion &&
        !item.observaciones;

      if (filaVacia) continue;

      if (!item.id_producto) {
        Swal.fire({
          icon: 'warning',
          title: 'Producto obligatorio',
          text: `Selecciona el producto en la fila ${index + 1}.`,
        });
        return false;
      }

      const producto = obtenerProductoPorId(item.id_producto);

      if (!producto) {
        Swal.fire({
          icon: 'warning',
          title: 'Producto no disponible',
          text: `No se encontró la configuración del producto en la fila ${index + 1}.`,
        });
        return false;
      }

      if (esVerdadero(producto.usa_variantes)) {
        const nuevaVariante = itemUsaNuevaVariante(item, producto);

        if (nuevaVariante) {
          const campos = obtenerCamposVariantes(producto);

          if (campos.length === 0) {
            Swal.fire({
              icon: 'warning',
              title: 'Configura las variantes',
              text: `${producto.nombre} tiene activadas las variantes, pero no tiene atributos configurados. Edita el producto y selecciona talla, color, género u otra dimensión.`,
            });
            return false;
          }

          const faltante = campos.find(
            (campo) => !String(item.atributos_variante?.[campo.clave] || '').trim()
          );

          if (faltante) {
            Swal.fire({
              icon: 'warning',
              title: 'Variante incompleta',
              text: `Captura ${faltante.etiqueta} para la nueva variante de ${producto.nombre} en la fila ${index + 1}.`,
            });
            return false;
          }
        } else if (!item.id_variante) {
          Swal.fire({
            icon: 'warning',
            title: 'Variante obligatoria',
            text: `Selecciona una variante de ${producto.nombre} o elige "Crear nueva combinación" en la fila ${index + 1}.`,
          });
          return false;
        }
      }

      const controlaCaducidad = esVerdadero(producto.controla_caducidad);
      const controlaLotes =
        esVerdadero(producto.controla_lotes) || controlaCaducidad;

      if (controlaLotes && !String(item.lote || '').trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Lote obligatorio',
          text: `${producto.nombre} controla lotes. Captura el lote en la fila ${index + 1}.`,
        });
        return false;
      }

      if (controlaCaducidad && !item.fecha_caducidad) {
        Swal.fire({
          icon: 'warning',
          title: 'Caducidad obligatoria',
          text: `${producto.nombre} controla caducidad. Captura la fecha en la fila ${index + 1}.`,
        });
        return false;
      }

      if (!item.cantidad || Number(item.cantidad) <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Cantidad inválida',
          text: `La cantidad de la fila ${index + 1} debe ser mayor a cero.`,
        });
        return false;
      }

      if (item.precio_compra === '' || Number(item.precio_compra) < 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Precio inválido',
          text: `El precio de compra de la fila ${index + 1} no es válido.`,
        });
        return false;
      }

      if (!item.ubicacion || !item.ubicacion.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Área obligatoria',
          text: `Captura el área o ubicación del producto en la fila ${index + 1}.`,
        });
        return false;
      }
    }

    if (resumenCompra.total <= 0 && Number(formCompra.monto_pagado || 0) > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta capturar el total',
        text: 'Para registrar un pago primero captura el total del ticket o agrega productos a la compra.',
      });
      return false;
    }

    if (Number(formCompra.monto_pagado || 0) > resumenCompra.total) {
      Swal.fire({
        icon: 'warning',
        title: 'Pago mayor al total',
        html: `
        <p>El monto pagado no puede ser mayor al total de la compra.</p>
        <div style="margin-top:12px;text-align:left;background:#f8fafc;border-radius:14px;padding:12px">
          <b>Total de la compra:</b> ${formatoMoneda(resumenCompra.total)}<br/>
          <b>Monto capturado:</b> ${formatoMoneda(formCompra.monto_pagado)}<br/>
          <b>Diferencia:</b> ${formatoMoneda(Number(formCompra.monto_pagado || 0) - resumenCompra.total)}
        </div>
        <p style="margin-top:12px;color:#64748b;font-size:13px">
          Corrige el monto pagado o revisa el total del ticket.
        </p>
      `,
        confirmButtonText: 'Entendido',
      });
      return false;
    }

    if (
      formCompra.metodo_pago === 'EFECTIVO' &&
      Number(formCompra.monto_pagado || 0) > 0 &&
      !formCompra.id_sesion
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Caja requerida',
        text: 'Para pagar en efectivo necesitas seleccionar una sesión de caja abierta.',
      });
      return false;
    }

    return true;
  };

  const guardarCompra = async (e) => {
    e.preventDefault();
    if (!validarCompra()) return;

    try {
      setGuardando(true);

      const productosValidos = items.filter((item) => {
        return item.id_producto && Number(item.cantidad || 0) > 0;
      });

      const payload = {
        id_sucursal: Number(formCompra.id_sucursal),
        id_proveedor: Number(formCompra.id_proveedor),
        metodo_pago: formCompra.metodo_pago,
        monto_pagado: Number(formCompra.monto_pagado || 0),
        id_sesion: formCompra.id_sesion ? Number(formCompra.id_sesion) : null,
        impuesto: Number(formCompra.impuesto || 0),
        descuento: Number(formCompra.descuento || 0),
        observaciones: formCompra.observaciones || null,
        total_manual: Number(formCompra.total_manual || 0),
        productos: productosValidos.map((item) => {
          const producto = obtenerProductoPorId(item.id_producto);
          const nuevaVariante = itemUsaNuevaVariante(item, producto);

          return {
            id_producto: Number(item.id_producto),
            id_variante:
              !nuevaVariante && item.id_variante
                ? Number(item.id_variante)
                : null,
            variante_nueva: nuevaVariante
              ? {
                  nombre_variante: item.nombre_variante || null,
                  sku: item.sku_variante || null,
                  codigo_barras: item.codigo_barras_variante || null,
                  atributos: item.atributos_variante || {},
                }
              : null,
            cantidad: Number(item.cantidad),
            precio_compra: Number(item.precio_compra || 0),
            descuento: Number(item.descuento || 0),
            lote: item.lote || null,
            fecha_caducidad: item.fecha_caducidad || null,
            ubicacion: item.ubicacion || null,
            observaciones: item.observaciones || null,
          };
        }),
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));

      if (ticketFile) formData.append('ticket', ticketFile);

      const respuesta = compraEditandoId
        ? await api.put(`/compras/${compraEditandoId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        : await api.post('/compras', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

      const { data } = respuesta;

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: compraEditandoId ? 'Compra actualizada' : 'Compra registrada',
          text:
            data.mensaje ||
            (compraEditandoId
              ? 'La compra fue actualizada correctamente.'
              : 'La compra fue registrada correctamente.'),
          timer: 1600,
          showConfirmButton: false,
        });

        cerrarModalCompra();
        await cargarCompras();
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: compraEditandoId
          ? 'Error al actualizar compra'
          : 'Error al guardar compra',
        text:
          error.response?.data?.mensaje ||
          (compraEditandoId
            ? 'No se pudo actualizar la compra.'
            : 'No se pudo registrar la compra.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  const verDetalleCompra = async (idCompra) => {
    try {
      const { data } = await api.get(`/compras/${idCompra}`);

      if (data.ok) {
        setDetalleCompra(data.compra);
        setDetalleProductos(data.detalle || []);
        setDetallePagos(data.pagos || []);
        setModalDetalle(true);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cargar el detalle de la compra.',
      });
    }
  };

  const editarCompra = async (idCompra) => {
    try {
      const { data } = await api.get(`/compras/${idCompra}`);

      if (data.ok) {
        const compra = data.compra;
        const detalle = data.detalle || [];

        if (compra.estado !== 'PENDIENTE') {
          Swal.fire({
            icon: 'warning',
            title: 'No se puede editar',
            text: 'Solo puedes editar compras pendientes.',
          });
          return;
        }

        setFormCompra({
          id_sucursal: compra.id_sucursal || '',
          id_proveedor: compra.id_proveedor || '',
          id_sesion: compra.id_sesion || '',
          metodo_pago: compra.metodo_pago || 'PENDIENTE',
          monto_pagado: compra.monto_pagado || '',
          impuesto: compra.impuesto || '',
          descuento: compra.descuento || '',
          observaciones: compra.observaciones || '',
          total_manual: compra.total || '',
        });

        const itemsEdicion = detalle.map((item) => ({
          id_producto: item.id_producto || '',
          id_variante: item.id_variante || '',
          modo_variante: 'EXISTENTE',
          atributos_variante: {},
          nombre_variante: '',
          sku_variante: '',
          codigo_barras_variante: '',
          cantidad: item.cantidad || '',
          precio_compra: item.precio_compra || '',
          descuento: item.descuento || '',
          lote:
            item.lote && item.lote !== 'SIN-LOTE'
              ? item.lote
              : '',
          fecha_caducidad: item.fecha_caducidad
            ? item.fecha_caducidad.substring(0, 10)
            : '',
          ubicacion: item.ubicacion || '',
          observaciones: item.observaciones || '',
        }));

        setItems(itemsEdicion);

        setCompraEditandoId(idCompra);
        setTicketFile(null);
        setTicketPreview('');
        await cargarCajasYSesion(compra.id_sucursal);

        const productosConVariantes = [
          ...new Set(
            detalle
              .filter((item) => item.id_variante)
              .map((item) => Number(item.id_producto))
          ),
        ];

        await Promise.all(
          productosConVariantes.map((idProducto) =>
            cargarVariantesProducto(idProducto, compra.id_sucursal)
          )
        );

        setModalCompra(true);
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cargar la compra para editar.',
      });
    }
  };

  const cancelarCompra = async (compra) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: 'Cancelar compra',
      html: `
        <p>¿Seguro que deseas cancelar la compra <b>${compra.folio}</b>?</p>
        <div style="margin-top:10px;text-align:left;background:#f8fafc;border-radius:14px;padding:12px">
          <b>Proveedor:</b> ${compra.proveedor || '—'}<br/>
          <b>Total:</b> ${formatoMoneda(compra.total)}<br/>
          <b>Estado actual:</b> ${compra.estado}
        </div>
        <p style="margin-top:10px;color:#64748b;font-size:13px">
          Esta acción cambiará la compra a estado CANCELADA.
        </p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, regresar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setCancelandoId(compra.id_compra);
      const { data } = await api.patch(`/compras/${compra.id_compra}/cancelar`);

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Compra cancelada',
          text: data.mensaje || 'La compra fue cancelada correctamente.',
          timer: 1600,
          showConfirmButton: false,
        });

        await cargarCompras();

        if (detalleCompra?.id_compra === compra.id_compra) {
          await verDetalleCompra(compra.id_compra);
        }
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'No se pudo cancelar',
        text:
          error.response?.data?.mensaje ||
          'Ocurrió un error al cancelar la compra.',
      });
    } finally {
      setCancelandoId(null);
    }
  };

  const cerrarDetalle = () => {
    setModalDetalle(false);
    setDetalleCompra(null);
    setDetalleProductos([]);
    setDetallePagos([]);
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-5 sm:space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F]">
              <ClipboardList size={24} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#AD526F]">
                <Sparkles size={13} />
                Abastecimiento y compras
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Compras
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                Registra compras a proveedores, comprobantes, pagos y entradas
                opcionales a inventario.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevaCompra}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.23)] transition hover:-translate-y-0.5 hover:bg-[#8B3F5B] sm:w-auto"
          >
            <Plus size={19} />
            Nueva compra
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Sucursal
            </label>

            {puedeCambiarSucursal ? (
              <select
                value={idSucursalFiltro}
                onChange={(e) => setIdSucursalFiltro(e.target.value)}
                className={inputFilterClass}
              >
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
                {sucursalFiltroActual?.nombre ||
                  sucursales[0]?.nombre ||
                  'Sucursal asignada'}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Proveedor
            </label>

            <select
              value={idProveedorFiltro}
              onChange={(e) => setIdProveedorFiltro(e.target.value)}
              className={inputFilterClass}
            >
              <option value="">Todos</option>

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

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Estado
            </label>

            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className={inputFilterClass}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
              <option value="PAGADA">Pagada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-[#5D4A51]">
              Fecha inicio
            </label>

            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={inputFilterClass}
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
              className={inputFilterClass}
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={cargarCompras}
              disabled={cargando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 font-black text-white transition hover:bg-[#35292E] disabled:opacity-60"
            >
              {cargando ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}

              {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 sm:gap-5">
        <CompraKpi
          titulo="Compras"
          valor={resumenGeneral.totalCompras}
          detalle="Operaciones registradas"
          icono={ClipboardList}
          claseIcono="bg-[#FBEAF0] text-[#AD526F]"
        />

        <CompraKpi
          titulo="Total compras"
          valor={formatoMoneda(resumenGeneral.totalImporte)}
          detalle="Importe acumulado"
          icono={CircleDollarSign}
          claseIcono="bg-[#FFF1F5] text-[#A84E6C]"
        />

        <CompraKpi
          titulo="Pagado"
          valor={formatoMoneda(resumenGeneral.totalPagado)}
          detalle="Importe cubierto"
          icono={BadgeCheck}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <CompraKpi
          titulo="Saldo"
          valor={formatoMoneda(resumenGeneral.totalSaldo)}
          detalle="Pendiente por pagar"
          icono={FileText}
          claseIcono="bg-red-50 text-red-700"
        />

        <CompraKpi
          titulo="Pendientes"
          valor={resumenGeneral.pendientes}
          detalle="Compras por liquidar"
          icono={Calendar}
          claseIcono="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#AD526F]">
              <ClipboardList size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Listado de compras
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {compras.length} compra(s) en la vista actual
              </p>
            </div>
          </div>
        </div>

        <div className="md:hidden p-4 space-y-3">
          {cargando ? (
            <div className="rounded-[1.4rem] border border-[#F0E4E8] bg-[#FFFCFD] p-6 text-center font-semibold text-[#8A757D]">
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-[#AD526F]" />
                Cargando compras...
              </div>
            </div>
          ) : compras.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-6 text-center text-[#8C777F] font-semibold">
              No hay compras registradas.
            </div>
          ) : (
            compras.map((compra) => (
              <article
                key={compra.id_compra}
                className="rounded-2xl border border-[#F0E4E8] p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)] bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#43353A] break-words">
                      {compra.folio}
                    </p>
                    <p className="text-xs text-[#AA939B] mt-1">
                      ID #{compra.id_compra}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${claseEstadoCompra(
                      compra.estado
                    )}`}
                  >
                    {compra.estado}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-[#FFFAFB] p-3">
                  <p className="text-xs text-[#8C777F]">Fecha</p>
                  <p className="font-semibold text-[#66535A]">
                    {formatoFecha(compra.fecha_compra)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F] flex items-center gap-1">
                      <Truck size={15} />
                      Proveedor
                    </p>
                    <p className="font-bold text-[#43353A] mt-1 break-words">
                      {compra.proveedor}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F] flex items-center gap-1">
                      <Store size={15} />
                      Sucursal
                    </p>
                    <p className="font-semibold text-[#66535A] break-words">
                      {compra.sucursal}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F]">Usuario</p>
                    <p className="font-semibold text-[#66535A] break-words">
                      {compra.usuario || '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-[#FFFAFB] p-3">
                    <p className="text-xs text-[#8C777F]">Total</p>
                    <p className="font-bold text-[#43353A]">
                      {formatoMoneda(compra.total)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#FFF2F5] p-3">
                    <p className="text-xs text-[#A84E6C]">Pagado</p>
                    <p className="font-bold text-[#8F405C]">
                      {formatoMoneda(compra.monto_pagado)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs text-red-700">Saldo</p>
                    <p className="font-bold text-red-700">
                      {formatoMoneda(compra.saldo)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={() => verDetalleCompra(compra.id_compra)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#F0EBF6] text-[#765D8D] hover:bg-[#EDE7F3] font-bold transition"
                  >
                    <Eye size={18} />
                    Ver detalle
                  </button>

                  {compra.estado === 'PENDIENTE' && (
                    <button
                      onClick={() => editarCompra(compra.id_compra)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold transition"
                    >
                      <Pencil size={18} />
                      Editar compra
                    </button>
                  )}

                  {puedeCancelarCompra(compra) && (
                    <button
                      onClick={() => cancelarCompra(compra)}
                      disabled={cancelandoId === compra.id_compra}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 font-bold transition disabled:opacity-60"
                    >
                      <Ban size={18} />
                      {cancelandoId === compra.id_compra
                        ? 'Cancelando...'
                        : 'Cancelar compra'}
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden md:block p-4">
          <div className="overflow-x-auto rounded-[2rem] border border-[#F0E4E8] shadow-[0_12px_40px_rgba(118,76,91,0.05)] bg-white">
            <table className="w-full min-w-[1280px]">
              <thead className="bg-[#FFFAFB] border-b border-[#F0E4E8]">
                <tr>
                  <th className="px-5 py-4 text-left text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Compra
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Fecha
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Proveedor
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Sucursal
                  </th>

                  <th className="px-5 py-4 text-left text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Usuario
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Total
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Pagado
                  </th>

                  <th className="px-5 py-4 text-right text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Saldo
                  </th>

                  <th className="px-5 py-4 text-center text-[11px] font-black text-[#8C777F] uppercase tracking-wider">
                    Estado
                  </th>

                  <th className="px-5 py-4 text-center text-[11px] font-black text-[#8C777F] uppercase tracking-wider sticky right-0 bg-[#FFFAFB] shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.65)] z-10">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F5EAED] bg-white">
                {cargando ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-14 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-[#8C777F]">
                        <div className="w-11 h-11 rounded-2xl bg-[#F8EDF1] flex items-center justify-center">
                          <Search size={22} className="animate-pulse" />
                        </div>
                        <p className="font-bold">Cargando compras...</p>
                      </div>
                    </td>
                  </tr>
                ) : compras.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-5 py-14 text-center">
                      <div className="inline-flex flex-col items-center gap-3 text-[#8C777F]">
                        <div className="w-12 h-12 rounded-2xl bg-[#F8EDF1] flex items-center justify-center">
                          <ClipboardList size={24} />
                        </div>
                        <div>
                          <p className="font-black text-[#66535A]">
                            No hay compras registradas
                          </p>
                          <p className="text-sm text-[#AA939B] mt-1">
                            Usa el botón Nueva compra para comenzar.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  compras.map((compra) => (
                    <tr
                      key={compra.id_compra}
                      className="group transition-colors hover:bg-[#FFFAFB]"
                    >
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[#FFF2F5] text-[#A84E6C] flex items-center justify-center shrink-0 transition-colors group-hover:bg-[#F4E1E7]">
                            <ClipboardList size={21} />
                          </div>

                          <div className="min-w-0">
                            <p className="font-black text-[#43353A] truncate">
                              {compra.folio}
                            </p>
                            <p className="text-xs text-[#AA939B] mt-0.5">
                              ID #{compra.id_compra}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-[#FFFAFB] px-3 py-2 text-sm font-semibold text-[#766168]">
                          <Calendar size={15} className="text-[#AA939B]" />
                          <span>{formatoFecha(compra.fecha_compra)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-start gap-2 max-w-[220px]">
                          <Truck size={18} className="text-[#AA939B] mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-[#43353A] truncate">
                              {compra.proveedor || '—'}
                            </p>
                            <p className="text-xs text-[#AA939B]">
                              Proveedor
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-start gap-2 max-w-[200px]">
                          <Store size={18} className="text-[#AA939B] mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-[#66535A] truncate">
                              {compra.sucursal || '—'}
                            </p>
                            <p className="text-xs text-[#AA939B]">
                              Sucursal
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="max-w-[170px]">
                          <p className="text-sm font-bold text-[#66535A] truncate">
                            {compra.usuario || '—'}
                          </p>
                          <p className="text-xs text-[#AA939B]">
                            Registró
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className="text-base font-black text-[#43353A]">
                            {formatoMoneda(compra.total)}
                          </span>
                          <span className="text-xs text-[#AA939B]">
                            Total compra
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-right">
                        <div className="inline-flex flex-col items-end rounded-2xl bg-[#FFF2F5] px-3 py-2">
                          <span className="text-base font-black text-[#A84E6C]">
                            {formatoMoneda(compra.monto_pagado)}
                          </span>
                          <span className="text-xs text-[#AD526F]">
                            Pagado
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-right">
                        <div
                          className={`inline-flex flex-col items-end rounded-2xl px-3 py-2 ${Number(compra.saldo || 0) > 0
                            ? 'bg-red-50'
                            : 'bg-emerald-50'
                            }`}
                        >
                          <span
                            className={`text-base font-black ${Number(compra.saldo || 0) > 0
                              ? 'text-red-700'
                              : 'text-emerald-700'
                              }`}
                          >
                            {formatoMoneda(compra.saldo)}
                          </span>
                          <span
                            className={`text-xs ${Number(compra.saldo || 0) > 0
                              ? 'text-red-600'
                              : 'text-emerald-600'
                              }`}
                          >
                            {Number(compra.saldo || 0) > 0 ? 'Pendiente' : 'Liquidado'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-center">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-black px-3 py-1.5 rounded-full ${claseEstadoCompra(
                            compra.estado
                          )}`}
                        >
                          {compra.estado}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-middle text-center sticky right-0 bg-white group-hover:bg-[#FFFAFB] shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.65)] transition-colors">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => verDetalleCompra(compra.id_compra)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F0EBF6] text-[#765D8D] hover:bg-[#EDE7F3] font-black transition"
                            title="Ver detalle"
                          >
                            <Eye size={17} />
                            Ver
                          </button>

                          {compra.estado === 'PENDIENTE' && (
                            <button
                              onClick={() => editarCompra(compra.id_compra)}
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-black transition"
                              title="Editar compra"
                            >
                              <Pencil size={17} />
                              Editar
                            </button>
                          )}

                          {puedeCancelarCompra(compra) && (
                            <button
                              onClick={() => cancelarCompra(compra)}
                              disabled={cancelandoId === compra.id_compra}
                              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-black transition disabled:opacity-60"
                              title="Cancelar compra"
                            >
                              <Ban size={17} />
                              {cancelandoId === compra.id_compra ? '...' : 'Cancelar'}
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

      {modalCompra && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm" onClick={cerrarModalCompra} />

          <div className="relative my-auto flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#AD526F]">
                  <ClipboardList size={12} />
                  {compraEditandoId ? 'Edición' : 'Nueva operación'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034] sm:text-2xl">
                  {compraEditandoId ? 'Editar compra' : 'Nueva compra'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Puedes registrar la compra con comprobante y capturar productos
                  cuando quieras alimentar el inventario.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalCompra}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={guardarCompra} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 overflow-y-auto space-y-7">
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Sucursal *
                    </label>

                    {puedeCambiarSucursal ? (
                      <select
                        name="id_sucursal"
                        value={formCompra.id_sucursal}
                        onChange={handleCompraChange}
                        className={inputModalClass}
                      >
                        <option value="">Selecciona sucursal</option>
                        {sucursales.map((sucursal) => (
                          <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                            {sucursal.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full min-w-0 px-4 py-3 rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] text-[#66535A] font-semibold truncate">
                        {sucursalActual?.nombre || sucursales[0]?.nombre || 'Sucursal asignada'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Proveedor *
                    </label>
                    <select
                      name="id_proveedor"
                      value={formCompra.id_proveedor}
                      onChange={handleCompraChange}
                      className={inputModalClass}
                    >
                      <option value="">Selecciona proveedor</option>
                      {proveedores.map((proveedor) => (
                        <option key={proveedor.id_proveedor} value={proveedor.id_proveedor}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Método de pago
                    </label>
                    <select
                      name="metodo_pago"
                      value={formCompra.metodo_pago}
                      onChange={handleCompraChange}
                      className={inputModalClass}
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Monto pagado
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="monto_pagado"
                      value={formCompra.monto_pagado}
                      onChange={handleCompraChange}
                      disabled={formCompra.metodo_pago === 'PENDIENTE'}
                      className="w-full min-w-0 px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#E5AFC0] disabled:bg-[#F8EDF1]"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Total del ticket
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="total_manual"
                      value={formCompra.total_manual}
                      onChange={handleCompraChange}
                      className={inputModalClass}
                      placeholder="0.00"
                    />
                  </div>

                  {formCompra.metodo_pago === 'EFECTIVO' && Number(formCompra.monto_pagado || 0) > 0 && (
                    <div className="md:col-span-2 min-w-0">
                      <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                        Caja abierta para pago *
                      </label>
                      <select
                        name="id_sesion"
                        value={formCompra.id_sesion}
                        onChange={handleCompraChange}
                        className={inputModalClass}
                      >
                        <option value="">Selecciona sesión de caja</option>
                        {cajas
                          .filter((c) => c.sesion_abierta)
                          .map((caja) => (
                            <option
                              key={caja.sesion_abierta.id_sesion}
                              value={caja.sesion_abierta.id_sesion}
                            >
                              {caja.nombre} · Sesión #{caja.sesion_abierta.id_sesion}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Descuento general
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="descuento"
                      value={formCompra.descuento}
                      onChange={handleCompraChange}
                      className={inputModalClass}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Impuesto
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="impuesto"
                      value={formCompra.impuesto}
                      onChange={handleCompraChange}
                      className={inputModalClass}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-4 min-w-0">
                    <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                      Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      value={formCompra.observaciones}
                      onChange={handleCompraChange}
                      rows="2"
                      className={`${inputModalClass} resize-none`}
                      placeholder="Observaciones generales de la compra"
                    />
                  </div>
                </section>

                <section className="rounded-[1.6rem] border border-[#F0E2E7] bg-[#FFFAFB] p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-[#FBEAF0] text-[#A84E6C] flex items-center justify-center shrink-0">
                        <ImageIcon size={22} />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-[#43353A]">
                          Ticket / comprobante de compra
                        </h3>
                        <p className="text-sm text-[#8C777F] leading-relaxed">
                          Puedes subir una foto del ticket o tomarla con la cámara de la computadora.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#EEDFE4] text-[#66535A] hover:bg-[#F8EDF1] font-bold cursor-pointer transition">
                        <Upload size={18} />
                        Subir imagen
                        <input type="file" accept="image/*" onChange={seleccionarTicket} className="hidden" />
                      </label>

                      <button
                        type="button"
                        onClick={abrirCamara}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#AD526F] text-white hover:bg-[#8B3F5B] font-bold cursor-pointer transition"
                      >
                        <Camera size={18} />
                        Tomar foto
                      </button>
                    </div>
                  </div>

                  {ticketPreview && (
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                      <div className="rounded-2xl overflow-hidden border border-[#EEDFE4] bg-white">
                        <img src={ticketPreview} alt="Vista previa del ticket" className="w-full h-56 object-cover" />
                      </div>

                      <div className="rounded-2xl bg-white border border-[#EEDFE4] p-4 min-w-0">
                        <p className="text-sm text-[#8C777F]">Archivo seleccionado</p>
                        <p className="font-bold text-[#43353A] mt-1 break-words">
                          {ticketFile?.name}
                        </p>
                        <p className="text-sm text-[#8C777F] mt-1">
                          {ticketFile ? `${(ticketFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                        </p>

                        <button
                          type="button"
                          onClick={quitarTicket}
                          className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-bold transition"
                        >
                          <Trash2 size={17} />
                          Quitar imagen
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-[#43353A]">
                        Productos de la compra
                      </h3>
                      <p className="text-sm text-[#8C777F] leading-relaxed">
                        Opcional. Si capturas productos, se alimentará el inventario según la configuración de cada artículo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={agregarProducto}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FBEAF0] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F4D9E2] sm:w-auto"
                    >
                      <Plus size={17} />
                      Producto
                    </button>
                  </div>

                  <div className="space-y-4">
                    {items.length === 0 && (
                      <div className="rounded-2xl sm:rounded-[2rem] border border-dashed border-[#E4D3D9] bg-[#FFFAFB] p-6 text-center">
                        <Package size={30} className="mx-auto text-[#AA939B]" />
                        <h4 className="font-bold text-[#66535A] mt-3">
                          Sin productos capturados
                        </h4>
                        <p className="text-sm text-[#8C777F] mt-1">
                          Puedes guardar la compra solo con el comprobante o agregar productos para actualizar inventario.
                        </p>
                      </div>
                    )}

                    {items.map((item, index) => {
                      const subtotalItem = Math.max(
                        Number(item.cantidad || 0) * Number(item.precio_compra || 0) - Number(item.descuento || 0),
                        0
                      );

                      const productoSeleccionado = obtenerProductoPorId(item.id_producto);
                      const usaVariantes = esVerdadero(productoSeleccionado?.usa_variantes);
                      const controlaCaducidad = esVerdadero(
                        productoSeleccionado?.controla_caducidad
                      );
                      const controlaLotes =
                        esVerdadero(productoSeleccionado?.controla_lotes) ||
                        controlaCaducidad;
                      const variantesItem = obtenerVariantesItem(item);
                      const cargandoVariantesItem =
                        cargandoVariantes[Number(item.id_producto)] || false;
                      const varianteSeleccionada = variantesItem.find(
                        (variante) =>
                          Number(variante.id_variante) === Number(item.id_variante)
                      );
                      const camposVariante = usaVariantes
                        ? obtenerCamposVariantes(productoSeleccionado)
                        : [];
                      const crearNuevaVariante = usaVariantes
                        ? itemUsaNuevaVariante(item, productoSeleccionado)
                        : false;

                      return (
                        <div key={index} className="rounded-[1.6rem] border border-[#F0E2E7] bg-[#FFFAFB] p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <h4 className="font-bold text-[#43353A]">
                              Producto #{index + 1}
                            </h4>

                            <button
                              type="button"
                              onClick={() => quitarProducto(index)}
                              className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition shrink-0"
                              title="Quitar producto"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className={usaVariantes ? 'md:col-span-4 min-w-0' : 'md:col-span-4 min-w-0'}>
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">Producto *</label>
                              <select
                                value={item.id_producto}
                                onChange={(e) => actualizarItem(index, 'id_producto', e.target.value)}
                                className={inputModalClass}
                              >
                                <option value="">Selecciona producto</option>
                                {productos.map((producto) => (
                                  <option key={producto.id_producto} value={producto.id_producto}>
                                    {producto.nombre}
                                    {esVerdadero(producto.usa_variantes) ? ' · variantes' : ''}
                                  </option>
                                ))}
                              </select>

                              {productoSeleccionado && (
                                <p className="mt-2 text-xs text-[#8C777F]">
                                  {usaVariantes
                                    ? 'Este producto requiere seleccionar una variante.'
                                    : 'Producto simple.'}
                                  {controlaLotes ? ' Controla lotes.' : ''}
                                  {controlaCaducidad ? ' Controla caducidad.' : ''}
                                </p>
                              )}
                            </div>

                            {usaVariantes && (
                              <div className="md:col-span-4 min-w-0">
                                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                                  Variante *
                                </label>

                                {variantesItem.length > 0 && (
                                  <select
                                    value={crearNuevaVariante ? 'NUEVA' : 'EXISTENTE'}
                                    onChange={(e) =>
                                      actualizarItem(index, 'modo_variante', e.target.value)
                                    }
                                    className={`${inputModalClass} mb-2`}
                                    disabled={cargandoVariantesItem}
                                  >
                                    <option value="EXISTENTE">Usar variante existente</option>
                                    <option value="NUEVA">Crear nueva combinación</option>
                                  </select>
                                )}

                                {!crearNuevaVariante ? (
                                  <select
                                    value={item.id_variante}
                                    onChange={(e) =>
                                      actualizarItem(index, 'id_variante', e.target.value)
                                    }
                                    className={inputModalClass}
                                    disabled={cargandoVariantesItem}
                                  >
                                    <option value="">
                                      {cargandoVariantesItem
                                        ? 'Cargando variantes...'
                                        : 'Selecciona variante'}
                                    </option>

                                    {variantesItem.map((variante) => (
                                      <option
                                        key={variante.id_variante}
                                        value={variante.id_variante}
                                      >
                                        {obtenerEtiquetaVariante(variante)}
                                        {variante.sku ? ` · SKU ${variante.sku}` : ''}
                                        {` · Stock actual ${formatoNumero(variante.stock_sucursal || 0)}`}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="rounded-xl border border-[#F0D4DE] bg-[#FFF2F5] px-3 py-3 text-sm text-[#7D5362]">
                                    {variantesItem.length === 0
                                      ? 'No hay combinaciones registradas. Captura la primera variante en esta compra.'
                                      : 'Captura abajo los datos de la nueva combinación.'}
                                  </div>
                                )}

                                {varianteSeleccionada && !crearNuevaVariante && (
                                  <div className="mt-2 rounded-xl border border-[#F0D4DE] bg-[#FFF2F5] px-3 py-2 text-xs text-[#7D5362]">
                                    <b>{obtenerEtiquetaVariante(varianteSeleccionada)}</b>
                                    <span className="block mt-1">
                                      Stock actual en sucursal:{' '}
                                      {formatoNumero(varianteSeleccionada.stock_sucursal || 0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {usaVariantes && crearNuevaVariante && (
                              <div className="md:col-span-12 rounded-2xl border border-[#F0D4DE] bg-white p-4">
                                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="font-black text-[#5D4A51]">
                                      Nueva combinación de variante
                                    </p>
                                    <p className="text-xs text-[#8C777F]">
                                      Se creará al guardar la compra y el stock entrará directamente a esta variante.
                                    </p>
                                  </div>
                                  <span className="rounded-full bg-[#FFF0F4] px-3 py-1 text-xs font-bold text-[#A84E6C]">
                                    {camposVariante.length} atributo{camposVariante.length === 1 ? '' : 's'} requerido{camposVariante.length === 1 ? '' : 's'}
                                  </span>
                                </div>

                                {camposVariante.length === 0 ? (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                                    Este producto tiene activadas las variantes, pero no tiene dimensiones configuradas. Edita el producto y selecciona talla, color, género u otros atributos antes de registrar la compra.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {camposVariante.map((campo) => (
                                      <div key={campo.clave} className="min-w-0">
                                        <label className="mb-2 block text-xs font-black text-[#5D4A51]">
                                          {campo.etiqueta} *
                                        </label>

                                        {campo.tipo === 'select' ? (
                                          <select
                                            value={item.atributos_variante?.[campo.clave] || ''}
                                            onChange={(e) =>
                                              actualizarAtributoVariante(index, campo.clave, e.target.value)
                                            }
                                            className={inputModalClass}
                                          >
                                            <option value="">Selecciona</option>
                                            {(campo.opciones || []).map((opcion) => (
                                              <option key={opcion} value={opcion}>
                                                {opcion}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.atributos_variante?.[campo.clave] || ''}
                                            onChange={(e) =>
                                              actualizarAtributoVariante(index, campo.clave, e.target.value)
                                            }
                                            className={inputModalClass}
                                            placeholder={campo.placeholder || campo.etiqueta}
                                          />
                                        )}
                                      </div>
                                    ))}

                                    <div className="min-w-0">
                                      <label className="mb-2 block text-xs font-black text-[#5D4A51]">
                                        Nombre de variante
                                      </label>
                                      <input
                                        type="text"
                                        value={item.nombre_variante || ''}
                                        onChange={(e) =>
                                          actualizarItem(index, 'nombre_variante', e.target.value)
                                        }
                                        className={inputModalClass}
                                        placeholder="Opcional, se genera automáticamente"
                                      />
                                    </div>

                                   

                                    <div className="min-w-0">
                                      <label className="mb-2 block text-xs font-black text-[#5D4A51]">
                                        Código de barras
                                      </label>
                                      <input
                                        type="text"
                                        value={item.codigo_barras_variante || ''}
                                        onChange={(e) =>
                                          actualizarItem(index, 'codigo_barras_variante', e.target.value)
                                        }
                                        className={inputModalClass}
                                        placeholder="Opcional"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="md:col-span-2 min-w-0">
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">Cantidad *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.cantidad}
                                onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                                className={inputModalClass}
                                placeholder="0"
                              />
                            </div>

                            <div className="md:col-span-2 min-w-0">
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">Precio compra *</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.precio_compra}
                                onChange={(e) => actualizarItem(index, 'precio_compra', e.target.value)}
                                className={inputModalClass}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="md:col-span-2 min-w-0">
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">Desc.</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.descuento}
                                onChange={(e) => actualizarItem(index, 'descuento', e.target.value)}
                                className={inputModalClass}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="md:col-span-2 min-w-0">
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">Subtotal</label>
                              <div className="px-4 py-3 rounded-2xl bg-white border border-[#EEDFE4] font-bold text-[#A84E6C] text-left md:text-right break-words">
                                {formatoMoneda(subtotalItem)}
                              </div>
                            </div>

                            {controlaLotes && (
                              <div className="md:col-span-3 min-w-0">
                                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                                  Lote *
                                </label>
                                <input
                                  value={item.lote}
                                  onChange={(e) =>
                                    actualizarItem(index, 'lote', e.target.value)
                                  }
                                  className="w-full min-w-0 px-4 py-3 rounded-2xl border border-[#EEDFE4] focus:outline-none focus:ring-2 focus:ring-[#E5AFC0] bg-white uppercase"
                                  placeholder="Ej. PAR-2027-A"
                                />
                              </div>
                            )}

                            {controlaCaducidad && (
                              <div className="md:col-span-3 min-w-0">
                                <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                                  Fecha caducidad *
                                </label>
                                <input
                                  type="date"
                                  value={item.fecha_caducidad}
                                  onChange={(e) =>
                                    actualizarItem(index, 'fecha_caducidad', e.target.value)
                                  }
                                  className={inputModalClass}
                                />
                              </div>
                            )}

                            <div className="md:col-span-3 min-w-0">
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">
                                Área / ubicación
                              </label>
                              <input
                                value={item.ubicacion}
                                onChange={(e) => actualizarItem(index, 'ubicacion', e.target.value)}
                                className={inputModalClass}
                                placeholder="Ej. Área 1, Área 2, Mostrador"
                              />
                            </div>

                            <div className="md:col-span-6 min-w-0">
                              <label className="mb-2 block text-sm font-black text-[#5D4A51]">Observaciones</label>
                              <input
                                value={item.observaciones}
                                onChange={(e) => actualizarItem(index, 'observaciones', e.target.value)}
                                className={inputModalClass}
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                    <p className="text-sm text-[#8C777F]">Subtotal</p>
                    <p className="text-xl font-bold text-[#43353A] break-words">
                      {formatoMoneda(resumenCompra.subtotal)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-red-50 p-4 min-w-0">
                    <p className="text-sm text-red-600">Descuento</p>
                    <p className="text-xl font-bold text-red-700 break-words">
                      -{formatoMoneda(resumenCompra.descuento)}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-[1.3rem] border border-[#E5DCEC] bg-[#F0EBF6] p-4">
                    <p className="text-sm text-[#826A9A]">Impuesto</p>
                    <p className="text-xl font-bold text-[#765D8D] break-words">
                      {formatoMoneda(resumenCompra.impuesto)}
                    </p>
                  </div>

                  <div className="min-w-0 rounded-[1.3rem] border border-[#F0D4DE] bg-[#FFF2F5] p-4">
                    <p className="text-sm text-[#AD526F]">Total</p>
                    <p className="text-2xl font-bold text-[#A84E6C] break-words">
                      {formatoMoneda(resumenCompra.total)}
                    </p>
                  </div>
                </section>
              </div>

              <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#F0E4E8] bg-white shrink-0">
                <button
                  type="button"
                  onClick={cerrarModalCompra}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] text-[#66535A] font-bold transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Save size={19} />
                  {guardando
                    ? 'Guardando...'
                    : compraEditandoId
                      ? 'Actualizar compra'
                      : 'Guardar compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCamara && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div className="fixed inset-0 bg-[#33272C]/65 backdrop-blur-sm" onClick={() => cerrarCamara(true)} />

          <div className="relative my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Tomar foto del ticket
                </h2>
                <p className="text-sm text-[#8C777F] leading-relaxed">
                  Alinea el ticket frente a la cámara y captura la imagen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => cerrarCamara(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {errorCamara ? (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-red-700 font-semibold">
                  {errorCamara}
                </div>
              ) : (
                <div className="rounded-2xl sm:rounded-[2rem] overflow-hidden bg-slate-950 border border-[#EEDFE4]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[62vh] object-contain bg-black"
                  />
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => cerrarCamara(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] text-[#66535A] font-bold transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={capturarFoto}
                  disabled={!camaraActiva || !!errorCamara}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Camera size={19} />
                  Capturar foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalDetalle && detalleCompra && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm" onClick={cerrarDetalle} />

          <div className="relative my-auto w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Detalle de compra
                </h2>
                <p className="text-sm text-[#8C777F] break-words">
                  {detalleCompra.folio}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDetalle}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[80vh] space-y-6">
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                  <p className="text-sm text-[#8C777F]">Proveedor</p>
                  <p className="font-bold text-[#43353A] mt-1 break-words">
                    {detalleCompra.proveedor}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                  <p className="text-sm text-[#8C777F]">Sucursal</p>
                  <p className="font-bold text-[#43353A] mt-1 break-words">
                    {detalleCompra.sucursal}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                  <p className="text-sm text-[#8C777F]">Fecha</p>
                  <p className="font-bold text-[#43353A] mt-1 break-words">
                    {formatoFecha(detalleCompra.fecha_compra)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                  <p className="text-sm text-[#8C777F]">Estado</p>
                  <span
                    className={`inline-flex mt-2 text-xs font-bold px-3 py-1 rounded-full ${claseEstadoCompra(
                      detalleCompra.estado
                    )}`}
                  >
                    {detalleCompra.estado}
                  </span>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="min-w-0 rounded-[1.3rem] border border-[#F0D4DE] bg-[#FFF2F5] p-4">
                  <p className="text-sm text-[#AD526F]">Total</p>
                  <p className="text-2xl font-bold text-[#A84E6C] break-words">
                    {formatoMoneda(detalleCompra.total)}
                  </p>
                </div>

                <div className="min-w-0 rounded-[1.3rem] border border-[#E5DCEC] bg-[#F0EBF6] p-4">
                  <p className="text-sm text-[#826A9A]">Pagado</p>
                  <p className="text-2xl font-bold text-[#765D8D] break-words">
                    {formatoMoneda(detalleCompra.monto_pagado)}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4 min-w-0">
                  <p className="text-sm text-red-600">Saldo</p>
                  <p className="text-2xl font-bold text-red-700 break-words">
                    {formatoMoneda(detalleCompra.saldo)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                  <p className="text-sm text-[#8C777F]">Método</p>
                  <p className="font-bold text-[#43353A] break-words">
                    {detalleCompra.metodo_pago}
                  </p>
                </div>
              </section>

              {detalleCompra.estado === 'PENDIENTE' && (
                <section className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-amber-800">Compra pendiente editable</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Puedes editar esta compra mientras siga en estado pendiente.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => editarCompra(detalleCompra.id_compra)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-600 text-white hover:bg-amber-700 font-bold transition"
                  >
                    <Pencil size={18} />
                    Editar compra
                  </button>
                </section>
              )}

              {puedeCancelarCompra(detalleCompra) && (
                <section className="rounded-2xl bg-red-50 border border-red-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-red-800">Compra pendiente de seguimiento</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Puedes cancelar esta compra si ya no se va a pagar o si fue capturada por error.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => cancelarCompra(detalleCompra)}
                    disabled={cancelandoId === detalleCompra.id_compra}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-bold transition disabled:opacity-60"
                  >
                    <Ban size={18} />
                    {cancelandoId === detalleCompra.id_compra ? 'Cancelando...' : 'Cancelar compra'}
                  </button>
                </section>
              )}

              {detalleCompra.ticket_proveedor_url && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="text-[#A84E6C] shrink-0" size={22} />
                    <h3 className="text-lg font-bold text-[#43353A]">
                      Ticket / comprobante
                    </h3>
                  </div>

                  <a
                    href={obtenerUrlTicket(detalleCompra.ticket_proveedor_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#FFF2F5] text-[#A84E6C] hover:bg-[#FBEAF0] font-bold transition"
                  >
                    <Eye size={18} />
                    Ver ticket
                  </a>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="text-[#A84E6C] shrink-0" size={22} />
                  <h3 className="text-lg font-bold text-[#43353A]">
                    Productos comprados
                  </h3>
                </div>

                {detalleProductos.length === 0 ? (
                  <div className="rounded-2xl bg-[#FFFAFB] p-5 text-center text-[#8C777F]">
                    Esta compra no tiene productos capturados.
                  </div>
                ) : (
                  <>
                    <div className="md:hidden space-y-3">
                      {detalleProductos.map((item) => (
                        <div key={item.id_detalle} className="rounded-2xl border border-[#F0E4E8] p-4 bg-white">
                          <p className="font-bold text-[#43353A] break-words">{item.producto}</p>
                          {item.id_variante && (
                            <p className="mt-1 text-sm font-bold text-[#A84E6C]">
                              Variante: {obtenerEtiquetaVariante(item)}
                            </p>
                          )}
                          {item.id_variante && (
                            <p className="text-xs text-[#8C777F] mt-1">
                              SKU / código: {item.sku_variante || item.codigo_barras_variante || '—'}
                            </p>
                          )}
                          {esVerdadero(item.controla_lotes) && (
                            <p className="text-xs text-[#8C777F] mt-1">
                              Lote: {item.lote || '—'}
                            </p>
                          )}
                          {esVerdadero(item.controla_caducidad) && (
                            <p className="text-xs text-[#8C777F] mt-1">
                              Caducidad: {formatoFechaSimple(item.fecha_caducidad)}
                            </p>
                          )}

                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-xl bg-[#FFFAFB] p-3">
                              <p className="text-xs text-[#8C777F]">Cantidad</p>
                              <p className="font-bold text-[#43353A]">{formatoNumero(item.cantidad)}</p>
                            </div>
                            <div className="rounded-xl bg-[#FFFAFB] p-3">
                              <p className="text-xs text-[#8C777F]">Precio</p>
                              <p className="font-bold text-[#43353A]">{formatoMoneda(item.precio_compra)}</p>
                            </div>
                            <div className="rounded-xl bg-red-50 p-3">
                              <p className="text-xs text-red-600">Descuento</p>
                              <p className="font-bold text-red-700">{formatoMoneda(item.descuento)}</p>
                            </div>
                            <div className="rounded-xl bg-[#FFF2F5] p-3">
                              <p className="text-xs text-[#AD526F]">Subtotal</p>
                              <p className="font-bold text-[#A84E6C]">{formatoMoneda(item.subtotal)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#F0E4E8]">
                      <table className="w-full min-w-[850px]">
                        <thead className="bg-[#FFFAFB]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Producto / variante</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">SKU / código</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Lote</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Caducidad</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">Cantidad</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">Precio</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">Desc.</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F5EAED]">
                          {detalleProductos.map((item) => (
                            <tr key={item.id_detalle}>
                              <td className="px-4 py-3 font-semibold text-[#43353A]">
                                <div>{item.producto}</div>
                                {item.id_variante && (
                                  <div className="mt-1 text-xs font-bold text-[#A84E6C]">
                                    {obtenerEtiquetaVariante(item)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[#766168]">
                                {item.sku_variante || item.codigo_barras_variante || '—'}
                              </td>
                              <td className="px-4 py-3 text-[#766168]">
                                {esVerdadero(item.controla_lotes) ? item.lote || '—' : 'No aplica'}
                              </td>
                              <td className="px-4 py-3 text-[#766168]">
                                {esVerdadero(item.controla_caducidad)
                                  ? formatoFechaSimple(item.fecha_caducidad)
                                  : 'No aplica'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-[#43353A]">{formatoNumero(item.cantidad)}</td>
                              <td className="px-4 py-3 text-right text-[#66535A]">{formatoMoneda(item.precio_compra)}</td>
                              <td className="px-4 py-3 text-right text-red-700">{formatoMoneda(item.descuento)}</td>
                              <td className="px-4 py-3 text-right font-bold text-[#A84E6C]">{formatoMoneda(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="text-[#A84E6C] shrink-0" size={22} />
                  <h3 className="text-lg font-bold text-[#43353A]">
                    Pagos registrados
                  </h3>
                </div>

                {detallePagos.length === 0 ? (
                  <div className="rounded-2xl bg-[#FFFAFB] p-5 text-center text-[#8C777F]">
                    Esta compra no tiene pagos registrados.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#F0E4E8]">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-[#FFFAFB]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Método</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Caja</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">Usuario</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F5EAED]">
                        {detallePagos.map((pago) => (
                          <tr key={pago.id_pago || `${pago.fecha_pago}-${pago.monto}`}>
                            <td className="px-4 py-3 text-[#766168]">{formatoFecha(pago.fecha_pago)}</td>
                            <td className="px-4 py-3 font-semibold text-[#43353A]">{pago.metodo_pago || '—'}</td>
                            <td className="px-4 py-3 text-[#766168]">{pago.caja || '—'}</td>
                            <td className="px-4 py-3 text-[#766168]">{pago.usuario || '—'}</td>
                            <td className="px-4 py-3 text-right font-bold text-[#A84E6C]">{formatoMoneda(pago.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {detalleCompra.observaciones && (
                <section className="rounded-2xl bg-[#FFFAFB] p-4">
                  <p className="text-sm text-[#8C777F]">Observaciones</p>
                  <p className="font-semibold text-[#43353A] mt-1 whitespace-pre-wrap">
                    {detalleCompra.observaciones}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputFilterClass =
  'w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

const inputModalClass =
  'w-full min-w-0 rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

function CompraKpi({
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

      <p className="mt-2 text-[11px] font-semibold text-[#AA939B]">
        {detalle}
      </p>
    </div>
  );
}

