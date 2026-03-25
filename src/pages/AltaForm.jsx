import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, MapPin } from 'lucide-react';
import { sendToSheet } from '../services/api';

export default function AltaForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const initialExtintorId = location.state?.extintorId || '';

    const [formData, setFormData] = useState({
        nInterno: initialExtintorId, nRecipiente: '', ubicacionSelect: '', ubicacionManual: '', estadoDisponibilidad: '',
        vtoPH: new Date().getFullYear() + 5, vtoCarga: '', capacidad: '10', agente: 'ABC (Polvo químico)',
        remitoProveedor: ''
    });

    useEffect(() => {
        const t = setTimeout(() => { if(inputRef.current) inputRef.current.focus(); }, 150);
        return () => clearTimeout(t);
    }, []);

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
            const prefix = newFormData.ubicacionSelect === 'Locación' ? '' : newFormData.ubicacionSelect;
            const combined = `${prefix} ${newFormData.ubicacionManual}`.trim();
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
                const prefix = newFormData.ubicacionSelect === 'Locación' ? '' : newFormData.ubicacionSelect;
                const combined = `${prefix} ${newFormData.ubicacionManual}`.trim();
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
            // Ya no navegamos a '/', nos quedamos aquí
            setFormData({
                ...formData,
                nInterno: '',
                nRecipiente: '',
                remitoProveedor: ''
            });
            if(inputRef.current) inputRef.current.focus();
        } catch (error) {
            alert('Error guardando extintor');
        } finally {
            setLoading(false);
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 25 }, (_, i) => currentYear - 5 + i);

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2>Alta de Extintor</h2>
                <p>Registra el ingreso de un nuevo extintor o uno recién recargado.</p>
            </header>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Interno / Identificador QR</label>
                    <input ref={inputRef} required name="nInterno" value={formData.nInterno} onChange={handleChange} placeholder="Ej. EXT-050" />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº de Recipiente (Fábrica)</label>
                    <input name="nRecipiente" value={formData.nRecipiente} onChange={handleChange} placeholder="Ej. 129384AB" />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vencimiento PH (Año)</label>
                        <select required name="vtoPH" value={formData.vtoPH} onChange={handleChange}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vencimiento Carga (Mes/Año)</label>
                        <input required type="month" name="vtoCarga" value={formData.vtoCarga} onChange={handleChange} />
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación Asignada (Selector)</label>
                    <select name="ubicacionSelect" value={formData.ubicacionSelect} onChange={handleChange}>
                        <option value="">Selecciona zona...</option>
                        <option value="Base NQN">Base NQN</option>
                        <option value="Base Tratayén">Base Tratayén</option>
                        <option value="Acopio">Acopio</option>
                        <option value="Locación">Nueva Locación (Especificar abajo)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Ubicación Asignada (Detalle manual / GPS)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input name="ubicacionManual" value={formData.ubicacionManual} onChange={handleChange} placeholder="Ej. Pasillo Norte o Nombre de Locación..." style={{ flex: 1, margin: 0 }} />
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

                <button type="submit" className="btn" style={{ marginTop: '1rem' }} disabled={loading}>
                    {loading ? 'Guardando...' : <><Save size={20} /> Registrar Ingreso</>}
                </button>
            </form>
        </div>
    );
}
