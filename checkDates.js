
const targetDateStr = "2026-03-12";
const formattedTarget = "12/03/2026";

const checkDate = (cellVal) => {
    const strVal = String(cellVal).trim();
    const strNorm = strVal.replace(/[/.]/g, "-");

    if (strNorm === targetDateStr || strNorm === formattedTarget || strNorm.includes(targetDateStr) || strNorm.includes(formattedTarget.replace(/\//g, '-'))) {
        return true;
    }

    const partsTarget = targetDateStr.split('-');
    const pT_Y = partsTarget[0];
    const pT_M = parseInt(partsTarget[1], 10);
    const pT_D = parseInt(partsTarget[2], 10);

    if (strNorm.includes('-')) {
        const pS = strNorm.split('-');
        if (pS.length === 3) {
            let sY, sM, sD;
            if (pS[0].length === 4) {
                sY = pS[0];
                sM = parseInt(pS[1], 10);
                sD = parseInt(pS[2], 10);
            } else if (pS[2].length === 4) {
                sD = parseInt(pS[0], 10);
                sM = parseInt(pS[1], 10);
                sY = pS[2];
            }

            if (sY === pT_Y && sM === pT_M && sD === pT_D) return true;
        }
    }
    return false;
}

console.log("2026-02-24: ", checkDate("2026-02-24"));
console.log("24-02-2026: ", checkDate("24-02-2026"));
console.log("2026-03-12: ", checkDate("2026-03-12"));
console.log("24/02/2026: ", checkDate("24/02/2026"));
console.log("24/02/2026 8:03:32: ", checkDate("24/02/2026 8:03:32"));
