import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Wrench, PackageSearch, Loader, Layers } from 'lucide-react';
import { fetchExtintores } from '../services/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const [loading, setLoading] = useState(true);
    const [extintoresReales, setExtintoresReales] = useState([]);

    // Mock data for initial MVP visualization (Fallback)
    const [stats, setStats] = useState([
        { label: 'Total Registrados', value: 0, icon: <PackageSearch size={24} />, color: '#3b82f6' },
        { label: 'Disponibles O.K.', value: 0, icon: <ShieldCheck size={24} />, color: '#10b981' },
        { label: 'En Recarga', value: 0, icon: <Wrench size={24} />, color: '#f59e0b' },
        { label: 'Vencidos/Baja', value: 0, icon: <ShieldAlert size={24} />, color: '#ef4444' }
    ]);

    useEffect(() => {
        const loadDocs = async () => {
            setLoading(true);
            try {
                // Modified fetchExtintores now acts just as a getter, 
                // but we also need the stats object. We can either parse the raw fetch here
                // or use the proxy directly. Let's hit the proxy since we know it returns {stats, items}.
                const API_URL = import.meta.env.VITE_API_URL || "/api/extintores";
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: 'get_current_state' }),
                });

                const json = await response.json();

                if (json.status === 'success') {
                    setExtintoresReales(json.items || []);
                    const st = json.stats || { total: 0, operativos: 0, reparacion: 0, vencidos: 0 };

                    setStats([
                        { label: 'Total Registrados', value: st.total, icon: <PackageSearch size={24} />, color: '#3b82f6' },
                        { label: 'Operativos O.K.', value: st.operativos, icon: <ShieldCheck size={24} />, color: '#10b981' },
                        { label: 'En Reparación', value: st.reparacion, icon: <Wrench size={24} />, color: '#f59e0b' },
                        { label: 'Vencidos / Baja', value: st.vencidos, icon: <ShieldAlert size={24} />, color: '#ef4444' }
                    ]);
                }
            } catch (error) {
                console.error("Dashboard Stats Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };
        loadDocs();
    }, []);

    const recentActivity = extintoresReales.length > 0
        ? extintoresReales.slice(-3).reverse().map((ext, idx) => ({
            id: idx,
            action: 'Registro en sistema',
            extinguisher: `EXT: ${ext.N_Interno} - ${ext.Estado_Disp || 'S/D'}`,
            time: new Date(ext.Timestamp).toLocaleDateString()
        }))
        : [
            { id: '1', action: 'Visualización Activa', extinguisher: 'Esperando registros...', time: 'Ahora' }
        ];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Dashboard</h2>
                <p>Resumen general del estado de extintores en la empresa.</p>
            </header>

            <section className="grid-stats">
                {stats.map((stat, i) => (
                    <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: stat.color }}>{stat.icon}</span>
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{stat.value}</h3>
                        </div>
                        <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-main)' }}>{stat.label}</p>
                    </div>
                ))}
            </section>

            <section className="glass-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Logística Avanzada</h3>
                <Link to="/mto-batch" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <Layers size={20} />
                    Despacho por Lote (Mantenimiento)
                </Link>
            </section>

            <section className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    Últimos Movimientos
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {recentActivity.map((item) => (
                        <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong style={{ display: 'block', fontSize: '1rem' }}>{item.action}</strong>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{item.extinguisher}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.time}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="glass-card">
                <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                    Extintores Operativos
                </h3>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader className="spin" size={32} color="var(--primary)" />
                    </div>
                ) : extintoresReales.filter(e => {
                    const d = (e.Estado_Disp || "").toLowerCase();
                    return (d.includes("disponible") || d.includes("afectado")) && !d.includes("no disponible");
                }).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>No hay extintores operativos aún.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {extintoresReales
                            .filter(e => {
                                const d = (e.Estado_Disp || "").toLowerCase();
                                return (d.includes("disponible") || d.includes("afectado")) && !d.includes("no disponible");
                            })
                            .map((ext, idx) => (
                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <div>
                                        <strong style={{ display: 'block', fontSize: '1rem' }}>{ext.N_Interno}</strong>
                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>📍 Ubicación: {ext.Ubicacion}</span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '12px' }}>{ext.Estado_Disp}</span>
                                </li>
                            ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
