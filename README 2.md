# NUDO Arquitectura — web editable

Esta carpeta contiene la dirección visual aprobada y una implementación modular preparada para completar la web con los proyectos reales.

## Vista previa

Desde esta carpeta:

```bash
node scripts/dev-server.mjs
```

Abrir `http://127.0.0.1:8080`.

Si `npm` está disponible, también se puede usar:

```bash
npm run dev
```

## Build

```bash
node scripts/build-site.mjs
```

El build detecta carpetas dentro de `projects/`, genera `projects.generated.json`, genera `assets.generated.json`, crea versiones responsive WebP en `optimized/` y publica la salida en `dist/`.

Para subir la web al hosting, subir el contenido completo de `dist/`. Esa carpeta ya queda limpia para publicación:

- `index.html`, `proyectos.html` y todos los `proyecto-<slug>.html`.
- `src/`, `styles.css`, `site.json`, `projects.generated.json`, `assets.generated.json` y `optimized.generated.json`.
- `assets/` con marca y placeholders necesarios.
- `img/favicon.png`.
- `optimized/` con las imágenes WebP responsive.
- `projects/` solamente cuando haya videos originales usados por algún proyecto.

No subir solo los HTML sueltos: las imágenes responsivas y las páginas individuales dependen de esos JSON y carpetas generadas. Las fotos originales, `.txt`, `project.json`, plantillas y carpetas de trabajo quedan fuera de `dist/`.

## Optimización de imágenes

El sitio mantiene las imágenes originales como fallback y genera variantes WebP de alta calidad para la carga normal del navegador.

- Calidad WebP: alta, pensada para arquitectura y líneas finas.
- Anchos generados: `480`, `640`, `960`, `1280`, `1600`, `1920`, `2400`, sin agrandar por encima del original.
- Manifiesto: `optimized.generated.json`.
- Salida: `optimized/`.

Los componentes renderizan `<picture>` con `srcset` y `sizes`; si una imagen no tiene versión optimizada, se usa el archivo original.

## Proyectos

Cada proyecto debe ir en una carpeta propia dentro de `projects/`. Las carpetas que empiezan con `_` se ignoran.

Estructura recomendada:

```text
projects/
  nombre-del-proyecto/
    datos.txt
    01-portada.jpg
    02-vista.jpg
    03-proceso.jpg
```

También se admite esta variante:

```text
projects/
  nombre-del-proyecto/
    datos.txt
    images/
      01-portada.jpg
      02-vista.jpg
```

La imagen `01` se toma como portada del proyecto. El resto de las imágenes se ordenan por número y se usan en la galería.

Si `01` es un video `.mp4`, `.webm` o `.mov`, se usa como portada animada del proyecto y también como primera pieza de la ficha. Las carpetas sin `.txt`, `project.json`, imágenes o videos no se publican.

Campos útiles dentro del `.txt`:

```text
Nombre: Delta Riego
Categoría: Comercial / Industrial
Ubicación: Uruguay
Año: 2024
Estado: Construido
Alcance: Proyecto y dirección de obra
Superficie: 320 m2
Resumen: Texto breve para destacar el proyecto.
Memoria: Texto más largo de la ficha individual.
Orden: 1
Publicado: sí
Destacado: sí
```

Si existe `project.json`, se usa como fuente más precisa y puede convivir con el `.txt`.

## Imágenes generales

Colocar las imágenes generales siempre en `img/` en minúscula con estos nombres de carpetas.

```text
img/
  portada/
    01.jpg
    02.jpg
  proceso/
    01.jpg
    02.jpg
    03.jpg
    04.jpg
  directores/
    juan-pablo.jpg
    joaquin-rivera.jpg
```

- `portada`: imágenes de portada principal de la home.
- `proceso`: imágenes para los cuatro ítems del proceso.
- `directores`: fotos del equipo; si los nombres incluyen `juan`, `pablo`, `jp`, `joaquin`, `rivera` o `jr`, la web intenta asignarlas automáticamente.

## Páginas actuales

- `index.html`: shell de home; el contenido lo renderiza `src/main.js`.
- `proyectos.html`: shell del archivo de proyectos.
- `proyecto-<slug>.html`: ruta generada por proyecto publicado.
- `admin.html`: referencia visual del futuro panel.

## Video de portada

Colocar el archivo en `assets/video/resumen-nudo.mp4`.

## Contenido local

- `site.json`: datos generales, métricas y contactos.
- `projects/<slug>/datos.txt` o `projects/<slug>/project.json`: información de cada proyecto.
- `projects/<slug>/`: imágenes del proyecto, numeradas.
- `projects/_template/`: modelo base.
