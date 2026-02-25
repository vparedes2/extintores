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

            if (res.status === 'success' && res.pdfUrl) {
                setPdfUrl(res.pdfUrl);
                // Intentar abrir automáticamente en una pestaña nueva
                window.open(res.pdfUrl, '_blank');
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
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid var(--success)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 'bold' }}>¡PDF Generado exitosamente!</p>
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'underline' }}>
                            Clic aquí para abrir (si no se abrió solo)
                        </a>
                    </div>
                )}
            </form>
        </div>
    );
}
