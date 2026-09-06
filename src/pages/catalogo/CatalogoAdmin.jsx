import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Plus,
  Search,
  RefreshCw,
  ImagePlus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  Package,
  X,
  Save,
  AlertTriangle,
  Share2,
  Globe2,
  MessageCircle,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Phone,
  Sparkles,
  ShoppingBag,
  BadgePercent,
} from 'lucide-react';
import api from '../../api/axios';

const formatearPrecio = (valor) => {
  const numero = Number(valor || 0);

  return numero.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
};

const estadoInicialFormulario = {
  id_catalogo: null,
  id_producto: '',
  titulo_catalogo: '',
  descripcion_catalogo: '',
  activo: true,
  destacado: false,
  mostrar_stock: true,
  orden: 0,
  galeria: [],
};


const configuracionRedes = {
  FACEBOOK: {
    abreviatura: 'f',
    claseIcono: 'bg-[#F0EBF6] text-[#765D8D] border-[#E5DCEC]',
    placeholder: 'https://www.facebook.com/tu-pagina',
  },
  INSTAGRAM: {
    abreviatura: 'IG',
    claseIcono: 'bg-[#FFF0F5] text-[#B24970] border-[#F1D5E0]',
    placeholder: 'https://www.instagram.com/tu-cuenta',
  },
  WHATSAPP: {
    abreviatura: 'WA',
    claseIcono: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    placeholder: 'https://wa.me/5215555555555',
  },
  TIKTOK: {
    abreviatura: 'TT',
    claseIcono: 'bg-[#F8EDF1] text-[#43353A] border-[#EEDFE4]',
    placeholder: 'https://www.tiktok.com/@tu-cuenta',
  },
  X: {
    abreviatura: 'X',
    claseIcono: 'bg-[#F8EDF1] text-[#342A2E] border-[#EEDFE4]',
    placeholder: 'https://x.com/tu-cuenta',
  },
  YOUTUBE: {
    abreviatura: 'YT',
    claseIcono: 'bg-red-50 text-red-700 border-red-100',
    placeholder: 'https://www.youtube.com/@tu-canal',
  },
};

const obtenerConfiguracionRed = (clave) => {
  return (
    configuracionRedes[clave] || {
      abreviatura: 'WEB',
      claseIcono: 'bg-[#F8EDF1] text-[#66535A] border-[#EEDFE4]',
      placeholder: 'https://ejemplo.com',
    }
  );
};

const IconoRedSocial = ({ clave, size = 20 }) => {
  if (clave === 'WHATSAPP') return <MessageCircle size={size} />;
  if (clave === 'GOOGLE_MAPS') return <MapPin size={size} />;
  if (clave === 'FACEBOOK' || clave === 'INSTAGRAM') return <Globe2 size={size} />;
  return <Share2 size={size} />;
};

export default function CatalogoAdmin() {
  const [catalogo, setCatalogo] = useState([]);
  const [productosDisponibles, setProductosDisponibles] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [formulario, setFormulario] = useState(estadoInicialFormulario);

  const [modalRedesAbierto, setModalRedesAbierto] = useState(false);
  const [redesSociales, setRedesSociales] = useState([]);
  const [cargandoRedes, setCargandoRedes] = useState(false);
  const [guardandoRedes, setGuardandoRedes] = useState(false);

  const [sucursalesWhatsapp, setSucursalesWhatsapp] = useState([]);
  const [cargandoSucursalesWhatsapp, setCargandoSucursalesWhatsapp] = useState(false);

  const cargarCatalogo = async () => {
    try {
      setCargando(true);

      const { data } = await api.get('/catalogo');

      if (data.ok) {
        setCatalogo(data.catalogo || []);
      }
    } catch (error) {
      console.error('Error al cargar catálogo:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.mensaje || 'No se pudo cargar el catálogo',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarProductosDisponibles = async () => {
    try {
      const { data } = await api.get('/catalogo/productos-disponibles');

      if (data.ok) {
        setProductosDisponibles(data.productos || []);
      }
    } catch (error) {
      console.error('Error al cargar productos disponibles:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar los productos disponibles',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  useEffect(() => {
    cargarCatalogo();
    cargarProductosDisponibles();
  }, []);


  const cargarRedesSociales = async () => {
    try {
      setCargandoRedes(true);

      const { data } = await api.get('/catalogo/redes-sociales');

      if (data.ok) {
        setRedesSociales(data.redes_sociales || []);
      }
    } catch (error) {
      console.error('Error al cargar redes sociales:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las redes sociales del catálogo.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargandoRedes(false);
    }
  };

  const cargarSucursalesWhatsapp = async () => {
    try {
      setCargandoSucursalesWhatsapp(true);

      const { data } = await api.get('/catalogo/sucursales-whatsapp');

      if (data.ok) {
        setSucursalesWhatsapp(data.sucursales || []);
      } else {
        setSucursalesWhatsapp([]);
      }
    } catch (error) {
      console.error('Error al cargar sucursales de WhatsApp:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las sucursales para WhatsApp.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargandoSucursalesWhatsapp(false);
    }
  };

  const abrirModalRedes = async () => {
    setModalRedesAbierto(true);
    await Promise.all([cargarRedesSociales(), cargarSucursalesWhatsapp()]);
  };

  const cerrarModalRedes = () => {
    if (guardandoRedes) return;

    setModalRedesAbierto(false);
    setRedesSociales([]);
    setSucursalesWhatsapp([]);
  };

  const actualizarRedSocialLocal = (idRedSocial, campo, valor) => {
    setRedesSociales((prev) =>
      prev.map((red) =>
        Number(red.id_red_social) === Number(idRedSocial)
          ? { ...red, [campo]: valor }
          : red
      )
    );
  };

  const actualizarSucursalWhatsappLocal = (idSucursal, valor) => {
    setSucursalesWhatsapp((prev) =>
      prev.map((sucursal) =>
        Number(sucursal.id_sucursal) === Number(idSucursal)
          ? { ...sucursal, mostrar_whatsapp_catalogo: valor }
          : sucursal
      )
    );
  };

  const guardarRedesSociales = async () => {
    const redesActivasSinUrl = redesSociales.filter(
      (red) =>
        red.clave !== 'WHATSAPP' &&
        red.activo &&
        !String(red.url || '').trim()
    );

    if (redesActivasSinUrl.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Faltan enlaces',
        text: `Captura un enlace válido para: ${redesActivasSinUrl
          .map((red) => red.nombre)
          .join(', ')}.`,
        confirmButtonColor: '#AD526F',
      });
      return;
    }

    try {
      setGuardandoRedes(true);

      for (const red of redesSociales) {
        const { data } = await api.put(
          `/catalogo/redes-sociales/${red.id_red_social}`,
          {
            url:
              red.clave === 'WHATSAPP'
                ? null
                : String(red.url || '').trim() || null,
            activo: Boolean(red.activo),
            orden:
              red.orden === '' || red.orden === null || red.orden === undefined
                ? 0
                : Number(red.orden),
          }
        );

        if (!data?.ok) {
          throw new Error(
            data?.mensaje || `No se pudo guardar ${red.nombre}.`
          );
        }
      }

      for (const sucursal of sucursalesWhatsapp) {
        const { data } = await api.put(
          `/catalogo/sucursales-whatsapp/${sucursal.id_sucursal}`,
          {
            mostrar_whatsapp_catalogo: Boolean(
              sucursal.mostrar_whatsapp_catalogo
            ),
          }
        );

        if (!data?.ok) {
          throw new Error(
            data?.mensaje ||
            `No se pudo actualizar la sucursal ${sucursal.nombre}.`
          );
        }
      }

      await Promise.all([cargarRedesSociales(), cargarSucursalesWhatsapp()]);

      Swal.fire({
        icon: 'success',
        title: 'Redes sociales actualizadas',
        text: 'La configuración de redes y sucursales se guardó correctamente.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error al guardar redes sociales:', error);

      Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar',
        text:
          error.response?.data?.mensaje ||
          error.message ||
          'No se pudieron actualizar las redes sociales.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardandoRedes(false);
    }
  };

  const catalogoFiltrado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return catalogo;

    return catalogo.filter((item) => {
      return (
        item.titulo_catalogo?.toLowerCase().includes(texto) ||
        item.nombre_producto?.toLowerCase().includes(texto) ||
        item.codigo_barras?.toLowerCase().includes(texto) ||
        item.nombre_categoria?.toLowerCase().includes(texto) ||
        item.marca?.toLowerCase().includes(texto)
      );
    });
  }, [catalogo, busqueda]);

  const productosFiltrados = useMemo(() => {
    const texto = busquedaProducto.trim().toLowerCase();

    if (!texto) return productosDisponibles;

    return productosDisponibles.filter((producto) => {
      return (
        producto.nombre?.toLowerCase().includes(texto) ||
        producto.codigo_barras?.toLowerCase().includes(texto) ||
        producto.nombre_categoria?.toLowerCase().includes(texto) ||
        producto.marca?.toLowerCase().includes(texto) ||
        producto.presentacion?.toLowerCase().includes(texto)
      );
    });
  }, [productosDisponibles, busquedaProducto]);

  const abrirModalNuevo = () => {
    setModoEdicion(false);
    setFormulario(estadoInicialFormulario);
    setBusquedaProducto('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (producto) => {
    setModoEdicion(true);

    const imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];

    setFormulario({
      id_catalogo: producto.id_catalogo,
      id_producto: producto.id_producto,
      titulo_catalogo: producto.titulo_catalogo || '',
      descripcion_catalogo: producto.descripcion_catalogo || '',
      activo: producto.activo === true,
      destacado: producto.destacado === true,
      mostrar_stock: producto.mostrar_stock === true,
      orden: producto.orden || 0,
      galeria: imagenes.length > 0
        ? imagenes.map((imagen, indice) => ({
            tipo: imagen.id_imagen ? 'existente' : 'legacy',
            id_imagen: imagen.id_imagen || null,
            imagen_url: imagen.imagen_url,
            preview: imagen.imagen_url,
            es_principal: Boolean(imagen.es_principal),
            orden: Number(imagen.orden ?? indice),
          }))
        : producto.imagen_url
          ? [{
              tipo: 'legacy',
              id_imagen: null,
              imagen_url: producto.imagen_url,
              preview: producto.imagen_url,
              es_principal: true,
              orden: 0,
            }]
          : [],
    });

    setBusquedaProducto('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setModalAbierto(false);
    setModoEdicion(false);
    setFormulario(estadoInicialFormulario);
  };

  const manejarCambio = (campo, valor) => {
    setFormulario((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const manejarImagenes = (e) => {
    const archivos = Array.from(e.target.files || []);

    if (archivos.length === 0) return;

    const invalidos = archivos.filter((archivo) => !archivo.type.startsWith('image/'));

    if (invalidos.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo no válido',
        text: 'Todos los archivos seleccionados deben ser imágenes.',
        confirmButtonColor: '#AD526F',
      });
      e.target.value = '';
      return;
    }

    setFormulario((prev) => {
      const disponibles = Math.max(8 - prev.galeria.length, 0);
      const seleccionados = archivos.slice(0, disponibles);
      const tienePrincipal = prev.galeria.some((imagen) => imagen.es_principal);

      const nuevos = seleccionados.map((archivo, indice) => ({
        tipo: 'nueva',
        temp_id: `${Date.now()}-${indice}-${archivo.name}`,
        archivo,
        preview: URL.createObjectURL(archivo),
        es_principal: !tienePrincipal && indice === 0,
        orden: prev.galeria.length + indice,
      }));

      return {
        ...prev,
        galeria: [...prev.galeria, ...nuevos].map((imagen, indice) => ({
          ...imagen,
          orden: indice,
        })),
      };
    });

    e.target.value = '';
  };

  const eliminarImagenGaleria = (indice) => {
    setFormulario((prev) => {
      const eliminada = prev.galeria[indice];
      const galeria = prev.galeria.filter((_, i) => i !== indice);

      if (eliminada?.tipo === 'nueva' && eliminada.preview) {
        URL.revokeObjectURL(eliminada.preview);
      }

      if (eliminada?.es_principal && galeria.length > 0) {
        galeria[0] = { ...galeria[0], es_principal: true };
      }

      return {
        ...prev,
        galeria: galeria.map((imagen, i) => ({ ...imagen, orden: i })),
      };
    });
  };

  const marcarImagenPrincipal = (indice) => {
    setFormulario((prev) => ({
      ...prev,
      galeria: prev.galeria.map((imagen, i) => ({
        ...imagen,
        es_principal: i === indice,
      })),
    }));
  };

  const moverImagenGaleria = (indice, direccion) => {
    setFormulario((prev) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= prev.galeria.length) return prev;

      const galeria = [...prev.galeria];
      [galeria[indice], galeria[destino]] = [galeria[destino], galeria[indice]];

      return {
        ...prev,
        galeria: galeria.map((imagen, i) => ({ ...imagen, orden: i })),
      };
    });
  };

  const seleccionarProducto = (producto) => {
    if (modoEdicion) return;

    if (producto.ya_en_catalogo) {
      Swal.fire({
        icon: 'info',
        title: 'Producto ya agregado',
        text: 'Este producto ya forma parte del catálogo.',
        confirmButtonColor: '#AD526F',
      });
      return;
    }

    setFormulario((prev) => ({
      ...prev,
      id_producto: producto.id_producto,
      titulo_catalogo: producto.nombre || '',
      descripcion_catalogo: producto.descripcion || '',
    }));
  };

  const productoSeleccionado = useMemo(() => {
    return productosDisponibles.find(
      (producto) => Number(producto.id_producto) === Number(formulario.id_producto)
    );
  }, [productosDisponibles, formulario.id_producto]);

  const guardarProductoCatalogo = async (e) => {
    e.preventDefault();

    if (!formulario.id_producto) {
      Swal.fire({
        icon: 'warning',
        title: 'Producto obligatorio',
        text: 'Selecciona un producto del inventario.',
        confirmButtonColor: '#AD526F',
      });
      return;
    }

    try {
      setGuardando(true);

      const formData = new FormData();

      formData.append('id_producto', formulario.id_producto);
      formData.append('titulo_catalogo', formulario.titulo_catalogo);
      formData.append('descripcion_catalogo', formulario.descripcion_catalogo);
      formData.append('activo', formulario.activo);
      formData.append('destacado', formulario.destacado);
      formData.append('mostrar_stock', formulario.mostrar_stock);
      formData.append('orden', formulario.orden || 0);

      const nuevas = formulario.galeria.filter((imagen) => imagen.tipo === 'nueva');
      nuevas.forEach((imagen) => {
        formData.append('imagenes', imagen.archivo);
      });

      const metadataGaleria = formulario.galeria.map((imagen, indice) => {
        if (imagen.tipo === 'nueva') {
          return {
            tipo: 'nueva',
            archivo_index: nuevas.findIndex((item) => item.temp_id === imagen.temp_id),
            orden: indice,
            es_principal: Boolean(imagen.es_principal),
          };
        }

        if (imagen.tipo === 'legacy') {
          return {
            tipo: 'legacy',
            imagen_url: imagen.imagen_url,
            orden: indice,
            es_principal: Boolean(imagen.es_principal),
          };
        }

        return {
          tipo: 'existente',
          id_imagen: imagen.id_imagen,
          orden: indice,
          es_principal: Boolean(imagen.es_principal),
        };
      });

      formData.append('metadata_galeria', JSON.stringify(metadataGaleria));

      if (modoEdicion) {
        await api.put(`/catalogo/${formulario.id_catalogo}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'Producto actualizado en el catálogo.',
          timer: 1600,
          showConfirmButton: false,
        });
      } else {
        await api.post('/catalogo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        Swal.fire({
          icon: 'success',
          title: 'Agregado',
          text: 'Producto agregado al catálogo.',
          timer: 1600,
          showConfirmButton: false,
        });
      }

      cerrarModal();
      await cargarCatalogo();
      await cargarProductosDisponibles();
    } catch (error) {
      console.error('Error al guardar producto:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar el producto en el catálogo.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (producto) => {
    try {
      const nuevoEstado = !producto.activo;

      await api.patch(`/catalogo/${producto.id_catalogo}/estado`, {
        activo: nuevoEstado,
      });

      await cargarCatalogo();

      Swal.fire({
        icon: 'success',
        title: nuevoEstado ? 'Producto activado' : 'Producto desactivado',
        timer: 1300,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo cambiar el estado del producto.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  const eliminarProducto = async (producto) => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar del catálogo?',
      text: `Se eliminará "${producto.titulo_catalogo || producto.nombre_producto}" del catálogo público.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      await api.delete(`/catalogo/${producto.id_catalogo}`);

      await cargarCatalogo();
      await cargarProductosDisponibles();

      Swal.fire({
        icon: 'success',
        title: 'Eliminado',
        text: 'Producto eliminado del catálogo.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo eliminar el producto del catálogo.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <style>
        {`
        .swal2-container {
          z-index: 10050 !important;
        }

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

      {/* Header */}
      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F] sm:h-14 sm:w-14">
              <ShoppingBag size={26} />
            </div>

            <div className="min-w-0">
             

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Administración del catálogo
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D] sm:text-base">
                Publica productos de moda y belleza, administra imágenes,
                ofertas, disponibilidad y canales de contacto.
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
            <button
              type="button"
              onClick={abrirModalRedes}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F8EDF1] px-5 py-3 font-black text-[#80606B] transition hover:bg-[#F2DDE4]"
            >
              <Share2 size={19} />
              Redes y contacto
            </button>

            <button
              type="button"
              onClick={abrirModalNuevo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.23)] transition hover:-translate-y-0.5 hover:bg-[#8B3F5B]"
            >
              <Plus size={19} />
              Agregar producto
            </button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CatalogoKpi
          titulo="Productos publicados"
          valor={catalogo.length}
          detalle="En el catálogo digital"
          icono={ShoppingBag}
          claseIcono="bg-[#FBEAF0] text-[#AD526F]"
        />

        <CatalogoKpi
          titulo="Visibles"
          valor={catalogo.filter((item) => item.activo).length}
          detalle="Disponibles al público"
          icono={Eye}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <CatalogoKpi
          titulo="Destacados"
          valor={catalogo.filter((item) => item.destacado).length}
          detalle="Con mayor exposición"
          icono={Star}
          claseIcono="bg-amber-50 text-amber-700"
        />

        <CatalogoKpi
          titulo="Con oferta activa"
          valor={catalogo.filter((item) => item.tiene_oferta).length}
          detalle="Precio promocional"
          icono={BadgePercent}
          claseIcono="bg-red-50 text-red-700"
        />
      </section>

      {/* Filtros */}
      <section className="bg-white rounded-[2rem] border border-[#F0E4E8] shadow-[0_12px_40px_rgba(118,76,91,0.05)] p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA939B]"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por producto, categoría, código o marca..."
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              cargarCatalogo();
              cargarProductosDisponibles();
              if (modalRedesAbierto) {
                cargarRedesSociales();
                cargarSucursalesWhatsapp();
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#44353B] hover:bg-[#35292E] text-white font-black transition"
          >
            <RefreshCw size={19} />
            Actualizar
          </button>
        </div>
      </section>

      {/* Tabla */}
      <section className="bg-white rounded-[2rem] border border-[#F0E4E8] shadow-[0_12px_40px_rgba(118,76,91,0.05)] overflow-hidden">
        <div className="p-5 border-b border-[#F0E4E8] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#342A2E]">
              Productos publicados
            </h2>
            <p className="text-sm text-[#8C777F] font-semibold">
              {catalogoFiltrado.length} resultado(s)
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#8C777F]">
            <RefreshCw size={34} className="animate-spin text-[#AD526F]" />
            <p className="mt-3 font-bold">Cargando catálogo...</p>
          </div>
        ) : catalogoFiltrado.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-20 h-20 rounded-[1.6rem] bg-[#F8EDF1] text-[#AA939B] flex items-center justify-center">
              <Package size={42} />
            </div>
            <h3 className="mt-4 text-xl font-black text-[#342A2E]">
              Sin productos en catálogo
            </h3>
            <p className="mt-1 text-[#8C777F]">
              Agrega productos para que aparezcan en el catálogo público.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-sm">
              <thead className="bg-[#FFFAFB] border-b border-[#F0E4E8]">
                <tr>
                  <th className="text-left px-5 py-4 font-black text-[#766168]">
                    Producto
                  </th>
                  <th className="text-left px-5 py-4 font-black text-[#766168]">
                    Categoría
                  </th>
                  <th className="text-left px-5 py-4 font-black text-[#766168]">
                    Precio
                  </th>
                  <th className="text-left px-5 py-4 font-black text-[#766168]">
                    Oferta
                  </th>
                  <th className="text-left px-5 py-4 font-black text-[#766168]">
                    Estado
                  </th>
                  <th className="text-left px-5 py-4 font-black text-[#766168]">
                    Opciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F5EAED]">
                {catalogoFiltrado.map((producto) => {
                  const nombre =
                    producto.titulo_catalogo || producto.nombre_producto;

                  return (
                    <tr key={producto.id_catalogo} className="hover:bg-[#FFFAFB]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-[#FFF2F5] border border-[#F0E4E8] flex items-center justify-center overflow-hidden">
                            {producto.imagen_url ? (
                              <img
                                src={producto.imagen_url}
                                alt={nombre}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ShoppingBag size={25} className="text-[#AD526F]" />
                            )}
                          </div>

                          <div>
                            <p className="font-black text-[#342A2E]">
                              {nombre}
                            </p>
                            <p className="text-xs text-[#8C777F] font-semibold">
                              {producto.codigo_barras || 'Sin código'}
                            </p>
                            <p className="text-xs text-[#AA939B]">
                              {producto.presentacion || 'Sin presentación'}
                            </p>

                            {producto.marca && (
                              <p className="mt-0.5 text-[11px] font-semibold text-[#9B858D]">
                                {producto.marca}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex px-3 py-1 rounded-xl bg-[#FFF2F5] text-[#A84E6C] border border-[#F0D4DE] text-xs font-black">
                          {producto.nombre_categoria || 'Sin categoría'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {producto.tiene_oferta ? (
                          <div>
                            <p className="text-xs text-[#AA939B] line-through font-bold">
                              {formatearPrecio(producto.precio_venta)}
                            </p>
                            <p className="font-black text-red-600">
                              {formatearPrecio(producto.precio_final)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-black text-[#A84E6C]">
                            {formatearPrecio(producto.precio_venta)}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {producto.tiene_oferta ? (
                          <span className="inline-flex px-3 py-1 rounded-xl bg-red-50 text-red-700 border border-red-100 text-xs font-black">
                            -{Number(producto.porcentaje_descuento || 0)}%
                          </span>
                        ) : (
                          <span className="text-[#AA939B] font-semibold">
                            Sin oferta
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {producto.activo ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black">
                              <Eye size={13} />
                              Visible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#F8EDF1] text-[#8C777F] border border-[#EEDFE4] text-xs font-black">
                              <EyeOff size={13} />
                              Oculto
                            </span>
                          )}

                          {producto.destacado && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-xs font-black">
                              <Star size={13} />
                              Destacado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(producto)}
                            className="w-9 h-9 rounded-xl bg-[#FFF2F5] text-[#A84E6C] hover:bg-[#F5DDE5] flex items-center justify-center transition"
                            title="Editar"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(producto)}
                            className="w-9 h-9 rounded-xl bg-[#FFFAFB] text-[#66535A] hover:bg-[#F8EDF1] flex items-center justify-center transition"
                            title={producto.activo ? 'Ocultar' : 'Mostrar'}
                          >
                            {producto.activo ? (
                              <EyeOff size={17} />
                            ) : (
                              <Eye size={17} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarProducto(producto)}
                            className="w-9 h-9 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition"
                            title="Eliminar"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal redes sociales */}
      {modalRedesAbierto && (
        <div className="fixed inset-0 z-[9998] bg-[#33272C]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
            <div className="sticky top-0 z-20 bg-white border-b border-[#F0E4E8] p-5 flex items-start justify-between gap-4 rounded-t-[2rem]">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-xs font-black text-[#A84E6C]">
                  <Share2 size={18} />
                  Redes sociales y contacto
                </div>
                <h2 className="mt-3 text-2xl font-black text-[#342A2E]">
                  Configuración pública del catálogo
                </h2>
                <p className="mt-1 text-sm text-[#8C777F] font-semibold">
                  Captura el enlace de cada red y activa únicamente los botones que deseas mostrar a tus clientes.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalRedes}
                disabled={guardandoRedes}
                className="w-11 h-11 rounded-2xl bg-[#F8EDF1] hover:bg-red-50 text-[#766168] hover:text-red-600 flex items-center justify-center transition disabled:opacity-60 shrink-0"
                title="Cerrar"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-5 lg:p-6">
              <div className="mb-5 rounded-[1.6rem] border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 text-amber-800">
                <AlertTriangle size={21} className="mt-0.5 shrink-0" />
                <p className="text-sm font-semibold leading-relaxed">
                  Una red solo se mostrará en el catálogo público cuando tenga un enlace válido y esté marcada como visible.
                </p>
              </div>

              {cargandoRedes ? (
                <div className="py-16 flex flex-col items-center justify-center text-[#8C777F]">
                  <Loader2 size={34} className="animate-spin text-[#AD526F]" />
                  <p className="mt-3 font-bold">Cargando redes sociales...</p>
                </div>
              ) : redesSociales.length === 0 ? (
                <div className="rounded-[1.6rem] bg-[#FFFAFB] border border-[#F0E4E8] px-5 py-10 text-center">
                  <Share2 size={38} className="mx-auto text-[#AA939B]" />
                  <p className="mt-3 font-black text-[#66535A]">
                    No hay redes sociales configuradas.
                  </p>

                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {redesSociales.map((red) => {
                    const configuracion = obtenerConfiguracionRed(red.clave);
                    const tieneUrl = Boolean(String(red.url || '').trim());
                    const esWhatsapp = red.clave === 'WHATSAPP';
                    const tieneSucursalWhatsappVisible = sucursalesWhatsapp.some(
                      (sucursal) =>
                        sucursal.activo &&
                        sucursal.telefono_valido &&
                        sucursal.mostrar_whatsapp_catalogo
                    );
                    const redListaParaMostrarse = esWhatsapp
                      ? tieneSucursalWhatsappVisible
                      : tieneUrl;

                    return (
                      <article
                        key={red.id_red_social}
                        className={`rounded-[1.6rem] border p-4 transition ${red.activo
                            ? 'border-[#E8C3CF] bg-[#FFF7F9]'
                            : 'border-[#EEDFE4] bg-white'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-2xl border flex items-center justify-center font-black text-xs shrink-0 ${configuracion.claseIcono}`}
                            >
                              {red.clave === 'WHATSAPP' || red.clave === 'GOOGLE_MAPS' ? (
                                <IconoRedSocial clave={red.clave} size={21} />
                              ) : (
                                configuracion.abreviatura
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-black text-[#342A2E] truncate">
                                {red.nombre}
                              </p>
                              <p className="text-xs text-[#8C777F] font-semibold truncate">
                                {red.clave}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              actualizarRedSocialLocal(
                                red.id_red_social,
                                'activo',
                                !red.activo
                              )
                            }
                            disabled={guardandoRedes}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:opacity-60 ${red.activo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-[#F8EDF1] text-[#8C777F] border-[#EEDFE4] hover:bg-[#EFE5E8]'
                              }`}
                          >
                            {red.activo ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                            {red.activo ? 'Visible' : 'Oculto'}
                          </button>
                        </div>

                        {red.clave === 'WHATSAPP' ? (
                          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                            <p className="text-sm font-black text-emerald-800">
                              Enlace dinámico por sucursal
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-relaxed text-emerald-700">
                              El catálogo generará los enlaces usando el teléfono de cada sucursal habilitada en la sección inferior.
                            </p>
                          </div>
                        ) : (
                          <label className="block mt-4">
                            <span className="text-xs font-black uppercase tracking-wide text-[#8C777F]">
                              Enlace público
                            </span>
                            <div className="relative mt-1.5">
                              <Globe2
                                size={18}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AA939B]"
                              />
                              <input
                                type="url"
                                value={red.url || ''}
                                onChange={(e) =>
                                  actualizarRedSocialLocal(
                                    red.id_red_social,
                                    'url',
                                    e.target.value
                                  )
                                }
                                disabled={guardandoRedes}
                                placeholder={configuracion.placeholder}
                                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-[#EEDFE4] bg-white focus:outline-none focus:ring-2 focus:ring-[#F3CAD6] focus:border-[#D58AA2] text-sm font-semibold text-[#66535A] disabled:bg-[#F8EDF1] disabled:cursor-not-allowed"
                              />

                              {tieneUrl && (
                                <a
                                  href={red.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-[#FFF2F5] text-[#A84E6C] hover:bg-[#F5DDE5] flex items-center justify-center transition"
                                  title="Abrir enlace"
                                >
                                  <ExternalLink size={16} />
                                </a>
                              )}
                            </div>
                          </label>
                        )}

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <label className="block w-28">
                            <span className="text-xs font-black uppercase tracking-wide text-[#8C777F]">
                              Orden
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={red.orden ?? 0}
                              onChange={(e) =>
                                actualizarRedSocialLocal(
                                  red.id_red_social,
                                  'orden',
                                  e.target.value
                                )
                              }
                              disabled={guardandoRedes}
                              className="mt-1.5 w-full px-3 py-2.5 rounded-2xl border border-[#EEDFE4] bg-white focus:outline-none focus:ring-2 focus:ring-[#F3CAD6] text-sm font-black text-[#66535A] disabled:bg-[#F8EDF1]"
                            />
                          </label>

                          <div className="text-right">
                            <p className="text-xs font-black text-[#8C777F]">Estado público</p>
                            <p className={`mt-1 text-sm font-black ${red.activo && redListaParaMostrarse ? 'text-emerald-700' : 'text-[#AA939B]'}`}>
                              {red.activo && redListaParaMostrarse
                                ? 'Se mostrará'
                                : 'No se mostrará'}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {redesSociales.some((red) => red.clave === 'WHATSAPP') && (
                <section className="mt-5 rounded-[1.75rem] border border-emerald-100 bg-emerald-50/40 p-4 lg:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                        <MessageCircle size={21} />
                      </div>
                      <div>
                        <h3 className="font-black text-[#342A2E]">
                          Sucursales disponibles para WhatsApp
                        </h3>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-[#766168]">
                          Activa las sucursales que podrán elegir los clientes. El enlace se genera con el teléfono registrado en cada sucursal.
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex w-fit items-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700">
                      {sucursalesWhatsapp.filter((sucursal) => sucursal.mostrar_whatsapp_catalogo).length} visible(s)
                    </span>
                  </div>

                  {cargandoSucursalesWhatsapp ? (
                    <div className="py-10 flex flex-col items-center justify-center text-[#8C777F]">
                      <Loader2 size={30} className="animate-spin text-emerald-600" />
                      <p className="mt-3 text-sm font-bold">Cargando sucursales...</p>
                    </div>
                  ) : sucursalesWhatsapp.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white/80 px-4 py-7 text-center text-sm font-semibold text-[#8C777F]">
                      No hay sucursales registradas para configurar.
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {sucursalesWhatsapp.map((sucursal) => {
                        const puedeMostrarse = Boolean(
                          sucursal.activo && sucursal.telefono_valido
                        );
                        const estaVisible = Boolean(
                          sucursal.mostrar_whatsapp_catalogo
                        );


                        return (
                          <article
                            key={sucursal.id_sucursal}
                            className={`rounded-2xl border p-4 transition ${estaVisible
                                ? 'border-emerald-200 bg-white shadow-[0_12px_40px_rgba(118,76,91,0.05)]'
                                : 'border-emerald-100 bg-white/70'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-black text-[#342A2E]">
                                  {sucursal.nombre}
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-[#8C777F]">
                                  {sucursal.clave || 'Sin clave'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  actualizarSucursalWhatsappLocal(
                                    sucursal.id_sucursal,
                                    !estaVisible
                                  )
                                }
                                disabled={guardandoRedes || !puedeMostrarse}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-55 ${estaVisible
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'border-[#EEDFE4] bg-[#F8EDF1] text-[#8C777F] hover:bg-[#EFE5E8]'
                                  }`}
                              >
                                {estaVisible ? <CheckCircle2 size={16} /> : <EyeOff size={16} />}
                                {estaVisible ? 'Visible' : 'Oculto'}
                              </button>
                            </div>

                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex items-start gap-2 text-[#766168]">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-[#AD526F]" />
                                <span className="whitespace-pre-line font-semibold">
                                  {sucursal.direccion || 'Sin dirección capturada'}
                                </span>
                              </div>

                              {sucursal.url_google_maps ? (
                                <a
                                  href={sucursal.url_google_maps}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#E8C3CF] bg-[#FFF2F5] px-3 py-2 text-xs font-black text-[#A84E6C] hover:bg-[#F5DDE5]"
                                >
                                  <MapPin size={15} />
                                  Ver ubicación configurada
                                </a>
                              ) : (
                                <p className="mt-3 text-xs font-bold text-[#AA939B]">
                                  Sin ubicación de Google Maps.
                                </p>
                              )}

                              <div className="flex items-center gap-2 text-[#766168]">
                                <Phone size={16} className="shrink-0 text-emerald-600" />
                                <span className="font-semibold">
                                  {sucursal.telefono || 'Sin teléfono capturado'}
                                </span>
                              </div>
                            </div>

                            {!sucursal.activo ? (
                              <p className="mt-3 rounded-xl bg-[#F8EDF1] px-3 py-2 text-xs font-bold text-[#8C777F]">
                                Esta sucursal está inactiva y no puede mostrarse.
                              </p>
                            ) : !sucursal.telefono_valido ? (
                              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                                Captura un teléfono mexicano válido de 10 dígitos en la sucursal para poder habilitarla.
                              </p>
                            ) : (
                              <p className="mt-3 text-xs font-bold text-emerald-700">
                                El cliente verá esta sucursal en el selector de WhatsApp.
                              </p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#F0E4E8] pt-5">                <button
                type="button"
                onClick={cerrarModalRedes}
                disabled={guardandoRedes}
                className="px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#EFE5E8] text-[#66535A] font-black transition disabled:opacity-60"
              >
                Cerrar
              </button>

                <button
                  type="button"
                  onClick={guardarRedesSociales}
                  disabled={guardandoRedes || cargandoRedes || redesSociales.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#AD526F] hover:bg-[#8B3F5B] text-white font-black shadow-lg shadow-[0_12px_28px_rgba(173,82,111,0.20)] transition disabled:opacity-60"
                >
                  {guardandoRedes ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Guardar redes sociales
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[9999] bg-[#33272C]/55 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="catalogo-modal-scroll w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 rounded-t-[2rem] border-b border-[#F2E5E9] bg-white p-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#AD526F]">
                  <ShoppingBag size={12} />
                  {modoEdicion ? 'Edición' : 'Nueva publicación'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034] sm:text-2xl">
                  {modoEdicion ? 'Editar producto del catálogo' : 'Agregar producto al catálogo'}
                </h2>

                <p className="mt-1 text-sm font-semibold leading-relaxed text-[#8A757D]">
                  Selecciona un producto y configura cómo se mostrará al público.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="w-11 h-11 rounded-2xl bg-[#F8EDF1] hover:bg-red-50 text-[#766168] hover:text-red-600 flex items-center justify-center transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={guardarProductoCatalogo} className="p-5 lg:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
                {/* Selector de producto */}
                <section className="space-y-4">
                  <div className="rounded-[1.6rem] border border-[#F0E4E8] bg-[#FFFAFB] p-4">
                    <h3 className="font-black text-[#342A2E]">
                      Producto del inventario
                    </h3>

                    {!modoEdicion && (
                      <div className="relative mt-4">
                        <Search
                          size={19}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA939B]"
                        />
                        <input
                          type="text"
                          value={busquedaProducto}
                          onChange={(e) => setBusquedaProducto(e.target.value)}
                          placeholder="Buscar producto..."
                          className="w-full rounded-2xl border border-[#EEDFE4] bg-white py-3 pl-11 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:ring-4 focus:ring-[#FBEAF0]"
                        />
                      </div>
                    )}

                    <div className="mt-4 max-h-[430px] overflow-y-auto catalogo-modal-scroll space-y-2 pr-1">
                      {modoEdicion && productoSeleccionado ? (
                        <div className="rounded-2xl border-2 border-[#E1A9BA] bg-white p-4">
                          <p className="font-black text-[#342A2E]">
                            {productoSeleccionado.nombre}
                          </p>
                          <p className="text-sm text-[#8C777F]">
                            {productoSeleccionado.codigo_barras}
                          </p>
                          <p className="text-sm text-[#A84E6C] font-black mt-1">
                            {formatearPrecio(productoSeleccionado.precio_venta)}
                          </p>
                        </div>
                      ) : (
                        productosFiltrados.map((producto) => {
                          const seleccionado =
                            Number(producto.id_producto) ===
                            Number(formulario.id_producto);

                          return (
                            <button
                              key={producto.id_producto}
                              type="button"
                              disabled={producto.ya_en_catalogo}
                              onClick={() => seleccionarProducto(producto)}
                              className={`w-full text-left rounded-2xl border p-4 transition ${seleccionado
                                  ? 'border-[#D987A3] bg-[#FFF2F5]'
                                  : producto.ya_en_catalogo
                                    ? 'border-[#EEDFE4] bg-[#F8EDF1] opacity-60 cursor-not-allowed'
                                    : 'border-[#EEDFE4] bg-white hover:border-[#E1A9BA] hover:bg-[#FFF2F5]'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-black text-[#342A2E]">
                                    {producto.nombre}
                                  </p>
                                  <p className="text-xs text-[#8C777F] font-semibold">
                                    {producto.codigo_barras || 'Sin código'}
                                  </p>
                                  <p className="text-xs text-[#AA939B]">
                                    {producto.nombre_categoria || 'Sin categoría'}
                                  </p>

                                  {producto.marca && (
                                    <p className="mt-0.5 text-[11px] font-semibold text-[#9B858D]">
                                      {producto.marca}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right">
                                  <p className="font-black text-[#A84E6C]">
                                    {formatearPrecio(producto.precio_venta)}
                                  </p>

                                  {producto.ya_en_catalogo ? (
                                    <span className="mt-1 inline-flex text-[11px] px-2 py-1 rounded-lg bg-[#EFE5E8] text-[#766168] font-black">
                                      Ya agregado
                                    </span>
                                  ) : (
                                    <span className="mt-1 inline-flex text-[11px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black">
                                      Disponible
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </section>

                {/* Formulario */}
                <section className="space-y-4">
                  {productoSeleccionado && (
                    <div className="rounded-[1.6rem] bg-[#FFF2F5] border border-[#F0D4DE] p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-[#A84E6C]">
                        Producto seleccionado
                      </p>
                      <h3 className="mt-1 text-xl font-black text-[#342A2E]">
                        {productoSeleccionado.nombre}
                      </h3>
                      <p className="text-sm text-[#8C777F]">
                        {productoSeleccionado.presentacion || 'Sin presentación'} ·{' '}
                        {productoSeleccionado.nombre_categoria || 'Sin categoría'}
                        {productoSeleccionado.marca
                          ? ` · ${productoSeleccionado.marca}`
                          : ''}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-sm font-black text-[#66535A]">
                        Título público
                      </span>
                      <input
                        type="text"
                        value={formulario.titulo_catalogo}
                        onChange={(e) =>
                          manejarCambio('titulo_catalogo', e.target.value)
                        }
                        placeholder="Ej. Vestido midi rosa / Labial mate tono nude"
                        className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                      />
                    </label>

                    <label className="space-y-1 md:col-span-2">
                      <span className="text-sm font-black text-[#66535A]">
                        Descripción pública
                      </span>
                      <textarea
                        value={formulario.descripcion_catalogo}
                        onChange={(e) =>
                          manejarCambio('descripcion_catalogo', e.target.value)
                        }
                        rows={3}
                        placeholder="Descripción que verá el cliente en el catálogo."
                        className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-sm font-black text-[#66535A]">
                        Orden
                      </span>
                      <input
                        type="number"
                        value={formulario.orden}
                        onChange={(e) => manejarCambio('orden', e.target.value)}
                        className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                      />
                    </label>

                    <div className="md:col-span-2 rounded-[1.6rem] border border-[#F0E4E8] bg-[#FFFAFB] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-[#66535A]">Variantes del producto</p>
                          <p className="mt-1 text-xs font-semibold text-[#9B848C]">
                            Las tallas, colores, tonos y presentaciones se toman automáticamente del producto.
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#AD526F]">
                          {(modoEdicion
                            ? catalogo.find((item) => Number(item.id_catalogo) === Number(formulario.id_catalogo))?.variantes
                            : productoSeleccionado?.variantes
                          )?.length || 0} variantes
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {((modoEdicion
                          ? catalogo.find((item) => Number(item.id_catalogo) === Number(formulario.id_catalogo))?.variantes
                          : productoSeleccionado?.variantes
                        ) || []).map((variante) => {
                          const etiqueta = [
                            variante.talla && `Talla ${variante.talla}`,
                            variante.color,
                            variante.tono && `Tono ${variante.tono}`,
                            variante.presentacion,
                          ].filter(Boolean).join(' · ') || variante.nombre_variante || 'Única';

                          return (
                            <span
                              key={variante.id_variante}
                              className="rounded-full border border-[#F0DCE3] bg-white px-3 py-1.5 text-xs font-black text-[#765D68]"
                            >
                              {etiqueta}
                              {Number(variante.stock_total || 0) > 0 ? ' · Disponible' : ' · Sin stock'}
                            </span>
                          );
                        })}

                        {((modoEdicion
                          ? catalogo.find((item) => Number(item.id_catalogo) === Number(formulario.id_catalogo))?.variantes
                          : productoSeleccionado?.variantes
                        ) || []).length === 0 && (
                          <span className="text-xs font-bold text-[#AA939B]">Sin variantes registradas.</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="text-sm font-black text-[#66535A]">
                            Galería del producto
                          </span>
                          <p className="mt-1 text-xs font-semibold text-[#9B848C]">
                            Puedes cargar hasta 8 imágenes, cambiar el orden y elegir la portada.
                          </p>
                        </div>

                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E1A9BA] bg-[#FFF2F5] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F5DDE5]">
                          <ImagePlus size={20} />
                          Agregar imágenes
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={manejarImagenes}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {formulario.galeria.length === 0 ? (
                        <div className="flex min-h-[180px] items-center justify-center rounded-[1.6rem] border border-[#F0E4E8] bg-[#FFFAFB] p-4">
                          <div className="text-center text-[#AA939B]">
                            <ImagePlus size={42} className="mx-auto" />
                            <p className="mt-2 font-bold">Sin imágenes</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {formulario.galeria.map((imagen, indice) => (
                            <div
                              key={imagen.id_imagen || imagen.temp_id || `${imagen.imagen_url}-${indice}`}
                              className={`relative overflow-hidden rounded-2xl border bg-white p-2 ${
                                imagen.es_principal
                                  ? 'border-[#AD526F] ring-2 ring-[#F7DCE4]'
                                  : 'border-[#F0E4E8]'
                              }`}
                            >
                              <div className="aspect-square overflow-hidden rounded-xl bg-[#FFFAFB]">
                                <img
                                  src={imagen.preview || imagen.imagen_url}
                                  alt={`Imagen ${indice + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              {imagen.es_principal && (
                                <div className="absolute left-3 top-3 rounded-full bg-[#AD526F] px-2 py-1 text-[10px] font-black text-white">
                                  PORTADA
                                </div>
                              )}

                              <div className="mt-2 grid grid-cols-4 gap-1">
                                <button
                                  type="button"
                                  onClick={() => moverImagenGaleria(indice, -1)}
                                  disabled={indice === 0}
                                  className="rounded-lg bg-[#F8EDF1] py-1.5 text-xs font-black text-[#765D68] disabled:opacity-30"
                                  title="Mover a la izquierda"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moverImagenGaleria(indice, 1)}
                                  disabled={indice === formulario.galeria.length - 1}
                                  className="rounded-lg bg-[#F8EDF1] py-1.5 text-xs font-black text-[#765D68] disabled:opacity-30"
                                  title="Mover a la derecha"
                                >
                                  →
                                </button>
                                <button
                                  type="button"
                                  onClick={() => marcarImagenPrincipal(indice)}
                                  className={`rounded-lg py-1.5 text-xs font-black ${
                                    imagen.es_principal
                                      ? 'bg-[#AD526F] text-white'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}
                                  title="Usar como portada"
                                >
                                  ★
                                </button>
                                <button
                                  type="button"
                                  onClick={() => eliminarImagenGaleria(indice)}
                                  className="rounded-lg bg-red-50 py-1.5 text-xs font-black text-red-700"
                                  title="Eliminar imagen"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => manejarCambio('activo', !formulario.activo)}
                      className={`rounded-2xl border px-4 py-3 font-black flex items-center justify-center gap-2 transition ${formulario.activo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-[#F8EDF1] text-[#8C777F] border-[#EEDFE4]'
                        }`}
                    >
                      {formulario.activo ? <Eye size={18} /> : <EyeOff size={18} />}
                      {formulario.activo ? 'Visible' : 'Oculto'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        manejarCambio('destacado', !formulario.destacado)
                      }
                      className={`rounded-2xl border px-4 py-3 font-black flex items-center justify-center gap-2 transition ${formulario.destacado
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-[#F8EDF1] text-[#8C777F] border-[#EEDFE4]'
                        }`}
                    >
                      {formulario.destacado ? (
                        <Star size={18} />
                      ) : (
                        <StarOff size={18} />
                      )}
                      Destacado
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        manejarCambio('mostrar_stock', !formulario.mostrar_stock)
                      }
                      className={`rounded-2xl border px-4 py-3 font-black flex items-center justify-center gap-2 transition ${formulario.mostrar_stock
                          ? 'bg-[#FFF2F5] text-[#A84E6C] border-[#E8C3CF]'
                          : 'bg-[#F8EDF1] text-[#8C777F] border-[#EEDFE4]'
                        }`}
                    >
                      <Package size={18} />
                      Disponibilidad
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={cerrarModal}
                      disabled={guardando}
                      className="px-5 py-3 rounded-2xl bg-[#F8EDF1] hover:bg-[#EFE5E8] text-[#66535A] font-black transition disabled:opacity-60"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={guardando}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#AD526F] hover:bg-[#8B3F5B] text-white font-black shadow-lg shadow-[0_12px_28px_rgba(173,82,111,0.20)] transition disabled:opacity-60"
                    >
                      {guardando ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          {modoEdicion ? 'Guardar cambios' : 'Agregar al catálogo'}
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogoKpi({
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

