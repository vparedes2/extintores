import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Loader, AlertCircle } from 'lucide-react';
import { fetchAppStateWithCache, sendToSheet } from '../services/api';

export default function Configuracion() {
    const [emails, setEmails] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [alertLoading, setAlertLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                await fetchAppStateWithCache(
                    (cached) => { if (cached && cached.correos) setEmails(cached.correos); setLoading(false); },
                    (fresh) => { if (fresh && fresh.correos) setEmails(fresh.correos); setLoading(false); }
                );
            } catch(e) {
                console.error(e);
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newEmail.trim() || !newEmail.includes('@')) return;
        setSaving(true);
        try {
            const res = await sendToSheet({ action: 'add_email', email: newEmail.trim() });
            if (res && res.status === 'success') {
                setEmails([...emails, newEmail.trim()]);
                setNewEmail('');
            } else {
                alert('Error agregando correo: ' + (res?.message || 'Desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de red al agregar correo.');
        } finally {
            setSaving(false);
        }
    };

    const handleDel = async (emailToDelete) => {
        if (!window.confirm(`¿Seguro que deseas dejar de enviar alertas a ${emailToDelete}?`)) return;
        setSaving(true);
        try {
            const res = await sendToSheet({ action: 'del_email', email: emailToDelete });
            if (res && res.status === 'success') {
                setEmails(emails.filter(e => e !== emailToDelete));
            } else {
                alert('Error eliminando: ' + (res?.message || 'Desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de red al eliminar correo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Configuración</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                    Gestiona los destinatarios de las <b>Alertas de Vencimiento</b> (a 30 días) enviadas diariamente por el sistema automático.
                </p>
            </header>

            <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Mail size={24} color="#3b82f6" />
                    <h3 style={{ margin: 0 }}>Correos Autorizados ({emails.length})</h3>
                </div>

                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', width: '100%', alignItems: 'center' }}>
                    <input 
                        type="email" 
                        placeholder="Ej. seguridad@empresa.com" 
                        value={newEmail} 
                        onChange={e => setNewEmail(e.target.value)}
                        required
                        style={{ flex: 1, minWidth: '0' }}
                    />
                    <button type="submit" className="btn" disabled={saving || !newEmail} style={{ width: 'auto', background: '#10b981', color: 'white', padding: '0.75rem 1.5rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {saving ? <Loader className="spin" size={20} /> : <Plus size={20} style={{ margin: 0 }} />}
                    </button>
                </form>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <Loader className="spin" size={32} />
                        <p>Cargando lista segura...</p>
                    </div>
                ) : emails.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <AlertCircle color="#3b82f6" size={32} style={{ margin: '0 auto 1rem' }} />
                        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-main)' }}>Lista Vacía</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nadie está recibiendo alertas proactivas. Agrega un correo arriba.</p>
                    </div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {emails.map((e, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>{e}</span>
                                <button onClick={() => handleDel(e)} disabled={saving} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Eliminar Correo">
                                    <Trash2 size={20} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                    <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={18} color="#f59e0b" />
                        Acciones de Diagnóstico
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Usa este botón para forzar el envío de mails en este momento. 
                        <b> Nota:</b> Para que los mails lleguen solos cada día, debés configurar un "Activador" (Trigger) en Google Apps Script apuntando a la función <code>checkVencimientosYEnviarCorreo</code>.
                    </p>
                    <button 
                        onClick={handleTestAlerts} 
                        disabled={alertLoading} 
                        className="btn btn-secondary" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#f59e0b' }}
                    >
                        {alertLoading ? <Loader className="spin" size={20} /> : <Mail size={20} />}
                        {alertLoading ? 'Procesando alertas...' : 'Probar Envío de Alertas Ahora'}
                    </button>
                </div>
            </div>
        </div>
    );
}
