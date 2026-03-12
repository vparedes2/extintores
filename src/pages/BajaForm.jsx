import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Send } from 'lucide-react';
import { sendToSheet, fetchExtintores } from '../services/api';

export default function BajaForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    // Si venimos del escáner, esto tendrá el N_Recipiente escaneado
    const initialExtintorId = location.state?.extintorId || location.state?.extintorData?.N_Recipiente || '';

    const [formData, setFormData] = useState({
        extintorId: initialExtintorId,
        motivo: '',
        observaciones: '',
        destino: 'Baja Definitiva (Rotura/Descarte)',
        proveedor: 'N/A', // Legacy field no longer used visually
        remitoSalida: 'N/A' // Legacy field no longer used visually
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const allExt = await fetchExtintores();
            const inputId = String(formData.extintorId).toLowerCase().trim();

            // Buscar por N_Recipiente porque ahora es el valor visual principal!
            const realExtintor = allExt.find(ext => ext.N_Recipiente && String(ext.N_Recipiente).toLowerCase().trim() === inputId);

            if (!realExtintor) {
                alert(`Error: El extintor con ID de Fábrica "${formData.extintorId}" no existe en el registro.`);
                setLoading(false);
                return;
            }

            // Ocultamente mandamos el N_Interno al backend
            await sendToSheet({ ...formData, action: 'baja', extintorId: realExtintor.N_Interno });
            alert('Se ha registrado el movimiento del extintor.');
            navigate('/');
        } catch (error) {
            alert('Hubo un error al registrar el movimiento.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Descarte o Extravío (Baja)</h2>
                <p>Registra cuando un extintor se retira definitivamente del sistema (robo, descarte, rotura total).</p>
            </header>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <AlertTriangle color="#ef4444" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#fca5a5' }}>
                        Atención: Una vez que confirmes este movimiento, el extintor dejará de aparecer como "Disponible" en el Dashboard.
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Identificador del Equipo (Nº Fábrica / Recipiente)</label>
                    <input required name="extintorId" value={formData.extintorId} onChange={handleChange} placeholder="Ej. 794074" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Baja</label>
                    <select required name="destino" value={formData.destino} onChange={handleChange}>
                        <option value="Baja Definitiva (Rotura/Descarte)">Baja Definitiva (Rotura / Vida útil vencida)</option>
                        <option value="Robo / Extravío">Robo / Extravío</option>
                        <option value="Vaciado (Uso en Incendio/Simulacro)">Vaciado (Uso en Incendio/Simulacro)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Motivo / Observaciones (Opcional)</label>
                    <textarea
                        name="observaciones"
                        value={formData.observaciones}
                        onChange={handleChange}
                        placeholder="Detalla qué sucedió con este equipo..."
                        rows={4}
                        style={{ resize: 'vertical' }}
                    ></textarea>
                </div>

                <button type="submit" className="btn" style={{ marginTop: '1rem', background: '#eab308' }} disabled={loading}>
                    {loading ? 'Procesando...' : <><Send size={20} /> Confirmar Movimiento</>}
                </button>
            </form>
        </div>
    );
}
