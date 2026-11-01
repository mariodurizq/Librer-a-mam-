#!/usr/bin/env python3
"""Regenera data/libros.js a partir del Excel Biblioteca_madre.xlsx.
Uso:  python3 tools/excel_a_libros_js.py ruta/Biblioteca_madre.xlsx
Requiere:  pip install openpyxl
"""
import sys, json, pathlib
from openpyxl import load_workbook

src = sys.argv[1] if len(sys.argv) > 1 else "Biblioteca_madre.xlsx"
ws = load_workbook(src, data_only=True)["Libros"]
out = []
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[1]:
        continue
    s = lambda x: "" if x is None else str(x)
    out.append(dict(id=s(r[0]), titulo=s(r[1]), autor=s(r[2]), editorial=s(r[3]), tomo=s(r[4]),
                    categoria=s(r[5]), video=s(r[6]), mueble=r[7], balda=r[8], posicion=r[9],
                    confianza=s(r[10]), notas=s(r[11])))
dest = pathlib.Path(__file__).resolve().parent.parent / "data" / "libros.js"
dest.write_text("window.LIBROS = " + json.dumps(out, ensure_ascii=False, indent=0) + ";\n", encoding="utf-8")
print(f"{len(out)} libros escritos en {dest}")
