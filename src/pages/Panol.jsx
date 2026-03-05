import React, { useState, useEffect } from 'react';
import { Truck, Search, Download, ShieldAlert } from 'lucide-react';
import { sendToSheet } from '../services/api';

export default function Panol() {
    const [extintoresPañol, setExtintoresPañol] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await sendToSheet({ action: 'get_all' });
                if (response.status === 'success') {
                    const altas = response.data || [];
                    const checklist = response.dataChecklist || [];

                    // Mapa para almacenar el estado MÁS RECIENTE de cada extintor
                    const estadoActual = new Map();

                    // 1. Cargar estado inicial desde ALTA
                    altas.forEach(item => {
                        if (item.N_Interno) {
                            estadoActual.set(item.N_Interno, {
                                nInterno: item.N_Interno,
                                nRecipiente: item.N_Recipiente,
                                ubicacion: item.Ubicacion,
                                estado: item.Estado_Disp,
                                fechaBase: item.Timestamp,
                                tipo: item.Agente,
                                capacidad: item.Capacidad
                            });
                        }
                    });

                    // 2. Sobrescribir con el estado más reciente desde CHECKLIST si existe
                    // Ordenamos por fecha para procesar del más antiguo al más nuevo (quedará el último)
                    const checklistOrds = [...checklist].sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));
                    checklistOrds.forEach(item => {
                        if (item.N_Interno && estadoActual.has(item.N_Interno)) {
                            const current = estadoActual.get(item.N_Interno);
                            current.estado = item.Estado_Disp;
                            current.ubicacion = item.Ubicacion;
                            current.ultimaRevision = item.Timestamp;
                        }
                    });

                    // 3. Filtrar SOLO los que están "No Disponible" (En reparación/Pañol)
                    const enPañol = Array.from(estadoActual.values()).filter(ext =>
                        ext.estado && ext.estado.toLowerCase().includes('no disponible')
                    );

                    setExtintoresPañol(enPañol);
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
        (ext.nInterno && ext.nInterno.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ext.nRecipiente && String(ext.nRecipiente).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ext.ubicacion && ext.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleGenerateRemito = () => {
        alert("Generación de comprobante en PDF en desarrollo...");
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

            <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por ID, Recipiente, Ubicación..."
                        style={{ paddingLeft: '2.8rem', margin: 0 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="btn" onClick={handleGenerateRemito} style={{ width: 'auto', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--danger)' }}>
                    <Download size={20} />
                    Remito de Salida
                </button>
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
                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{ext.nInterno} <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 'normal' }}>({ext.capacidad}kg {ext.tipo})</span></h4>
                                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Nº Recipiente: <strong style={{ color: 'var(--text)' }}>{ext.nRecipiente}</strong> | Origen: {ext.ubicacion}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
