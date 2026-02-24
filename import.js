const API_URL = "https://script.google.com/macros/s/AKfycbx-sYcf6lFbaeXplcBXMaTrKUkX5_NLXFgSyL2yMw-JpNQuhXfMLB0zcSpsNJy5XDwX3w/exec";

const rawData = `1	875945	Captación - Troncal	B	2027	feb-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
2	15417	Captación - Troncal	B	2027	oct-24	25KG	ABC P.Q.S.	B	B	B	B	B	B	B
3	724524	Captación - Troncal	B	2029	feb-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
4	106204	Rebombeo 1	B	2027	jun-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
5	875948	Rebombeo 2	B	2027	feb-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
6	302618	Rebombeo 2	B	2028	mar-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
7	15416	Rebombeo 3	B	2027	oct-24	25KG	ABC P.Q.S.	B	B	M	B	B	B	B
8	749074	Campamento R1	B	2028	ene-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
9	974035	Campamento R1	B	2028	abr-25	10KG	ABC P.Q.S.	B	B	B	B	B	B	B
10	1602786	Totem 400lts	B	2029	may-25	5KG	ABC P.Q.S.	B	B	B	B	M	B	B`;

const datesMap = {
    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
};

const parseDate = (dText) => {
    if (!dText) return '';
    const parts = dText.toLowerCase().split('-');
    if (parts.length !== 2) return dText;
    const month = datesMap[parts[0]] || '01';
    const year = "20" + parts[1];
    return `${year}-${month}`;
};

async function upload() {
    const lines = rawData.split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        const cols = line.split('\t').map(s => s.trim());

        const nInterno = cols[0];
        const nRecipiente = cols[1];
        const ubicacion = cols[2];
        const vtoPH = cols[4];
        const vtoCarga = parseDate(cols[5]);
        const capacidad = cols[6].replace('KG', '');
        const agente = cols[7];

        let estadoDisp = "Afectado a locación";
        if (ubicacion.toLowerCase().includes('nqn') || ubicacion.toLowerCase().includes('acopio') || ubicacion.toLowerCase().includes('trata')) {
            estadoDisp = "Disponible";
        }

        const payloadAlta = {
            action: "alta",
            nInterno: nInterno,
            nRecipiente: nRecipiente,
            ubicacionSelect: ubicacion,
            ubicacionManual: "",
            estadoDisponibilidad: estadoDisp,
            vtoPH: vtoPH,
            vtoCarga: vtoCarga,
            capacidad: capacidad,
            agente: agente
        };

        const payloadChecklist = {
            action: "checklist",
            extintorId: nInterno,
            nRecipiente: nRecipiente,
            ubicacion: ubicacion,
            estadoDisponibilidad: estadoDisp,
            fecha: new Date().toISOString().split('T')[0],
            inspecciono: "IMPORTACIÓN MIGRACIÓN",
            tarjetaIdentificacion: cols[3],
            vencimientoPH: vtoPH,
            vtoCarga: vtoCarga,
            capacidad: capacidad,
            agenteExtintor: agente,
            manometro: cols[8],
            manijaPalanca: cols[9],
            mangueraBoquilla: cols[10],
            seguroPrecinto: cols[11],
            soporte: cols[12],
            estadoRecipiente: cols[13],
            senalizacionAcceso: cols[14]
        };

        try {
            console.log(`Subiendo ALTA ${nInterno}...`);
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payloadAlta)
            });

            console.log(`Subiendo CHECKLIST ${nInterno}...`);
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payloadChecklist)
            });
        } catch (e) {
            console.error("Error subiendo", nInterno, e.message);
        }
    }
    console.log("¡Terminado!");
}

upload();
