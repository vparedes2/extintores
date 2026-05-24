import React, { useState, useEffect } from 'react';
import { Lock, Trash2, Calendar, User, FileText, CheckCircle, AlertTriangle, LogOut, Loader, Search, RefreshCw, Key } from 'lucide-react';
import { fetchAppStateWithCache, sendToSheet } from '../services/api';

export default function Admin() {
    // Auth State
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('admin_user');
        return saved ? JSON.parse(saved) : null;
    });
    const [clientId, setClientId] = useState(() => {
        return localStorage.getItem('google_client_id') || '';
    });
    const [clientIdInput, setClientIdInput] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);

    // App Data State
    const [items, setItems] = useState([]);
    const [checklists, setChecklists] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [activeTab, setActiveTab] = useState('delete'); // 'delete' or 'checklists'

    // Deletion Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExtId, setSelectedExtId] = useState('');
    const [deleting, setDeleting] = useState(false);

    // Checklist PDF State
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [activeChecklistPdf, setActiveChecklistPdf] = useState(null); // { url, date }

    // Load google client script dynamically
    useEffect(() => {
        if (!clientId) return;
        
        const loadGoogleScript = () => {
            if (window.google) {
                initGoogleSignIn();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initGoogleSignIn;
            document.head.appendChild(script);
        };

        loadGoogleScript();
    }, [clientId]);

    const initGoogleSignIn = () => {
        if (!window.google) return;
        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleResponse,
                auto_select: false
            });
            window.google.accounts.id.renderButton(
                document.getElementById('googleBtnParent'),
                { theme: 'outline', size: 'large', text: 'signin_with' }
            );
        } catch (err) {
            console.error('Google Sign-In Init Error:', err);
        }
    };

    const handleGoogleResponse = (response) => {
        const credential = response.credential;
        if (!credential) return;

        // Decode JWT
        try {
            const base64Url = credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            
            const email = String(payload.email || '').trim().toLowerCase();
            const name = payload.name || 'Usuario Google';

            if (email === 'vparedes2@gmail.com') {
                const loggedInUser = { email, token: credential, name };
                setUser(loggedInUser);
                localStorage.setItem('admin_user', JSON.stringify(loggedInUser));
            } else {
                alert(`Acceso denegado: El correo ${email} no está autorizado para administrar.`);
            }
        } catch (e) {
            console.error('Error al decodificar credenciales:', e);
            alert('Error al iniciar sesión con Google.');
        }
    };

    const handleSaveClientId = (e) => {
        e.preventDefault();
        if (!clientIdInput.trim()) return;
        localStorage.setItem('google_client_id', clientIdInput.trim());
        setClientId(clientIdInput.trim());
        setShowKeyInput(false);
        alert('Google Client ID guardado. Recargando autenticador...');
    };

    const handleDevBypass = () => {
        const loggedInUser = { 
            email: 'vparedes2@gmail.com', 
            token: 'dev-bypass-vparedes2', 
            name: 'Victor Paredes (Simulado)' 
        };
        setUser(loggedInUser);
        localStorage.setItem('admin_user', JSON.stringify(loggedInUser));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('admin_user');
        setSelectedExtId('');
        // Clean Google credentials cookie if loaded
        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
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
    const handleDelete = async () => {
        if (!selectedExtId) return;
        const ext = items.find(e => e.N_Recipiente === selectedExtId || e.N_Interno === selectedExtId);
        if (!ext) return;

        const confirmMsg = `¿ESTÁS ABSOLUTAMENTE SEGURO?\n\nSe eliminará de la base el extintor:\nNº Interno: ${ext.N_Interno || 'S/D'}\nNº Recipiente: ${ext.N_Recipiente || 'S/D'}\n\nEsto borrará permanentemente sus registros de ALTA, CHECKLIST, MANTENIMIENTO y BAJA asociados. Esta acción no se puede deshacer.`;
        if (!window.confirm(confirmMsg)) return;

        setDeleting(true);
        try {
            const res = await sendToSheet({
                action: 'delete_equipo',
                extId: selectedExtId,
                token: user.token
            });

            if (res && res.status === 'success') {
                alert(res.message || 'Extintor eliminado correctamente.');
                setSelectedExtId('');
                setSearchQuery('');
                // Forzar recarga del estado fresco
                await loadState();
            } else {
                alert('Fallo al eliminar: ' + (res?.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de red al intentar eliminar el extintor.');
        } finally {
            setDeleting(false);
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

    // Filtering inventory for delete autocomplete
    const filteredItems = items.filter(e => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return false; // Show none if empty query
        const intId = String(e.N_Interno || '').toLowerCase();
        const recId = String(e.N_Recipiente || '').toLowerCase();
        const loc = String(e.Ubicacion || '').toLowerCase();
        return intId.includes(query) || recId.includes(query) || loc.includes(query);
    });

    const selectedExt = items.find(e => e.N_Recipiente === selectedExtId || e.N_Interno === selectedExtId);

    // Auth screen layout
    if (!user) {
        return (
            <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
                <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h2>Administración de Sistema</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Acceso restringido para depuración de base de datos.</p>
                </header>

                <div className="glass-card login-container">
                    <Lock size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                    
                    {!clientId ? (
                        <div style={{ width: '100%', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                Para habilitar el inicio de sesión de Google, ingresa tu Client ID de Google Cloud.
                            </p>
                            <form onSubmit={handleSaveClientId} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input
                                    type="text"
                                    placeholder="Google Client ID (.apps.googleusercontent.com)"
                                    value={clientIdInput}
                                    onChange={e => setClientIdInput(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                />
                                <button type="submit" className="btn btn-primary">
                                    <Key size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px' }} />
                                    Guardar Client ID
                                </button>
                            </form>
                            <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>¿En entorno de desarrollo local?</p>
                                <button onClick={handleDevBypass} className="btn btn-secondary" style={{ width: '100%' }}>
                                    Entrar en Modo Simulado (Dev)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                            <div id="googleBtnParent" style={{ minHeight: '40px' }}></div>
                            
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                                Autorizado únicamente para el correo <strong style={{ color: 'var(--text-main)' }}>vparedes2@gmail.com</strong>
                            </p>

                            <div style={{ width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button onClick={() => setShowKeyInput(!showKeyInput)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                                    {showKeyInput ? 'Ocultar ajustes' : '🔑 Cambiar Google Client ID / Usar Bypass'}
                                </button>
                                
                                {showKeyInput && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Ingresa nuevo Client ID"
                                            value={clientIdInput}
                                            onChange={e => setClientIdInput(e.target.value)}
                                            style={{ width: '100%', fontSize: '0.85rem' }}
                                        />
                                        <button onClick={handleSaveClientId} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                            Guardar
                                        </button>
                                        <button onClick={() => {
                                            localStorage.removeItem('google_client_id');
                                            setClientId('');
                                            setShowKeyInput(false);
                                        }} className="btn btn-secondary" style={{ padding: '0.5rem', color: '#ef4444' }}>
                                            Quitar Client ID
                                        </button>
                                        <button onClick={handleDevBypass} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
                                            Usar Bypass Local
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Panel principal una vez autenticado
    return (
        <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2>Panel de Administración</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Sesión activa: <b>{user.email}</b> ({user.name})</p>
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
                    Depurar Extintores
                </button>
                <button 
                    className={`admin-tab ${activeTab === 'checklists' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('checklists'); setActiveChecklistPdf(null); }}
                >
                    <Calendar size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: '-3px' }} />
                    Historial de Checklists
                </button>
            </nav>

            {loadingData && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader className="spin" size={32} color="var(--primary)" style={{ margin: '0 auto' }} />
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Sincronizando con Google Sheets...</p>
                </div>
            )}

            {/* TAB 1: DEPURACION DE EXTINTORES */}
            {activeTab === 'delete' && !loadingData && (
                <section className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Trash2 size={24} color="#ef4444" />
                        <h3 style={{ margin: 0 }}>Eliminar Extintores Definitivamente</h3>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Utiliza este buscador para localizar el extintor que deseas purgar de la base de datos (por ejemplo, aquellos que se desecharon o perdieron sin dejar registro oficial).
                    </p>

                    {/* Buscador */}
                    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <input
                                type="text"
                                placeholder="Escribe Nº Interno, Nº Recipiente o Ubicación para buscar..."
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    if (selectedExtId) setSelectedExtId('');
                                }}
                                style={{ flex: 1 }}
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setSelectedExtId(''); }} className="btn btn-secondary" style={{ width: 'auto', margin: 0 }}>
                                    Limpiar
                                </button>
                            )}
                        </div>

                        {/* Autocomplete List */}
                        {searchQuery && !selectedExtId && filteredItems.length > 0 && (
                            <ul style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: '#1f1f23', border: '1px solid var(--glass-border)',
                                borderRadius: '8px', zIndex: 50, listStyle: 'none',
                                padding: 0, margin: '4px 0 0', maxHeight: '200px', overflowY: 'auto',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                            }}>
                                {filteredItems.map((ext, idx) => (
                                    <li 
                                        key={idx}
                                        onClick={() => {
                                            setSelectedExtId(ext.N_Recipiente || ext.N_Interno);
                                            setSearchQuery(`EXT: ${ext.N_Interno || 'S/D'} (Rec: ${ext.N_Recipiente || 'S/D'})`);
                                        }}
                                        style={{
                                            padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                            fontSize: '0.875rem'
                                        }}
                                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={e => e.target.style.background = 'transparent'}
                                    >
                                        <div>
                                            <strong>{ext.N_Interno || 'S/N'}</strong>
                                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Recipiente: {ext.N_Recipiente || 'S/N'}</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {ext.Ubicacion || 'S/D'}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {searchQuery && !selectedExtId && filteredItems.length === 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: '#1f1f23', border: '1px solid var(--glass-border)',
                                borderRadius: '8px', zIndex: 50, padding: '1rem',
                                color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center'
                            }}>
                                No se encontraron extintores con esa descripción.
                            </div>
                        )}
                    </div>

                    {/* Detalle del Extintor Seleccionado */}
                    {selectedExt && (
                        <div className="animate-scale-in" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Detalles del Equipo Seleccionado:</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Código Interno:</span> <br/>
                                    <strong>{selectedExt.N_Interno || 'No asignado'}</strong>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Código Recipiente / Fábrica:</span> <br/>
                                    <strong>{selectedExt.N_Recipiente || 'No asignado'}</strong>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Ubicación:</span> <br/>
                                    <strong>📍 {selectedExt.Ubicacion || 'S/D'}</strong>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Agente / Capacidad:</span> <br/>
                                    <strong>{selectedExt.Agente || 'S/D'} {selectedExt.Capacidad || ''}</strong>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Disponibilidad / Estado:</span> <br/>
                                    <strong style={{ color: selectedExt.Estado_Disp?.toLowerCase().includes('disponible') ? 'var(--success)' : '#f59e0b' }}>
                                        {selectedExt.Estado_Disp || 'S/D'}
                                    </strong>
                                </p>
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Vencimiento Carga:</span> <br/>
                                    <strong>📅 {selectedExt.Vto_Carga || 'S/D'}</strong>
                                </p>
                            </div>

                            <div className="delete-confirm-box">
                                <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={20} /> ¡Peligro de Borrado Permanente!
                                </h4>
                                <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Al presionar el botón de abajo, se borrará definitivamente este extintor. El sistema buscará y removerá todas sus referencias históricas en las pestañas ALTA, CHECKLIST, MANTENIMIENTO y BAJA de Google Sheets.
                                </p>

                                <button 
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="btn"
                                    style={{ background: '#ef4444', color: 'white', border: 'none', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                                >
                                    {deleting ? <Loader className="spin" size={18} /> : <Trash2 size={18} />}
                                    {deleting ? 'Eliminando equipo...' : 'Eliminar Extintor Definitivamente'}
                                </button>
                            </div>
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
                            A continuación se listan las inspecciones de campo agrupadas por fecha e inspector. Haz clic sobre cualquiera de ellas para cargar y obtener su reporte en PDF oficial.
                        </p>

                        {checklists.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                No se registran inspecciones de checklist aún en el sistema.
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
                                                        {generatingPdf ? <Loader className="spin" size={12} /> : <FileText size={12} />}
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
