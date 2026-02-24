const API_URL = "https://script.google.com/macros/s/AKfycbx-sYcf6lFbaeXplcBXMaTrKUkX5_NLXFgSyL2yMw-JpNQuhXfMLB0zcSpsNJy5XDwX3w/exec";

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
            return json.data || [];
        } else {
            console.error("Error desde el Sheet:", json.message);
            return [];
        }
    } catch (error) {
        console.error("Error crítico obteniendo datos:", error);
        return [];
    }
};
