# Control de Vivencia - Pro-Vida Seguros

Sistema web para consultar rentistas por **DOCUMENTO DE IDENTIDAD**.
Ahora configurado para que pueda usarse desde:
- **Tu misma PC** (como antes).
- **Otras PCs en la misma red** (oficina/wifi).
- **Internet**, publicándolo en un servicio en la nube (para personas en otras redes/ciudades).

> ⚠️ **Nota de seguridad:** por decisión del equipo, este sistema **no tiene login**.
> Cualquier persona que tenga la dirección (URL o IP) puede consultar documentos
> y también puede reemplazar el Excel desde `/admin.html`. Si más adelante
> quieres restringir esto (usuario/contraseña), avísame y lo agregamos.

## Estructura del proyecto

```
control-vivencia/
├── data/
│   └── CONTROL_DE_VIVENCIA.xlsx   <- Archivo de datos (se puede reemplazar desde /admin.html)
├── public/
│   ├── index.html                 <- ENTRADA (ingresar el CI)
│   ├── resultado.html             <- SALIDA (muestra el resultado)
│   ├── admin.html                 <- Subir/actualizar el Excel desde el navegador
│   ├── styles.css
│   └── logo.png
├── server.js
├── package.json
├── render.yaml                    <- Configuración lista para publicar en Render
└── README.md
```

---

## 1. Uso en tu propia PC (igual que antes)

```
npm install
npm start
```

Abre `http://localhost:3000`.

---

## 2. Uso desde otras PCs en la MISMA red (oficina/wifi)

1. Inicia el servidor con `npm start`. En la terminal verás algo así:
   ```
   En esta PC:        http://localhost:3000
   En la red local:   http://192.168.1.15:3000
   ```
2. Comparte esa segunda dirección (`http://192.168.1.15:3000`, con tu IP real)
   con las personas conectadas al mismo router/wifi. Deben escribirla en su
   navegador — no funciona "localhost" en sus equipos, tiene que ser esa IP.
3. Si no logran conectarse, probablemente el **Firewall de Windows** está
   bloqueando el puerto 3000. Para permitirlo:
   - Panel de control > Firewall de Windows Defender > Configuración avanzada
   - "Reglas de entrada" > "Nueva regla" > Puerto > TCP > 3000 > Permitir la conexión
4. Tu PC debe quedar **encendida y con `npm start` corriendo** mientras otros
   la usan (es tu PC la que hace de servidor).

---

## 3. Uso desde INTERNET (otras redes, oficinas, ciudades)

Para esto ya no basta tu PC personal — necesitas publicarlo en un servicio en
la nube que esté encendido 24/7. La opción más simple y con plan gratuito/económico
es **Render**. Pasos:

1. Sube la carpeta `control-vivencia` a un repositorio de GitHub (puedes hacerlo
   directamente desde la web de GitHub, arrastrando los archivos, sin necesidad
   de usar comandos Git si no los conoces).
2. Crea una cuenta gratuita en **https://render.com**.
3. Haz clic en "New +" > "Web Service" y conecta tu repositorio de GitHub.
4. Render detectará el archivo `render.yaml` incluido y configurará todo
   automáticamente (comando de instalación, comando de inicio, y un **disco
   persistente** para que el Excel no se borre cada vez que el servicio se reinicia).
5. Dale "Deploy". En unos minutos te dará una dirección pública, algo como:
   ```
   https://control-vivencia.onrender.com
   ```
6. Comparte esa dirección con cualquier persona, en cualquier red — podrán
   usarla igual que en tu PC.
7. Para actualizar el Excel más adelante, entra a
   `https://control-vivencia.onrender.com/admin.html` y sube el archivo nuevo
   desde ahí (no necesitas volver a subir código ni tocar Render).

**Alternativas a Render:** Railway.app y Fly.io funcionan de forma muy similar
(ambas con plan gratuito limitado). A continuación el paso a paso para Railway,
que ya viene preconfigurado en este proyecto (`railway.json`).

### Publicar en Railway (alternativa a Render)

1. Sube el proyecto a GitHub igual que en el paso 1 de Render (si ya lo hiciste
   para Render, es el mismo repositorio, no hace falta repetirlo).
2. Ve a **https://railway.app** y crea una cuenta (lo más rápido es con tu
   cuenta de GitHub).
3. Haz clic en **"New Project"** > **"Deploy from GitHub repo"** y elige tu
   repositorio `control-vivencia`.
4. Railway detecta automáticamente que es un proyecto Node.js (usa el archivo
   `railway.json` incluido) y comienza a construirlo solo.
5. Antes de que termine, ve a la pestaña **"Variables"** del servicio y agrega:
   - `ADMIN_USER` = `Jronquilla`
   - `ADMIN_PASS` = `Ronquill4` (o la contraseña que prefieras)
6. Para que el Excel no se borre cada vez que Railway reinicie el servicio,
   ve a la pestaña **"Volumes"**, crea un volumen nuevo y móntalo en la ruta
   `/app/data` (ahí es donde vive `CONTROL_DE_VIVENCIA.xlsx` dentro del proyecto).
7. Ve a la pestaña **"Settings"** > **"Networking"** y haz clic en
   **"Generate Domain"**. Railway te dará una dirección pública como:
   ```
   https://control-vivencia-production.up.railway.app
   ```
8. Abre esa dirección para probar la búsqueda, y `.../admin.html` para
   confirmar que pide usuario y contraseña.

Railway cobra por uso (tiene un pequeño crédito gratuito mensual); si tu
sistema se usa de forma moderada (consultas ocasionales, no miles al día),
normalmente se mantiene dentro de ese margen gratuito o con un costo mínimo.

---

## Cómo funciona

- **`index.html`**: formulario para ingresar el documento de identidad.
- **`resultado.html`**: consulta `/api/buscar?ci=...` y muestra fecha de
  renovación, rentista, tipo de pensión, regional y observaciones.
- **`admin.html`**: permite subir un nuevo `.xlsx` que reemplaza al actual,
  sin necesidad de tocar el servidor directamente (útil sobre todo cuando
  el sistema está publicado en internet).
- **`server.js`**: escucha en `0.0.0.0` (todas las interfaces de red), por lo
  que funciona igual en tu PC, en la red local o en la nube sin cambios de código.

## Actualizar los datos

- **Localmente:** reemplaza `data/CONTROL_DE_VIVENCIA.xlsx` con el mismo nombre.
- **Publicado en internet:** entra a `/admin.html` y sube el archivo nuevo.

En ambos casos debe mantener las columnas:
```
DOCUMENTO DE IDENTIDAD | FECHA DE RENOVACION | RENTISTA | TIPO DE PENSION | REGIONAL | OBSERVACIONES
```

## Personalización

- Logo: `public/logo.png`.
- Colores y marca de agua: variables `--morado` y `--azul` en `public/styles.css`.
- Puerto local: variable de entorno `PORT` (por defecto 3000).
