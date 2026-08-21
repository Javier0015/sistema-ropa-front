import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MapPin,
  PackageCheck,
  Palette,
  Ruler,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';

const moneda = (valor) =>
  Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

const valorUnico = (variantes, campo) =>
  [...new Set(variantes.map((item) => item?.[campo]).filter(Boolean))];

const etiquetaVariante = (variante) =>
  [
    variante?.talla && `Talla ${variante.talla}`,
    variante?.color,
    variante?.tono && `Tono ${variante.tono}`,
    variante?.presentacion,
  ]
    .filter(Boolean)
    .join(' · ') || variante?.nombre_variante || 'Única';

export default function ProductoCatalogoModal({
  producto,
  onCerrar,
  onVerDisponibilidad,
}) {
  const imagenes = useMemo(() => {
    const lista = Array.isArray(producto?.imagenes)
      ? producto.imagenes.filter((imagen) => imagen?.imagen_url)
      : [];

    if (lista.length > 0) return lista;

    return producto?.imagen_url
      ? [
          {
            id_imagen: 'principal',
            imagen_url: producto.imagen_url,
            es_principal: true,
          },
        ]
      : [];
  }, [producto]);

  const variantes = useMemo(
    () => (Array.isArray(producto?.variantes) ? producto.variantes : []),
    [producto]
  );

  const [indiceImagen, setIndiceImagen] = useState(0);
  const [idVariante, setIdVariante] = useState(null);

  useEffect(() => {
    setIndiceImagen(0);

    const principal =
      variantes.find((variante) => variante.es_principal && variante.disponible) ||
      variantes.find((variante) => variante.disponible) ||
      variantes.find((variante) => variante.es_principal) ||
      variantes[0] ||
      null;

    setIdVariante(principal?.id_variante || null);
  }, [producto, variantes]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  useEffect(() => {
    const manejarTecla = (event) => {
      if (event.key === 'Escape') {
        onCerrar?.();
        return;
      }

      if (event.key === 'ArrowLeft' && imagenes.length > 1) {
        setIndiceImagen((actual) =>
          actual <= 0 ? imagenes.length - 1 : actual - 1
        );
      }

      if (event.key === 'ArrowRight' && imagenes.length > 1) {
        setIndiceImagen((actual) =>
          actual >= imagenes.length - 1 ? 0 : actual + 1
        );
      }
    };

    window.addEventListener('keydown', manejarTecla);

    return () => window.removeEventListener('keydown', manejarTecla);
  }, [imagenes.length, onCerrar]);

  const varianteSeleccionada =
    variantes.find(
      (variante) => Number(variante.id_variante) === Number(idVariante)
    ) || null;

  const tallas = valorUnico(variantes, 'talla');
  const colores = valorUnico(variantes, 'color');
  const tonos = valorUnico(variantes, 'tono');
  const presentaciones = valorUnico(variantes, 'presentacion');

  const precioActual =
    varianteSeleccionada?.precio_final ??
    varianteSeleccionada?.precio_venta ??
    producto?.precio_final ??
    producto?.precio_venta;

  const precioOriginal =
    varianteSeleccionada?.precio_venta ?? producto?.precio_venta;

  const disponible = varianteSeleccionada
    ? Boolean(
        varianteSeleccionada.disponible ||
          Number(varianteSeleccionada.stock_total || 0) > 0
      )
    : Number(producto?.stock_total || 0) > 0;

  const imagenActual = imagenes[indiceImagen]?.imagen_url || null;

  const anterior = () =>
    setIndiceImagen((actual) =>
      actual <= 0 ? imagenes.length - 1 : actual - 1
    );

  const siguiente = () =>
    setIndiceImagen((actual) =>
      actual >= imagenes.length - 1 ? 0 : actual + 1
    );

  if (!producto || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="flex items-center justify-center bg-[#2B2226]/70 p-3 backdrop-blur-sm sm:p-5"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCerrar?.();
        }
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        style={{ maxHeight: '94vh' }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={
          producto?.titulo_catalogo || producto?.nombre_producto || 'Detalle de producto'
        }
      >
        <div className="flex h-full max-h-[94vh] flex-col">
          <div className="z-30 flex shrink-0 items-center justify-between border-b border-[#F0E2E6] bg-white px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#AD526F]">
                {producto?.marca || producto?.nombre_categoria || 'Moda & Belleza'}
              </p>
              <h2 className="truncate text-xl font-black text-[#30272B] sm:text-2xl">
                {producto?.titulo_catalogo ||
                  producto?.nombre_producto ||
                  'Producto'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onCerrar}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8EDF1] text-[#765D68] transition hover:bg-red-50 hover:text-red-600"
              aria-label="Cerrar detalle"
            >
              <X size={23} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="border-b border-[#F0E2E6] bg-[#FFF9FA] p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="relative overflow-hidden rounded-[1.8rem] border border-[#F0E2E6] bg-white">
                  <div className="aspect-square sm:aspect-[4/3] lg:aspect-square">
                    {imagenActual ? (
                      <img
                        src={imagenActual}
                        alt={
                          producto?.titulo_catalogo ||
                          producto?.nombre_producto ||
                          'Producto'
                        }
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-[#B89AA5]">
                        <ImageOff size={52} />
                        <span className="font-black">Sin imágenes disponibles</span>
                      </div>
                    )}
                  </div>

                  {imagenes.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={anterior}
                        className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#553E47] shadow-lg transition hover:bg-[#FFF2F5]"
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft size={24} />
                      </button>

                      <button
                        type="button"
                        onClick={siguiente}
                        className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#553E47] shadow-lg transition hover:bg-[#FFF2F5]"
                        aria-label="Imagen siguiente"
                      >
                        <ChevronRight size={24} />
                      </button>

                      <div className="absolute bottom-3 right-3 rounded-full bg-[#30272B]/80 px-3 py-1 text-xs font-black text-white backdrop-blur">
                        {indiceImagen + 1} / {imagenes.length}
                      </div>
                    </>
                  )}
                </div>

                {imagenes.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {imagenes.map((imagen, indice) => (
                      <button
                        key={
                          imagen.id_imagen || `${imagen.imagen_url}-${indice}`
                        }
                        type="button"
                        onClick={() => setIndiceImagen(indice)}
                        className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white p-1 transition ${
                          indice === indiceImagen
                            ? 'border-[#AD526F] ring-2 ring-[#F7DCE4]'
                            : 'border-[#F0E2E6] hover:border-[#E1A9BA]'
                        }`}
                      >
                        <img
                          src={imagen.imagen_url}
                          alt={`Vista ${indice + 1}`}
                          className="h-full w-full rounded-xl object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  {producto?.destacado && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-xs font-black text-[#AD526F]">
                      <Sparkles size={15} />
                      Destacado
                    </span>
                  )}

                  {producto?.tiene_oferta && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#AD526F] px-3 py-1.5 text-xs font-black text-white">
                      <Tag size={15} />
                      {Number(producto?.porcentaje_descuento || 0)}% de descuento
                    </span>
                  )}

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${
                      disponible
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <PackageCheck size={15} />
                    {disponible ? 'Disponible' : 'Sin stock'}
                  </span>
                </div>

                <h3 className="mt-5 text-3xl font-black leading-tight text-[#30272B]">
                  {producto?.titulo_catalogo || producto?.nombre_producto}
                </h3>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-[#806E75]">
                  {producto?.marca && <span>{producto.marca}</span>}
                  {producto?.nombre_categoria && (
                    <span>{producto.nombre_categoria}</span>
                  )}
                  {producto?.codigo_barras && (
                    <span>Cod. {producto.codigo_barras}</span>
                  )}
                </div>

                <div className="mt-5">
                  {producto?.tiene_oferta &&
                    Number(precioOriginal) > Number(precioActual) && (
                      <p className="text-sm font-bold text-[#A8969D] line-through">
                        {moneda(precioOriginal)}
                      </p>
                    )}

                  <p className="text-3xl font-black text-[#AD526F]">
                    {moneda(precioActual)}
                  </p>
                </div>

                {(producto?.descripcion_catalogo ||
                  producto?.descripcion_producto) && (
                  <p className="mt-5 text-sm font-medium leading-7 text-[#6F5D64]">
                    {producto.descripcion_catalogo ||
                      producto.descripcion_producto}
                  </p>
                )}

                {variantes.length > 0 && (
                  <div className="mt-6 space-y-5 border-t border-[#F0E2E6] pt-5">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-[0.12em] text-[#765D68]">
                        Opciones disponibles
                      </h4>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {variantes.map((variante) => {
                          const activa =
                            Number(variante.id_variante) === Number(idVariante);
                          const tieneStock = Boolean(
                            variante.disponible ||
                              Number(variante.stock_total || 0) > 0
                          );

                          return (
                            <button
                              key={variante.id_variante}
                              type="button"
                              onClick={() => setIdVariante(variante.id_variante)}
                              className={`rounded-2xl border p-3 text-left transition ${
                                activa
                                  ? 'border-[#AD526F] bg-[#FFF4F7] ring-2 ring-[#F7DCE4]'
                                  : 'border-[#EEDFE4] bg-white hover:bg-[#FFF9FA]'
                              }`}
                            >
                              <p className="text-sm font-black text-[#4A3940]">
                                {etiquetaVariante(variante)}
                              </p>

                              <div className="mt-1 flex items-center justify-between gap-2 text-xs font-bold">
                                <span className="text-[#967F88]">
                                  {variante.sku}
                                </span>
                                <span
                                  className={
                                    tieneStock
                                      ? 'text-emerald-700'
                                      : 'text-slate-400'
                                  }
                                >
                                  {tieneStock ? 'Disponible' : 'Sin stock'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(tallas.length > 0 ||
                      colores.length > 0 ||
                      tonos.length > 0 ||
                      presentaciones.length > 0) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {tallas.length > 0 && (
                          <div className="rounded-2xl bg-[#FFF9FA] p-3">
                            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#806E75]">
                              <Ruler size={15} /> Tallas
                            </p>
                            <p className="mt-2 text-sm font-black text-[#4A3940]">
                              {tallas.join(' · ')}
                            </p>
                          </div>
                        )}

                        {colores.length > 0 && (
                          <div className="rounded-2xl bg-[#FFF9FA] p-3">
                            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#806E75]">
                              <Palette size={15} /> Colores
                            </p>
                            <p className="mt-2 text-sm font-black text-[#4A3940]">
                              {colores.join(' · ')}
                            </p>
                          </div>
                        )}

                        {tonos.length > 0 && (
                          <div className="rounded-2xl bg-[#FFF9FA] p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-[#806E75]">
                              Tonos
                            </p>
                            <p className="mt-2 text-sm font-black text-[#4A3940]">
                              {tonos.join(' · ')}
                            </p>
                          </div>
                        )}

                        {presentaciones.length > 0 && (
                          <div className="rounded-2xl bg-[#FFF9FA] p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-[#806E75]">
                              Presentaciones
                            </p>
                            <p className="mt-2 text-sm font-black text-[#4A3940]">
                              {presentaciones.join(' · ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onVerDisponibilidad?.(producto)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3.5 font-black text-white shadow-lg shadow-[#AD526F]/20 transition hover:bg-[#8B3F5B]"
                >
                  <MapPin size={19} />
                  Ver disponibilidad por sucursal
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
