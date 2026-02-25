const API_URL = "https://script.google.com/macros/s/AKfycbw0WwAq3VPVy8KKxVWGuIoNil6j6Y87NPm53ZMp6d21mR8frXixdHvaittpl8eMkwDU6A/exec";

export const sendToSheet = async (data) => {
    if (!API_URL) {
        console.warn("API_URL no configurada. Simulando envío:", data);
        return new Promise((resolve) => setTimeout(() => resolve({ status: 'success' }), 1000));
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            // Es importante usar 'text/plain' para evitar problemas de CORS por defecto con GAS
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(data),
        });

        return await response.json();
    } catch (error) {
        console.error("Error enviando datos:", error);
        throw error;
    }
};

export const fetchExtintores = async () => {
    if (!API_URL) {
        console.warn("API_URL no configurada. Devolviendo datos vacíos.");
        return [];
    }

    try {
        // Ejecutamos un POST especial con action='get_all' para evitar bloqueos CORS
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({ action: 'get_all' }),
        });

        const json = await response.json();

        if (json.status === 'success') {
            const altas = json.data || [];
            const bajas = json.dataBaja || [];
            const checklists = json.dataChecklist || [];

            // Combinar la historia para encontrar el estado real final
            const equipos = new Map();

            // 1. Cargar base inicial de ALTA
            altas.forEach(a => {
                equipos.set(String(a.N_Interno).trim(), { ...a, Ultimo_Movimiento: new Date(a.Timestamp) });
            });

            // 2. Mapear CHECKLISTS (Actualizan ubicación y estado de disponibilidad)
            checklists.forEach(c => {
                const id = String(c.N_Interno).trim();
                const ts = new Date(c.Timestamp);
                if (equipos.has(id)) {
                    let eq = equipos.get(id);
                    if (ts > eq.Ultimo_Movimiento) {
                        eq.Estado_Disp = c.Estado_Disp;
                        eq.Ubicacion = c.Ubicacion;
                        eq.Vto_Carga = c.Vto_Carga;
                        eq.Ultimo_Movimiento = ts;
                        equipos.set(id, eq);
                    }
                }
            });

            // 3. Mapear BAJAS (Sobrescriben el estado a "No Disponible" o similar)
            bajas.forEach(b => {
                const id = String(b.N_Interno).trim();
                const ts = new Date(b.Timestamp);
                if (equipos.has(id)) {
                    let eq = equipos.get(id);
                    // Usar >= en vez de > por si se guardan muy rápido o falla el delta de milisegundos
                    if (ts >= eq.Ultimo_Movimiento) {
                        const destinoStr = String(b.Destino).toLowerCase();
                        if (destinoStr.includes('recarga') || destinoStr.includes('mantenimiento')) {
                            eq.Estado_Disp = 'En reparación';
                        } else {
                            eq.Estado_Disp = `Baja: ${b.Destino}`;
                        }
                        eq.Ultimo_Movimiento = ts;
                        equipos.set(id, eq);
                    }
                }
            });

            return Array.from(equipos.values());

        } else {
            console.error("Error desde el Sheet:", json.message);
            return [];
        }
    } catch (error) {
        console.error("Error crítico obteniendo datos:", error);
        return [];
    }
};
