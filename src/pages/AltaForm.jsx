import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, MapPin } from 'lucide-react';
import { sendToSheet } from '../services/api';

export default function AltaForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    const initialExtintorId = location.state?.extintorId || '';

    const [formData, setFormData] = useState({
        nInterno: initialExtintorId, nRecipiente: '', ubicacionSelect: '', ubicacionManual: '', estadoDisponibilidad: '',
        vtoPH: '', vtoCarga: '', capacidad: '', agente: '',
        tarjetaIdentificacion: 'B',
        manometro: 'B',
        manijaPalanca: 'B',
        mangueraBoquilla: 'B',
        seguroPrecinto: 'B',
        soporte: 'B',
        estadoRecipiente: 'B',
        senalizacionAcceso: 'B',
        remitoProveedor: ''
    });

    const checklistItems = [
        { name: 'tarjetaIdentificacion', label: 'Placa de identificación' },
        { name: 'manometro', label: 'Manómetro' },
        { name: 'manijaPalanca', label: 'Manija y palanca' },
        { name: 'mangueraBoquilla', label: 'Manguera/boquilla' },
        { name: 'seguroPrecinto', label: 'Seguro/precinto' },
        { name: 'soporte', label: 'Soporte' },
        { name: 'estadoRecipiente', label: 'Estado del recipiente' },
        { name: 'senalizacionAcceso', label: 'Señalización y acceso' }
    ];

    const detectStatus = (ubicacion) => {
        const lower = ubicacion.toLowerCase();
        if (lower.includes('base nqn') || lower.includes('base tratayen') || lower.includes('acopio')) {
            return 'Disponible';
        }
        if (ubicacion.trim() !== '') {
            return 'Afectado a locación';
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        if (name === 'ubicacionSelect' || name === 'ubicacionManual') {
            const combined = `${newFormData.ubicacionSelect} ${newFormData.ubicacionManual}`;
            newFormData.estadoDisponibilidad = detectStatus(combined);
        }

        setFormData(newFormData);
    };

    const getGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const cords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                const manual = formData.ubicacionManual ? formData.ubicacionManual + ` [GPS: ${cords}]` : `[GPS: ${cords}]`;

                let newFormData = { ...formData, ubicacionManual: manual };
                const combined = `${newFormData.ubicacionSelect} ${newFormData.ubicacionManual}`;
                newFormData.estadoDisponibilidad = detectStatus(combined);

                setFormData(newFormData);
            }, () => {
                alert('No se pudo obtener la ubicación GPS. Verifica los permisos.');
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await sendToSheet({ action: 'alta', ...formData });
            alert('Extintor guardado exitosamente');
            navigate('/');
        } catch (error) {
            alert('Error guardando extintor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Alta de Extintor</h2>
                <p>Registra el ingreso de un nuevo extintor o uno recién recargado.</p>
            </header>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Interno / Identificador QR</label>
                    <input required name="nInterno" value={formData.nInterno} onChange={handleChange} placeholder="Ej. EXT-050" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº de Recipiente (Fábrica)</label>
                    <input name="nRecipiente" value={formData.nRecipiente} onChange={handleChange} placeholder="Ej. 129384AB" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación Asignada (Selector)</label>
                    <select name="ubicacionSelect" value={formData.ubicacionSelect} onChange={handleChange}>
                        <option value="">Selecciona zona...</option>
                        <option value="Base NQN">Base NQN</option>
                        <option value="Base Tratayén">Base Tratayén</option>
                        <option value="Acopio">Acopio</option>
                        <option value="Locación">Locación (Especificar abajo)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación Asignada (Detalle manual / GPS)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input name="ubicacionManual" value={formData.ubicacionManual} onChange={handleChange} placeholder="Ej. Pasillo Norte..." style={{ flex: 1, margin: 0 }} />
                        <button type="button" onClick={getGPS} className="btn btn-secondary" style={{ width: 'auto', padding: '0 1rem' }} title="Obtener GPS">
                            <MapPin size={20} />
                        </button>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Estado de Disponibilidad (Autobaseado en ubicación)</label>
                    <select required name="estadoDisponibilidad" value={formData.estadoDisponibilidad} onChange={handleChange}>
                        <option value="">Selecciona...</option>
                        <option value="Disponible">Disponible (Base/Acopio)</option>
                        <option value="Afectado a locación">Afectado a locación (Uso activo)</option>
                        <option value="No Disponible">No Disponible / En Reparación</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Remito Proveedor (Opcional si es ingreso nuevo/reparado)</label>
                    <input name="remitoProveedor" value={formData.remitoProveedor} onChange={handleChange} placeholder="Ej. R-0001-4567" />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vencimiento PH (Mes/Año)</label>
                        <input required type="month" name="vtoPH" value={formData.vtoPH} onChange={handleChange} />
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

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Agente Extintor</label>
                    <select required name="agente" value={formData.agente} onChange={handleChange}>
                        <option value="">Selecciona agente...</option>
                        <option value="ABC (Polvo químico)">ABC (Polvo químico)</option>
                        <option value="BC (CO2)">BC (CO2)</option>
                        <option value="K (Acetato de Potasio)">K (Acetato de Potasio)</option>
                        <option value="Agua">Agua</option>
                        <option value="Halocabón">Halocabón</option>
                    </select>
                </div>

                {/* Lista de chequeo visual B/M/R/NC */}
                <section style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Estado Físico al Ingreso</h3>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span title="Bueno">B</span>
                        <span title="Regular">R</span>
                        <span title="Malo">M</span>
                        <span title="No Corresponde">NC</span>
                    </div>

                    {checklistItems.map((item) => (
                        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                            <span style={{ fontSize: '0.875rem', flex: 1 }}>{item.label}</span>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                {['B', 'R', 'M', 'NC'].map((val) => (
                                    <label key={val} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '28px', height: '28px',
                                        background: formData[item.name] === val ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                                        fontSize: '0.75rem', fontWeight: formData[item.name] === val ? 'bold' : 'normal'
                                    }}>
                                        <input
                                            type="radio"
                                            name={item.name}
                                            value={val}
                                            checked={formData[item.name] === val}
                                            onChange={handleChange}
                                            style={{ display: 'none' }}
                                        />
                                        {val}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                <button type="submit" className="btn" style={{ marginTop: '1rem' }} disabled={loading}>
                    {loading ? 'Guardando...' : <><Save size={20} /> Registrar Ingreso</>}
                </button>
            </form>
        </div>
    );
}
