const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUnyQ0QmPQiMvhNu6r5u66MR8ilMl5KDPbHoTtlX1iTm0gt_u4B6POw3CwiOO40m5poA/exec';

async function fetchStats() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_current_state" })
        });
        const data = await response.json();
        console.log(JSON.stringify(data.stats, null, 2));

        // Let's count how many have what status
        const counts = {};
        if (data.items) {
            data.items.forEach(eq => {
                const st = (eq.Estado_Disp || "").toLowerCase();
                counts[st] = (counts[st] || 0) + 1;
            });
            console.log("\nDistribution of raw Estado_Disp (lowercased):");
            console.log(JSON.stringify(counts, null, 2));

            console.log("\nUncategorized or non-matching statuses:");
            data.items.forEach(eq => {
                const estado = (eq.Estado_Disp || "").toLowerCase();
                let matched = false;
                if (estado.includes('baja')) matched = true;
                else if (estado.includes('reparaci') || estado.includes('recarga') || estado.includes('no disponible')) matched = true;
                else if (estado.includes('disponible') || estado.includes('afectado')) matched = true;

                if (!matched) {
                    console.log(`- ${eq.N_Interno}: ${eq.Estado_Disp}`);
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}
fetchStats();
