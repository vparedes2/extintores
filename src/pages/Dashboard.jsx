import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Wrench, PackageSearch, Loader } from 'lucide-react';
import { fetchExtintores } from '../services/api';

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
            const data = await fetchExtintores();
            if (data && data.length > 0) {
                setExtintoresReales(data);

                const parseDate = (d) => new Date(d);
                const now = new Date();

                const total = data.length;
                let operativos = 0;
                let enRecarga = 0;
                let vencidosOBaja = 0;

                data.forEach(ext => {
                    const dispLower = (ext.Estado_Disp || "").toLowerCase();
                    const vtoCargaStr = ext.Vto_Carga;
                    let isVencido = false;

                    if (vtoCargaStr) {
                        // Support MM/YYYY or YYYY-MM
                        let month = 1, year = 2099;
                        if (vtoCargaStr.includes('-')) {
                            const p = vtoCargaStr.split('-');
                            year = parseInt(p[0]); month = parseInt(p[1]);
                        }
                        const vtoCDate = new Date(year, month - 1, 1);
                        if (vtoCDate < now) isVencido = true;
                    }

                    const vtoPH = ext.Vto_PH ? parseInt(ext.Vto_PH) : null;
                    if (vtoPH && vtoPH < now.getFullYear()) isVencido = true;

                    // Lógica estricta de Dashboard
                    if (dispLower.includes('no disponible') || dispLower.includes('reparaci') || dispLower.includes('recarga')) {
                        enRecarga++;
                    } else if (dispLower.includes('baja') || isVencido) {
                        vencidosOBaja++;
                    } else if (dispLower.includes('disponible') || dispLower.includes('afectado')) {
                        operativos++;
                    }
                });

                setStats([
                    { label: 'Total Registrados', value: total, icon: <PackageSearch size={24} />, color: '#3b82f6' },
                    { label: 'Operativos O.K.', value: operativos, icon: <ShieldCheck size={24} />, color: '#10b981' },
                    { label: 'En Reparación', value: enRecarga, icon: <Wrench size={24} />, color: '#f59e0b' },
                    { label: 'Vencidos / Baja', value: vencidosOBaja, icon: <ShieldAlert size={24} />, color: '#ef4444' }
                ]);
            }
            setLoading(false);
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
