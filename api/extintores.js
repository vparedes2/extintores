export const maxDuration = 60;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

    // Ignoramos process.env.GAS_URL momentáneamente porque en Vercel puede haber quedado la URL vieja cargada como variable de entorno,
    // rompiendo todo el mapeo de columnas y causando fallas en el dashboard y escáner.
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYnGme-lwpbBzWNXhuEflqCP3QB6h4olJ4iJXD-yj-kLZKH3B3IPMtN4i38XEUAy9bgA/exec";

    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                status: "error",
                message: "Method Not Allowed",
            });
        }

        const bodyData = req.body;

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData),
    });

    const data = await response.json();

    if (bodyData && bodyData.action === "get_current_state") {
      res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=59");
    } else {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}
