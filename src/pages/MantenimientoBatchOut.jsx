import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle, Package, Send, Trash2, StopCircle } from 'lucide-react';
import { sendToSheet } from '../services/api';

export default function MantenimientoBatchOut() {
    const [scannedItems, setScannedItems] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        proveedor: '',
        motivo: 'Mantenimiento General / Recarga',
        responsable: '',
        remito: ''
    });
    const [manualId, setManualId] = useState('');

    const qrRef = useRef(null);

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
                    const id = decodedText.trim();
                    setScannedItems(prev => {
                        // Evitar duplicados
                        if (prev.some(item => item.id === id)) return prev;
                        playScanSound();
                        return [...prev, { id, timestamp: new Date() }];
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
        try {
            // Detenemos cámara si estaba activa
            await stopScanner();

            // 1. Enviar salidas individuales en paralelo
            const hoy = new Date().toISOString().split('T')[0];
            const pmises = scannedItems.map(item =>
                sendToSheet({
                    action: 'mto_out',
                    extintorId: item.id,
                    fecha: hoy,
                    proveedor: formData.proveedor,
                    motivo: formData.motivo,
                    observaciones: 'Despacho automático por lote',
                    remito: formData.remito,
                    responsable: formData.responsable
                })
            );

            await Promise.all(pmises);

            // 2. Generar el Remito Consolidado
            // El backend export_remito espera "extintores" como array de objetos con info.
            // Puesto que en el lote capaz no tengamos la información completa (Capacidad, Agente), pasamos el N_Interno al menos.
            const extintoresParaRemito = scannedItems.map(item => ({
                N_Interno: item.id,
                N_Recipiente: '-',
                Capacidad: '',
                Agente: 'S/D',
                Vto_PH: '',
                Vto_Carga: ''
            }));

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

                const link = document.createElement('a');
                link.href = finalBlobUrl;
                link.download = resRemito.fileName || 'Remito_Salida_Lote.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            alert("✅ Lote despachado correctamente y remito generado.");
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
                const id = manualId.trim();
                if (!id) return;
                setScannedItems(prev => {
                    if (prev.some(item => String(item.id).toUpperCase() === id.toUpperCase())) return prev;
                    if (isScanning) playScanSound();
                    return [...prev, { id: id.toUpperCase(), timestamp: new Date() }];
                });
                setManualId('');
            }} className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    placeholder="Escriba el Nº del extintor..."
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-card)' }}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
                    Añadir al Lote
                </button>
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
                                <span><strong>{index + 1}.</strong> ID: {item.id}</span>
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
                    <input
                        type="text"
                        required
                        placeholder="Ej. Matafuegos Sur S.A."
                        value={formData.proveedor}
                        onChange={e => setFormData({ ...formData, proveedor: e.target.value })}
                    />
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
            </form>
        </div>
    );
}
