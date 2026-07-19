# Encargo para Codex — NUDO Arquitectura

## Objetivo

Revisar esta maqueta, conservar su dirección visual y convertirla en una web de producción, mobile-first, rápida y editable. La fuente de verdad inicial debe ser el contenido local de `site.json` y de cada carpeta `projects/<slug>/`.

## Reglas visuales que no deben alterarse

1. Usar Roboto como tipografía base.
2. Negro pleno `#000000` y blanco como paleta principal. Naranja/amarillo solamente como acento mínimo.
3. Header fijo con solo `PROYECTOS`, `ESTUDIO` y `CONTACTO`; menú mobile de fondo negro pleno.
4. Portada con video resumen a pantalla completa y fallback de imágenes.
5. Métricas en tres círculos solapados aproximadamente 10–15 %, con cifras en negrita.
6. Slider de la home desplazable con rueda, arrastre y gesto táctil. Nombre del proyecto en negrita sobre la imagen.
7. Archivo de proyectos en una grilla uniforme: en reposo se ve solamente la imagen; al hover aparecen nombre y datos, y la imagen aumenta aproximadamente 10 %. En touch, la leyenda debe ser legible sin hover.
8. Página individual: portada, datos, descripción, galería y navegación entre proyectos.
9. Respetar `prefers-reduced-motion`, navegación por teclado, contraste y textos alternativos.

## Lectura de carpetas locales

- Detectar todas las carpetas dentro de `projects/`, excluyendo las que comiencen con `_`.
- Leer `project.json` en cada carpeta.
- Resolver `cover` y `gallery[].file` de forma relativa a esa carpeta.
- Ordenar por `order`.
- Mostrar únicamente elementos con `published: true`.
- El slider de home usa proyectos con `featured: true`.
- Generar automáticamente la grilla y una ruta por proyecto a partir de `slug`.
- Validar datos faltantes y mostrar mensajes claros durante desarrollo; no romper el build.

## Arquitectura recomendada

Preferencia: Vite + React o Vite + JavaScript modular. Mantener componentes simples y evitar dependencias pesadas.

Componentes mínimos:

- `Header`
- `HeroVideo`
- `Metrics`
- `FeaturedProjectsRail`
- `StudioSection`
- `ProcessSection`
- `TeamSection`
- `ContactSection`
- `ProjectsGrid`
- `ProjectPage`
- `PageTransition`

## Panel de administración

Preparar una segunda etapa con Supabase:

- Autenticación restringida.
- CRUD de proyectos.
- Carga y orden de imágenes.
- Publicar/ocultar y destacar proyectos.
- Edición ES/EN.
- Edición de métricas, teléfonos, correo y textos generales.

La primera migración puede seguir leyendo archivos locales. Separar la capa de datos para que luego pueda reemplazarse por Supabase sin reescribir la interfaz.

## Internacionalización

- Español por defecto.
- Dejar funcional el esquema ES/EN usando los campos ya incluidos en JSON.
- No mostrar el selector de idioma hasta que las traducciones estén completas, pero dejar el soporte preparado.

## Imágenes y video

- Generar `srcset`/tamaños responsivos y formatos WebP/AVIF durante build cuando sea posible.
- Lazy-load fuera de portada.
- No recortar rostros ni arquitectura de forma agresiva.
- Conservar `object-position` configurable por proyecto si se agrega al JSON.
- Video de portada: MP4 H.264, autoplay muted loop playsinline, poster y versión mobile opcional.

## Criterios de aceptación

- Sin errores de consola.
- Lighthouse móvil: rendimiento >= 85, accesibilidad >= 95, buenas prácticas >= 95, SEO >= 95.
- Navegación operativa con teclado y touch.
- No hay colores casi negros: todo fondo negro es `#000000`.
- Las cards del archivo no muestran textos en reposo en desktop.
- La web funciona con cualquier cantidad de carpetas de proyecto válidas.
- El contenido no queda hardcodeado en los componentes.

## Antes de modificar el diseño

Comparar la implementación contra los HTML de esta carpeta. Cualquier cambio de composición, tipografía, ritmo, animación o jerarquía debe justificarse por accesibilidad, rendimiento o adaptación responsive, no por una reinterpretación estética.

## Ajustes visuales V5
- El header de la home debe verse negro desde el inicio.
- El logo no se superpone sobre el video de portada; solo aparece en el header.
- El logo del header enlaza siempre a `index.html`.
- El hover de los servicios extiende el fondo negro al ancho completo del viewport.
- Las imágenes del equipo se plantean cuadradas y de escala contenida.
- La primera etapa del proceso se denomina “Evaluar”.

