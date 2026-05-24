import React, { useState, useEffect } from 'react';
import { Lock, Trash2, Calendar, User, FileText, AlertTriangle, LogOut, Loader, Search, RefreshCw, Eye } from 'lucide-react';
import { fetchAppStateWithCache, sendToSheet } from '../services/api';

export default function Admin() {
    // Auth State
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('admin_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [passcode, setPasscode] = useState('');
    const [loginError, setLoginError] = useState('');

    // App Data State
    const [items, setItems] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [activeTab, setActiveTab] = useState('delete'); // 'delete' or 'checklists'

    // Deletion Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // Checklist PDF State
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [activeChecklistPdf, setActiveChecklistPdf] = useState(null); // { url, date, inspector }

    const handleLogin = (e) => {
        e.preventDefault();
        if (passcode.trim() === '1977') {
            const loggedInUser = { 
                email: 'vparedes2@gmail.com', 
                token: '1977', 
                name: 'Administrador Principal' 
            };
            setUser(loggedInUser);
            localStorage.setItem('admin_user', JSON.stringify(loggedInUser));
            setLoginError('');
            setPasscode('');
        } else {
            setLoginError('Clave incorrecta. Inténtalo de nuevo.');
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('admin_user');
        setSearchQuery('');
        setActiveChecklistPdf(null);
    };

    // Load Extinguishers list and Checklist history
    const loadState = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            await fetchAppStateWithCache(
                (cached) => {
                    if (cached) {
                        setItems(cached.items || []);
                        setChecklists(cached.checklists || []);
                    }
                },
                (fresh) => {
                    if (fresh) {
                        setItems(fresh.items || []);
                        setChecklists(fresh.checklists || []);
                    }
                    setLoadingData(false);
                }
            );
        } catch (err) {
            console.error('Error fetching admin data:', err);
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadState();
    }, [user]);

    // Handle Deletion
    const handleDelete = async (ext) => {
        const extId = ext.N_Recipiente || ext.N_Interno;
        if (!extId) return;

        const confirmMsg = `¿ESTÁS ABSOLUTAMENTE SEGURO?\n\nSe eliminará permanentemente de la base el extintor:\nNº Interno: ${ext.N_Interno || 'S/D'}\nNº Recipiente: ${ext.N_Recipiente || 'S/D'}\nUbicación: ${ext.Ubicacion || 'S/D'}\n\nEsto borrará permanentemente sus registros de ALTA, CHECKLIST, MANTENIMIENTO y BAJA asociados en Google Sheets. Esta acción no se puede deshacer.`;
        if (!window.confirm(confirmMsg)) return;

        setDeletingId(extId);
        try {
            const res = await sendToSheet({
                action: 'delete_equipo',
                extId: extId,
                token: user.token
            });

            if (res && res.status === 'success') {
                alert(res.message || 'Extintor eliminado correctamente.');
                // Forzar recarga del estado fresco
                await loadState();
            } else {
                alert('Fallo al eliminar: ' + (res?.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de red al intentar eliminar el extintor.');
        } finally {
            setDeletingId(null);
        }
    };

    // Handle PDF Consulting
    const handleConsultPdf = async (c) => {
        setGeneratingPdf(true);
        setActiveChecklistPdf(null);
        try {
            const res = await sendToSheet({
                action: 'export_pdf',
                fecha: c.fecha,
                inspector: c.inspector
            });

            if (res && res.status === 'success' && res.pdfBase64) {
                const byteCharacters = atob(res.pdfBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(blob);
                
                setActiveChecklistPdf({
                    url: blobUrl,
                    date: c.fecha,
                    inspector: c.inspector
                });
            } else {
                alert('Error al generar PDF: ' + (res?.message || 'No se encontró el reporte'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de red al consultar el PDF.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    // Filtering inventory
    const filteredItems = items.filter(e => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true; // Show all if query is empty
        const intId = String(e.N_Interno || '').toLowerCase();
        const recId = String(e.N_Recipiente || '').toLowerCase();
        const loc = String(e.Ubicacion || '').toLowerCase();
        return intId.includes(query) || recId.includes(query) || loc.includes(query);
    });

    // Auth screen layout
    if (!user) {
        return (
            <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
                <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h2>Acceso de Administración</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Ingresa la clave autorizada para depurar y ver registros.</p>
                </header>

                <div className="glass-card login-container" style={{ padding: '2rem', borderRadius: '12px' }}>
                    <Lock size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                    
                    <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Clave de Acceso</label>
                            <input
                                type="password"
                                placeholder="Escribe la clave de 4 dígitos"
                                value={passcode}
                                onChange={e => setPasscode(e.target.value)}
                                required
                                style={{ width: '100%', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2rem' }}
                            />
                        </div>

                        {loginError && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
                                ⚠️ {loginError}
                            </p>
                        )}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Panel de Control (Admin)</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Administrador: <b>{user.email}</b></p>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <LogOut size={16} /> Cerrar Sesión
                </button>
            </header>

            <nav className="admin-tabs">
                <button 
                    className={`admin-tab ${activeTab === 'delete' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('delete'); setActiveChecklistPdf(null); }}
                >
                    <Trash2 size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px' }} />
                    Depurar Extintores ({items.length})
                </button>
                <button 
                    className={`admin-tab ${activeTab === 'checklists' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('checklists'); setActiveChecklistPdf(null); }}
                >
                    <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px' }} />
                    Historial de Checklists ({checklists.length})
                </button>
            </nav>

            {loadingData && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader className="spin" size={32} color="var(--primary)" style={{ margin: '0 auto' }} />
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Cargando datos en tiempo real de Google Sheets...</p>
                </div>
            )}

            {/* TAB 1: DEPURACION DE EXTINTORES (LISTADO Y BORRADO DIRECTO) */}
            {activeTab === 'delete' && !loadingData && (
                <section className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Trash2 size={24} color="#ef4444" />
                        <h3 style={{ margin: 0 }}>Listado y Depuración de Equipos</h3>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        A continuación se listan todos los extintores activos en la base de datos. Puedes usar la barra de búsqueda para filtrar rápidamente y presionar el botón de eliminar si el equipo ya no está en servicio y deseas depurar la base.
                    </p>

                    {/* Buscador */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', width: '100%', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="🔍 Buscar por Nº Interno, Nº Recipiente o Ubicación..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="btn btn-secondary" style={{ width: 'auto', margin: 0 }}>
                                Limpiar
                            </button>
                        )}
                        <button onClick={loadState} className="btn btn-secondary" style={{ width: 'auto', margin: 0 }} title="Sincronizar">
                            <RefreshCw size={18} />
                        </button>
                    </div>

                    {filteredItems.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron equipos registrados que coincidan con la búsqueda.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Nº Interno</th>
                                        <th>Nº Recipiente</th>
                                        <th>Ubicación</th>
                                        <th>Agente / Cap.</th>
                                        <th>Estado</th>
                                        <th style={{ textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((ext, idx) => {
                                        const extId = ext.N_Recipiente || ext.N_Interno;
                                        const isDeletingThis = deletingId === extId;
                                        return (
                                            <tr key={idx}>
                                                <td><strong>{ext.N_Interno || 'S/N'}</strong></td>
                                                <td>{ext.N_Recipiente || 'S/N'}</td>
                                                <td>📍 {ext.Ubicacion || 'S/D'}</td>
                                                <td>{ext.Agente || 'S/D'} {ext.Capacidad || ''}</td>
                                                <td>
                                                    <span style={{ 
                                                        fontSize: '0.8rem', 
                                                        color: ext.Estado_Disp?.toLowerCase().includes('disponible') ? 'var(--success)' : '#f59e0b',
                                                        fontWeight: '600'
                                                    }}>
                                                        {ext.Estado_Disp || 'S/D'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleDelete(ext)}
                                                        disabled={deletingId !== null}
                                                        className="btn"
                                                        style={{ 
                                                            background: 'rgba(239, 68, 68, 0.1)', 
                                                            color: '#ef4444', 
                                                            border: '1px solid #ef4444',
                                                            width: 'auto', 
                                                            margin: 0, 
                                                            padding: '0.4rem 0.8rem', 
                                                            fontSize: '0.8rem', 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '0.35rem' 
                                                        }}
                                                    >
                                                        {isDeletingThis ? <Loader className="spin" size={12} /> : <Trash2 size={12} />}
                                                        {isDeletingThis ? 'Borrando...' : 'Eliminar'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* TAB 2: HISTORIAL DE CHECKLISTS */}
            {activeTab === 'checklists' && !loadingData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <section className="glass-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Calendar size={24} color="var(--primary)" />
                            <h3 style={{ margin: 0 }}>Historial de Checklists Realizados</h3>
                        </div>

                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            A continuación se listan las inspecciones de campo agrupadas por fecha e inspector. Haz clic en "Ver PDF" para consultar el reporte oficial de todos los realizados en esa fecha.
                        </p>

                        {checklists.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No se registran inspecciones de checklist aún. Actualiza la Google App Script en tu planilla para cargar el historial.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha de Inspección</th>
                                            <th>Inspector</th>
                                            <th>Equipos Inspeccionados</th>
                                            <th style={{ textAlign: 'center' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {checklists.map((c, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <strong>📅 {c.fecha}</strong>
                                                </td>
                                                <td>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <User size={14} style={{ color: 'var(--text-muted)' }} /> {c.inspector}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--primary)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        {c.cantidad} extintores
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleConsultPdf(c)}
                                                        disabled={generatingPdf}
                                                        className="btn btn-secondary"
                                                        style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        {generatingPdf ? <Loader className="spin" size={12} /> : <Eye size={12} />}
                                                        Ver PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Visor de PDF inline cuando se selecciona */}
                    {generatingPdf && (
                        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}>
                            <Loader className="spin" size={32} color="var(--primary)" />
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Generando reporte PDF consolidado desde Google Sheets...</p>
                        </div>
                    )}

                    {activeChecklistPdf && (
                        <section className="glass-card animate-scale-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--success)' }}>
                                    📄 Reporte PDF: {activeChecklistPdf.date} ({activeChecklistPdf.inspector})
                                </h3>
                                <button 
                                    onClick={() => setActiveChecklistPdf(null)} 
                                    className="btn btn-secondary" 
                                    style={{ width: 'auto', margin: 0, padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                >
                                    Cerrar Vista
                                </button>
                            </div>

                            <div style={{ width: '100%', height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: '1rem' }}>
                                <iframe
                                    src={activeChecklistPdf.url}
                                    title="Visor PDF Histórico"
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
                                        const iframe = document.querySelector('iframe[title="Visor PDF Histórico"]');
                                        if (iframe) iframe.contentWindow.print();
                                    }}
                                >
                                    Imprimir Reporte
                                </button>
                                <a
                                    href={activeChecklistPdf.url}
                                    download={`Checklist_Inspeccion_${activeChecklistPdf.date}_${activeChecklistPdf.inspector.replace(/\s+/g, '_')}.pdf`}
                                    className="btn btn-primary"
                                    style={{ flex: 1, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Descargar PDF
                                </a>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
