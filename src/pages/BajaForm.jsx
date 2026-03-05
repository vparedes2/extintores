import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Send } from 'lucide-react';
import { sendToSheet, fetchExtintores } from '../services/api';

export default function BajaForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    // Si venimos del escáner, esto tendrá un valor
    const initialExtintorId = location.state?.extintorId || location.state?.extintorData?.N_Interno || '';

    const [formData, setFormData] = useState({
        extintorId: initialExtintorId,
        motivo: '',
        observaciones: '',
        destino: 'Recarga',
        proveedor: '',
        remitoSalida: ''
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
            const exists = allExt.some(ext => String(ext.N_Interno).toLowerCase().trim() === inputId);

            if (!exists) {
                alert(`Error: El extintor "${formData.extintorId}" no existe en el registro. Por favor, verifica el ID o dale de Alta primero.`);
                setLoading(false);
                return;
            }

            await sendToSheet({ action: 'baja', ...formData });
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
                <h2>Baja o Recarga</h2>
                <p>Registra cuando un extintor se vacía, vence, o se retira de servicio.</p>
            </header>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <AlertTriangle color="#ef4444" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#fca5a5' }}>
                        Atención: Una vez que confirmes este movimiento, el extintor dejará de aparecer como "Disponible" en el Dashboard.
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Identificador del Equipo</label>
                    <input required name="extintorId" value={formData.extintorId} onChange={handleChange} placeholder="Escanea o ingresa el código..." />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Movimiento</label>
                    <select required name="destino" value={formData.destino} onChange={handleChange}>
                        <option value="Recarga">Envío a Recarga Anual</option>
                        <option value="Uso">Vaciado por uso (Incendio/Simulacro)</option>
                        <option value="Mantenimiento">Mantenimiento Correctivo / Prueba Hidráulica</option>
                        <option value="Baja Definitiva">Baja Definitiva (Rotura/Descarte)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Proveedor / Destinatario (Opcional)</label>
                    <input name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Ej: Matafuegos SA" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Remito de Salida (Opcional)</label>
                    <input name="remitoSalida" value={formData.remitoSalida} onChange={handleChange} placeholder="Ej: R-0002-1234" />
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
