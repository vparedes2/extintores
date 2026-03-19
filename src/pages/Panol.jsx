import React, { useState, useEffect } from 'react';
import { Truck, Search, Download, ShieldAlert } from 'lucide-react';
import { fetchExtintores, sendToSheet } from '../services/api';

export default function Panol() {
    const [extintoresPañol, setExtintoresPañol] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfName, setPdfName] = useState('');

    // Remito Form State
    const [remitoData, setRemitoData] = useState({
        proveedor: '',
        motivo: 'Mantenimiento General / Recarga'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchExtintores();
                if (data && data.length > 0) {
                    const enPañol = data.filter(ext => {
                        const estado = (ext.Estado_Disp || "").toLowerCase();
                        return estado.includes('reparaci') || estado.includes('recarga') || estado.includes('no disponible');
                    });

                    const mapped = enPañol.map(ext => ({
                        nInterno: ext.N_Interno,
                        nRecipiente: ext.N_Recipiente,
                        ubicacion: ext.Ubicacion,
                        estado: ext.Estado_Disp,
                        tipo: ext.Agente,
                        capacidad: ext.Capacidad,
                        // Copias exactas para el backend GAS (export_remito)
                        N_Interno: ext.N_Interno,
                        N_Recipiente: ext.N_Recipiente,
                        Capacidad: ext.Capacidad,
                        Agente: ext.Agente,
                        Vto_PH: ext.Vto_PH,
                        Vto_Carga: ext.Vto_Carga
                    }));

                    setExtintoresPañol(mapped);
                }
            } catch (error) {
                console.error("Error fetching pañol data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredList = extintoresPañol.filter(ext =>
        (ext.nInterno && String(ext.nInterno).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ext.nRecipiente && String(ext.nRecipiente).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ext.ubicacion && String(ext.ubicacion).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleGenerateRemito = async () => {
        if (filteredList.length === 0) {
            alert("No hay extintores en la lista para generar un remito.");
            return;
        }
        if (!remitoData.proveedor.trim()) {
            alert('Por favor, especifica el Proveedor destino antes de generar el remito.');
            return;
        }

        setDownloading(true);
        setPdfUrl(null);
        try {
            const response = await sendToSheet({
                action: 'export_remito',
                extintores: filteredList,
                proveedor: remitoData.proveedor,
                motivo: remitoData.motivo
            });

            if (response && response.pdfBase64) {
                const byteCharacters = atob(response.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const finalBlobUrl = URL.createObjectURL(blob);

                setPdfUrl(finalBlobUrl);
                setPdfName(response.fileName || 'Remito_Salida.pdf');
            } else {
                alert('Error al generar el remito: ' + (response?.message || 'Respuesta vacía'));
            }
        } catch (error) {
            console.error("Error generating remito", error);
            alert("Fallo la conexión con el servidor al generar el remito.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Pañol & Logística</h2>
                    <p>Control de extintores en mantenimiento exterior.</p>
                </div>
                <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold' }}>
                    {extintoresPañol.length} en proceso
                </div>
            </header>
            <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Generar Remito de Salida a Proveedor</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Nombre del Proveedor (Ej. Matafuegos Sur)"
                        value={remitoData.proveedor}
                        onChange={(e) => setRemitoData({ ...remitoData, proveedor: e.target.value })}
                        style={{ margin: 0 }}
                    />
                    <input
                        type="text"
                        placeholder="Motivo General (Ej. Recarga)"
                        value={remitoData.motivo}
                        onChange={(e) => setRemitoData({ ...remitoData, motivo: e.target.value })}
                        style={{ margin: 0 }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por Nº Fábrica (ej. 794074) p/ filtrar el remito..."
                            style={{ paddingLeft: '2.8rem', margin: 0 }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn" onClick={handleGenerateRemito} disabled={downloading || filteredList.length === 0} style={{ width: 'auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger)' }}>
                        {downloading ? <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'white' }}></div> : <Download size={20} />}
                        Exportar PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                    Cargando inventario del pañol...
                </div>
            ) : filteredList.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <ShieldAlert size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                    <p>No hay extintores registrados en reparación actualmente.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredList.map((ext, idx) => (
                        <div key={idx} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--danger)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '12px', color: 'var(--danger)' }}>
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Fábrica: {ext.nRecipiente || 'S/D'} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'normal' }}>({ext.capacidad}kg {ext.tipo})</span></h4>
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Interno: <span style={{ color: 'var(--text-muted)' }}>{ext.nInterno || 'S/D'}</span> | Origen: {ext.ubicacion}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* VISOR DE PDF REMITO INTEGRADO */}
            {pdfUrl && (
                <div className="glass-card" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--success)' }}>✅ Remito Generado Exitosamente</h3>

                    <div style={{ width: '100%', height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                        <iframe
                            src={pdfUrl}
                            title="Visor de Remito PDF"
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            onClick={() => {
                                const iframe = document.querySelector('iframe[title="Visor de Remito PDF"]');
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
                            Descargar PDF
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
