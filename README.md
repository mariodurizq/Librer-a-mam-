# Mi librería

Web estática (HTML + CSS + JS, sin servidor ni dependencias) con el catálogo de la biblioteca de mi madre.

## Estructura

```
index.html          Página principal
style.css           Estilos (modo claro/oscuro automático)
app.js              Lógica de la app
data/libros.js      Catálogo base (window.LIBROS)
tools/excel_a_libros_js.py   Regenera data/libros.js desde el Excel
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo (por ejemplo `libreria`) y sube todos estos archivos a la raíz.
2. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)`. Guarda.
4. En un minuto la web estará en `https://TU_USUARIO.github.io/libreria/`.

También funciona abriendo `index.html` directamente en el navegador.

## Añadir, editar y eliminar libros desde la web

- Botón **+ Añadir** (arriba): formulario con título, autor, editorial, categoría, ubicación, etc. Si no pones posición, se coloca al final de la balda.
- Pulsa cualquier libro para ver su ficha: ahí puedes **editar**, **eliminar**, marcar como favorito o leído.
- Los cambios se guardan en el **localStorage de tu navegador**. Eso significa que son privados de ese navegador y dispositivo: no los ven otras personas ni se sincronizan solos.

### Hacer los cambios permanentes (para todos)

1. Menú **⋯ → Descargar libros.js**.
2. En el repositorio, sustituye `data/libros.js` por el archivo descargado (en GitHub: abre el archivo → lápiz → pega, o sube el nuevo archivo).
3. Haz commit. Tras publicarse, cualquier dispositivo verá los libros nuevos.

Tras eso puedes usar **Borrar mis cambios** en el menú para limpiar lo local (ya estará en los datos base).

### Copias de seguridad

- **Copia de seguridad (JSON)**: guarda tus altas, ediciones, favoritos y leídos.
- **Restaurar copia**: los recupera en otro navegador o dispositivo.
- **CSV**: para abrir en Excel.

## Regenerar los datos desde el Excel

```bash
pip install openpyxl
python3 tools/excel_a_libros_js.py ruta/Biblioteca_madre.xlsx
```

Sobrescribe `data/libros.js`.

## Atajos

- `/` enfoca el buscador.
- 🎲 **Sorpréndeme** propone un libro (prioriza los no leídos y respeta los filtros).

## Notas de esta versión

- `index.html` es un **único archivo autocontenido** (catálogo, estilos, código e icono incrustados): es lo que publica GitHub Pages. `app.js`, `style.css` y `libros.js` son el código fuente de referencia.
- Añadir libro con **ISBN**: botón 📷 Escanear (cámara) o escribir el ISBN; rellena título, autor y editorial desde Google Books / Open Library.
- **Préstamos**: en la ficha de cada libro, "Prestar" / "Marcar devuelto"; los pendientes salen en la pestaña Resumen.
- **Mapa de estantería**: la ficha muestra el mueble con el hueco del libro resaltado.
- **Sincronización**: ⋯ → repositorio + token de GitHub (permiso Contents: read/write); guarda `data/usuario.json`.
