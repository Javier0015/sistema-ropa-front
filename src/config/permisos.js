export const permisosPorRol = {
  ROOT: [
    'dashboard',
    'productos',
    'inventario',
    'stock-sucursales',
    'pos',
    'caja',
    'cajas',
    'ventas',
    'devoluciones',
    'ventas-servicios-clinicos',
    'proveedores',
    'compras',
    'usuarios',
    'tarjetas-puntos',
    'sucursales',
    'categorias',
    'alertas',
    'puntos',
    'recetas-admin',
    'ofertas',
    'catalogo-admin',
    'fila-espera',
    'reportes-cierre-caja',
    'control-sanitario',
    'catalogo-servicios-clinicos',
    'configuracion-ticket',
  ],

  SUPER_ADMIN: [
    'dashboard',
    'productos',
    'inventario',
    //'stock-sucursales',
    'pos',
    'caja',
    'cajas',
    'ventas',
    'devoluciones',
    'ventas-servicios-clinicos',
    //'proveedores',
    //'compras',
    'usuarios',
    //'tarjetas-puntos',
    'sucursales',
    'categorias',
    'alertas',
    //'puntos',
    'recetas-admin',
    'ofertas',
    'catalogo-admin',
    'fila-espera',
    'reportes-cierre-caja',
    'control-sanitario',
    'catalogo-servicios-clinicos',
    'configuracion-ticket',
  ],

  CAJERO: [
    /* 'dashboard',*/
    'pos',
    //'stock-sucursales',
    'caja',
    'ventas',
    'devoluciones',
    'ventas-servicios-clinicos',
    'tarjetas-puntos',
    'recetas-admin',
    'fila-espera',
    /* 'productos',*/
    'inventario',
    'categorias',
    'proveedores',
    'compras',
    'control-sanitario',
    'catalogo-servicios-clinicos',
  ],
};

export const tienePermiso = (rol, modulo) => {
  if (!rol || !modulo) return false;

  const permisos = permisosPorRol[rol] || [];

  return permisos.includes(modulo);
};