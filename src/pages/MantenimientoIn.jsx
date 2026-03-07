import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader } from 'lucide-react';

export default function MantenimientoIn() {
    const location = useLocation();
    const navigate = useNavigate();
    const [extintor, setExtintor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        proveedor: '',
        trabajos: 'Recarga y Mantenimiento Anual',
        vtoCarga: '',
        vtoPH: '',
        checkVisual: true,
        observaciones: '',
        remito: '',
        responsable: ''
    });

    useEffect(() => {
        if (location.state && location.state.extintorData) {
            const eq = location.state.extintorData;
            setExtintor(eq);

            // Sugerir el proveedor donde estaba
            let preProv = eq.Ubicacion || '';
            if (preProv === 'Pañol Central') preProv = '';

            setFormData(prev => ({ ...prev, proveedor: preProv }));
        } else {
            navigate('/scanner');
        }
    }, [location, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            action: 'mto_in',
            extintorId: extintor.N_Interno,
            ...formData
        };

        try {
            const apiUrl = import.meta.env.VITE_API_URL || "https://extintores-api.vercel.app/api/extintores";
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (data.status === 'success') {
                setSuccess(true);
                setTimeout(() => navigate('/'), 2000);
            } else {
                alert('Error al recibir de mantenimiento: ' + data.message);
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    if (!extintor) return null;

    if (success) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ width: '80px', height: '80px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                    <CheckCircle color="white" size={40} />
                </div>
                <h2>¡Recepción Confirmada!</h2>
                <p style={{ color: 'var(--text-muted)' }}>El extintor {extintor.N_Interno} ahora está disponible en Pañol.</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem' }}>
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Recepción de Mantenimiento</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Check-in de equipos reparados</p>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)' }}>
                <h3 style={{ color: '#3b82f6', margin: '0 0 0.5rem 0' }}>{extintor.N_Interno}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Viene de: {extintor.Ubicacion}</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div className="form-group">
                    <label>Fecha de Recepción</label>
                    <input type="date" required value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>Proveedor / Empresa</label>
                    <input type="text" required placeholder="Quién lo trajo de vuelta" value={formData.proveedor} onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>Trabajos Realizados</label>
                    <input type="text" required value={formData.trabajos} onChange={(e) => setFormData({ ...formData, trabajos: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label>Nuevo Vto. Carga</label>
                        <input type="month" required value={formData.vtoCarga} onChange={(e) => setFormData({ ...formData, vtoCarga: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Nuevo Vto. PH (Año)</label>
                        <input type="number" required placeholder="Ej. 2030" value={formData.vtoPH} onChange={(e) => setFormData({ ...formData, vtoPH: e.target.value })} />
                    </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <input
                        type="checkbox"
                        id="chk_visual"
                        checked={formData.checkVisual}
                        onChange={(e) => setFormData({ ...formData, checkVisual: e.target.checked })}
                        style={{ width: '20px', height: '20px', margin: 0 }}
                    />
                    <label htmlFor="chk_visual" style={{ margin: 0, fontSize: '0.95rem', cursor: 'pointer' }}>
                        Recepción Conforme (Manómetro OK, precinto y seguro colocados)
                    </label>
                </div>

                <div className="form-group">
                    <label>Observaciones al recibir</label>
                    <textarea placeholder="Detalles extra..." value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>Nº Remito de Proveedor / Certificado</label>
                    <input type="text" required placeholder="Ej. R-00021" value={formData.remito} onChange={(e) => setFormData({ ...formData, remito: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>Responsable que recibe</label>
                    <input type="text" required placeholder="Tu nombre" value={formData.responsable} onChange={(e) => setFormData({ ...formData, responsable: e.target.value })} />
                </div>

                <button type="submit" className="btn" disabled={loading} style={{ background: '#3b82f6', color: '#fff', marginTop: '1rem' }}>
                    {loading ? <Loader className="spin" size={20} /> : 'Registrar Ingreso a Pañol'}
                </button>
            </form>
        </div>
    );
}
