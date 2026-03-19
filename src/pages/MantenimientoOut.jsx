import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader, X } from 'lucide-react';
import { sendToSheet, fetchAppState } from '../services/api';

export default function MantenimientoOut() {
    const location = useLocation();
    const navigate = useNavigate();
    const [extintor, setExtintor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        proveedor: '',
        motivo: 'Recarga',
        observaciones: '',
        remito: '',
        responsable: ''
    });

    const [proveedores, setProveedores] = useState([]);
    const [showAddProvModal, setShowAddProvModal] = useState(false);
    const [newProvName, setNewProvName] = useState('');
    const [savingProv, setSavingProv] = useState(false);

    useEffect(() => {
        if (location.state && location.state.extintorData) {
            setExtintor(location.state.extintorData);
        } else {
            navigate('/scanner');
        }

        const loadProveedores = async () => {
            const dataState = await fetchAppState();
            if (dataState && dataState.proveedores) {
                setProveedores(dataState.proveedores);
            }
        };
        loadProveedores();

    }, [location, navigate]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            action: 'mto_out',
            extintorId: extintor.N_Interno,
            ...formData
        };

        try {
            const data = await sendToSheet(payload);

            if (data.status === 'success') {
                setSuccess(true);
                setTimeout(() => navigate('/'), 2000);
            } else {
                alert('Error al enviar a mantenimiento: ' + data.message);
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
                <div style={{ width: '80px', height: '80px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                    <Save color="white" size={40} />
                </div>
                <h2>¡Salida Registrada!</h2>
                <p style={{ color: 'var(--text-muted)' }}>El extintor {extintor.N_Interno} ha sido enviado a {formData.proveedor}.</p>
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
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Salida a Mantenimiento</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Check-out de equipos</p>
                </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
                <h3 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0' }}>{extintor.N_Interno}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Actual: {extintor.Estado_Disp} en {extintor.Ubicacion}</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div className="form-group">
                    <label>Fecha de Salida</label>
                    <input type="date" required value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
                </div>

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
                    <label>Motivo del Servicio</label>
                    <select required value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}>
                        <option value="Recarga">Recarga Anual</option>
                        <option value="Prueba Hidráulica">Prueba Hidráulica (PH)</option>
                        <option value="Reparación">Reparación de piezas rotas</option>
                        <option value="Revisión">Revisión general</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Observaciones al entregar</label>
                    <textarea placeholder="Ej. Manómetro roto, le falta el precinto..." value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>Nº Remito de Salida (Opcional)</label>
                    <input type="text" placeholder="Ej. 0001-000045" value={formData.remito} onChange={(e) => setFormData({ ...formData, remito: e.target.value })} />
                </div>

                <div className="form-group">
                    <label>Responsable que entrega</label>
                    <input type="text" required placeholder="Tu nombre" value={formData.responsable} onChange={(e) => setFormData({ ...formData, responsable: e.target.value })} />
                </div>

                <button type="submit" className="btn" disabled={loading} style={{ background: '#f59e0b', color: '#000', marginTop: '1rem' }}>
                    {loading ? <Loader className="spin" size={20} /> : 'Registrar Salida a Proveedor'}
                </button>
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
