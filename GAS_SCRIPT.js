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
        let sheetName = '';
        if (action === 'alta') sheetName = 'ALTA';
        else if (action === 'baja') sheetName = 'BAJA';
        else if (action === 'checklist') sheetName = 'CHECKLIST';
        else if (action === 'mto_out' || action === 'mto_in') sheetName = 'MANTENIMIENTO';
        else if (action === 'get_current_state' || action === 'export_pdf' || action === 'export_remito') sheetName = null;
        else return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "Acción no válida: " + action })).setMimeType(ContentService.MimeType.JSON);

        let sheet;
        if (sheetName) sheet = spreadsheet.getSheetByName(sheetName);

        if (sheetName && !sheet) {
            sheet = spreadsheet.insertSheet(sheetName);
            if (action === 'alta') sheet.appendRow(['Timestamp', 'N_Interno', 'N_Recipiente', 'Ubicacion', 'Estado_Disp', 'Vto_PH', 'Vto_Carga', 'Capacidad', 'Agente', 'Tarjeta_ID', 'Manometro', 'Palanca', 'Manguera', 'Precinto', 'Soporte', 'Estado_Rec', 'Acceso', 'Remito_Prov']);
            if (action === 'baja') sheet.appendRow(['Timestamp', 'N_Interno', 'Destino', 'Observaciones', 'Proveedor', 'Remito_Sal']);
            if (action === 'checklist') sheet.appendRow(['Timestamp', 'N_Interno', 'N_Recipiente', 'Ubicacion', 'Estado_Disp', 'Fecha', 'Inspector', 'Placa_ID', 'Vto_PH', 'Vto_Carga', 'Capacidad_Valor', 'Agente', 'Manometro', 'Palanca', 'Manguera', 'Precinto', 'Soporte', 'Estado_Rec', 'Acceso']);
            if (action === 'mto_out' || action === 'mto_in') sheet.appendRow(['Timestamp', 'Tipo_Movimiento', 'N_Interno', 'Fecha_Movimiento', 'Proveedor', 'Motivo_Trabajo', 'Observaciones', 'Remito', 'Responsable', 'Nuevo_Vto_Carga', 'Nuevo_Vto_PH', 'Check_Visual']);
        }

        // Insertar los datos según la acción
        const timestamp = new Date();

        // 4. Normalización estricta de Fechas de Vencimiento de Carga (YYYY-MM)
        const normalizeVtoMonth = (vtoStr) => {
            if (!vtoStr) return "";
            const str = String(vtoStr).trim();
            // Case 1: Already YYYY-MM
            if (/^\d{4}-\d{2}$/.test(str)) return str;
            // Case 2: Full ISO Date or YYYY-MM-DD
            if (str.includes('-') && str.length >= 10) {
                const parts = str.split('-');
                return `${parts[0]}-${parts[1]}`;
            }
            // Case 3: MM/YYYY or similar
            const match = str.match(/(20\d{2})/);
            if (match) {
                const year = match[0];
                const monthMatch = str.replace(year, "").match(/(\d{1,2})/);
                if (monthMatch) {
                    return `${year}-${String(monthMatch[0]).padStart(2, '0')}`;
                }
                return `${year}-01`; // Fallback to january if only year
            }
            return str;
        };

        if (action === 'alta') {
            const locFinal = data.ubicacionSelect + " " + data.ubicacionManual;
            const cleanVtoCarga = normalizeVtoMonth(data.vtoCarga);
            sheet.appendRow([
                timestamp, data.nInterno, data.nRecipiente, locFinal.trim(), data.estadoDisponibilidad, data.vtoPH, cleanVtoCarga, data.capacidad, data.agente,
                data.tarjetaIdentificacion, data.manometro, data.manijaPalanca, data.mangueraBoquilla, data.seguroPrecinto, data.soporte, data.estadoRecipiente, data.senalizacionAcceso, data.remitoProveedor
            ]);
        } else if (action === 'baja') {
            sheet.appendRow([timestamp, data.extintorId, data.destino, data.observaciones, data.proveedor, data.remitoSalida]);
        } else if (action === 'checklist') {
            const cleanVtoCarga = normalizeVtoMonth(data.vtoCarga);
            sheet.appendRow([
                timestamp, data.extintorId, data.nRecipiente, data.ubicacion, data.estadoDisponibilidad, data.fecha, data.inspecciono,
                data.tarjetaIdentificacion, data.vencimientoPH, cleanVtoCarga,
                data.capacidad, data.agenteExtintor, data.manometro,
                data.manijaPalanca, data.mangueraBoquilla, data.seguroPrecinto,
                data.soporte, data.estadoRecipiente, data.senalizacionAcceso
            ]);
        } else if (action === 'mto_out') {
            sheet.appendRow([
                timestamp, 'SALIDA', data.extintorId, data.fecha, data.proveedor, data.motivo, data.observaciones, data.remito, data.responsable, "", "", ""
            ]);
        } else if (action === 'mto_in') {
            const clCarga = normalizeVtoMonth(data.vtoCarga);
            const clPH = data.vtoPH || "";
            const chkVis = data.checkVisual ? 'SI' : 'NO';
            sheet.appendRow([
                timestamp, 'INGRESO', data.extintorId, data.fecha, data.proveedor, data.trabajos, data.observaciones, data.remito, data.responsable, clCarga, clPH, chkVis
            ]);
        } else if (action === 'get_current_state') {
            const normalizeKey = (rawHeader) => {
                const h = String(rawHeader).toLowerCase().trim();
                const clean = h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

                if (clean.includes('time') || clean.includes('fecha') || clean.includes('marca')) return 'Timestamp';
                if (clean.includes('interno')) return 'N_Interno';
                if (clean.includes('recipiente') || clean.includes('fabrica')) return 'N_Recipiente';
                if (clean.includes('ubicacion') || clean.includes('locacion') || clean.includes('sector')) return 'Ubicacion';
                if (clean.includes('estado') && clean.includes('disp')) return 'Estado_Disp';
                if (clean.includes('vencimientoph') || clean.includes('vtoph') || (clean.includes('vto') && clean.includes('ph'))) return 'Vto_PH';
                if (clean.includes('estadodecarga') || clean.includes('vtocarga') || clean.includes('vencimientocarga') || (clean.includes('vto') && clean.includes('carga'))) return 'Vto_Carga';
                if (clean.includes('capacidad') || clean.includes('peso')) return 'Capacidad';
                if (clean.includes('agente') || clean.includes('tipo') && !clean.includes('movimiento')) return 'Agente';
                if (clean.includes('placa') || clean.includes('tarjeta') || clean.includes('identif')) return 'Tarjeta_ID';
                if (clean.includes('manometro')) return 'Manometro';
                if (clean.includes('palanca') || clean.includes('manija')) return 'Palanca';
                if (clean.includes('manguera') || clean.includes('boquilla')) return 'Manguera';
                if (clean.includes('seguro') || clean.includes('precinto')) return 'Precinto';
                if (clean.includes('soporte')) return 'Soporte';
                if (clean.includes('movimiento') || clean.includes('accion')) return 'Tipo_Movimiento';
                if (clean.includes('proveedor')) return 'Proveedor';
                if (clean.includes('motivo') || clean.includes('trabajo')) return 'Motivo_Trabajo';
                if (clean.includes('nuevovto') && clean.includes('carga')) return 'Nuevo_Vto_Carga';
                if (clean.includes('nuevovto') && clean.includes('ph')) return 'Nuevo_Vto_PH';
                if (clean.includes('destino')) return 'Destino';

                return rawHeader;
            };

            const getAllDataFromSheet = (sheetObj) => {
                if (!sheetObj) return [];
                const dataRange = sheetObj.getDataRange();
                const values = dataRange.getValues();
                if (values.length <= 1) return [];

                const rawHeaders = values[0];
                const cleanHeaders = rawHeaders.map(normalizeKey);

                const rows = values.slice(1);
                return rows.map(row => {
                    let obj = {};
                    cleanHeaders.forEach((key, index) => {
                        obj[key] = row[index];
                    });
                    if (!obj.hasOwnProperty('N_Interno')) obj.N_Interno = '';
                    if (!obj.hasOwnProperty('N_Recipiente')) obj.N_Recipiente = '';
                    return obj;
                });
            };

            const dataAlta = getAllDataFromSheet(spreadsheet.getSheetByName('ALTA'));
            const dataBaja = getAllDataFromSheet(spreadsheet.getSheetByName('BAJA'));
            const dataChecklist = getAllDataFromSheet(spreadsheet.getSheetByName('CHECKLIST'));
            const dataManto = getAllDataFromSheet(spreadsheet.getSheetByName('MANTENIMIENTO'));

            const safeParseDate = (dateVal) => {
                if (!dateVal) return new Date(0);
                
                // Si ya es un objeto Date nativo de Google Sheets
                if (Object.prototype.toString.call(dateVal) === '[object Date]') {
                    return isNaN(dateVal.getTime()) ? new Date(0) : dateVal;
                }

                const str = String(dateVal).trim();
                let d;

                // Detectar formato DD/MM/YYYY o DD-MM-YYYY (con o sin hora)
                const latamMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(.*))?$/);
                if (latamMatch) {
                    const day = parseInt(latamMatch[1], 10);
                    const month = parseInt(latamMatch[2], 10) - 1; // 0-indexed
                    const year = parseInt(latamMatch[3], 10);
                    const timePart = latamMatch[4] || "00:00:00";
                    
                    // Extraer horas y minutos si existen
                    const timeMatch = timePart.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
                    let hours = 0, mins = 0, secs = 0;
                    if (timeMatch) {
                        hours = parseInt(timeMatch[1], 10);
                        mins = parseInt(timeMatch[2], 10);
                        secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                    }
                    d = new Date(year, month, day, hours, mins, secs);
                } else {
                    // Fallback al parser estandar (YYYY-MM-DD o MM/DD/YYYY)
                    d = new Date(str);
                }
                
                return isNaN(d.getTime()) ? new Date(0) : d;
            };

            const equipos = new Map();

            dataAlta.forEach(a => {
                const id = String(a.N_Interno || a.N_Recipiente).trim();
                equipos.set(id, { ...a, Ultimo_Movimiento: safeParseDate(a.Timestamp) });
            });

            dataChecklist.forEach(c => {
                const id = String(c.N_Interno || c.N_Recipiente).trim();
                const ts = safeParseDate(c.Timestamp);
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

            dataManto.forEach(m => {
                const id = String(m.N_Interno || m.N_Recipiente).trim();
                // En mantenimiento usamos Timestamp para desempate si la tabla se carga rapido
                const ts = safeParseDate(m.Timestamp);
                if (equipos.has(id)) {
                    let eq = equipos.get(id);
                    if (ts >= eq.Ultimo_Movimiento) {
                        const tipo = String(m.Tipo_Movimiento).toUpperCase();
                        if (tipo === 'SALIDA') {
                            eq.Estado_Disp = 'En reparación';
                            eq.Ubicacion = String(m.Proveedor).trim() || 'Proveedor Externo';
                        } else if (tipo === 'INGRESO') {
                            eq.Estado_Disp = 'Disponible en Pañol';
                            eq.Ubicacion = 'Pañol Central';
                            if (m.Nuevo_Vto_Carga) eq.Vto_Carga = m.Nuevo_Vto_Carga;
                            if (m.Nuevo_Vto_PH) eq.Vto_PH = m.Nuevo_Vto_PH;
                        }
                        eq.Ultimo_Movimiento = ts;
                        equipos.set(id, eq);
                    }
                }
            });

            dataBaja.forEach(b => {
                const id = String(b.N_Interno || b.N_Recipiente).trim();
                const ts = safeParseDate(b.Timestamp);
                if (equipos.has(id)) {
                    let eq = equipos.get(id);
                    if (ts >= eq.Ultimo_Movimiento) {
                        eq.Estado_Disp = `Baja: ${b.Destino}`;
                        eq.Ultimo_Movimiento = ts;
                        equipos.set(id, eq);
                    }
                }
            });

            const finalItems = Array.from(equipos.values());

            // 4. Calcular Estadísticas Básicas en el Servidor
            let operativos = 0;
            let reparacion = 0;
            let vencidos = 0;
            let vigentes = 0;

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // 1-12

            finalItems.forEach(eq => {
                const estado = (eq.Estado_Disp || "").toLowerCase();

                if (estado.includes('baja') && (estado.includes('recarga') || estado.includes('reparaci') || estado.includes('ph'))) {
                    reparacion++;
                    return;
                }

                if (estado.includes('baja')) {
                    vencidos++;
                    return;
                }

                if (estado.includes('reparaci') || estado.includes('recarga') || estado.includes('no disponible')) {
                    reparacion++;
                } else if (estado.includes('disponible') || estado.includes('afectado')) {
                    operativos++;

                    // Calculo simple de vencimiento para la data
                    let isVencido = false;
                    if (eq.Vto_Carga) {
                        try {
                            const [yearStr, monthStr] = String(eq.Vto_Carga).split('-');
                            if (yearStr && monthStr) {
                                const vYear = parseInt(yearStr, 10);
                                const vMonth = parseInt(monthStr, 10);
                                if (vYear < currentYear || (vYear === currentYear && vMonth < currentMonth)) {
                                    isVencido = true;
                                }
                            }
                        } catch (e) { }
                    }
                    if (isVencido) {
                        vencidos++;
                    } else {
                        vigentes++;
                    }
                }
            });

            return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "stats": {
                    "total": finalItems.length,
                    "operativos": operativos,
                    "reparacion": reparacion,
                    "vencidos": vencidos,
                    "vigentes": vigentes
                },
                "items": finalItems
            })).setMimeType(ContentService.MimeType.JSON);
        } else if (action === 'export_remito') {
            // == LOGICA DE GENERACION DE REMITO (ORIGINAL Y COPIA) ==
            let sheetRemito = spreadsheet.getSheetByName('REMITO_TEMPLATE');

            if (!sheetRemito) {
                // Auto-create template sheet if it's missing
                sheetRemito = spreadsheet.insertSheet('REMITO_TEMPLATE');
            }

            const extintores = data.extintores || [];
            if (extintores.length === 0) {
                return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "No hay extintores seleccionados para el remito." })).setMimeType(ContentService.MimeType.JSON);
            }

            // 1. Limpiar hoja para asegurar dibujo nuevo
            sheetRemito.clear();

            // Borramos todas las imagenes existentes en la hoja (Logos anteriores)
            const images = sheetRemito.getImages();
            for (let i = 0; i < images.length; i++) {
                images[i].remove();
            }

            // General styling
            sheetRemito.getRange("A:G").setFontFamily("Arial").setVerticalAlignment("middle");

            // URL del Logo de Rio Limay
            const logoUrl = "https://raw.githubusercontent.com/vparedes2/extintores/main/public/logo192.png";

            // Función auxiliar para dibujar un bloque de Remito (1=Original, 2=Copia)
            const drawRemitoBlock = (startRow, typeLabel) => {
                // Insertar Logo (Abarca A:B aprox)
                try {
                    const blob = UrlFetchApp.fetch(logoUrl).getBlob();
                    sheetRemito.insertImage(blob, 1, startRow, 5, 5);
                } catch (e) {
                    sheetRemito.getRange(`A${startRow}`).setValue("RIO LIMAY S.A.").setFontWeight("bold");
                }

                // Título y Tipo
                sheetRemito.getRange(`C${startRow}:G${startRow + 1}`).merge().setValue(`REMITO DE SALIDA\n${typeLabel}`)
                    .setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(14).setFontWeight("bold").setBackground("#f3f4f6");

                const hoyStr = Utilities.formatDate(new Date(), spreadsheet.getSpreadsheetTimeZone(), "dd/MM/yyyy");
                sheetRemito.getRange(`A${startRow + 3}`).setValue(`Fecha: ${hoyStr}`).setFontWeight("bold");
                sheetRemito.getRange(`A${startRow + 4}`).setValue(`Cantidad Total: ${extintores.length}`).setFontWeight("bold");

                sheetRemito.getRange(`B${startRow + 5}`).setValue(`Proveedor: ${data.proveedor || ''}`).setFontWeight("bold");
                sheetRemito.getRange(`B${startRow + 6}`).setValue(`Motivo: ${data.motivo || ''}`).setFontWeight("bold");

                // Cabeceras de Tabla
                const headers = [["Item", "Nº Interno", "Nº Recipiente", "Tipo / Capacidad", "Motivo", "Vto PH", "Vto Carga"]];
                const headerRow = startRow + 8;
                sheetRemito.getRange(`A${headerRow}:G${headerRow}`).setValues(headers)
                    .setFontWeight("bold").setBackground("#d9d9d9").setHorizontalAlignment("center");

                // Preparar matriz de datos
                let finalOutput = [];
                const motivoText = data.motivo || "Mto. General / Recarga";
                extintores.forEach((ext, idx) => {
                    let row = new Array(7).fill("");
                    row[0] = idx + 1; // Item
                    row[1] = ext.N_Interno || "";
                    row[2] = ext.N_Recipiente || "";

                    let capStr = ext.Capacidad ? String(ext.Capacidad).trim() : "";
                    if (capStr && !capStr.toLowerCase().includes("kg") && !capStr.toLowerCase().includes("lt")) {
                        capStr += " kg";
                    }
                    row[3] = (capStr ? capStr + " " : "") + (ext.Agente ? String(ext.Agente).trim() : "");
                    row[4] = motivoText;
                    row[5] = ext.Vto_PH ? Utilities.formatDate(new Date(ext.Vto_PH), spreadsheet.getSpreadsheetTimeZone(), "MM/yyyy") : "";
                    row[6] = ext.Vto_Carga ? Utilities.formatDate(new Date(ext.Vto_Carga), spreadsheet.getSpreadsheetTimeZone(), "MM/yyyy") : "";
                    finalOutput.push(row);
                });

                // Insertar Datos
                const dataRowStart = headerRow + 1;
                sheetRemito.getRange(dataRowStart, 1, finalOutput.length, 7).setValues(finalOutput)
                    .setHorizontalAlignment("center").setFontSize(9);

                // Dibujar bordes a la tabla
                sheetRemito.getRange(`A${headerRow}:G${dataRowStart + finalOutput.length - 1}`).setBorder(true, true, true, true, true, true);

                // Bloque de Firmas (3 filas debajo del final de la tabla)
                const sigRow = dataRowStart + finalOutput.length + 3;
                sheetRemito.getRange(`B${sigRow}`).setValue("______________________________\nFirma Entrega (Rio Limay)").setHorizontalAlignment("center").setFontWeight("bold");
                sheetRemito.getRange(`F${sigRow}`).setValue("______________________________\nFirma Recepción (Proveedor)").setHorizontalAlignment("center").setFontWeight("bold");

                return sigRow + 3; // Devolver la siguiente fila disponible para el bloque Copia (con un margen de 3 filas extra)
            };

            // 2. Dibujar bloque ORIGINAL
            const nextStartRow = drawRemitoBlock(1, "ORIGINAL");

            // 3. Línea de corte (Tijera)
            sheetRemito.getRange(`A${nextStartRow}:G${nextStartRow}`).merge().setValue("-------------------------------------------------- CORTE --------------------------------------------------")
                .setHorizontalAlignment("center").setVerticalAlignment("middle").setFontColor("#9ca3af");

            // 4. Dibujar bloque COPIA
            drawRemitoBlock(nextStartRow + 2, "COPIA");

            // 5. Configurar anchos de columna fijos para que cuadre en A4 vertical
            sheetRemito.setColumnWidth(1, 40);
            sheetRemito.setColumnWidth(2, 90);
            sheetRemito.setColumnWidth(3, 110);
            sheetRemito.setColumnWidth(4, 150);
            sheetRemito.setColumnWidth(5, 140);
            sheetRemito.setColumnWidth(6, 80);
            sheetRemito.setColumnWidth(7, 80);

            SpreadsheetApp.flush();            // Exportar a PDF (base64)
            const url = spreadsheet.getUrl().replace(/\/edit.*$/, '');
            const sheetId = sheetRemito.getSheetId();
            // exportFormat=pdf (portrait)
            const pdfUrl = url + '/export?exportFormat=pdf&format=pdf&size=A4&portrait=true&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false&gid=' + sheetId;

            try { DriveApp.getFileById(spreadsheet.getId()); } catch (e) { }

            const token = ScriptApp.getOAuthToken();
            const response = UrlFetchApp.fetch(pdfUrl, { headers: { 'Authorization': 'Bearer ' + token } });

            const blob = response.getBlob();
            const base64Data = Utilities.base64Encode(blob.getBytes());

            const hoyStrForFile = Utilities.formatDate(new Date(), spreadsheet.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "pdfBase64": base64Data,
                "fileName": "Remito_Salida_" + hoyStrForFile + ".pdf"
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

            // LA FECHA SIEMPRE ES EL ÍNDICE 5 en la inserción de checklist
            // [timestamp (0), id (1), nRec(2), ubic(3), estDisp(4), fecha (5), ...]
            let fechaIndex = 5;

            const rowsToExport = clRows.filter(row => {
                let cellVal = row[fechaIndex];
                if (!cellVal) return false;

                // Si la celda es un objeto Date nativo de Google o Javascript
                if (cellVal instanceof Date) {
                    let cellDateStr = Utilities.formatDate(cellVal, spreadsheet.getSpreadsheetTimeZone(), "yyyy-MM-dd");
                    return cellDateStr === targetDateStr;
                }

                const strVal = String(cellVal).trim();

                // Convertir cualquier formato extraño separador (/ o .) a guiones para estandarizar visualmente
                const strNorm = strVal.replace(/[\/\.]/g, "-");

                // Soporte para variaciones de YYYY-MM-DD vs DD-MM-YYYY
                if (strNorm === targetDateStr || strNorm === formattedTarget || strNorm.includes(targetDateStr) || strNorm.includes(formattedTarget.replace(/\//g, '-'))) {
                    return true;
                }

                // Desensamblaje profundo en caso de que Google Sheets lo haya volcado como 'D-M-YYYY'
                // targetDateStr es YYYY-MM-DD
                const partsTarget = targetDateStr.split('-');
                const pT_Y = partsTarget[0];
                const pT_M = parseInt(partsTarget[1], 10);
                const pT_D = parseInt(partsTarget[2], 10);

                if (strNorm.includes('-')) {
                    const pS = strNorm.split('-');
                    if (pS.length === 3) {
                        // Si la primera parte es 4 digitos es YYYY-XX-XX
                        let sY, sM, sD;
                        if (pS[0].length === 4) {
                            sY = pS[0];
                            sM = parseInt(pS[1], 10);
                            sD = parseInt(pS[2], 10);
                        } else if (pS[2].length === 4) { // Si la ultima es 4 digitos es DD-MM-YYYY o MM-DD-YYYY (asumimos DD-MM usual en LATAM)
                            sD = parseInt(pS[0], 10);
                            sM = parseInt(pS[1], 10);
                            sY = pS[2];
                        }

                        if (sY === pT_Y && sM === pT_M && sD === pT_D) return true;
                    }
                }

                return false;
            });

            if (rowsToExport.length === 0) {
                return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": "No se encontraron checklists guardados exactamente bajo la fecha " + formattedTarget + ". Verifica en la tabla CHECKLIST cómo quedó escrita." })).setMimeType(ContentService.MimeType.JSON);
            }

            // ===================================
            // INSERCIÓN DE METADATOS Y TABLA
            // ===================================

            // 1. Encontrar y llenar metadatos dinámicamente SIN sobreescribir la etiqueta visual
            // 1. Llenar metadatos respetando celdas combinadas y concatenando
            // A7 (combinada B7), C7 (combinada F7), G7 (combinada P7)

            let currentA7 = String(sheetHoja3.getRange("A7").getValue() || "Fecha de Inspección: ");
            let currentC7 = String(sheetHoja3.getRange("C7").getValue() || "Próxima inspección: ");
            let currentG7 = String(sheetHoja3.getRange("G7").getValue() || "Inspeccionó: ");

            // Limpiar si ya tenía un valor antes (dividimos por ":" y tomamos la etiqueta original)
            let baseA7 = currentA7.includes(":") ? currentA7.split(":")[0] + ": " : currentA7 + " ";
            let baseC7 = currentC7.includes(":") ? currentC7.split(":")[0] + ": " : currentC7 + " ";
            let baseG7 = currentG7.includes(":") ? currentG7.split(":")[0] + ": " : currentG7 + " ";

            sheetHoja3.getRange("A7").setValue(baseA7 + formattedTarget);
            sheetHoja3.getRange("C7").setValue(baseC7 + formattedNext);
            sheetHoja3.getRange("G7").setValue(baseG7 + data.inspector);

            // 2. Insertar los datos en posiciones FIJAS Y EXACTAS.
            let dataStartRow = 11;
            let lastRow = sheetHoja3.getLastRow();
            if (lastRow >= dataStartRow) {
                sheetHoja3.getRange(dataStartRow, 1, lastRow - (dataStartRow - 1), sheetHoja3.getLastColumn()).clearContent();
            }

            let finalOutput = [];

            // 3. Emparejar a columnas físicas exactas de A(0) a O(14) extrayendo desde POSICIONES ABSOLUTAS
            // El array interno clRow tiene 19 valores según appendRow:
            // 0:timestamp, 1:extintorId, 2:nRecipiente, 3:ubicacion, 4:estadoDisponibilidad, 
            // 5:fecha, 6:inspecciono, 7:tarjetaIdentificacion, 8:vencimientoPH, 9:vtoCarga, 
            // 10:capacidad, 11:agenteExtintor, 12:manometro, 13:manijaPalanca, 14:mangueraBoquilla, 
            // 15:seguroPrecinto, 16:soporte, 17:estadoRecipiente, 18:senalizacionAcceso

            rowsToExport.forEach(rowChecklist => {
                // Aumentamos a 16 elementos porque dejaremos A (0) en blanco para la numeración.
                let newRow = new Array(16).fill("");

                newRow[0] = "";               // A: Número correlativo (lo dejamos en blanco o el usuario lo numera manual)
                newRow[1] = rowChecklist[2];  // B: Nº Recipiente
                newRow[2] = rowChecklist[3];  // C: Ubicación
                newRow[3] = rowChecklist[7];  // D: Placa de id
                newRow[4] = rowChecklist[8];  // E: Vencimiento PH
                newRow[5] = rowChecklist[9];  // F: Estado de carga (Vto.)
                newRow[6] = rowChecklist[10]; // G: Capacidad (kg)
                newRow[7] = rowChecklist[11]; // H: Agente extintor
                newRow[8] = rowChecklist[12]; // I: Manómetro
                newRow[9] = rowChecklist[13]; // J: Manija y palanca
                newRow[10] = rowChecklist[14]; // K: Manguera/boquilla
                newRow[11] = rowChecklist[15]; // L: Seguro/precinto
                newRow[12] = rowChecklist[16]; // M: Soporte
                newRow[13] = rowChecklist[17]; // N: Estado recipiente
                newRow[14] = rowChecklist[18]; // O: Señalización y acceso
                // OJO: Hay una columna extra física en la foto antes de Placa si P es el final, pero P es la 16 (0-15).

                finalOutput.push(newRow);
            });

            if (finalOutput.length > 0) {
                // Pegar EXACTAMENTE los 16 elementos para no desalinear
                sheetHoja3.getRange(dataStartRow, 1, finalOutput.length, 16).setValues(finalOutput);
            }

            SpreadsheetApp.flush(); // Forzar guardado

            const url = spreadsheet.getUrl().replace(/\/edit.*$/, '');
            const sheetId = sheetHoja3.getSheetId();
            // exportFormat=pdf es para exportación nativa. portrait=false cambia a APAISADO (landscape).
            const pdfUrl = url + '/export?exportFormat=pdf&format=pdf&size=A4&portrait=false&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false&gid=' + sheetId;

            // Truco para obligar a Apps Script a pedir permisos de Drive al autorizar (si no los tiene)
            try { DriveApp.getFileById(spreadsheet.getId()); } catch (e) { }

            // Descargar el PDF desde el propio servidor de Google para evitar que el celular intercepte la URL
            const token = ScriptApp.getOAuthToken();
            const response = UrlFetchApp.fetch(pdfUrl, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const blob = response.getBlob();
            const base64Data = Utilities.base64Encode(blob.getBytes());

            return ContentService.createTextOutput(JSON.stringify({
                "status": "success",
                "pdfBase64": base64Data,
                "fileName": "Reporte_Extintores_" + targetDateStr + ".pdf"
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

// ==========================================
// FUNCIÓN DE CONFIGURACIÓN DE PERMISOS
// ==========================================
// EJECUTAR UNA SOLA VEZ DESDE EL EDITOR DE APPS SCRIPT PARA AUTORIZAR LA APP
function setupPermisos() {
    try {
        UrlFetchApp.fetch("https://www.google.com");
        DriveApp.getFiles();
        SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
    }
}
