import { useState, useEffect } from 'react';
import {
  getDashboard,
  getReporteVentas,
  getReporteCompras,
  getReporteProductos,
  getReporteClientes,
  type DashboardDTO,
  type ReporteVentasDTO,
  type ReporteComprasDTO,
  type ReporteProductosDTO,
  type ReporteClientesDTO
} from '../../../api/reportesApi';

type TabType = 'dashboard' | 'ventas' | 'compras' | 'productos' | 'clientes';

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Fechas por defecto: mes actual
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes.toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(hoy.toISOString().split('T')[0]);
  
  // Data
  const [dashboard, setDashboard] = useState<DashboardDTO | null>(null);
  const [reporteVentas, setReporteVentas] = useState<ReporteVentasDTO | null>(null);
  const [reporteCompras, setReporteCompras] = useState<ReporteComprasDTO | null>(null);
  const [reporteProductos, setReporteProductos] = useState<ReporteProductosDTO | null>(null);
  const [reporteClientes, setReporteClientes] = useState<ReporteClientesDTO | null>(null);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboard();
    }
  }, [activeTab]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (err) {
      setError('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadReporte = async () => {
    setLoading(true);
    setError('');
    try {
      switch (activeTab) {
        case 'ventas':
          setReporteVentas(await getReporteVentas(fechaDesde, fechaHasta));
          break;
        case 'compras':
          setReporteCompras(await getReporteCompras(fechaDesde, fechaHasta));
          break;
        case 'productos':
          setReporteProductos(await getReporteProductos(fechaDesde, fechaHasta));
          break;
        case 'clientes':
          setReporteClientes(await getReporteClientes(fechaDesde, fechaHasta));
          break;
      }
    } catch (err) {
      setError('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value: number | null | undefined) => {
    if (value == null) return 'S/ 0.00';
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'ventas', label: 'Ventas' },
    { id: 'compras', label: 'Compras' },
    { id: 'productos', label: 'Productos' },
    { id: 'clientes', label: 'Clientes' },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500">Visualiza reportes y estadísticas de tu negocio</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros de fecha (no para dashboard) */}
      {activeTab !== 'dashboard' && (
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg bg-slate-50 p-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <button
            onClick={loadReporte}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Generar Reporte'}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</div>
      )}

      {/* Dashboard */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* KPIs principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ventas Hoy</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboard.ventasHoy)}</p>
                  <p className="text-xs text-slate-500">{dashboard.comprobantesHoy} comprobantes</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ventas Semana</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboard.ventasSemana)}</p>
                  <p className={`text-xs ${dashboard.variacionVentasSemana >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(dashboard.variacionVentasSemana)} vs semana anterior
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ventas Mes</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboard.ventasMes)}</p>
                  <p className={`text-xs ${dashboard.variacionVentasMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(dashboard.variacionVentasMes)} vs mes anterior
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Caja</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboard.saldoCajaActual)}</p>
                  <p className={`text-xs ${dashboard.cajaAbierta ? 'text-green-600' : 'text-red-600'}`}>
                    {dashboard.cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-3">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Segunda fila */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Compras Mes</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboard.comprasMes)}</p>
                  <p className="text-xs text-amber-600">{dashboard.comprasPendientes} pendientes</p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Productos</p>
                  <p className="text-2xl font-bold text-slate-900">{dashboard.totalProductos}</p>
                  <p className="text-xs text-slate-500">
                    {dashboard.productosBajoStock > 0 && (
                      <span className="text-amber-600">{dashboard.productosBajoStock} bajo stock</span>
                    )}
                    {dashboard.productosSinStock > 0 && (
                      <span className="text-red-600 ml-2">{dashboard.productosSinStock} sin stock</span>
                    )}
                  </p>
                </div>
                <div className="rounded-full bg-teal-100 p-3">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Clientes</p>
                  <p className="text-2xl font-bold text-slate-900">{dashboard.totalClientes}</p>
                  <p className="text-xs text-slate-500">registrados</p>
                </div>
                <div className="rounded-full bg-indigo-100 p-3">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Compras Hoy</p>
                  <p className="text-2xl font-bold text-slate-900">{formatMoney(dashboard.comprasHoy)}</p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reporte de Ventas */}
      {activeTab === 'ventas' && reporteVentas && (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <p className="text-sm text-green-700">Total Ventas</p>
              <p className="text-2xl font-bold text-green-900">{formatMoney(reporteVentas.totalVentas)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <p className="text-sm text-blue-700">IGV Total</p>
              <p className="text-2xl font-bold text-blue-900">{formatMoney(reporteVentas.totalIgv)}</p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-6">
              <p className="text-sm text-purple-700">Comprobantes</p>
              <p className="text-2xl font-bold text-purple-900">{reporteVentas.cantidadComprobantes}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm text-amber-700">Descuentos</p>
              <p className="text-2xl font-bold text-amber-900">{formatMoney(reporteVentas.totalDescuentos)}</p>
            </div>
          </div>

          {/* Detalle por tipo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Por Tipo de Documento</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Facturas</span>
                  <span className="font-medium">{reporteVentas.cantidadFacturas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Boletas</span>
                  <span className="font-medium">{reporteVentas.cantidadBoletas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Notas de Crédito</span>
                  <span className="font-medium text-red-600">-{reporteVentas.cantidadNotasCredito}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Notas de Débito</span>
                  <span className="font-medium text-green-600">+{reporteVentas.cantidadNotasDebito}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Montos por Tipo</h3>
              <div className="space-y-3">
                {reporteVentas.ventasPorTipo.map(vt => (
                  <div key={vt.tipoDoc} className="flex justify-between items-center">
                    <span className="text-slate-600">{vt.descripcion}</span>
                    <span className="font-medium">{formatMoney(vt.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ventas por día */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Ventas por Día</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-right py-2 px-3">Comprobantes</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteVentas.ventasPorDia.filter(v => v.cantidad > 0).map(v => (
                    <tr key={v.fecha} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3">{new Date(v.fecha).toLocaleDateString('es-PE')}</td>
                      <td className="py-2 px-3 text-right">{v.cantidad}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatMoney(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reporte de Compras */}
      {activeTab === 'compras' && reporteCompras && (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm text-red-700">Total Compras</p>
              <p className="text-2xl font-bold text-red-900">{formatMoney(reporteCompras.totalCompras)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <p className="text-sm text-blue-700">IGV Total</p>
              <p className="text-2xl font-bold text-blue-900">{formatMoney(reporteCompras.totalIgv)}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <p className="text-sm text-green-700">Recibidas</p>
              <p className="text-2xl font-bold text-green-900">{reporteCompras.comprasRecibidas}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm text-amber-700">Pendientes</p>
              <p className="text-2xl font-bold text-amber-900">{reporteCompras.comprasPendientes}</p>
            </div>
          </div>

          {/* Top Proveedores */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Top 10 Proveedores</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3">Proveedor</th>
                    <th className="text-left py-2 px-3">RUC</th>
                    <th className="text-right py-2 px-3">Compras</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reporteCompras.comprasPorProveedor.map(p => (
                    <tr key={p.proveedorId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3">{p.proveedorNombre}</td>
                      <td className="py-2 px-3">{p.proveedorRuc}</td>
                      <td className="py-2 px-3 text-right">{p.cantidad}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatMoney(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reporte de Productos */}
      {activeTab === 'productos' && reporteProductos && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top productos por cantidad */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Top 10 Más Vendidos (Cantidad)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3">Producto</th>
                      <th className="text-right py-2 px-3">Cantidad</th>
                      <th className="text-right py-2 px-3">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteProductos.productosTopVendidos.map((p, i) => (
                      <tr key={p.productoId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <span className="text-slate-400 mr-2">#{i + 1}</span>
                          {p.nombre}
                        </td>
                        <td className="py-2 px-3 text-right">{p.cantidadVendida} {p.unidad}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatMoney(p.montoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top productos por monto */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Top 10 Más Vendidos (Monto)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3">Producto</th>
                      <th className="text-right py-2 px-3">Cantidad</th>
                      <th className="text-right py-2 px-3">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteProductos.productosTopMonto.map((p, i) => (
                      <tr key={p.productoId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <span className="text-slate-400 mr-2">#{i + 1}</span>
                          {p.nombre}
                        </td>
                        <td className="py-2 px-3 text-right">{p.cantidadVendida} {p.unidad}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatMoney(p.montoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Productos bajo stock */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="font-semibold text-amber-900 mb-4">Productos Bajo Stock ({reporteProductos.productosBajoStock.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-amber-200">
                      <th className="text-left py-2 px-3">Producto</th>
                      <th className="text-right py-2 px-3">Stock</th>
                      <th className="text-right py-2 px-3">Mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteProductos.productosBajoStock.map(p => (
                      <tr key={p.productoId} className="border-b border-amber-100">
                        <td className="py-2 px-3">{p.nombre}</td>
                        <td className="py-2 px-3 text-right font-medium text-amber-700">{p.stockActual}</td>
                        <td className="py-2 px-3 text-right">{p.stockMinimo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Productos sin stock */}
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h3 className="font-semibold text-red-900 mb-4">Productos Sin Stock ({reporteProductos.productosSinStock.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-red-200">
                      <th className="text-left py-2 px-3">Código</th>
                      <th className="text-left py-2 px-3">Producto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteProductos.productosSinStock.map(p => (
                      <tr key={p.productoId} className="border-b border-red-100">
                        <td className="py-2 px-3 text-red-700">{p.codigo}</td>
                        <td className="py-2 px-3">{p.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reporte de Clientes */}
      {activeTab === 'clientes' && reporteClientes && (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6">
              <p className="text-sm text-indigo-700">Total Clientes (en período)</p>
              <p className="text-2xl font-bold text-indigo-900">{reporteClientes.totalClientes}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-6">
              <p className="text-sm text-green-700">Clientes Nuevos</p>
              <p className="text-2xl font-bold text-green-900">{reporteClientes.clientesNuevos}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top por monto */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Top 10 por Monto</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3">Cliente</th>
                      <th className="text-right py-2 px-3">Compras</th>
                      <th className="text-right py-2 px-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteClientes.clientesTopMonto.map((c, i) => (
                      <tr key={c.nroDoc} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div>
                            <span className="text-slate-400 mr-2">#{i + 1}</span>
                            {c.nombre}
                          </div>
                          <div className="text-xs text-slate-500">{c.nroDoc}</div>
                        </td>
                        <td className="py-2 px-3 text-right">{c.cantidadCompras}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatMoney(c.montoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top por frecuencia */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Top 10 por Frecuencia</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3">Cliente</th>
                      <th className="text-right py-2 px-3">Compras</th>
                      <th className="text-right py-2 px-3">Última</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteClientes.clientesTopFrecuencia.map((c, i) => (
                      <tr key={c.nroDoc} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div>
                            <span className="text-slate-400 mr-2">#{i + 1}</span>
                            {c.nombre}
                          </div>
                          <div className="text-xs text-slate-500">{c.nroDoc}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{c.cantidadCompras}</td>
                        <td className="py-2 px-3 text-right text-xs">{c.ultimaCompra}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-600">Cargando...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && activeTab !== 'dashboard' && !reporteVentas && !reporteCompras && !reporteProductos && !reporteClientes && (
        <div className="text-center py-12 text-slate-500">
          Selecciona un rango de fechas y haz clic en "Generar Reporte"
        </div>
      )}
    </div>
  );
}
