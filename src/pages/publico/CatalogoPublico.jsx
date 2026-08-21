import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  SlidersHorizontal,
  PackageSearch,
  Store,
  Sparkles,
  Tags,
  ShoppingBag,
  X,
  ArrowUpRight,
  Share2,
  MapPin,
  Music2,
  MessageCircle,
  Phone,
} from 'lucide-react';
import api from '../../api/axios';
import ProductoCatalogoCard from '../../components/catalogo/ProductoCatalogoCard';
import ProductoCatalogoModal from '../../components/catalogo/ProductoCatalogoModal';
import SucursalesDisponiblesModal from '../../components/catalogo/SucursalesDisponiblesModal';
import ChatbotDisponibilidad from '../../components/catalogo/ChatbotDisponibilidad';


const CONFIGURACION_REDES_SOCIALES = {
  FACEBOOK: {
    clase: 'border-blue-100 bg-blue-50 text-blue-600',
    textoAccion: 'Visitar página oficial',
  },
  INSTAGRAM: {
    clase: 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-600',
    textoAccion: 'Visitar perfil oficial',
  },
  WHATSAPP: {
    clase: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    textoAccion: 'Escríbenos por WhatsApp',
  },
  TIKTOK: {
    clase: 'border-slate-200 bg-slate-50 text-slate-900',
    textoAccion: 'Visitar perfil oficial',
  },
  X: {
    clase: 'border-slate-200 bg-slate-50 text-slate-900',
    textoAccion: 'Visitar perfil oficial',
  },
  YOUTUBE: {
    clase: 'border-red-100 bg-red-50 text-red-600',
    textoAccion: 'Visitar canal oficial',
  },
};

const obtenerConfiguracionRedSocial = (clave) => {
  return (
    CONFIGURACION_REDES_SOCIALES[String(clave || '').toUpperCase()] || {
      clase: 'border-rose-100 bg-rose-50 text-[#8B3F5B]',
      textoAccion: 'Abrir enlace oficial',
    }
  );
};

function IconoRedSocial({ clave, size = 22 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (String(clave || '').toUpperCase()) {
    case 'FACEBOOK':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M13.8 21v-8h2.7l.4-3.2h-3.1V7.76c0-.93.26-1.56 1.59-1.56h1.7V3.34c-.3-.04-1.31-.13-2.5-.13-2.47 0-4.16 1.5-4.16 4.26V9.8H7.6V13h2.81v8h3.39Z" />
        </svg>
      );

    case 'INSTAGRAM':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'WHATSAPP':
      return (
        <span className="relative flex h-full w-full items-center justify-center">
          <MessageCircle size={size + 1} strokeWidth={2.2} />
          <span className="absolute flex h-4 w-4 items-center justify-center"><Phone size={10} strokeWidth={2.8} /></span>
        </span>
      );

    case 'TIKTOK':
      return <Music2 size={size + 1} strokeWidth={2.3} />;

    case 'X':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M4.3 3h4.13l4.23 5.66L17.68 3H20l-6.28 7.23L20.3 21h-4.12l-4.57-6.12L6.3 21H4l6.55-7.54L4.3 3Zm2.2 1.66 10.57 14.68h1.16L7.67 4.66H6.5Z" />
        </svg>
      );

    case 'YOUTUBE':
      return (
        <svg
          width={size + 2}
          height={size + 2}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M21.58 7.19a2.93 2.93 0 0 0-2.06-2.08C17.7 4.62 12 4.62 12 4.62s-5.7 0-7.52.49A2.93 2.93 0 0 0 2.42 7.2C1.93 9 1.93 12 1.93 12s0 3 .49 4.81a2.93 2.93 0 0 0 2.06 2.08c1.82.49 7.52.49 7.52.49s5.7 0 7.52-.49a2.93 2.93 0 0 0 2.06-2.08c.49-1.81.49-4.81.49-4.81s0-3-.49-4.81ZM10.1 15.02V8.98L15.4 12l-5.3 3.02Z" />
        </svg>
      );

    default:
      return <Share2 size={size} strokeWidth={2.2} />;
  }
}

export default function CatalogoPublico() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [redesSociales, setRedesSociales] = useState([]);
  const [modalWhatsappAbierto, setModalWhatsappAbierto] = useState(false);
  const [sucursalesWhatsapp, setSucursalesWhatsapp] = useState([]);
  const [cargandoSucursalesWhatsapp, setCargandoSucursalesWhatsapp] = useState(false);
  const [errorSucursalesWhatsapp, setErrorSucursalesWhatsapp] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [idCatalogoSeleccionado, setIdCatalogoSeleccionado] = useState('');

  const [sugerenciasProductos, setSugerenciasProductos] = useState([]);
  const [cargandoSugerencias, setCargandoSugerencias] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [indiceSugerencia, setIndiceSugerencia] = useState(-1);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [
    productoDisponibilidadSeleccionado,
    setProductoDisponibilidadSeleccionado,
  ] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargarCategorias = async () => {
    try {
      const { data } = await api.get('/public/catalogo/categorias');

      if (data.ok) {
        setCategorias(data.categorias || []);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarRedesSociales = async () => {
    try {
      const { data } = await api.get('/public/catalogo/redes-sociales');

      if (data.ok) {
        setRedesSociales(data.redes_sociales || []);
      } else {
        setRedesSociales([]);
      }
    } catch (error) {
      /*
       * Las redes sociales no bloquean la consulta del catálogo. Si el
       * servicio no está disponible, simplemente no mostramos este bloque.
       */
      console.warn('No se pudieron cargar las redes sociales públicas:', error);
      setRedesSociales([]);
    }
  };

  const cargarSucursalesWhatsapp = async () => {
    try {
      setCargandoSucursalesWhatsapp(true);
      setErrorSucursalesWhatsapp('');

      const { data } = await api.get('/public/catalogo/sucursales-whatsapp');

      if (data.ok) {
        setSucursalesWhatsapp(data.sucursales || []);
      } else {
        setSucursalesWhatsapp([]);
        setErrorSucursalesWhatsapp(
          data.mensaje || 'No se pudieron cargar las sucursales.'
        );
      }
    } catch (error) {
      console.error('Error al cargar sucursales de WhatsApp:', error);
      setSucursalesWhatsapp([]);
      setErrorSucursalesWhatsapp(
        error.response?.data?.mensaje ||
        'No se pudieron cargar las sucursales para WhatsApp.'
      );
    } finally {
      setCargandoSucursalesWhatsapp(false);
    }
  };

  const abrirSelectorWhatsapp = async () => {
    setModalWhatsappAbierto(true);
    await cargarSucursalesWhatsapp();
  };

  const cargarCatalogo = async ({
    idCatalogo = idCatalogoSeleccionado,
    textoBusqueda = busqueda,
    categoria = categoriaSeleccionada,
  } = {}) => {
    try {
      setCargando(true);
      setError('');

      const params = {};

      if (idCatalogo) {
        params.id_catalogo = idCatalogo;
      } else if (String(textoBusqueda || '').trim()) {
        params.q = String(textoBusqueda).trim();
      }

      if (categoria) {
        params.categoria = categoria;
      }

      const { data } = await api.get('/public/catalogo', { params });

      if (!data.ok) {
        setError(data.mensaje || 'No se pudo cargar el catálogo');
        return;
      }

      setProductos(data.catalogo || []);
    } catch (error) {
      console.error('Error al cargar catálogo:', error);
      setError('Error al conectar con el catálogo');
    } finally {
      setCargando(false);
    }
  };

  const buscarSugerenciasProductos = async (termino, signal) => {
    const texto = String(termino || '').trim();

    if (texto.length < 2 || idCatalogoSeleccionado) {
      setSugerenciasProductos([]);
      setMostrarSugerencias(false);
      setIndiceSugerencia(-1);
      return;
    }

    try {
      setCargandoSugerencias(true);
      setMostrarSugerencias(true);

      const { data } = await api.get('/public/catalogo', {
        params: {
          autocomplete: 1,
          q: texto,
          categoria: categoriaSeleccionada || undefined,
          limit: 8,
        },
        signal,
      });

      if (data?.ok) {
        setSugerenciasProductos(data.productos || []);
        setIndiceSugerencia(-1);
      } else {
        setSugerenciasProductos([]);
      }
    } catch (error) {
      if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        return;
      }

      console.error('Error al consultar sugerencias del catálogo:', error);
      setSugerenciasProductos([]);
    } finally {
      if (!signal?.aborted) {
        setCargandoSugerencias(false);
      }
    }
  };

  const seleccionarSugerencia = (producto) => {
    const nombre =
      producto?.titulo_catalogo ||
      producto?.nombre_producto ||
      producto?.nombre ||
      '';

    setBusqueda(nombre);
    setIdCatalogoSeleccionado(producto?.id_catalogo || '');
    setSugerenciasProductos([]);
    setMostrarSugerencias(false);
    setIndiceSugerencia(-1);
  };

  const manejarTeclaBusqueda = (event) => {
    const hayOpciones = sugerenciasProductos.length > 0;

    if (event.key === 'ArrowDown' && hayOpciones) {
      event.preventDefault();
      setMostrarSugerencias(true);
      setIndiceSugerencia((actual) =>
        actual >= sugerenciasProductos.length - 1 ? 0 : actual + 1
      );
      return;
    }

    if (event.key === 'ArrowUp' && hayOpciones) {
      event.preventDefault();
      setIndiceSugerencia((actual) =>
        actual <= 0 ? sugerenciasProductos.length - 1 : actual - 1
      );
      return;
    }

    if (event.key === 'Enter' && indiceSugerencia >= 0 && hayOpciones) {
      event.preventDefault();
      seleccionarSugerencia(sugerenciasProductos[indiceSugerencia]);
      return;
    }

    if (event.key === 'Escape') {
      setMostrarSugerencias(false);
      setIndiceSugerencia(-1);
    }
  };

  const abrirDetalle = async (producto) => {
    try {
      setCargandoDetalle(true);

      const { data } = await api.get(`/public/catalogo/${producto.id_catalogo}`);

      if (data.ok) {
        setProductoSeleccionado(data.producto);
      } else {
        setProductoSeleccionado(producto);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      setProductoSeleccionado(producto);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaSeleccionada('');
    setIdCatalogoSeleccionado('');
    setSugerenciasProductos([]);
    setMostrarSugerencias(false);
    setIndiceSugerencia(-1);
  };

  useEffect(() => {
    cargarCategorias();
    cargarRedesSociales();
  }, []);

  useEffect(() => {
    if (idCatalogoSeleccionado) {
      cargarCatalogo();
      return undefined;
    }

    const timer = setTimeout(() => {
      cargarCatalogo();
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, categoriaSeleccionada, idCatalogoSeleccionado]);

  useEffect(() => {
    const texto = String(busqueda || '').trim();

    if (idCatalogoSeleccionado || texto.length < 2) {
      setSugerenciasProductos([]);
      setMostrarSugerencias(false);
      setIndiceSugerencia(-1);
      setCargandoSugerencias(false);
      return undefined;
    }

    const controlador = new AbortController();
    const timer = setTimeout(() => {
      buscarSugerenciasProductos(texto, controlador.signal);
    }, 280);

    return () => {
      clearTimeout(timer);
      controlador.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, categoriaSeleccionada, idCatalogoSeleccionado]);

  const totalProductos = productos.length;

  const productosConOferta = useMemo(() => {
    return productos.filter((p) => p.tiene_oferta).length;
  }, [productos]);

  const categoriaActual = useMemo(() => {
    if (!categoriaSeleccionada) return null;

    return categorias.find(
      (categoria) =>
        String(categoria.id_categoria) === String(categoriaSeleccionada)
    );
  }, [categoriaSeleccionada, categorias]);

  const redesVisibles = useMemo(() => {
    return (redesSociales || []).filter((red) => {
      const clave = String(red?.clave || '').toUpperCase();

      if (clave === 'WHATSAPP') return true;

      return Boolean(String(red?.url || '').trim());
    });
  }, [redesSociales]);

  const hayFiltros = busqueda.trim() || categoriaSeleccionada;

  return (
    <div className="min-h-screen bg-[#F7F3EF] text-[#251F21]">
      <style>
        {`
          @keyframes editorialFade {
            from { opacity: 0; transform: translateY(14px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes editorialFloat {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-10px) rotate(1deg); }
          }

          @keyframes editorialPulse {
            0%, 100% { transform: scale(1); opacity: .75; }
            50% { transform: scale(1.04); opacity: 1; }
          }

          .editorial-fade { animation: editorialFade .55s ease-out both; }
          .editorial-float { animation: editorialFloat 6s ease-in-out infinite; }
          .editorial-pulse { animation: editorialPulse 4s ease-in-out infinite; }

          @media (prefers-reduced-motion: reduce) {
            .editorial-fade,
            .editorial-float,
            .editorial-pulse {
              animation: none !important;
            }
          }
        `}
      </style>

      <div className="border-b border-[#E8DED8] bg-[#251F21] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.24em] sm:text-xs">
          <Sparkles size={14} />
          Nuevas piezas · Belleza · Accesorios · Promociones
        </div>
      </div>

      <header className="relative border-b border-[#E8DED8] bg-[#FCFAF7]">
        <div className="mx-auto max-w-7xl px-5">
          <nav className="flex min-h-[78px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center border border-[#251F21] bg-[#251F21] text-white">
                <ShoppingBag size={22} strokeWidth={1.9} />
              </div>
              <div>
                <p className="text-base font-black uppercase tracking-[0.16em] text-[#251F21]">
                  Moda & Belleza
                </p>
                <p className="text-xs font-semibold text-[#85777C]">
                  Catálogo de temporada
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-7 text-xs font-black uppercase tracking-[0.14em] text-[#5C4E53] md:flex">
              <span>Ropa</span>
              <span>Cosméticos</span>
              <span>Accesorios</span>
            </div>

            <button
              type="button"
              onClick={() => {
                document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 border border-[#251F21] bg-transparent px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#251F21] transition hover:bg-[#251F21] hover:text-white"
            >
              Ver colección
              <ArrowUpRight size={16} />
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#F7F3EF]">
          <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-[#EFC1CF]/45 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-[#E8D9CF]/60 blur-3xl" />

          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch lg:py-16">
            <div className="editorial-fade flex flex-col justify-center">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-[#AD526F]" />
                <span className="text-xs font-black uppercase tracking-[0.28em] text-[#AD526F]">
                  Edición actual
                </span>
              </div>

              <h1 className="max-w-4xl font-serif text-[clamp(3.4rem,8vw,7.8rem)] font-semibold leading-[.84] tracking-[-0.055em] text-[#251F21]">
                Tu estilo,
                <span className="block italic text-[#AD526F]">a tu manera.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base font-medium leading-7 text-[#75676C] sm:text-lg">
                Descubre prendas, cosméticos y accesorios con sus tallas, colores, tonos y disponibilidad antes de visitar tu sucursal favorita.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('buscar-catalogo')?.focus();
                  }}
                  className="inline-flex items-center gap-2 bg-[#251F21] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#AD526F]"
                >
                  <Search size={18} />
                  Buscar productos
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('coleccion')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 border border-[#CDBFC3] bg-[#FCFAF7] px-5 py-3.5 text-sm font-black text-[#3E3337] transition hover:border-[#AD526F] hover:text-[#AD526F]"
                >
                  Explorar todo
                  <ArrowUpRight size={18} />
                </button>
              </div>

              <div className="mt-10 grid max-w-lg grid-cols-3 border-y border-[#DCCFD2] py-5">
                <div>
                  <p className="text-2xl font-black text-[#251F21]">{totalProductos}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8D7D82]">Productos</p>
                </div>
                <div className="border-x border-[#DCCFD2] px-4">
                  <p className="text-2xl font-black text-[#251F21]">{categorias.length}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8D7D82]">Categorías</p>
                </div>
                <div className="pl-4">
                  <p className="text-2xl font-black text-[#AD526F]">{productosConOferta}</p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#8D7D82]">Ofertas</p>
                </div>
              </div>
            </div>

            <div className="editorial-fade relative min-h-[430px]" style={{ animationDelay: '.1s' }}>
              <div className="absolute inset-6 border border-[#251F21]/15 bg-[#EFC1CF] lg:inset-8" />
              <div className="absolute inset-x-0 bottom-0 top-12 bg-[#251F21] p-7 text-white sm:p-9">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#F2CBD6]">
                        Lookbook 26
                      </p>
                      <h2 className="mt-3 max-w-sm font-serif text-4xl font-semibold leading-[.95] sm:text-5xl">
                        Moda, color y belleza en un solo lugar.
                      </h2>
                    </div>
                    <span className="text-6xl font-black leading-none text-white/10 sm:text-7xl">01</span>
                  </div>

                  <div className="editorial-float mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-white/15 bg-[#AD526F] text-white shadow-2xl sm:h-48 sm:w-48">
                    <ShoppingBag size={66} strokeWidth={1.3} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/15 pt-5 text-center">
                    {['Tallas', 'Colores', 'Tonos'].map((item) => (
                      <div key={item} className="text-xs font-black uppercase tracking-[0.12em] text-[#FCEEF2]">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#E7DCD8] bg-[#FCFAF7]">
          <div className="mx-auto max-w-7xl px-5 py-5">
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setCategoriaSeleccionada('');
                  setIdCatalogoSeleccionado('');
                }}
                className={`shrink-0 border px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition ${
                  !categoriaSeleccionada
                    ? 'border-[#251F21] bg-[#251F21] text-white'
                    : 'border-[#D8CBCF] bg-white text-[#625358] hover:border-[#AD526F] hover:text-[#AD526F]'
                }`}
              >
                Todas
              </button>

              {categorias.map((categoria) => (
                <button
                  key={categoria.id_categoria}
                  type="button"
                  onClick={() => {
                    setCategoriaSeleccionada(String(categoria.id_categoria));
                    setIdCatalogoSeleccionado('');
                  }}
                  className={`shrink-0 border px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] transition ${
                    String(categoriaSeleccionada) === String(categoria.id_categoria)
                      ? 'border-[#AD526F] bg-[#AD526F] text-white'
                      : 'border-[#D8CBCF] bg-white text-[#625358] hover:border-[#AD526F] hover:text-[#AD526F]'
                  }`}
                >
                  {categoria.nombre}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 lg:py-12">
          <div className={`relative z-30 border border-[#DDD0D3] bg-[#FCFAF7] p-4 sm:p-5 ${mostrarSugerencias ? 'z-50' : ''}`}>
            <div className="grid gap-3 lg:grid-cols-[1fr_280px_auto]">
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B7A80]"
                />
                <input
                  id="buscar-catalogo"
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setIdCatalogoSeleccionado('');
                    setMostrarSugerencias(e.target.value.trim().length >= 2);
                    setIndiceSugerencia(-1);
                  }}
                  onFocus={() => {
                    if (String(busqueda || '').trim().length >= 2 && !idCatalogoSeleccionado) {
                      setMostrarSugerencias(true);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setMostrarSugerencias(false);
                      setIndiceSugerencia(-1);
                    }, 160);
                  }}
                  onKeyDown={manejarTeclaBusqueda}
                  placeholder="Buscar nombre, talla, color o tono..."
                  className="w-full border border-[#D7CACD] bg-white py-3.5 pl-11 pr-11 text-sm font-bold text-[#30272B] outline-none transition focus:border-[#251F21]"
                  autoComplete="off"
                />

                {cargandoSugerencias && (
                  <RefreshCw
                    size={18}
                    className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[#AD526F]"
                  />
                )}

                {mostrarSugerencias &&
                  !idCatalogoSeleccionado &&
                  String(busqueda || '').trim().length >= 2 && (
                    <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden border border-[#D8CBCF] bg-white shadow-[0_18px_50px_rgba(44,34,38,.16)]">
                      {cargandoSugerencias ? (
                        <div className="flex items-center gap-3 px-4 py-4 text-sm font-bold text-[#75676C]">
                          <RefreshCw size={18} className="animate-spin text-[#AD526F]" />
                          Buscando productos...
                        </div>
                      ) : sugerenciasProductos.length === 0 ? (
                        <div className="px-4 py-4 text-sm font-semibold text-[#75676C]">
                          No encontramos coincidencias.
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto py-1">
                          {sugerenciasProductos.map((producto, indice) => {
                            const nombre =
                              producto.titulo_catalogo ||
                              producto.nombre_producto ||
                              producto.nombre ||
                              'Producto';
                            const detalle = [
                              producto.marca,
                              producto.presentacion,
                              producto.nombre_categoria,
                            ]
                              .filter(Boolean)
                              .join(' · ');

                            return (
                              <button
                                key={producto.id_catalogo}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => seleccionarSugerencia(producto)}
                                className={`flex w-full items-center gap-3 border-b border-[#F0E7E9] px-4 py-3 text-left transition last:border-b-0 ${
                                  indiceSugerencia === indice
                                    ? 'bg-[#FCEEF2]'
                                    : 'hover:bg-[#FAF7F4]'
                                }`}
                              >
                                <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden bg-[#F4EEEA] text-[#AD526F]">
                                  {producto.imagen_url ? (
                                    <img
                                      src={producto.imagen_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <PackageSearch size={19} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-[#30272B]">{nombre}</p>
                                  <p className="mt-0.5 truncate text-xs font-semibold text-[#8D7D82]">
                                    {detalle || 'Catálogo'}
                                  </p>
                                </div>
                                <span className="text-sm font-black text-[#AD526F]">
                                  {Number(producto.precio_final ?? producto.precio_venta ?? 0).toLocaleString('es-MX', {
                                    style: 'currency',
                                    currency: 'MXN',
                                  })}
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
                onChange={(e) => {
                  setCategoriaSeleccionada(e.target.value);
                  setIdCatalogoSeleccionado('');
                  setIndiceSugerencia(-1);
                  if (String(busqueda || '').trim().length >= 2) {
                    setMostrarSugerencias(true);
                  }
                }}
                className="border border-[#D7CACD] bg-white px-4 py-3.5 text-sm font-black text-[#4D4145] outline-none transition focus:border-[#251F21]"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id_categoria} value={categoria.id_categoria}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 border border-[#251F21] bg-[#251F21] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#AD526F]"
              >
                <RefreshCw size={18} />
                Limpiar
              </button>
            </div>

            {hayFiltros && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E8DDDF] pt-4">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9A898E]">
                  Filtros
                </span>
                {busqueda.trim() && (
                  <span className="border border-[#E5D8DC] bg-white px-3 py-1.5 text-xs font-black text-[#6B5960]">
                    “{busqueda.trim()}”
                  </span>
                )}
                {categoriaActual && (
                  <span className="border border-[#E5D8DC] bg-white px-3 py-1.5 text-xs font-black text-[#6B5960]">
                    {categoriaActual.nombre}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section id="coleccion" className="mx-auto max-w-7xl px-5 pb-14">
          <div className="mb-7 flex flex-col gap-4 border-b border-[#DCCFD2] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#AD526F]">
                Selección actual
              </p>
              <h2 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.03em] text-[#251F21] sm:text-5xl">
                La colección
              </h2>
            </div>
            <p className="max-w-md text-sm font-semibold leading-6 text-[#807177] sm:text-right">
              Explora cada producto para ver galería, variantes y disponibilidad por sucursal.
            </p>
          </div>

          {cargando && (
            <div className="flex min-h-[360px] flex-col items-center justify-center border border-[#E2D6D9] bg-[#FCFAF7] text-[#75676C]">
              <RefreshCw size={34} className="animate-spin text-[#AD526F]" />
              <p className="mt-4 font-black">Preparando la colección...</p>
            </div>
          )}

          {!cargando && error && (
            <div className="border border-red-200 bg-red-50 p-6 font-bold text-red-700">
              {error}
            </div>
          )}

          {!cargando && !error && productos.length === 0 && (
            <div className="border border-[#E2D6D9] bg-[#FCFAF7] px-6 py-16 text-center">
              <PackageSearch size={48} className="mx-auto text-[#B8A7AC]" />
              <h3 className="mt-5 font-serif text-3xl font-semibold text-[#30272B]">
                No encontramos productos
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-[#827378]">
                Prueba con otra búsqueda o limpia los filtros para explorar la colección completa.
              </p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-6 inline-flex items-center gap-2 bg-[#251F21] px-5 py-3 font-black text-white transition hover:bg-[#AD526F]"
              >
                <RefreshCw size={18} />
                Ver todo
              </button>
            </div>
          )}

          {!cargando && !error && productos.length > 0 && (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {productos.map((producto) => (
                <ProductoCatalogoCard
                  key={producto.id_catalogo}
                  producto={producto}
                  onVerDetalle={abrirDetalle}
                />
              ))}
            </div>
          )}
        </section>

        {redesVisibles.length > 0 && (
          <section className="bg-[#251F21] text-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#EFC1CF]">
                  Conecta con nosotros
                </p>
                <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                  Novedades, lanzamientos y atención directa.
                </h2>
                <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-white/60">
                  Síguenos en nuestras redes o escríbenos por WhatsApp para consultar una sucursal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {redesVisibles.map((red) => {
                  const esWhatsapp = String(red.clave || '').toUpperCase() === 'WHATSAPP';
                  const contenido = (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/10 text-white">
                        <IconoRedSocial clave={red.clave} size={20} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-black">{red.nombre}</p>
                        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.09em] text-white/45">
                          {esWhatsapp ? 'Escríbenos' : 'Visitar'}
                        </p>
                      </div>
                      <ArrowUpRight size={16} className="text-white/45" />
                    </>
                  );

                  const classes = "group flex min-h-[70px] items-center gap-3 border border-white/15 bg-white/[0.04] p-3 transition hover:border-[#EFC1CF]/60 hover:bg-white/[0.08]";

                  if (esWhatsapp) {
                    return (
                      <button
                        key={red.id_red_social || red.clave}
                        type="button"
                        onClick={abrirSelectorWhatsapp}
                        className={classes}
                      >
                        {contenido}
                      </button>
                    );
                  }

                  return (
                    <a
                      key={red.id_red_social || red.clave}
                      href={red.url}
                      target="_blank"
                      rel="noreferrer"
                      className={classes}
                    >
                      {contenido}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {modalWhatsappAbierto && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#251F21]/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl overflow-hidden bg-[#FCFAF7] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E4D8DB] p-5 sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#AD526F]">
                  Atención directa
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-[#251F21]">
                  Elige una sucursal
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#807177]">
                  Te llevaremos a WhatsApp con la sucursal seleccionada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalWhatsappAbierto(false)}
                className="flex h-11 w-11 items-center justify-center border border-[#D8CBCF] bg-white text-[#5B4C51] transition hover:border-red-300 hover:text-red-600"
              >
                <X size={22} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5 sm:p-6">
              {cargandoSucursalesWhatsapp ? (
                <div className="flex flex-col items-center justify-center py-14 text-[#75676C]">
                  <RefreshCw size={34} className="animate-spin text-[#AD526F]" />
                  <p className="mt-3 font-black">Cargando sucursales...</p>
                </div>
              ) : errorSucursalesWhatsapp ? (
                <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {errorSucursalesWhatsapp}
                </div>
              ) : sucursalesWhatsapp.length === 0 ? (
                <div className="border border-[#E1D5D8] bg-white px-5 py-12 text-center">
                  <MessageCircle size={40} className="mx-auto text-[#B09EA4]" />
                  <h3 className="mt-4 text-lg font-black text-[#30272B]">
                    Aún no hay sucursales disponibles
                  </h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sucursalesWhatsapp.map((sucursal) => (
                    <article key={sucursal.id_sucursal} className="border border-[#DDD0D3] bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#AD526F]">Sucursal</p>
                          <h3 className="mt-1 text-lg font-black text-[#30272B]">{sucursal.nombre}</h3>
                        </div>
                        <Store size={22} className="text-[#AD526F]" />
                      </div>

                      <div className="mt-4 space-y-3 text-sm font-semibold text-[#6D5E63]">
                        <div className="flex items-start gap-2">
                          <MapPin size={17} className="mt-0.5 shrink-0 text-[#AD526F]" />
                          <span className="whitespace-pre-line">{sucursal.direccion || 'Dirección disponible al contactar.'}</span>
                        </div>
                        {sucursal.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone size={17} className="text-[#AD526F]" />
                            <span>{sucursal.telefono}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 grid gap-2">
                        <a
                          href={sucursal.url_whatsapp}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 bg-[#251F21] px-4 py-3 text-sm font-black text-white transition hover:bg-[#AD526F]"
                        >
                          <MessageCircle size={18} />
                          Abrir WhatsApp
                        </a>
                        {sucursal.url_google_maps && (
                          <a
                            href={sucursal.url_google_maps}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 border border-[#D8CBCF] px-4 py-3 text-sm font-black text-[#5D4D53] transition hover:border-[#AD526F] hover:text-[#AD526F]"
                          >
                            <MapPin size={18} />
                            Ver ubicación
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {cargandoDetalle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#251F21]/70 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 bg-white px-7 py-5 shadow-2xl">
            <RefreshCw size={23} className="animate-spin text-[#AD526F]" />
            <span className="font-black text-[#403438]">Cargando detalle...</span>
          </div>
        </div>
      )}

      {productoSeleccionado && (
        <ProductoCatalogoModal
          producto={productoSeleccionado}
          onCerrar={() => setProductoSeleccionado(null)}
          onVerDisponibilidad={(producto) => {
            setProductoDisponibilidadSeleccionado(producto);
          }}
        />
      )}

      {productoDisponibilidadSeleccionado && (
        <SucursalesDisponiblesModal
          producto={productoDisponibilidadSeleccionado}
          onCerrar={() => setProductoDisponibilidadSeleccionado(null)}
        />
      )}

      <footer className="border-t border-[#E2D6D9] bg-[#FCFAF7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-serif text-3xl font-semibold text-[#251F21]">Moda & Belleza</p>
            <p className="mt-2 text-sm font-semibold text-[#84757A]">Ropa · Cosméticos · Accesorios · Catálogo digital</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#AD526F]">
            <ShoppingBag size={17} />
            Encuentra tu próxima favorita
          </div>
        </div>
      </footer>

      <ChatbotDisponibilidad
        onVerDetalle={abrirDetalle}
        onVerDisponibilidad={(producto) => {
          setProductoDisponibilidadSeleccionado(producto);
        }}
        onAbrirWhatsApp={abrirSelectorWhatsapp}
      />
    </div>
  );
}
