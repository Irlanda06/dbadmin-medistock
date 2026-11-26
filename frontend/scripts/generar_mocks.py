"""Genera frontend/js/mocks.js a partir del Excel de endpoints de Pedro."""
import json, sys, openpyxl

xlsx, salida = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(xlsx).active
filas = list(ws.iter_rows(values_only=True))[3:]
items = []
for r in filas:
    if not r[0] or not str(r[0]).startswith("E"):
        continue
    def js(txt):
        try:
            return json.loads(txt)
        except Exception:
            return None
    items.append({
        "id": r[0], "modulo": r[1], "metodo": r[2], "ruta": r[3],
        "finalidad": r[4], "http": int(r[8]) if r[8] else 200,
        "entrada": js(r[7]), "respuesta": js(r[9]),
        "errores": r[10], "pruebas": r[12],
    })
faltan = [i["id"] for i in items if i["respuesta"] is None]
with open(salida, "w", encoding="utf-8") as f:
    f.write("// Generado automáticamente desde DBAdmin_61_Endpoints_Una_Hoja.xlsx (Pedro).\n")
    f.write("// Son los JSON de ejemplo del contrato: sirven para el MODO_PRUEBA.\n")
    f.write("// No editar a mano: volver a correr scripts/generar_mocks.py si cambia el Excel.\n\n")
    f.write("export const ENDPOINTS = ")
    json.dump(items, f, ensure_ascii=False, indent=2)
    f.write(";\n")
print(len(items), "endpoints; sin JSON de respuesta válido:", faltan)
