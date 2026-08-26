// =========================================================
//  CONTROL DE VIVENCIA - Pro-Vida Seguros
//  Servidor Express: lee el Excel y expone una API de
//  búsqueda por DOCUMENTO DE IDENTIDAD.
// =========================================================

const path = require('path');
const os = require('os');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
// Escucha en todas las interfaces de red (0.0.0.0), no solo localhost.
// Esto permite el acceso desde otras PCs de la misma red y, si el
// servidor está publicado en internet (Render, Railway, VPS, etc.),
// también desde otras redes.
const HOST = '0.0.0.0';

// Carpeta y ruta del archivo Excel con los datos.
// data/ debe existir siempre; si se publica en un servicio en la nube,
// configúrala como "disco persistente" para que no se borre al reiniciar.
const DATA_DIR = path.join(__dirname, 'data');
const EXCEL_PATH = path.join(DATA_DIR, 'CONTROL_DE_VIVENCIA.xlsx');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Configuración para recibir la subida de un nuevo Excel desde el navegador
// (página /admin.html). Se guarda temporalmente y luego reemplaza el archivo.
const upload = multer({ dest: path.join(os.tmpdir(), 'uploads-control-vivencia') });

// -----------------------------------------------------
// Credenciales del panel de administración (/admin.html).
// Puedes cambiarlas aquí, o mejor aún, mediante variables de entorno
// ADMIN_USER y ADMIN_PASS (por ejemplo en Render), para no dejarlas
// escritas directamente en el código.
// -----------------------------------------------------
const ADMIN_USER = process.env.ADMIN_USER || 'Jronquilla';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Ronquill4';

function protegerAdmin(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Panel de administración - Control de Vivencia"');
    return res.status(401).send('Autenticación requerida.');
  }

  const credenciales = Buffer.from(auth.split(' ')[1], 'base64').toString('utf-8');
  const separador = credenciales.indexOf(':');
  const usuario = credenciales.slice(0, separador);
  const clave = credenciales.slice(separador + 1);

  if (usuario === ADMIN_USER && clave === ADMIN_PASS) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Panel de administración - Control de Vivencia"');
  return res.status(401).send('Usuario o contraseña incorrectos.');
}

// Esta protección debe registrarse ANTES de express.static, para que
// intercepte la petición a /admin.html antes de que el archivo se sirva
// directamente como archivo estático.
app.use('/admin.html', protegerAdmin);
app.use('/admin/subir-excel', protegerAdmin);

// -----------------------------------------------------
// Carga de datos en memoria (se recarga en cada consulta
// leyendo el archivo, así siempre refleja la última versión
// guardada del Excel sin necesidad de reiniciar el servidor)
// -----------------------------------------------------
function cargarDatos() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // defval: '' evita que celdas vacías generen "undefined"
  const filas = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Normalizamos nombres de columnas a claves fijas,
  // sin importar mayúsculas/tildes en el encabezado del Excel.
  return filas.map((fila) => {
    const normalizado = {};
    Object.keys(fila).forEach((key) => {
      const k = key.trim().toUpperCase();
      normalizado[k] = fila[key];
    });
    return {
      documento: String(normalizado['DOCUMENTO DE IDENTIDAD'] ?? '').trim(),
      fechaRenovacion: normalizado['FECHA DE RENOVACION'] ?? '',
      estado: normalizado['ESTADO'] ?? '',
      rentista: normalizado['RENTISTA'] ?? '',
      tipoPension: normalizado['TIPO DE PENSION'] ?? '',
      regional: normalizado['REGIONAL'] ?? '',
      // El Excel puede traer la columna como "REFERENCIA" u "OBSERVACIONES"
      // según la versión; soportamos ambas.
      referencia: normalizado['REFERENCIA'] ?? normalizado['OBSERVACIONES'] ?? '',
    };
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------
// API: GET /api/buscar?ci=1234567
// -----------------------------------------------------
app.get('/api/buscar', (req, res) => {
  const ci = String(req.query.ci || '').trim();

  if (!ci) {
    return res.status(400).json({ ok: false, mensaje: 'Debe ingresar un documento de identidad.' });
  }

  let datos;
  try {
    datos = cargarDatos();
  } catch (err) {
    console.error('Error leyendo el Excel:', err);
    return res.status(500).json({ ok: false, mensaje: 'No se pudo leer el archivo de datos (CONTROL_DE_VIVENCIA.xlsx).' });
  }

  // Comparación limpia: solo dígitos, así "5.544.816", "5544816 " o "5544816" calzan igual.
  const limpiar = (v) => String(v).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  const ciBuscado = limpiar(ci);

  const encontrado = datos.find((r) => limpiar(r.documento) === ciBuscado);

  if (!encontrado) {
    return res.json({ ok: false, mensaje: 'No se encontró ningún registro con ese documento de identidad.' });
  }

  return res.json({ ok: true, data: encontrado });
});

// -----------------------------------------------------
// API: POST /admin/subir-excel
// Permite reemplazar el archivo de datos desde el navegador
// (útil cuando el sistema está publicado en internet y no
// se tiene acceso directo al servidor de archivos).
// -----------------------------------------------------
app.post('/admin/subir-excel', upload.single('archivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, mensaje: 'No se recibió ningún archivo.' });
  }

  const nombreOriginal = req.file.originalname || '';
  if (!nombreOriginal.toLowerCase().endsWith('.xlsx')) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ ok: false, mensaje: 'El archivo debe ser un .xlsx' });
  }

  try {
    // Validamos que el archivo se pueda leer como Excel antes de reemplazar
    XLSX.readFile(req.file.path);
    fs.copyFileSync(req.file.path, EXCEL_PATH);
    fs.unlink(req.file.path, () => {});
    return res.json({ ok: true, mensaje: 'Archivo actualizado correctamente.' });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Error al reemplazar el Excel:', err);
    return res.status(400).json({ ok: false, mensaje: 'El archivo no parece ser un Excel válido.' });
  }
});

// Cualquier otra ruta -> index.html (entrada de datos)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function obtenerIPsLocales() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  Object.values(interfaces).forEach((lista) => {
    (lista || []).forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    });
  });
  return ips;
}

app.listen(PORT, HOST, () => {
  console.log('=========================================');
  console.log(' CONTROL DE VIVENCIA - Pro-Vida Seguros');
  console.log(` En esta PC:        http://localhost:${PORT}`);
  obtenerIPsLocales().forEach((ip) => {
    console.log(` En la red local:   http://${ip}:${PORT}`);
  });
  console.log(` Panel para subir Excel: /admin.html`);
  console.log('=========================================');
});
