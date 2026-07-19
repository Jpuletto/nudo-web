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

El build detecta carpetas dentro de `projects/`, genera `projects.generated.json`, genera `assets.generated.json` y publica la salida en `dist/`.

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

Colocar las imágenes generales en `IMG/` o `img/` con estos nombres de carpetas:

```text
IMG/
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
