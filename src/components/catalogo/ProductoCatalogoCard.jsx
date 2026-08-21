import { ArrowUpRight, ImageOff, MapPin, PackageCheck, Sparkles, Tag } from 'lucide-react';

const moneda = (valor) =>
  Number(valor || 0).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

const obtenerImagen = (producto) =>
  producto?.imagen_url ||
  producto?.imagenes?.find((imagen) => imagen.es_principal)?.imagen_url ||
  producto?.imagenes?.[0]?.imagen_url ||
  null;

const obtenerEtiquetasVariantes = (producto) => {
  const variantes = Array.isArray(producto?.variantes) ? producto.variantes : [];
  const valores = [];

  for (const variante of variantes) {
    [variante.talla, variante.color, variante.tono, variante.presentacion]
      .filter(Boolean)
      .forEach((valor) => {
        if (!valores.includes(valor)) valores.push(valor);
      });
  }

  return valores.slice(0, 3);
};

export default function ProductoCatalogoCard({ producto, onVerDetalle }) {
  const imagen = obtenerImagen(producto);
  const etiquetas = obtenerEtiquetasVariantes(producto);
  const tieneOferta = Boolean(producto?.tiene_oferta);
  const stock = Number(producto?.stock_total || 0);
  const nombre = producto?.titulo_catalogo || producto?.nombre_producto || 'Producto';

  return (
    <article className="group relative bg-transparent">
      <button
        type="button"
        onClick={() => onVerDetalle?.(producto)}
        className="block w-full text-left"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE7E2]">
          {imagen ? (
            <img
              src={imagen}
              alt={nombre}
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.045]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[#B1A0A5]">
              <ImageOff size={42} strokeWidth={1.5} />
              <span className="text-xs font-black uppercase tracking-[0.14em]">Sin imagen</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-[#251F21]/92 px-4 py-3 text-white backdrop-blur transition duration-300 group-hover:translate-y-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.12em]">Ver detalle</span>
              <ArrowUpRight size={17} />
            </div>
          </div>

          <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
            {producto?.destacado && (
              <span className="inline-flex items-center gap-1 bg-[#FCFAF7]/95 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#AD526F] shadow-sm backdrop-blur">
                <Sparkles size={12} />
                Selección
              </span>
            )}

            {tieneOferta && (
              <span className="inline-flex items-center gap-1 bg-[#AD526F] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-sm">
                <Tag size={12} />
                -{Number(producto?.porcentaje_descuento || 0)}%
              </span>
            )}
          </div>

          {Array.isArray(producto?.imagenes) && producto.imagenes.length > 1 && (
            <div className="absolute right-3 top-3 bg-[#251F21]/75 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white backdrop-blur">
              {producto.imagenes.length} fotos
            </div>
          )}
        </div>

        <div className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#AD526F]">
                {producto?.marca || producto?.nombre_categoria || 'Moda & Belleza'}
              </p>
              <h3 className="mt-1.5 line-clamp-2 font-serif text-[1.38rem] font-semibold leading-[1.05] tracking-[-0.02em] text-[#251F21]">
                {nombre}
              </h3>
            </div>

            <div className="shrink-0 text-right">
              {tieneOferta && (
                <p className="text-[11px] font-bold text-[#A59399] line-through">
                  {moneda(producto?.precio_venta)}
                </p>
              )}
              <p className="text-lg font-black text-[#251F21]">
                {moneda(producto?.precio_final ?? producto?.precio_venta)}
              </p>
            </div>
          </div>

          {etiquetas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
              {etiquetas.map((etiqueta, indice) => (
                <span
                  key={`${etiqueta}-${indice}`}
                  className="text-[11px] font-black uppercase tracking-[0.08em] text-[#7E6F74]"
                >
                  {indice > 0 && <span className="mr-3 text-[#C9BCC0]">/</span>}
                  {etiqueta}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-[#DCCFD2] pt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.09em] text-[#716268]">
              <MapPin size={14} />
              {Number(producto?.total_sucursales_disponibles || 0)} sucursales
            </span>

            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.09em] ${
                stock > 0 ? 'text-emerald-700' : 'text-[#9E8E93]'
              }`}
            >
              <PackageCheck size={14} />
              {stock > 0 ? 'Disponible' : 'Agotado'}
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
