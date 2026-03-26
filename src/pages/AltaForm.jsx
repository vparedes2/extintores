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
        const lower = (ubicacion || "").toLowerCase();
        if (lower.includes('base nqn') || lower.includes('base tratayen') || lower.includes('acopio')) {
            return 'Disponible';
        }
        if (lower.includes('vehiculo')) {
            return 'Afectado a Vehículo';
        }
        if (lower.trim() !== '') {
            return 'Afectado a locación';
        }
        return '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        if (name === 'ubicacionSelect' || name === 'ubicacionManual') {
            const prefix = (newFormData.ubicacionSelect === 'Locación' || newFormData.ubicacionSelect === 'Vehículo') ? '' : newFormData.ubicacionSelect;
            const combined = `${prefix} ${newFormData.ubicacionManual}`.trim();
            newFormData.estadoDisponibilidad = detectStatus(combined || newFormData.ubicacionSelect);
        }

        setFormData(newFormData);
    };

    const getGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const cords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                const manual = formData.ubicacionManual ? formData.ubicacionManual + ` [GPS: ${cords}]` : `[GPS: ${cords}]`;

                let newFormData = { ...formData, ubicacionManual: manual };
                const prefix = (newFormData.ubicacionSelect === 'Locación' || newFormData.ubicacionSelect === 'Vehículo') ? '' : newFormData.ubicacionSelect;
                const combined = `${prefix} ${newFormData.ubicacionManual}`.trim();
                newFormData.estadoDisponibilidad = detectStatus(combined || newFormData.ubicacionSelect);

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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Interno / QR</label>
                        <input ref={inputRef} required name="nInterno" value={formData.nInterno} onChange={handleChange} placeholder="Ej. EXT-050" />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Recipiente</label>
                        <input name="nRecipiente" value={formData.nRecipiente} onChange={handleChange} placeholder="Ej. 129384AB" />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>PH (Año)</label>
                        <select required name="vtoPH" value={formData.vtoPH} onChange={handleChange}>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vto Carga</label>
                        <input required type="month" name="vtoCarga" value={formData.vtoCarga} onChange={handleChange} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Capacidad</label>
                        <select name="capacidad" value={formData.capacidad} onChange={handleChange}>
                            <option value="1">1 kg</option>
                            <option value="2.5">2.5 kg</option>
                            <option value="5">5 kg</option>
                            <option value="10">10 kg</option>
                            <option value="25">25 kg</option>
                            <option value="50">50 kg</option>
                            <option value="100">100 kg</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Agente</label>
                        <select name="agente" value={formData.agente} onChange={handleChange}>
                            <option value="ABC (Polvo químico)">ABC (Polvo)</option>
                            <option value="CO2 (Dióxido de carbono)">CO2 (Nieve)</option>
                            <option value="HCFC (Haloclean)">HCFC (Haloclean)</option>
                            <option value="Agua">Agua / Espuma</option>
                            <option value="K (Cocinas)">Clase K</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Zona / Ubicación</label>
                    <select name="ubicacionSelect" value={formData.ubicacionSelect} onChange={handleChange}>
                        <option value="">Selecciona zona...</option>
                        <option value="Base NQN">Base NQN</option>
                        <option value="Base Tratayén">Base Tratayén</option>
                        <option value="Acopio">Acopio</option>
                        <option value="Vehículo">Vehículo (Especificar abajo)</option>
                        <option value="Locación">Nueva Locación (Especificar abajo)</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Detalle / GPS</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input name="ubicacionManual" value={formData.ubicacionManual} onChange={handleChange} placeholder="Patente, Sector, etc." style={{ flex: 1, margin: 0 }} />
                        <button type="button" onClick={getGPS} className="btn btn-secondary" style={{ width: 'auto', padding: '0 1rem' }} title="Obtener GPS">
                            <MapPin size={20} />
                        </button>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Estado Detectado</label>
                    <input readOnly name="estadoDisponibilidad" value={formData.estadoDisponibilidad} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--primary)', fontWeight: 'bold' }} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nº Remito Proveedor (Opcional)</label>
                    <input name="remitoProveedor" value={formData.remitoProveedor} onChange={handleChange} placeholder="Ej. 0001-000234" />
                </div>

                <button disabled={loading} type="submit" className="btn btn-primary" style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {loading ? <Save className="spin" /> : <Save />}
                    {loading ? 'Guardando...' : 'Registrar Extintor'}
                </button>
            </form>
        </div>
    );
}
