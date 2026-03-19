import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle, Package, Send, Trash2, StopCircle, X } from 'lucide-react';
import { sendToSheet } from '../services/api';

export default function MantenimientoBatchOut() {
    const [scannedItems, setScannedItems] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfName, setPdfName] = useState('');
    const [formData, setFormData] = useState({
        proveedor: '',
        motivo: 'Mantenimiento General / Recarga',
        responsable: '',
        remito: ''
    });
    const [manualId, setManualId] = useState('');
    const [extintoresDb, setExtintoresDb] = useState({});

    const [proveedores, setProveedores] = useState([]);
    const [showAddProvModal, setShowAddProvModal] = useState(false);
    const [newProvName, setNewProvName] = useState('');
    const [savingProv, setSavingProv] = useState(false);

    const qrRef = useRef(null);

    // Cargar base de datos al iniciar para cruzar datos en el PDF
    useEffect(() => {
        const loadDocs = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || "/api/extintores";
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: 'get_current_state' }),
                });
                const json = await response.json();
                if (json.status === 'success') {
                    if (json.proveedores) {
                        setProveedores(json.proveedores);
                    }
                    if (json.items) {
                        const dbMapNRec = {};
                        json.items.forEach(eq => {
                            if (eq.N_Recipiente) {
                                dbMapNRec[String(eq.N_Recipiente).toUpperCase()] = eq;
                            }
                            if (eq.N_Interno) {
                                dbMapNRec[String(eq.N_Interno).toUpperCase()] = eq; // Fallback para búsqueda manual
                            }
                        });
                        setExtintoresDb(dbMapNRec);
                    }
                }
            } catch (error) {
                console.error("Error cargando BD para el Remito:", error);
            }
        };
        loadDocs();
    }, []);

    const handleSaveNewProvider = async () => {
        if (!newProvName.trim()) return;
        setSavingProv(true);
        try {
            const res = await sendToSheet({ action: "add_proveedor", proveedor: newProvName.trim() });
            if (res && res.status === 'success') {
                setFormData(prev => ({ ...prev, proveedor: newProvName.trim() }));
                setProveedores(prev => [...prev, newProvName.trim()]);
                setShowAddProvModal(false);
                setNewProvName('');
            } else {
                alert("Error guardando proveedor: " + (res?.message || 'Error'));
            }
        } catch (e) {
            alert("Error de conexión al guardar proveedor.");
        } finally {
            setSavingProv(false);
        }
    };

    // Reproducir sonido al escanear
    const playScanSound = () => {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gainNode = context.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, context.currentTime); // A5 note
            osc.connect(gainNode);
            gainNode.connect(context.destination);
            osc.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.1);
            osc.stop(context.currentTime + 0.1);
        } catch (e) { }
    };

    const startScanner = async () => {
        try {
            const html5QrCode = new Html5Qrcode("reader-batch");
            qrRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    const id = decodedText.trim().toUpperCase();
                    // Validate against DB if loaded
                    if (Object.keys(extintoresDb).length > 0) {
                        const eq = extintoresDb[id];
                        if (!eq) return; // Ignore silently in continuous mode

                        const estado = String(eq.Estado_Disp || "").toLowerCase();
                        if (estado.includes('reparaci') || estado.includes('recarga') || estado.includes('baja')) {
                            // Optionally, we could show a toast here, but alerts interrupt scanning.
                            // So we just ignore it for the scanner.
                            return;
                        }
                    }

                    setScannedItems(prev => {
                        // Evitar duplicados
                        if (prev.some(item => String(item.id).toUpperCase() === id)) return prev;
                        playScanSound();
                        return [...prev, { id, nInterno: extintoresDb[id]?.N_Interno || id, timestamp: new Date() }];
                    });
                },
                (errorMessage) => {
                    // Ignorar errores de escaneo continuo
                }
            );
            setIsScanning(true);
        } catch (err) {
            console.error("Error al iniciar el escáner:", err);
            alert("No se pudo iniciar la cámara. Verifica los permisos.");
        }
    };

    const stopScanner = async () => {
        if (qrRef.current && isScanning) {
            try {
                await qrRef.current.stop();
                qrRef.current.clear();
                setIsScanning(false);
            } catch (err) {
                console.error("Error al detener el escáner:", err);
            }
        }
    };

    // Detener cámara al desmontar
    useEffect(() => {
        return () => {
            if (qrRef.current && isScanning) {
                qrRef.current.stop().catch(console.error);
            }
        };
    }, [isScanning]);

    const removeItem = (idToRemove) => {
        setScannedItems(prev => prev.filter(item => item.id !== idToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (scannedItems.length === 0) {
            alert("No has escaneado ningún extintor.");
            return;
        }

        if (!formData.proveedor.trim() || !formData.motivo.trim() || !formData.responsable.trim()) {
            alert("Los campos Proveedor, Motivo y Responsable son obligatorios.");
            return;
        }

        const confirmacion = window.confirm(`Estás a punto de enviar ${scannedItems.length} extintores a mantenimiento en "${formData.proveedor}". ¿Confirmar despacho masivo?`);
        if (!confirmacion) return;

        setLoading(true);
        setPdfUrl(null);
        try {
            // Detenemos cámara si estaba activa
            await stopScanner();

            // 1. Enviar salidas individuales de forma SECUENCIAL para evitar colapsar Google Apps Script
            const hoy = new Date().toISOString().split('T')[0];
            
            for (const item of scannedItems) {
                await sendToSheet({
                    action: 'mto_out',
                    extintorId: item.nInterno || item.id, // Backend strictly requires N_Interno
                    fecha: hoy,
                    proveedor: formData.proveedor,
                    motivo: formData.motivo,
                    observaciones: 'Despacho automático por lote',
                    remito: formData.remito,
                    responsable: formData.responsable
                });
            }

            // 2. Generar el Remito Consolidado
            // Cruzamos el ID escaneado con la base de datos descargada para inyectar Capacidad y Agente reales.
            const extintoresParaRemito = scannedItems.map(item => {
                const idUppercase = String(item.id).toUpperCase();
                const dbInfo = extintoresDb[idUppercase] || {};

                return {
                    N_Interno: item.nInterno || item.id,
                    N_Recipiente: dbInfo.N_Recipiente || dbInfo.N_Interno || '-',
                    Capacidad: dbInfo.Capacidad || '',
                    Agente: dbInfo.Agente || 'S/D',
                    Vto_PH: dbInfo.Vto_PH || '',
                    Vto_Carga: dbInfo.Vto_Carga || ''
                };
            });

            const resRemito = await sendToSheet({
                action: 'export_remito',
                extintores: extintoresParaRemito,
                proveedor: formData.proveedor,
                motivo: formData.motivo
            });

            if (resRemito && resRemito.pdfBase64) {
                const byteCharacters = atob(resRemito.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const finalBlobUrl = URL.createObjectURL(blob);
                setPdfUrl(finalBlobUrl);
                setPdfName(resRemito.fileName || 'Remito_Salida_Lote.pdf');
            } else {
                alert(`Extintores despachados, pero hubo un error generando el PDF: ${resRemito?.message || 'Error desconocido'}. Puedes intentar en la vista Pañol.`);
            }

            setScannedItems([]);
            setFormData({ ...formData, remito: '' }); // resetear remito opcional

        } catch (error) {
            console.error("Error en despacho por lote:", error);
            alert("Hubo un error al procesar el lote o generar el remito.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Despacho Múltiple a Mantenimiento</h2>
                <p>Escanea varios equipos a la vez y genera un único remito de salida.</p>
            </header>

            {/* ZONA DE ESCANEO */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                {!isScanning && !loading && (
                    <button type="button" className="btn btn-secondary" onClick={startScanner} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
                        <Camera size={24} />
                        Activar Cámara / Lector
                    </button>
                )}

                <div id="reader-batch" style={{
                    width: '100%',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: isScanning && !loading ? 'block' : 'none',
                    marginTop: '1rem',
                    border: '2px solid rgba(255,255,255,0.1)'
                }}></div>

                {isScanning && !loading && (
                    <button type="button" onClick={stopScanner} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem auto 0 auto' }}>
                        <StopCircle size={18} /> Detener Cámara
                    </button>
                )}
            </div>

            {/* INGRESO MANUAL */}
            <form onSubmit={(e) => {
                e.preventDefault();
                const id = manualId.trim().toUpperCase();
                if (!id) return;

                // Validate existence
                if (Object.keys(extintoresDb).length > 0) {
                    const eq = extintoresDb[id];
                    if (!eq) {
                        alert(`El extintor Nº ${id} no está en el sistema. Asegúrate de darlo de alta primero.`);
                        return;
                    }

                    const estado = String(eq.Estado_Disp || "").toLowerCase();
                    if (estado.includes('reparaci') || estado.includes('recarga') || estado.includes('baja')) {
                        alert(`El extintor Nº ${id} ya se encuentra "${eq.Estado_Disp}". No puedes enviarlo de nuevo a mantenimiento.`);
                        return;
                    }
                }

                setScannedItems(prev => {
                    if (prev.some(item => String(item.id).toUpperCase() === id)) return prev;
                    if (isScanning) playScanSound();
                    return [...prev, { id: id, nInterno: extintoresDb[id]?.N_Interno || id, timestamp: new Date() }];
                });
                setManualId('');
            }} className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>O añadir manualmente:</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <input
                        type="text"
                        placeholder="Ej: 794074 (Fábrica) o 6 (Interno)"
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        style={{ margin: 0, flex: 1 }}
                    />
                    <button type="submit" className="btn btn-secondary" style={{ width: 'auto', margin: 0, padding: '0.875rem 1.5rem' }}>
                        Añadir
                    </button>
                </div>
            </form>

            {/* LISTA ADQUIRIDA */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
                    <Package className="icon-primary" />
                    Bandeja de Salida ({scannedItems.length})
                </h3>

                {scannedItems.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>La bandeja está vacía. Comienza a escanear extintores.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {scannedItems.map((item, index) => (
                            <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                                <span><strong>{index + 1}.</strong> ID Fábrica: {item.id}</span>
                                <button type="button" onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }}>
                                    <Trash2 size={18} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* FORMULARIO COMÚN */}
            <form onSubmit={handleSubmit} className="glass-card">
                <h3 style={{ marginTop: 0 }}>Parámetros de Despacho</h3>
                <div className="form-group">
                    <label>Proveedor / Empresa</label>
                    <select
                        required
                        value={formData.proveedor}
                        onChange={(e) => {
                            if (e.target.value === '__NEW__') {
                                setShowAddProvModal(true);
                            } else {
                                setFormData({ ...formData, proveedor: e.target.value });
                            }
                        }}
                        className="input-select"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--glass)', color: 'white' }}
                    >
                        <option value="" disabled>Seleccionar Proveedor...</option>
                        {proveedores.map((p, i) => (
                            <option key={i} value={p}>{p}</option>
                        ))}
                        <option value="__NEW__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>＋ Agregar Nuevo Proveedor...</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Motivo Central</label>
                    <select required value={formData.motivo} onChange={e => setFormData({ ...formData, motivo: e.target.value })}>
                        <option value="Mantenimiento General / Recarga">Mantenimiento General / Recarga</option>
                        <option value="Prueba Hidráulica (PH)">Prueba Hidráulica (PH)</option>
                        <option value="Reparación Mecánica">Reparación Mecánica / Cambio de Piezas</option>
                        <option value="Revisión / Auditoría">Revisión / Auditoría</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Responsable de Entrega (Tú)</label>
                    <input
                        type="text"
                        required
                        placeholder="Quien autoriza la salida"
                        value={formData.responsable}
                        onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Nº de Remito Remitente (Opcional)</label>
                    <input
                        type="text"
                        placeholder="Si tienes un talonario manual"
                        value={formData.remito}
                        onChange={e => setFormData({ ...formData, remito: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || scannedItems.length === 0}
                    style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {loading ? <div className="spinner"></div> : <Send size={20} />}
                    {loading ? 'Procesando Lote y Generando PDF...' : `Confirmar y Despachar ${scannedItems.length} equipos`}
                </button>

                {pdfUrl && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid var(--success)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--success)', margin: 0, fontWeight: 'bold' }}>✅ ¡Lote Procesado Exitosamente!</p>
                        </div>

                        {/* VISOR INTEGRADO */}
                        <div style={{ width: '100%', height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                            <iframe
                                src={pdfUrl}
                                title="Visor de Remito Lotes"
                                width="100%"
                                height="100%"
                                style={{ border: 'none' }}
                            />
                        </div>

                        {/* ACCIONES */}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                                onClick={() => {
                                    const iframe = document.querySelector('iframe[title="Visor de Remito Lotes"]');
                                    if (iframe) iframe.contentWindow.print();
                                }}
                            >
                                Imprimir Remito
                            </button>
                            <a
                                href={pdfUrl}
                                download={pdfName}
                                className="btn btn-primary"
                                style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            >
                                Descargar Copia
                            </a>
                        </div>
                    </div>
                )}
            </form>

            {/* Modal para Agregar Proveedor */}
            {showAddProvModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card animate-scale-up" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Registrar Proveedor</h3>
                            <button onClick={e => setShowAddProvModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Nombre de la empresa externa..."
                            value={newProvName}
                            onChange={(e) => setNewProvName(e.target.value)}
                            autoFocus
                        />
                        <button className="btn-primary" onClick={handleSaveNewProvider} disabled={savingProv || !newProvName.trim()} style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                            {savingProv ? <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div> : 'Guardar Proveedor Oficial'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
