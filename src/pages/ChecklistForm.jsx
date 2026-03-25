import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckSquare, MapPin } from 'lucide-react';
import { sendToSheet, fetchExtintores, fetchAppStateWithCache } from '../services/api';

export default function ChecklistForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    // Si venimos del escáner, se envía extintorId que es el N_Recipiente, o extintorData.N_Recipiente
    const initialExtintorId = location.state?.extintorId || location.state?.extintorData?.N_Recipiente || '';
    const initialData = location.state?.extintorData || {};

    // Parsear string de fecha a YYYY-MM para el input type="month"
    let parsedVto = '';
    if (initialData.Vto_Carga) {
        parsedVto = String(initialData.Vto_Carga).substring(0, 7);
    }

    // Parsear Vto_PH para extraer solo el año (los inputs type="number" fallan si hay texto adicional)
    let parsedVtoPH = '';
    if (initialData.Vto_PH) {
        const phStr = String(initialData.Vto_PH);
        // Buscar el primer bloque de 4 dígitos que parezca un año (ej. 2024, 2029)
        const match4 = phStr.match(/(20\d{2})/);
        if (match4) {
            parsedVtoPH = match4[0];
        } else {
            // Si no hay 4 dígitos, buscar 2 dígitos al final o sueltos que parezcan año
            const match2 = phStr.match(/(\d{2})/);
            if (match2) {
                parsedVtoPH = `20${match2[0]}`;
            }
        }
    }

    const [formData, setFormData] = useState({
        extintorId: initialExtintorId,
        nRecipiente: initialData.N_Recipiente || '',
        ubicacion: initialData.Ubicacion || '',
        estadoDisponibilidad: initialData.Estado_Disp || '',
        fecha: new Date().toISOString().split('T')[0],
        inspecciono: '',

        // Dates manually entered
        vencimientoPH: parsedVtoPH,
        vtoCarga: parsedVto,
        capacidad: initialData.Capacidad || '',

        // Checklist Fields (B: Bueno, M: Malo, R: Regular, NC: No Corresponde)
        tarjetaIdentificacion: 'B',
        agenteExtintor: 'B',
        manometro: 'B',
        manijaPalanca: 'B',
        mangueraBoquilla: 'B',
        seguroPrecinto: 'B',
        soporte: 'B',
        estadoRecipiente: 'B',
        senalizacionAcceso: 'B',
    });

    // --- MEJORA: Foco automático robusto ---
    useEffect(() => {
        const t = setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
        }, 100);
        return () => clearTimeout(t);
    }, []);

    // --- MEJORA: Autocompletado automático al ingresar ID ---
    useEffect(() => {
        const lookupDetails = async () => {
            const id = String(formData.extintorId || '').trim().toLowerCase();
            if (id.length < 1) return; // Ahora se activa desde el primer caracter

            try {
                // Usamos fetchAppStateWithCache para traer la base de datos (con SWR)
                await fetchAppStateWithCache(
                    (cached) => { processMatch(cached?.items, id); },
                    (fresh) => { processMatch(fresh?.items, id); }
                );
            } catch (err) {
                console.error("Error en autocompletado:", err);
            }
        };

        const processMatch = (items, searchId) => {
            if (!items) return;
            const match = items.find(e => 
                (e.N_Interno && String(e.N_Interno).toLowerCase() === searchId) ||
                (e.N_Recipiente && String(e.N_Recipiente).toLowerCase() === searchId)
            );

            if (match) {
                setFormData(prev => {
                    // Solo actualizar si no han sido editados o si venimos de un cambio de ID radical
                    // Para simplificar, si encontramos un match exacto, pisamos los metadatos base
                    
                    // Parse PH Year
                    let phYear = '';
                    if (match.Vto_PH) {
                        const m = String(match.Vto_PH).match(/(20\d{2})/);
                        if (m) phYear = m[0];
                    }

                    // Parse Carga Month
                    let cargaMonth = '';
                    if (match.Vto_Carga) {
                        cargaMonth = String(match.Vto_Carga).substring(0, 7);
                    }

                    return {
                        ...prev,
                        nRecipiente: match.N_Recipiente || prev.nRecipiente,
                        ubicacion: match.Ubicacion || prev.ubicacion,
                        vencimientoPH: phYear || prev.vencimientoPH,
                        vtoCarga: cargaMonth || prev.vtoCarga,
                        capacidad: match.Capacidad || prev.capacidad,
                        estadoDisponibilidad: match.Estado_Disp || prev.estadoDisponibilidad
                    };
                });
            }
        };

        lookupDetails();
    }, [formData.extintorId]);
    // -------------------------------------------------------


    const detectStatus = (ubicacionTxt) => {
        const lower = ubicacionTxt.toLowerCase();
        if (lower.includes('base nqn') || lower.includes('base tratayen') || lower.includes('acopio')) {
            return 'Disponible';
        }
        if (ubicacionTxt.trim() !== '') {
            return 'Afectado a locación';
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };
        if (name === 'ubicacion') {
            newFormData.estadoDisponibilidad = detectStatus(value);
        }
        setFormData(newFormData);
    };

    const getGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const cords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                const manual = formData.ubicacion ? formData.ubicacion + ` [GPS: ${cords}]` : `[GPS: ${cords}]`;

                let newFormData = { ...formData, ubicacion: manual };
                newFormData.estadoDisponibilidad = detectStatus(manual);

                setFormData(newFormData);
            }, () => {
                alert('No se pudo obtener la ubicación GPS.');
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const allExt = await fetchExtintores();
            const inputId = String(formData.extintorId).toLowerCase().trim();

            // Buscar por N_Recipiente que es la PK visual actual
            let realExtintor = allExt.find(ext => ext.N_Recipiente && String(ext.N_Recipiente).toLowerCase().trim() === inputId);

            // Fallback al N_Interno por si ingresan el interno manual
            if (!realExtintor) {
                realExtintor = allExt.find(ext => ext.N_Interno && String(ext.N_Interno).toLowerCase().trim() === inputId);
            }

            if (!realExtintor && !initialData.N_Interno) {
                alert(`Error: El extintor con código "${formData.extintorId}" no existe en el sistema.`);
                setLoading(false);
                return;
            }

            const internalId = realExtintor ? realExtintor.N_Interno : initialData.N_Interno;

            await sendToSheet({ ...formData, action: 'checklist', extintorId: internalId });
            alert('Checklist enviado correctamente');
            // navigate('/');
            setFormData(prev => ({ ...prev, extintorId: '', nRecipiente: '' }));
            if(inputRef.current) inputRef.current.focus();
        } catch (error) {
            alert('Error de conexión con la hoja de cálculo');
        } finally {
            setLoading(false);
        }
    };

    const checklistItems = [
        { name: 'tarjetaIdentificacion', label: 'Placa de identificación' },
        { name: 'agenteExtintor', label: 'Agente extintor' },
        { name: 'manometro', label: 'Manómetro' },
        { name: 'manijaPalanca', label: 'Manija y palanca' },
        { name: 'mangueraBoquilla', label: 'Manguera/boquilla' },
        { name: 'seguroPrecinto', label: 'Seguro/precinto' },
        { name: 'soporte', label: 'Soporte' },
        { name: 'estadoRecipiente', label: 'Estado del recipiente' },
        { name: 'senalizacionAcceso', label: 'Señalización y acceso' }
    ];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Checklist Mensual</h2>
                <p>Inspección visual periódica de los equipos.</p>
            </header>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Metadatos básicos */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Identificador (Nº Fábrica o Nº Interno)</label>
                            <input 
                                ref={inputRef}
                                required 
                                name="extintorId" 
                                value={formData.extintorId} 
                                onChange={handleChange} 
                                placeholder="Ej. 794074 o 6" 
                            />
                        </div>
                        <div style={{ flex: 1, display: 'none' }}>
                            {/* Oculto, ya no se usa N_Recipiente manual porque el principal ahora es el fábrica */}
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Recipiente (Legacy)</label>
                            <input name="nRecipiente" value={formData.nRecipiente} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación Exacta / GPS</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input required name="ubicacion" value={formData.ubicacion} onChange={handleChange} placeholder="Sector o coordenadas GPS..." style={{ flex: 1, margin: 0 }} />
                            <button type="button" onClick={getGPS} className="btn btn-secondary" style={{ width: 'auto', padding: '0 1rem' }}>
                                <MapPin size={20} />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Estado de Disponibilidad</label>
                        <select required name="estadoDisponibilidad" value={formData.estadoDisponibilidad} onChange={handleChange}>
                            <option value="">Selecciona...</option>
                            <option value="Disponible">Disponible (Base/Acopio)</option>
                            <option value="Afectado a locación">Afectado a locación (Uso activo)</option>
                            <option value="No Disponible">No Disponible / En Reparación</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fecha</label>
                            <input required type="date" name="fecha" value={formData.fecha} onChange={handleChange} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Inspector</label>
                            <input required name="inspecciono" value={formData.inspecciono} onChange={handleChange} placeholder="Tu nombre..." />
                        </div>
                    </div>
                </section>

                {/* Additional Metadata Fields specifically for Checklist */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vencimiento PH (Año)</label>
                            <input required type="number" name="vencimientoPH" value={formData.vencimientoPH} onChange={handleChange} placeholder="Ej. 2029" min="2000" max="2100" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vencimiento Carga (Mes/Año)</label>
                            <input required type="month" name="vtoCarga" value={formData.vtoCarga} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Capacidad (kg)</label>
                        <select required name="capacidad" value={formData.capacidad} onChange={handleChange}>
                            <option value="">Selecciona capacidad...</option>
                            <option value="1">1 kg</option>
                            <option value="5">5 kg</option>
                            <option value="10">10 kg</option>
                            <option value="25">25 kg</option>
                            <option value="50">50 kg</option>
                        </select>
                    </div>
                </section>

                {/* Lista de chequeo visual B/M/R/NC */}
                <section>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span title="Bueno">B</span>
                        <span title="Regular">R</span>
                        <span title="Malo">M</span>
                        <span title="No Corresponde">NC</span>
                    </div>

                    {checklistItems.map((item) => (
                        <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.875rem' }}>{item.label}</span>
                            <div className="radio-group">
                                {['B', 'R', 'M', 'NC'].map((val) => (
                                    <label key={val}>
                                        <input
                                            type="radio"
                                            name={item.name}
                                            value={val}
                                            checked={formData[item.name] === val}
                                            onChange={handleChange}
                                        />
                                        <span>{val}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                <button type="submit" className="btn" style={{ marginTop: '1rem' }} disabled={loading}>
                    {loading ? 'Enviando...' : <><CheckSquare size={20} /> Guardar Inspección</>}
                </button>
            </form>
        </div>
    );
}
