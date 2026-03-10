import React, { useState } from 'react';
import { FileText, Calendar, User } from 'lucide-react';
import { sendToSheet } from '../services/api';

export default function Reportes() {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [inspector, setInspector] = useState('');
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setPdfUrl(null);
        try {
            const res = await sendToSheet({
                action: 'export_pdf',
                fecha: fecha,
                inspector: inspector
            });

            if (res.status === 'success' && res.pdfBase64) {
                // Convertir Base64 a Blob
                const byteCharacters = atob(res.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Crear URL del Blob
                const blobUrl = URL.createObjectURL(blob);
                setPdfUrl(blobUrl);
            } else {
                alert('No se encontraron registros o hubo un error: ' + (res.message || 'Error desconocido'));
            }
        } catch (error) {
            alert('Error conectando con la base de datos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Reportes Diarios</h2>
                <p>Genera un PDF con los checklists realizados en una fecha específica usando la Hoja 3.</p>
            </header>

            <form onSubmit={handleGenerate} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Metadatos básicos */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px' }} />
                            Fecha de Inspección
                        </label>
                        <input
                            type="date"
                            name="fecha"
                            required
                            value={fecha}
                            onChange={e => setFecha(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                            <User size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px' }} />
                            Inspeccionó (Tu nombre)
                        </label>
                        <input
                            type="text"
                            name="inspector"
                            required
                            placeholder="Ej. Juan Pérez"
                            value={inspector}
                            onChange={e => setInspector(e.target.value)}
                        />
                    </div>
                </section>

                <button type="submit" className="btn" style={{ marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? 'Preparando archivo (puede demorar)...' : <><FileText size={20} /> Convertir a PDF</>}
                </button>

                {pdfUrl && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid var(--success)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--success)', margin: 0, fontWeight: 'bold' }}>¡PDF Generado exitosamente!</p>
                        </div>

                        {/* VISOR INTEGRADO */}
                        <div style={{ width: '100%', height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                            <iframe
                                src={pdfUrl}
                                title="Visor de PDF"
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
                                    const iframe = document.querySelector('iframe[title="Visor de PDF"]');
                                    if (iframe) iframe.contentWindow.print();
                                }}
                            >
                                Imprimir
                            </button>
                            <a
                                href={pdfUrl}
                                download={`Reporte_${fecha}.pdf`}
                                className="btn btn-primary"
                                style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            >
                                Descargar Copia
                            </a>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
