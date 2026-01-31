import React, { useState, useEffect } from 'react';
import { emitirGuiaRemision, MOTIVOS_TRASLADO, type GuiaRemisionRequest, type ItemGuia } from '../../../api/guiasRemisionApi';
import { listComprobantes, getComprobanteConDetalle, type Comprobante } from '../../../api/comprobantesApi';
import { listProductos, type Producto } from '../../../api/productosApi';
import { consultarRuc, consultarDni } from '../../../api/consultaApi';
import { entidadesComercialesApi, type EntidadComercial } from '../../../api/entidadesComercialesApi';
import { http } from '../../../api/http';
import { getErrorMessage } from '../../../api/errorHelper';
import { getAuth } from '../../../auth/authStore';
import Modal from '../../../components/Modal';

const GuiasRemisionPage: React.FC = () => {
  const [guias, setGuias] = useState<Comprobante[]>([]);
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<EntidadComercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState(''); // Error dentro del modal
  const [success, setSuccess] = useState('');

  // Form data
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().substring(0, 16));
  const [fechaTraslado, setFechaTraslado] = useState(new Date().toISOString().substring(0, 16));
  const [motivoCodigo, setMotivoCodigo] = useState('01');
  const [motivoOtro, setMotivoOtro] = useState(''); // Para motivo "13 - Otros"
  const [modalidad, setModalidad] = useState('02'); // 02=Privado por defecto
  const [pesoBruto, setPesoBruto] = useState('');
  const [numBultos, setNumBultos] = useState('1');
  
  // Documento relacionado (factura)
  const [comprobanteRelacionadoId, setComprobanteRelacionadoId] = useState('');
  
  // Partida
  const [partidaUbigeo, setPartidaUbigeo] = useState('');
  const [partidaDireccion, setPartidaDireccion] = useState('');
  
  // Llegada
  const [llegadaUbigeo, setLlegadaUbigeo] = useState('');
  const [llegadaDireccion, setLlegadaDireccion] = useState('');
  
  // Destinatario
  const [destTipoDoc, setDestTipoDoc] = useState('6');
  const [destNroDoc, setDestNroDoc] = useState('');
  const [destNombre, setDestNombre] = useState('');
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<EntidadComercial[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);
  const [errorProveedor, setErrorProveedor] = useState('');
  const [successProveedor, setSuccessProveedor] = useState('');
  
  // Transportista (público)
  const [transpRuc, setTranspRuc] = useState('');
  const [transpNombre, setTranspNombre] = useState('');
  const [buscandoTransportista, setBuscandoTransportista] = useState(false);
  const [errorTransportista, setErrorTransportista] = useState('');
  const [successTransportista, setSuccessTransportista] = useState('');
  
  // Conductor (privado)
  const [condDni, setCondDni] = useState('');
  const [condNombres, setCondNombres] = useState('');
  const [condApellidos, setCondApellidos] = useState('');
  const [condLicencia, setCondLicencia] = useState('');
  const [buscandoConductor, setBuscandoConductor] = useState(false);
  const [errorConductor, setErrorConductor] = useState('');
  const [successConductor, setSuccessConductor] = useState('');
  
  // Vehículo (privado)
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');
  const [vehiculoMarca, setVehiculoMarca] = useState('');
  
  // Items
  const [items, setItems] = useState<ItemGuia[]>([]);
  const [itemProductoId, setItemProductoId] = useState('');
  const [itemCantidad, setItemCantidad] = useState('1');

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setMostrarSugerencias(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const empresaId = auth?.empresaId;
      console.log('EmpresaId desde auth:', empresaId);
      
      // Cargar comprobantes y productos siempre
      const [comprobantesData, productosData] = await Promise.all([
        listComprobantes(),
        listProductos()
      ]);
      
      // Cargar proveedores y empresa solo si hay empresaId válido
      let proveedoresData = { content: [] as EntidadComercial[] };
      let empresaData: { direccion?: string } = { direccion: '' };
      
      if (empresaId && empresaId > 0) {
        // Cargar proveedores
        try {
          const proveedoresResp = await entidadesComercialesApi.getAll(empresaId, { rol: 'PROVEEDOR', limit: 1000 });
          proveedoresData = proveedoresResp;
        } catch {
          setModalError('Error al cargar proveedores');
        }
        
        // Cargar datos de empresa (separado para no afectar proveedores)
        try {
          const empresaResp = await http.get('/api/v1/empresas/me');
          empresaData = empresaResp.data;
        } catch {
          // No mostrar error si no se puede cargar empresa, es opcional
        }
      } else {
        console.warn('EmpresaId no válido, no se cargan proveedores');
      }
      
      // Filtrar guías (tipo_doc = 09) y facturas/boletas para relacionar
      setGuias(comprobantesData.filter(c => c.tipoDoc === '09'));
      setComprobantes(comprobantesData.filter(c => ['01', '03'].includes(c.tipoDoc)));
      setProductos(productosData);
      setProveedores(proveedoresData.content);
      
      // Auto-rellenar punto de partida con datos de la empresa
      if (empresaData.direccion) {
        setPartidaDireccion(empresaData.direccion);
      }
      // Nota: El ubigeo de la empresa debería estar en la BD, si no existe pedir que lo configure
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar datos'));
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarItem = () => {
    if (!itemProductoId) {
      setError('Seleccione un producto');
      return;
    }
    const producto = productos.find(p => p.id === parseInt(itemProductoId));
    if (!producto) return;

    const cantidad = parseFloat(itemCantidad);
    if (!cantidad || cantidad <= 0) {
      setError('Cantidad inválida');
      return;
    }

    setItems([...items, {
      codigo: producto.codigo || undefined,
      descripcion: producto.descripcion,
      unidad: producto.unidadMedida.codigo,
      cantidad
    }]);
    setItemProductoId('');
    setItemCantidad('1');
    setError('');
  };

  const handleEliminarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Buscar proveedor por RUC/DNI (para COMPRA/OTROS)
  const buscarProveedor = async () => {
    if (!destNroDoc) {
      setErrorProveedor('Ingrese un número de documento');
      setSuccessProveedor('');
      return;
    }
    if (destTipoDoc === '6' && destNroDoc.length !== 11) {
      setErrorProveedor('RUC debe tener 11 dígitos');
      setSuccessProveedor('');
      return;
    }
    if (destTipoDoc === '1' && destNroDoc.length !== 8) {
      setErrorProveedor('DNI debe tener 8 dígitos');
      setSuccessProveedor('');
      return;
    }
    
    setBuscandoProveedor(true);
    setErrorProveedor('');
    setSuccessProveedor('');
    try {
      if (destTipoDoc === '6') {
        const resultado = await consultarRuc(destNroDoc);
        if (resultado.estado && resultado.razonSocial) {
          setDestNombre(resultado.razonSocial);
          // Auto-rellenar punto de partida con dirección del proveedor
          if (resultado.direccion) {
            setPartidaDireccion(resultado.direccion);
          }
          setSuccessProveedor('Proveedor encontrado. Dirección cargada en Punto de Partida.');
          setErrorProveedor('');
        } else {
          setErrorProveedor(resultado.mensaje || 'No se encontró el RUC');
          setSuccessProveedor('');
        }
      } else {
        const resultado = await consultarDni(destNroDoc);
        if (resultado.estado && resultado.nombreCompleto) {
          setDestNombre(resultado.nombreCompleto);
          setSuccessProveedor('Proveedor encontrado');
          setErrorProveedor('');
        } else {
          setErrorProveedor(resultado.mensaje || 'No se encontró el DNI');
          setSuccessProveedor('');
        }
      }
    } catch (err) {
      console.error('Error consultando documento:', err);
      setErrorProveedor('Error al buscar proveedor. Ingrese el nombre manualmente.');
      setSuccessProveedor('');
    } finally {
      setBuscandoProveedor(false);
    }
  };

  // Seleccionar proveedor registrado
  const seleccionarProveedor = (proveedorId: string) => {
    if (!proveedorId) {
      // Limpiar si deselecciona
      setDestTipoDoc('6');
      setDestNroDoc('');
      setDestNombre('');
      return;
    }
    
    const proveedor = proveedores.find(p => p.id === parseInt(proveedorId));
    if (proveedor) {
      setDestTipoDoc(proveedor.tipoDocumento);
      setDestNroDoc(proveedor.numeroDocumento);
      setDestNombre(proveedor.razonSocial);
      // Auto-rellenar punto de partida con dirección del proveedor
      if (proveedor.direccion) {
        setPartidaDireccion(proveedor.direccion);
      }
    }
  };

  // Buscar transportista por RUC
  const buscarTransportista = async () => {
    if (!transpRuc || transpRuc.length !== 11) {
      setErrorTransportista('RUC debe tener 11 dígitos');
      setSuccessTransportista('');
      return;
    }
    setBuscandoTransportista(true);
    setErrorTransportista('');
    setSuccessTransportista('');
    try {
      const resultado = await consultarRuc(transpRuc);
      if (resultado.estado && resultado.razonSocial) {
        setTranspNombre(resultado.razonSocial);
        setSuccessTransportista('Transportista encontrado');
        setErrorTransportista('');
      } else {
        setErrorTransportista(resultado.mensaje || 'No se encontró el RUC');
        setSuccessTransportista('');
      }
    } catch (err) {
      console.error('Error consultando RUC:', err);
      setErrorTransportista('Error al buscar transportista. Ingrese el nombre manualmente.');
      setSuccessTransportista('');
    } finally {
      setBuscandoTransportista(false);
    }
  };

  // Buscar conductor por DNI
  const buscarConductor = async () => {
    if (!condDni || condDni.length !== 8) {
      setErrorConductor('DNI debe tener 8 dígitos');
      setSuccessConductor('');
      return;
    }
    setBuscandoConductor(true);
    setErrorConductor('');
    setSuccessConductor('');
    try {
      const resultado = await consultarDni(condDni);
      if (resultado.estado && resultado.nombres && resultado.apellidoPaterno) {
        setCondNombres(resultado.nombres);
        setCondApellidos(`${resultado.apellidoPaterno} ${resultado.apellidoMaterno || ''}`.trim());
        setSuccessConductor('Conductor encontrado');
        setErrorConductor('');
      } else {
        setErrorConductor(resultado.mensaje || 'No se encontró el DNI');
        setSuccessConductor('');
      }
    } catch (err) {
      console.error('Error consultando DNI:', err);
      setErrorConductor('Error al buscar conductor. Ingrese el nombre manualmente.');
      setSuccessConductor('');
    } finally {
      setBuscandoConductor(false);
    }
  };

  // Cargar datos desde comprobante seleccionado (solo para VENTA)
  const cargarDesdeComprobante = async (comprobanteId: string) => {
    if (!comprobanteId) {
      // Limpiar si deselecciona
      setDestNroDoc('');
      setDestNombre('');
      setDestTipoDoc('6');
      setItems([]);
      return;
    }
    
    try {
      const data = await getComprobanteConDetalle(Number(comprobanteId));

      // Cargar destinatario
      if (data.receptorNroDoc && data.receptorNombre) {
        setDestNroDoc(data.receptorNroDoc);
        setDestNombre(data.receptorNombre);
        // Detectar tipo de documento
        if (data.receptorNroDoc.length === 11) {
          setDestTipoDoc('6'); // RUC
        } else if (data.receptorNroDoc.length === 8) {
          setDestTipoDoc('1'); // DNI
        }
      }

      // Cargar items
      if (data.items && data.items.length > 0) {
        const itemsGuia = data.items.map((item: { codigo?: string; descripcion: string; unidad?: string; cantidad: number }) => ({
          codigo: item.codigo || undefined,
          descripcion: item.descripcion,
          unidad: item.unidad || 'NIU',
          cantidad: item.cantidad
        }));
        setItems(itemsGuia);
      }
    } catch (error) {
      console.error('Error cargando comprobante:', error);
      alert('Error al cargar los datos del comprobante');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSuccess('');

    // Validaciones según motivo
    if (motivoCodigo === '01') {
      // VENTA: debe seleccionar comprobante
      if (!comprobanteRelacionadoId) {
        setModalError('Para ventas debe seleccionar una factura o boleta');
        return;
      }
    }
    
    if (motivoCodigo === '13' && !motivoOtro.trim()) {
      setModalError('Debe especificar el motivo personalizado');
      return;
    }
    if (partidaUbigeo && partidaUbigeo.length !== 6) {
      setModalError('Ubigeo de partida debe tener 6 dígitos');
      return;
    }
    if (llegadaUbigeo && llegadaUbigeo.length !== 6) {
      setModalError('Ubigeo de llegada debe tener 6 dígitos');
      return;
    }
    if (!destNroDoc || !destNombre) {
      setModalError('Complete datos del destinatario');
      return;
    }
    if (modalidad === '01' && (!transpRuc || !transpNombre)) {
      setModalError('Complete datos del transportista (modalidad pública)');
      return;
    }
    if (modalidad === '02' && (!condDni || !condNombres || !condApellidos || !vehiculoPlaca || !condLicencia)) {
      setModalError('Complete datos del conductor y vehículo (modalidad privada)');
      return;
    }
    if (items.length === 0) {
      setModalError('Agregue al menos un item');
      return;
    }

    const peso = parseFloat(pesoBruto);
    if (!peso || peso <= 0) {
      setModalError('Peso bruto inválido');
      return;
    }

    const request: GuiaRemisionRequest = {
      fechaEmision,
      fechaInicioTraslado: fechaTraslado,
      motivoTrasladoCodigo: motivoCodigo,
      motivoTrasladoDescripcion: motivoCodigo === '13' ? motivoOtro : MOTIVOS_TRASLADO[motivoCodigo],
      modalidadTransporte: modalidad,
      pesoBrutoTotal: peso,
      numeroBultos: parseInt(numBultos),
      partidaUbigeo,
      partidaDireccion,
      llegadaUbigeo,
      llegadaDireccion,
      destinatarioTipoDoc: destTipoDoc,
      destinatarioNroDoc: destNroDoc,
      destinatarioNombre: destNombre,
      items
    };

    // Agregar datos según modalidad
    if (modalidad === '01') {
      request.transportistaTipoDoc = '6';
      request.transportistaNroDoc = transpRuc;
      request.transportistaNombre = transpNombre;
    } else {
      request.conductorTipoDoc = '1';
      request.conductorNroDoc = condDni;
      request.conductorNombres = condNombres;
      request.conductorApellidos = condApellidos;
      request.conductorLicencia = condLicencia;
      request.vehiculoPlaca = vehiculoPlaca;
      request.vehiculoMarca = vehiculoMarca;
    }

    try {
      setLoading(true);
      await emitirGuiaRemision(request);
      setSuccess('Guía de remisión emitida correctamente');
      setShowModal(false);
      setModalError('');
      resetForm();
      await cargarDatos();
    } catch (err) {
      setModalError(getErrorMessage(err, 'Error al emitir guía'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFechaEmision(new Date().toISOString().substring(0, 16));
    setFechaTraslado(new Date().toISOString().substring(0, 16));
    setMotivoCodigo('01');
    setMotivoOtro('');
    setComprobanteRelacionadoId('');
    setModalidad('02');
    setPesoBruto('');
    setNumBultos('1');
    setPartidaUbigeo('');
    setPartidaDireccion('');
    setLlegadaUbigeo('');
    setLlegadaDireccion('');
    setDestTipoDoc('6');
    setDestNroDoc('');
    setDestNombre('');
    setTranspRuc('');
    setTranspNombre('');
    setCondDni('');
    setCondNombres('');
    setCondApellidos('');
    setCondLicencia('');
    setVehiculoPlaca('');
    setVehiculoMarca('');
    setItems([]);
  };

  const descargarPdf = (id: number) => {
    window.open(`/api/v1/comprobantes/${id}/files/pdf`, '_blank');
  };

  const descargarXml = (id: number) => {
    window.open(`/api/v1/comprobantes/${id}/files/xml`, '_blank');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Guías de Remisión</h1>
        <button
          onClick={() => { setModalError(''); setShowModal(true); }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Nueva Guía
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Lista de guías */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : guias.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay guías registradas
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Serie-Número</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Fecha Emisión</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Destinatario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {guias.map(guia => (
                <tr key={guia.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">
                    {guia.serie}-{guia.correlativo.toString().padStart(8, '0')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(guia.fechaEmision).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>{guia.receptorNombre}</div>
                    <div className="text-xs text-gray-500">{guia.receptorNroDoc}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      guia.estado === 'ACEPTADO' ? 'bg-green-100 text-green-800' :
                      guia.estado === 'RECIBIDO' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {guia.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => descargarPdf(guia.id)}
                      className="mr-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => descargarXml(guia.id)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      XML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva Guía */}
      <Modal 
        isOpen={showModal} 
        title="Nueva Guía de Remisión" 
        onClose={() => { setShowModal(false); setModalError(''); }} 
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensaje de error dentro del modal */}
            {modalError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                <p className="font-medium">Error</p>
                <p>{modalError}</p>
              </div>
            )}

            {/* VENTA: Selector de Factura OBLIGATORIO */}
            {motivoCodigo === '01' && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <label className="block text-sm font-semibold text-green-900 mb-2">
                  Seleccionar Factura/Boleta (OBLIGATORIO) *
                </label>
                <select
                  value={comprobanteRelacionadoId}
                  onChange={e => {
                    setComprobanteRelacionadoId(e.target.value);
                    cargarDesdeComprobante(e.target.value);
                  }}
                  className="w-full rounded-lg border border-green-300 px-3 py-2"
                  required={motivoCodigo === '01'}
                >
                  <option value="">Seleccionar comprobante...</option>
                  {comprobantes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.serie}-{c.correlativo.toString().padStart(8, '0')} - {c.receptorNombre} - S/ {c.total}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-green-800 font-medium">
                  Destinatario e items se cargan automáticamente del comprobante
                </p>
              </div>
            )}

            {/* COMPRA/OTROS: Ingreso Manual de Proveedor */}
            {(motivoCodigo === '02' || motivoCodigo === '13') && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h3 className="font-semibold text-purple-900 mb-3">
                  Proveedor/Origen
                </h3>
                
                {/* Buscador de Proveedor Registrado */}
                <div className="mb-4 relative" onClick={e => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-purple-900 mb-1">
                    Buscar Proveedor Registrado (Opcional)
                  </label>
                  <input
                    type="text"
                    value={busquedaProveedor}
                    onChange={e => {
                      const valor = e.target.value.toUpperCase();
                      setBusquedaProveedor(valor);
                      if (valor.length >= 1) {
                        const filtrados = proveedores.filter(p => 
                          p.razonSocial.toUpperCase().includes(valor) ||
                          p.numeroDocumento.includes(valor)
                        ).slice(0, 10);
                        setProveedoresFiltrados(filtrados);
                        setMostrarSugerencias(true);
                      } else {
                        // Mostrar todos los proveedores al hacer clic sin escribir nada
                        setProveedoresFiltrados(proveedores.slice(0, 10));
                        setMostrarSugerencias(proveedores.length > 0);
                      }
                    }}
                    onFocus={() => {
                      // Al hacer focus, mostrar los primeros proveedores
                      if (busquedaProveedor.length === 0) {
                        setProveedoresFiltrados(proveedores.slice(0, 10));
                        setMostrarSugerencias(proveedores.length > 0);
                      } else if (busquedaProveedor.length >= 1) {
                        setMostrarSugerencias(true);
                      }
                    }}
                    placeholder="Escribe RUC o nombre del proveedor..."
                    className="w-full rounded-lg border border-purple-300 px-3 py-2 uppercase"
                  />
                  {/* Sugerencias */}
                  {mostrarSugerencias && proveedoresFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-purple-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {proveedoresFiltrados.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            seleccionarProveedor(p.id.toString());
                            setBusquedaProveedor(`${p.numeroDocumento} - ${p.razonSocial}`);
                            setMostrarSugerencias(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-purple-100 border-b border-purple-100 last:border-0"
                        >
                          <span className="font-medium text-purple-900">
                            {p.tipoDocumento === '6' ? 'RUC' : 'DNI'}: {p.numeroDocumento}
                          </span>
                          <span className="text-gray-600 ml-2">{p.razonSocial}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {mostrarSugerencias && proveedoresFiltrados.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-purple-300 rounded-lg shadow-lg p-3 text-gray-500 text-sm">
                      {proveedores.length === 0 
                        ? 'No hay proveedores registrados. Ingresa los datos manualmente abajo.'
                        : 'No se encontraron proveedores con ese criterio'
                      }
                    </div>
                  )}
                </div>

                {/* Ingreso Manual o Búsqueda */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-1">
                      Tipo Doc *
                    </label>
                    <select
                      value={destTipoDoc}
                      onChange={e => setDestTipoDoc(e.target.value)}
                      className="w-full rounded-lg border border-purple-300 px-3 py-2"
                      required
                    >
                      <option value="6">RUC</option>
                      <option value="1">DNI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-1">
                      Número *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={destNroDoc}
                        onChange={e => setDestNroDoc(e.target.value)}
                        className="flex-1 rounded-lg border border-purple-300 px-3 py-2"
                        maxLength={destTipoDoc === '6' ? 11 : 8}
                        required
                      />
                      <button
                        type="button"
                        onClick={buscarProveedor}
                        disabled={buscandoProveedor || !destNroDoc}
                        className="rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-700 disabled:opacity-50 text-sm whitespace-nowrap"
                        title="Buscar en API externa"
                      >
                        {buscandoProveedor ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    {/* Mensajes de error/éxito locales */}
                    {errorProveedor && (
                      <p className="mt-1 text-xs text-red-600">{errorProveedor}</p>
                    )}
                    {successProveedor && (
                      <p className="mt-1 text-xs text-green-600">{successProveedor}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-900 mb-1">
                      Razón Social/Nombre *
                    </label>
                    <input
                      type="text"
                      value={destNombre}
                      onChange={e => setDestNombre(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-purple-300 px-3 py-2 uppercase"
                      required
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-purple-800 italic">
                  Este es el origen del traslado. El destinatario es tu empresa.
                </p>
              </div>
            )}

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Emisión *
                </label>
                <input
                  type="datetime-local"
                  value={fechaEmision}
                  onChange={e => setFechaEmision(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio Traslado *
                </label>
                <input
                  type="datetime-local"
                  value={fechaTraslado}
                  onChange={e => setFechaTraslado(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Motivo y Modalidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de Traslado *
                </label>
                <select
                  value={motivoCodigo}
                  onChange={e => setMotivoCodigo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                >
                  {Object.entries(MOTIVOS_TRASLADO).map(([cod, desc]) => (
                    <option key={cod} value={cod}>{cod} - {desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modalidad de Transporte *
                </label>
                <select
                  value={modalidad}
                  onChange={e => setModalidad(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="01">01 - Transporte Público</option>
                  <option value="02">02 - Transporte Privado</option>
                </select>
              </div>
            </div>

            {/* Motivo Personalizado (solo si es "13 - Otros") */}
            {motivoCodigo === '13' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especificar Motivo *
                </label>
                <input
                  type="text"
                  value={motivoOtro}
                  onChange={e => setMotivoOtro(e.target.value.toUpperCase())}
                  placeholder="Ej: TRASLADO POR EXHIBICIÓN"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase"
                  required={motivoCodigo === '13'}
                />
              </div>
            )}

            {/* Peso y Bultos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso Bruto Total (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pesoBruto}
                  onChange={e => setPesoBruto(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Bultos *
                </label>
                <input
                  type="number"
                  value={numBultos}
                  onChange={e => setNumBultos(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Partida */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Punto de Partida</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubigeo (6 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={partidaUbigeo}
                    onChange={e => setPartidaUbigeo(e.target.value.replace(/\D/g, ''))}
                    placeholder="150101 (Opcional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Opcional. SUNAT solo requiere la dirección completa
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={partidaDireccion}
                    onChange={e => setPartidaDireccion(e.target.value.toUpperCase())}
                    placeholder="SE AUTO-RELLENA CON DIRECCIÓN DE LA EMPRESA"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase"
                    required
                  />
                  <p className="mt-1 text-xs text-red-600">
                    Obligatorio: Dirección completa de origen
                  </p>
                </div>
              </div>
            </div>

            {/* Llegada */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Punto de Llegada</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubigeo (6 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={llegadaUbigeo}
                    onChange={e => setLlegadaUbigeo(e.target.value.replace(/\D/g, ''))}
                    placeholder="150101 (Opcional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Opcional. SUNAT solo requiere la dirección completa
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={llegadaDireccion}
                    onChange={e => setLlegadaDireccion(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase"
                    required
                  />
                  <p className="mt-1 text-xs text-red-600">
                    Obligatorio: Dirección completa de destino
                  </p>
                </div>
              </div>
            </div>


            {/* Transporte Público */}
            {modalidad === '01' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="font-semibold text-blue-900 mb-3">Transportista (Público)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      RUC *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={transpRuc}
                        onChange={e => setTranspRuc(e.target.value)}
                        className="flex-1 rounded-lg border border-blue-300 px-3 py-2"
                        maxLength={11}
                        required={modalidad === '01'}
                      />
                      <button
                        type="button"
                        onClick={buscarTransportista}
                        disabled={buscandoTransportista || !transpRuc}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50 text-sm"
                        title="Buscar RUC"
                      >
                      {buscandoTransportista ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    {/* Mensajes de error/éxito locales */}
                    {errorTransportista && (
                      <p className="mt-1 text-xs text-red-600">{errorTransportista}</p>
                    )}
                    {successTransportista && (
                      <p className="mt-1 text-xs text-green-600">{successTransportista}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Razón Social *
                    </label>
                    <input
                      type="text"
                      value={transpNombre}
                      onChange={e => setTranspNombre(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-blue-300 px-3 py-2 uppercase"
                      required={modalidad === '01'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Transporte Privado */}
            {modalidad === '02' && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <h3 className="font-semibold text-orange-900 mb-3">Conductor y Vehículo (Privado)</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-1">
                      DNI Conductor *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={condDni}
                        onChange={e => setCondDni(e.target.value)}
                        className="flex-1 rounded-lg border border-orange-300 px-3 py-2"
                        maxLength={8}
                        required={modalidad === '02'}
                      />
                      <button
                        type="button"
                        onClick={buscarConductor}
                        disabled={buscandoConductor || !condDni}
                        className="rounded-lg bg-orange-600 px-3 py-2 text-white hover:bg-orange-700 disabled:opacity-50 text-sm"
                        title="Buscar DNI"
                      >
                        {buscandoConductor ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    {/* Mensajes de error/éxito locales */}
                    {errorConductor && (
                      <p className="mt-1 text-xs text-red-600">{errorConductor}</p>
                    )}
                    {successConductor && (
                      <p className="mt-1 text-xs text-green-600">{successConductor}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-1">
                      Licencia *
                    </label>
                    <input
                      type="text"
                      value={condLicencia}
                      onChange={e => setCondLicencia(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-orange-300 px-3 py-2 uppercase"
                      required={modalidad === '02'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-1">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      value={condNombres}
                      onChange={e => setCondNombres(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-orange-300 px-3 py-2 uppercase"
                      required={modalidad === '02'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-1">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      value={condApellidos}
                      onChange={e => setCondApellidos(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-orange-300 px-3 py-2 uppercase"
                      required={modalidad === '02'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-1">
                      Placa Vehículo *
                    </label>
                    <input
                      type="text"
                      value={vehiculoPlaca}
                      onChange={e => setVehiculoPlaca(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-orange-300 px-3 py-2 uppercase"
                      required={modalidad === '02'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-1">
                      Marca Vehículo
                    </label>
                    <input
                      type="text"
                      value={vehiculoMarca}
                      onChange={e => setVehiculoMarca(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-orange-300 px-3 py-2 uppercase"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">Items a Trasladar</h3>
              
              {motivoCodigo === '01' ? (
                /* VENTA: Items cargados automáticamente desde comprobante */
                <div>
                  <div className="mb-3 rounded-lg bg-green-50 border border-green-300 p-3">
                    <p className="text-sm text-green-800">
                      Los items se cargan automáticamente al seleccionar el comprobante
                    </p>
                  </div>
                  {/* Tabla de Items (Read-Only) */}
                  {items.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Código</th>
                          <th className="px-3 py-2 text-left">Descripción</th>
                          <th className="px-3 py-2 text-center">Cantidad</th>
                          <th className="px-3 py-2 text-center">U.M.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.codigo || '-'}</td>
                            <td className="px-3 py-2">{item.descripcion}</td>
                            <td className="px-3 py-2 text-center">{item.cantidad}</td>
                            <td className="px-3 py-2 text-center">{item.unidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-4 text-center text-sm text-gray-500">
                      Seleccione un comprobante para cargar los items
                    </div>
                  )}
                </div>
              ) : (
                /* COMPRA/OTROS: Agregar items manualmente */
                <div>
                  <div className="mb-3 rounded-lg bg-purple-50 border border-purple-300 p-3">
                    <p className="text-sm text-purple-800">
                      Agregue manualmente los productos a trasladar
                    </p>
                  </div>
                  {/* Agregar Item */}
                  <div className="mb-4 flex gap-2">
                    <select
                      value={itemProductoId}
                      onChange={e => setItemProductoId(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="">Seleccionar producto...</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.codigo ? `[${p.codigo}] ` : ''}{p.descripcion}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={itemCantidad}
                      onChange={e => setItemCantidad(e.target.value)}
                      placeholder="Cantidad"
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleAgregarItem}
                      className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                    >
                      Agregar
                    </button>
                  </div>

                  {/* Tabla de Items (Editable) */}
                  {items.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Código</th>
                          <th className="px-3 py-2 text-left">Descripción</th>
                          <th className="px-3 py-2 text-center">Cantidad</th>
                          <th className="px-3 py-2 text-center">U.M.</th>
                          <th className="px-3 py-2 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">{item.codigo || '-'}</td>
                            <td className="px-3 py-2">{item.descripcion}</td>
                            <td className="px-3 py-2 text-center">{item.cantidad}</td>
                            <td className="px-3 py-2 text-center">{item.unidad}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleEliminarItem(idx)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-4 text-center text-sm text-gray-500">
                      No hay items agregados
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Emitiendo...' : 'Emitir Guía'}
              </button>
            </div>
          </form>
        </Modal>
    </div>
  );
};

export default GuiasRemisionPage;
