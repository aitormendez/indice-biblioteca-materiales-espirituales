# Índice de la Biblioteca Espiritual (Sitio Web)

Este proyecto contiene el código fuente de un sitio web estático construido con [Astro](https://astro.build/) para visualizar el índice de la biblioteca digital de `Materiales espirituales`.

El propósito de este sitio es ofrecer una interfaz web rápida y sencilla para explorar todos los autores, reveladores y sus obras de un solo vistazo, evitando la necesidad de navegar por las carpetas anidadas del sistema de archivos.

## Tecnologías Utilizadas

- **Framework**: Astro
- **Estilos**: Tailwind CSS
- **Generación de Contenido**: Script de Python

## Flujo de Trabajo

El contenido del sitio web se genera dinámicamente a partir de la estructura de directorios de la biblioteca. El proceso consta de dos fases principales:

1.  **Generación de Datos**: Un script de Python (`generar_indice.py`) escanea los directorios de `Materiales espirituales` y crea un archivo `biblioteca.json` que sirve como base de datos para el sitio.
2.  **Construcción del Sitio**: Astro utiliza este archivo `biblioteca.json` para construir una página HTML estática con el índice completo.

---

## Instrucciones de Uso

Sigue estos pasos para actualizar el contenido y visualizar el sitio web.

### Requisitos Previos

- Tener instalado [Node.js](https://nodejs.org/) (que incluye npm).
- Tener instalado [Python 3](https://www.python.org/).

### Paso 1: Actualizar el Índice de Contenidos

Cada vez que realices cambios en la biblioteca (añadir, eliminar o renombrar archivos en `Materiales espirituales`), debes regenerar el archivo de datos `biblioteca.json`.

Para ello, desde el directorio raíz del proyecto (`/Volumes/E/Nextcloud/`), ejecuta el siguiente comando en la terminal:

```bash
python3 scripts/generar_indice.py
```

Este comando actualizará el archivo `SitioWeb/src/data/biblioteca.json` con los últimos cambios.

### Paso 2: Instalar Dependencias (Solo la primera vez)

Si es la primera vez que trabajas con el sitio web o si se han añadido nuevas dependencias, necesitas instalarlas.

Navega al directorio del sitio web y ejecuta `npm install`:

```bash
cd SitioWeb
npm install
```

### Paso 3: Iniciar el Servidor de Desarrollo

Para ver el sitio web en tu máquina local, puedes iniciar el servidor de desarrollo de Astro.

```bash
# Asegúrate de estar en el directorio SitioWeb
npm run dev
```

Esto iniciará un servidor local. Podrás acceder al sitio desde la URL que aparezca en la terminal (normalmente `http://localhost:4321`). El servidor se recargará automáticamente si haces cambios en los archivos del sitio (ej. `index.astro`).

### Paso 4: Generar el Sitio Estático (Para Despliegue)

Cuando quieras generar la versión final del sitio para subirla a un servidor, utiliza el comando `build`.

```bash
# Asegúrate de estar en el directorio SitioWeb
npm run build
```

Este comando creará una carpeta `dist` con todos los archivos HTML, CSS y JS estáticos, listos para ser desplegados en cualquier servicio de hosting.

---

## Despliegue en Netlify

Este proyecto está optimizado para un despliegue automático y continuo a través de Netlify.

### Flujo Automático

El despliegue es automático. Cada vez que se suben cambios a la rama `main` del repositorio en GitHub, Netlify reconstruye y publica el sitio automáticamente. El flujo es:

1.  Haces `git push` con tus cambios (del código fuente, nunca de la carpeta `dist`).
2.  Netlify detecta el `push`.
3.  Netlify ejecuta el `build command` en sus servidores, generando la carpeta `dist` allí.
4.  Netlify publica el contenido de esa nueva carpeta `dist` en la web.

### Configuración en Netlify

Si necesitas configurar el sitio desde cero en Netlify, estos son los ajustes que debes usar:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Base directory:** (dejar en blanco)

**Importante:** El `Base directory` se deja en blanco porque se asume que el repositorio que conectas a Netlify es el proyecto del sitio web en sí, no el monorepo completo que tienes en tu ordenador.
