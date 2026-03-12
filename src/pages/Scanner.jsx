import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Search, Loader, AlertCircle } from 'lucide-react';
import { fetchExtintores } from '../services/api';

export default function Scanner() {
    const [manualCode, setManualCode] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [loadingData, setLoadingData] = useState(true);
    const [dbData, setDbData] = useState([]);

    // El objeto encontrado en la base de datos, si existe
    const [foundExtintor, setFoundExtintor] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        // Precargar la base de datos de extintores
        const loadDocs = async () => {
            setLoadingData(true);
            const data = await fetchExtintores();
            setDbData(data || []);
            setLoadingData(false);
        };
        loadDocs();
    }, []);

    useEffect(() => {
        let scanner = null;

        // Inicializar escáner QR solo cuando los datos hayan cargado y el div "reader" exista
        if (!loadingData && !scanResult) {
            scanner = new Html5QrcodeScanner("reader", {
                qrbox: { width: 250, height: 250 },
                fps: 10
            });

            scanner.render(
                (decodedText) => {
                    handleScanCode(decodedText);
                    scanner.clear(); // Detener al escanear
                },
                (error) => {
                    // Ignorar errores continuos de no detección de QR
                }
            );
        }

        return () => {
            // Limpiar al desmontar o cuando el escáner se oculta
            if (scanner) {
                scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner. ", error));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingData, scanResult]);

    const handleScanCode = (code) => {
        setScanResult(code);

        const searchStr = code.trim().toUpperCase();

        // 1. ALWAYS search by N_Recipiente (Factory Serial) exclusively, per user request.
        let match = dbData.find(e => e.N_Recipiente && e.N_Recipiente.toString().trim().toUpperCase() === searchStr);

        if (match) {
            setFoundExtintor(match);
        } else {
            setFoundExtintor(null);
        }
    };

    const handleManualSearch = (e) => {
        e.preventDefault();
        if (manualCode) {
            handleScanCode(manualCode);
        }
    };

    const handleAction = (action) => {
        // Pasamos el objeto del extintor completo a la siguiente ruta
        // o sólo el ID si es un ALTA nueva
        navigate(`/${action}`, {
            state: {
                extintorId: scanResult,
                extintorData: foundExtintor
            }
        });
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Escáner y Búsqueda</h2>
                <p>Escanea el QR del extintor o ingresa su número interno.</p>
            </header>

            {loadingData && (
                <div style={{ textAlign: 'center', margin: '2rem 0', color: 'var(--primary)' }}>
                    <Loader className="spin" size={32} style={{ display: 'inline-block' }} />
                    <p>Sincronizando Base de Datos...</p>
                </div>
            )}

            {!loadingData && !scanResult ? (
                <>
                    <section className="glass-card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        {/* Contenedor para el lector QR */}
                        <div id="reader" style={{ width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden' }}></div>
                    </section>

                    <section className="glass-card">
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Ingreso Manual</h3>
                        <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="Ej. EXT-012"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                style={{ margin: 0 }}
                            />
                            <button type="submit" className="btn" style={{ width: 'auto' }}>
                                <Search size={20} />
                            </button>
                        </form>
                    </section>
                </>
            ) : !loadingData && scanResult ? (
                <section className="glass-card animate-fade-in" style={{ textAlign: 'center' }}>

                    {foundExtintor ? (
                        <>
                            <div style={{ padding: '2rem 1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Extintor Identificado</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', margin: 0 }}>ID Fábrica: {foundExtintor.N_Recipiente}</p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Capacidad: {foundExtintor.Capacidad}kg | Vto Carga: {foundExtintor.Vto_Carga}</p>
                            </div>

                            <p style={{ marginBottom: '1.5rem' }}>¿Qué acción deseas realizar con este equipo?</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button className="btn" onClick={() => handleAction('checklist')}>📝 Realizar Checklist Inspección</button>

                                {foundExtintor.Estado_Disp && foundExtintor.Estado_Disp.toLowerCase().includes('reparaci') ? (
                                    <button
                                        className="btn"
                                        style={{ background: '#3b82f6', color: 'white' }}
                                        onClick={() => handleAction('mto-in')}
                                    >⬇️ Recibir de Mantenimiento</button>
                                ) : (
                                    <button
                                        className="btn"
                                        style={{ background: '#f59e0b', color: 'black' }}
                                        onClick={() => handleAction('mto-out')}
                                    >⬆️ Enviar a Mantenimiento</button>
                                )}

                                <button className="btn btn-secondary" onClick={() => handleAction('baja')}>🗑️ Dar de Baja Definitiva</button>
                                <button className="btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setScanResult(null)}>Volver a buscar</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ padding: '2rem 1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                <AlertCircle color="#ef4444" size={48} style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Extintor NO Encontrado</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', margin: 0 }}>{scanResult}</p>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Este código no figura en el listado maestro de equipos (Alta).</p>
                            </div>

                            <p style={{ marginBottom: '1.5rem' }}>¿Qué deseas hacer?</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button className="btn" onClick={() => handleAction('alta')}>Dar de Alta Extintor Nuevo</button>
                                <button className="btn btn-secondary" onClick={() => setScanResult(null)}>Volver a buscar</button>
                            </div>
                        </>
                    )}
                </section>
            ) : null}
        </div>
    );
}
