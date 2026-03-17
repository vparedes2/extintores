function doPost(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // ===============================
    // GUARDAR CHECKLIST
    // ===============================
    if (action === "save_checklist") {
      const sheet = spreadsheet.getSheetByName("CHECKLIST");

      if (!sheet) {
        return jsonResponse("error", "No existe hoja CHECKLIST");
      }

      const row = [
        new Date(),
        data.inspector || "",
        data.numero || "",
        data.ubicacion || "",
        data.tipo || "",
        data.fecha || "",
        data.placa || "",
        data.vto_ph || "",
        data.estado_carga || "",
        data.capacidad || "",
        data.agente || "",
        data.manometro || "",
        data.manija || "",
        data.manguera || "",
        data.seguro || "",
        data.soporte || "",
        data.recipient || "",
        data.senalizacion || "",
      ];

      sheet.appendRow(row);

      return jsonResponse("success", "Checklist guardado");
    }

    // ===============================
    // OBTENER ESTADO ACTUAL
    // ===============================
    if (action === "get_current_state") {
      const sheet = spreadsheet.getSheetByName("CHECKLIST");

      if (!sheet) {
        return jsonResponse("error", "No existe hoja CHECKLIST");
      }

      const data = sheet.getDataRange().getValues();

      const headers = data[0];
      const rows = data.slice(1);

      return ContentService.createTextOutput(
        JSON.stringify({
          status: "success",
          items: rows.map((row) => {
            let obj = {};
            headers.forEach((h, i) => (obj[h] = row[i]));
            return obj;
          }),
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // ===============================
    // EXPORTAR PDF (CORREGIDO)
    // ===============================
    if (action === "export_pdf") {
      const targetDateStr = String(data.fecha || "").trim();
      const inspectorName = String(data.inspector || "").trim();

      if (!targetDateStr) {
        return jsonResponse("error", "Falta fecha");
      }

      const parts = targetDateStr.split("-");
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);

      const nextDate = new Date(y, m, d);

      const formattedTarget = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
      const formattedNext = `${String(nextDate.getDate()).padStart(2, "0")}/${String(nextDate.getMonth() + 1).padStart(2, "0")}/${nextDate.getFullYear()}`;

      const sheetChecklist = spreadsheet.getSheetByName("CHECKLIST");
      const sheetHoja3 = spreadsheet.getSheetByName("Hoja 3");

      const dataAll = sheetChecklist.getDataRange().getValues();
      const rows = dataAll.slice(1);

      const fechaIndex = 5;

      const normalizeDate = (value) => {
        if (!value) return "";

        if (Object.prototype.toString.call(value) === "[object Date]") {
          return Utilities.formatDate(value, spreadsheet.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        }

        const str = String(value);

        let m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return str;

        m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;

        return "";
      };

      // 🔥 FILTRO EXACTO
      const rowsToExport = rows.filter((r) => {
        return normalizeDate(r[fechaIndex]) === targetDateStr;
      });

      if (rowsToExport.length === 0) {
        return jsonResponse("error", "No hay datos para esa fecha");
      }

      // METADATOS
      sheetHoja3.getRange("A7").setValue("Fecha de Inspección: " + formattedTarget);
      sheetHoja3.getRange("C7").setValue("Próxima inspección: " + formattedNext);
      sheetHoja3.getRange("G7").setValue("Inspeccionó: " + inspectorName);

      // 🔥 LIMPIEZA SEGURA
      sheetHoja3.getRange(11, 1, 200, 16).clearContent();

      // ARMADO TABLA
      const output = [];

      rowsToExport.forEach((r, i) => {
        const row = new Array(16).fill("");

        row[0] = i + 1;
        row[1] = r[2];
        row[2] = r[3];
        row[3] = r[6];
        row[4] = r[7];
        row[5] = r[8];
        row[6] = r[9];
        row[7] = r[10];
        row[8] = r[11];
        row[9] = r[12];
        row[10] = r[13];
        row[11] = r[14];
        row[12] = r[15];
        row[13] = r[16];
        row[14] = r[17];

        output.push(row);
      });

      sheetHoja3.getRange(11, 1, output.length, 16).setValues(output);

      SpreadsheetApp.flush();

      const url = spreadsheet.getUrl().replace(/edit$/, "");
      const pdfUrl =
        url +
        "export?format=pdf&gid=" +
        sheetHoja3.getSheetId();

      const token = ScriptApp.getOAuthToken();

      const response = UrlFetchApp.fetch(pdfUrl, {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const blob = response.getBlob();
      const base64 = Utilities.base64Encode(blob.getBytes());

      return ContentService.createTextOutput(
        JSON.stringify({
          status: "success",
          pdfBase64: base64,
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return jsonResponse("error", "Acción no válida");
  } catch (error) {
    return jsonResponse("error", error.toString());
  }
}

// ===============================
// HELPER JSON
// ===============================
function jsonResponse(status, message) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: status,
      message: message,
    })
  ).setMimeType(ContentService.MimeType.JSON);
  }
