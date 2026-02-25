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
        if (sheetName === 'CHECKLIST') {
            const hoja3 = spreadsheet.getSheetByName('Hoja 3');
            if (hoja3) {
                if (sheet) {
                    // Si ya existe una hoja llamada CHECKLIST pero también existe Hoja 3,
                    // borramos la generada automáticamente y renombramos Hoja 3.
                    spreadsheet.deleteSheet(sheet);
                }
                hoja3.setName('CHECKLIST');
                sheet = hoja3;

                // Si la Hoja 3 estaba completamente vacía, ponemos encabezados
                if (sheet.getLastRow() === 0) {
                    sheet.appendRow(['Timestamp', 'N_Interno', 'N_Recipiente', 'Ubicacion', 'Estado_Disp', 'Fecha', 'Inspector', 'Placa_ID', 'Vto_PH', 'Vto_Carga', 'Capacidad_Valor', 'Agente', 'Manometro', 'Palanca', 'Manguera', 'Precinto', 'Soporte', 'Estado_Rec', 'Acceso']);
                }
            }
        }

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
