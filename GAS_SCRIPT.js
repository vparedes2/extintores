/**
 * INSTRUCCIONES DE USO:
 * 1. Crea un nuevo Google Sheet.
 * 2. Ve a Extensiones > Apps Script.
 * 3. Pega este código reemplazando todo lo que haya.
 * 4. Guarda y pulsa en el botón azul "Implementar" -> "Nueva implementación".
 * 5. Selecciona tipo "Aplicación web".
 * 6. En "Ejecutar como" elige "Tú".
 * 7. En "Quién tiene acceso" elige "Cualquier persona".
 * 8. Autoriza los permisos si te los pide.
 * 9. Copia la URL de la aplicación web generada (empieza por script.google.com/macros/s/...)
 * 10. Usa esa URL en el archivo src/services/api.js de tu app local.
 */

// Función principal que recibe las peticiones POST desde la App Local
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action; // Puede ser 'alta', 'baja', o 'checklist'

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

        // Obtenemos o creamos las pestañas necesarias
        let sheetName = action.toUpperCase();
        let sheet = spreadsheet.getSheetByName(sheetName);

        // Lógica específica pedida por el usuario: Usar "Hoja 3" para CHECKLIST
        // BORRADO: Ya no renombramos Hoja 3 a CHECKLIST porque el usuario la usará de plantilla PDF.

        if (!sheet) {
            sheet = spreadsheet.insertSheet(sheetName);
            // Configurar cabeceras iniciales si la hoja es nueva
            if (action === 'alta') sheet.appendRow(['Timestamp', 'N_Interno', 'N_Recipiente', 'Ubicacion', 'Estado_Disp', 'Vto_PH', 'Vto_Carga', 'Capacidad', 'Agente', 'Placa_ID', 'Manometro', 'Palanca', 'Manguera', 'Precinto', 'Soporte', 'Estado_Rec', 'Acceso']);
            if (action === 'baja') sheet.appendRow(['Timestamp', 'N_Interno', 'Destino', 'Motivo']);
            if (action === 'checklist') sheet.appendRow(['Timestamp', 'N_Interno', 'N_Recipiente', 'Ubicacion', 'Estado_Disp', 'Fecha', 'Inspector', 'Placa_ID', 'Vto_PH', 'Vto_Carga', 'Capacidad_Valor', 'Agente', 'Manometro', 'Palanca', 'Manguera', 'Precinto', 'Soporte', 'Estado_Rec', 'Acceso']);
        }

        // Insertar los datos según la acción
        const timestamp = new Date();

        if (action === 'alta') {
            const locFinal = data.ubicacionSelect + " " + data.ubicacionManual;
            sheet.appendRow([
                timestamp, data.nInterno, data.nRecipiente, locFinal.trim(), data.estadoDisponibilidad, data.vtoPH, data.vtoCarga, data.capacidad, data.agente,
                data.tarjetaIdentificacion, data.manometro, data.manijaPalanca, data.mangueraBoquilla, data.seguroPrecinto, data.soporte, data.estadoRecipiente, data.senalizacionAcceso
            ]);
        } else if (action === 'baja') {
            sheet.appendRow([timestamp, data.extintorId, data.destino, data.observaciones]);
        } else if (action === 'checklist') {
            sheet.appendRow([
                timestamp, data.extintorId, data.nRecipiente, data.ubicacion, data.estadoDisponibilidad, data.fecha, data.inspecciono,
                data.tarjetaIdentificacion, data.vencimientoPH, data.vtoCarga,
                data.capacidad, data.agenteExtintor, data.manometro,
                data.manijaPalanca, data.mangueraBoquilla, data.seguroPrecinto,
                data.soporte, data.estadoRecipiente, data.senalizacionAcceso
            ]);
        } else if (action === 'get_all') {
            // Manejar solicitud especial de lectura para sortear el bloqueo CORS de GET

            const getAllDataFromSheet = (sheetObj) => {
                if (!sheetObj) return [];
                const dataRange = sheetObj.getDataRange();
                const values = dataRange.getValues();
                if (values.length <= 1) return [];
                const headers = values[0];
                const rows = values.slice(1);
                return rows.map(row => {
                    let obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });
            };

            const dataAlta = getAllDataFromSheet(spreadsheet.getSheetByName('ALTA'));
            const dataBaja = getAllDataFromSheet(spreadsheet.getSheetByName('BAJA'));
            const dataChecklist = getAllDataFromSheet(spreadsheet.getSheetByName('CHECKLIST'));

            return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "data": dataAlta,
                "dataBaja": dataBaja,
                "dataChecklist": dataChecklist
            })).setMimeType(ContentService.MimeType.JSON);
        } else if (action === 'export_pdf') {
            // == LOGICA DE GENERACION DE PDF ==
            const targetDateStr = data.fecha; // ej. "2026-02-25"
            // Calcular proxima inspeccion (mes entrante mismo dia)
            let parts = targetDateStr.split('-');
            let y = parseInt(parts[0], 10);
            let m = parseInt(parts[1], 10);
            let d = parseInt(parts[2], 10);
            let nextDateObj = new Date(y, m, d); // En JS, mes es 0-indexed, así que "m" es automáticamente el mes siguiente.

            // Formatear DD/MM/YYYY para inyectar en hoja
            const formattedTarget = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
            const formattedNext = `${String(nextDateObj.getDate()).padStart(2, '0')}/${String(nextDateObj.getMonth() + 1).padStart(2, '0')}/${nextDateObj.getFullYear()}`;

            // Obtener checklist y Hoja 3
            let sheetChecklist = spreadsheet.getSheetByName('CHECKLIST');
            let sheetHoja3 = spreadsheet.getSheetByName('Hoja 3');

            if (!sheetChecklist || !sheetHoja3) {
                return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Falta pestaña CHECKLIST u Hoja 3" })).setMimeType(ContentService.MimeType.JSON);
            }

            // Filtrar checklists por la fecha solicitada
            const clData = sheetChecklist.getDataRange().getValues();
            if (clData.length <= 1) {
                return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "No hay checklists registrados" })).setMimeType(ContentService.MimeType.JSON);
            }

            const clHeaders = clData[0];
            const clRows = clData.slice(1);

            // Buscar índice de la columna "Fecha"
            let fechaIndex = clHeaders.indexOf('Fecha');
            if (fechaIndex === -1) fechaIndex = 5; // fallback

            const rowsToExport = clRows.filter(row => {
                let cellVal = row[fechaIndex];
                if (!cellVal) return false;

                // Si es un objeto Date de Google Apps Script:
                if (cellVal instanceof Date) {
                    let cellDateStr = Utilities.formatDate(cellVal, spreadsheet.getSpreadsheetTimeZone(), "yyyy-MM-dd");
                    return cellDateStr === targetDateStr;
                }
                // Si es un texto tipo "yyyy-MM-dd" o "dd/MM/yyyy"
                const strVal = String(cellVal).trim();
                return strVal === targetDateStr || strVal.includes(targetDateStr) || strVal === formattedTarget;
            });

            if (rowsToExport.length === 0) {
                return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "No hay checklists para la fecha seleccionada" })).setMimeType(ContentService.MimeType.JSON);
            }

            // Llenar cabeceras en Hoja 3
            let h3Data = sheetHoja3.getDataRange().getValues();
            let startRow = -1;

            for (let r = 0; r < h3Data.length; r++) {
                for (let c = 0; c < h3Data[r].length; c++) {
                    let val = String(h3Data[r][c]).toLowerCase().trim();
                    if (val.includes("fecha:")) { sheetHoja3.getRange(r + 1, c + 2).setValue(formattedTarget); }
                    if (val.includes("próxima inspección:") || val.includes("proxima inspeccion:")) { sheetHoja3.getRange(r + 1, c + 2).setValue(formattedNext); }
                    if (val.includes("inspeccionó:") || val.includes("inspecciono:")) { sheetHoja3.getRange(r + 1, c + 2).setValue(data.inspector); }

                    if (val.includes("n_interno") || val.includes("n interno") || val.includes("nº interno")) {
                        if (startRow === -1) startRow = r + 1; // Fila donde empieza la data (después de cabeceras)
                    }
                }
            }

            if (startRow === -1) startRow = 3; // Fallback fila 4 (0-indexed es 3)

            let lastRow = sheetHoja3.getLastRow();
            if (lastRow > startRow) {
                // Limpiar datos viejos
                sheetHoja3.getRange(startRow + 1, 1, lastRow - startRow, sheetHoja3.getLastColumn()).clearContent();
            }

            // Escribir los nuevos datos
            sheetHoja3.getRange(startRow + 1, 1, rowsToExport.length, rowsToExport[0].length).setValues(rowsToExport);

            SpreadsheetApp.flush(); // Forzar guardado

            // Generar URL del PDF
            const url = spreadsheet.getUrl().replace(/\/edit.*$/, '');
            const sheetId = sheetHoja3.getSheetId();
            // exportFormat=pdf es para exportación nativa
            const pdfUrl = url + '/export?exportFormat=pdf&format=pdf&size=A4&portrait=true&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false&gid=' + sheetId;

            return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "pdfUrl": pdfUrl
            })).setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}

// Función para permitir peticiones GET y leer datos
function doGet(e) {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = spreadsheet.getSheetByName('ALTA');

        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify({ "status": "success", "data": [] })).setMimeType(ContentService.MimeType.JSON);
        }

        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();

        if (values.length <= 1) {
            return ContentService.createTextOutput(JSON.stringify({ "status": "success", "data": [] })).setMimeType(ContentService.MimeType.JSON);
        }

        const headers = values[0];
        const rows = values.slice(1);

        const jsonData = rows.map(row => {
            let obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index];
            });
            return obj;
        });

        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "data": jsonData })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
}

// Necesario para permitir peticiones preflight CORS desde tu navegador local
function doOptions(e) {
    return ContentService.createTextOutput("")
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader("Access-Control-Allow-Origin", "*")
        .setHeader("Access-Control-Allow-Methods", "POST, GET");
}
