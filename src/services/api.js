const API_URL = import.meta.env.VITE_API_URL || "/api/extintores";

export const sendToSheet = async (data) => {
  if (!API_URL) {
    console.warn("API_URL no configurada. Simulando envío:", data);
    return new Promise((resolve) =>
      setTimeout(() => resolve({ status: "success" }), 1000)
    );
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    console.warn("API URL no disponible...");
    return [];
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "get_current_state" }),
    });

    const json = await response.json();

    if (json.status === "success") {
      return json.items || [];
    } else {
      console.error("Error desde el Sheet:", json.message);
      return [];
    }
  } catch (error) {
    console.error("Error crítico obteniendo datos:", error);
    return [];
  }
};
