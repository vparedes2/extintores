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

export const fetchAppState = async () => {
  if (!API_URL) return null;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_current_state" }),
    });
    const json = await response.json();
    return json.status === "success" ? json : null;
  } catch (error) {
    console.error("fetchAppState error:", error);
    return null;
  }
};

/**
 * Stale-While-Revalidate (SWR) Caching Strategy
 * 1. Checks `localStorage` and immediately invokes `onCached` if data exists (0ms load).
 * 2. Asynchronously fetches the true state from the backend.
 * 3. Overwrites cache and invokes `onFresh` to seamlessly update the UI.
 */
export const fetchAppStateWithCache = async (onCached, onFresh) => {
  if (!API_URL) return;

  const cacheKey = "extintores_swr_cache";
  const cachedData = localStorage.getItem(cacheKey);
  
  // 1. Instantaneous Local Hydration
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      onCached(parsed);
    } catch (e) {
      console.warn("Error leyendo caché SWR:", e);
    }
  }

  // 2. Background Revalidation (Network)
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_current_state" }),
    });
    
    const json = await response.json();
    if (json && json.status === "success") {
      // 3. Persist and trigger Fresh UI Update
      localStorage.setItem(cacheKey, JSON.stringify(json));
      onFresh(json);
    }
  } catch (error) {
    console.error("Error silencioso obteniendo datos frescos SWR:", error);
  }
};
