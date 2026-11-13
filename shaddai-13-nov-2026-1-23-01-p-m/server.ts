import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const DATA_FILE_TMP = path.join(DATA_DIR, 'db.json.tmp');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

// Credentials strictly requested by user:
const ADMIN_EMAIL = 'shaddai.papeleria00@gmail.com';
const ADMIN_PASS = 'Diosesamor00';

// Ensure data and backup directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Helper to sanitize incoming customer text strings against XSS / HTML injection
function sanitizeText(str: any, maxLen = 500): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().slice(0, maxLen);
}

// Data integrity validator to protect db.json against corruption or accidental wiping
function isValidAppData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (!data.catalogSettings || typeof data.catalogSettings !== 'object') return false;
  if (!Array.isArray(data.products)) return false;
  return true;
}

// In-memory cache & version tracking for lightning-fast reads and real-time sync
let cachedDB: any = null;
let dataVersion = Date.now();
const sseClients = new Set<Response>();

// Active admin sessions tokens (in-memory + HMAC stateless signature)
const activeAdminTokens = new Map<string, { email: string; expiresAt: number }>();
const AUTH_SECRET = 'shaddai_papeleria_secure_token_secret_2026';

function generateAdminToken(email: string): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const data = `${email.toLowerCase()}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
  return Buffer.from(`${data}:${hmac}`).toString('base64url');
}

function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  // Check active in-memory session
  const session = activeAdminTokens.get(token);
  if (session && Date.now() <= session.expiresAt) return true;
  // Stateless token verification
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 3) return false;
    const [email, expStr, sig] = parts;
    const exp = parseInt(expStr, 10);
    if (isNaN(exp) || Date.now() > exp) return false;
    if (email !== ADMIN_EMAIL.toLowerCase()) return false;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${email}:${expStr}`).digest('hex');
    return sig === expectedSig;
  } catch (e) {
    return false;
  }
}

// Simple in-memory rate limiter for login
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Read database with cache and defensive fallback
function readDB() {
  if (cachedDB) {
    return cachedDB;
  }
  if (!fs.existsSync(DATA_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    cachedDB = JSON.parse(raw);
    return cachedDB;
  } catch (err) {
    console.error('Error reading db.json:', err);
    // Check if backup exists
    const backupFile = path.join(DATA_DIR, 'db.backup.json');
    if (fs.existsSync(backupFile)) {
      try {
        const rawBackup = fs.readFileSync(backupFile, 'utf-8');
        cachedDB = JSON.parse(rawBackup);
        console.warn('Recovered db from db.backup.json');
        return cachedDB;
      } catch (backupErr) {
        console.error('Error reading backup:', backupErr);
      }
    }
    return null;
  }
}

// Atomic file write + rolling backup
function writeDB(data: any): boolean {
  try {
    if (!isValidAppData(data)) {
      console.error('writeDB: Intento de guardar datos inválidos o incompletos rechazado por seguridad');
      return false;
    }

    // 1. Minified JSON serialization for optimal speed & disk size
    const content = JSON.stringify(data);

    // 2. Write to temporary file first (atomic write)
    fs.writeFileSync(DATA_FILE_TMP, content, 'utf-8');
    fs.renameSync(DATA_FILE_TMP, DATA_FILE);

    // 3. Update in-memory cache
    cachedDB = data;
    dataVersion = Date.now();

    // 4. Save primary backup
    fs.writeFileSync(path.join(DATA_DIR, 'db.backup.json'), content, 'utf-8');

    // 5. Save rolling backup (max 10 recent backups)
    const backupName = `backup-${new Date().toISOString().slice(0, 10)}.json`;
    fs.writeFileSync(path.join(BACKUPS_DIR, backupName), content, 'utf-8');

    // Clean old backups if > 15 files
    try {
      const files = fs.readdirSync(BACKUPS_DIR);
      if (files.length > 15) {
        files.sort().slice(0, files.length - 15).forEach((f) => {
          fs.unlinkSync(path.join(BACKUPS_DIR, f));
        });
      }
    } catch (e) {
      // ignore cleanup errors
    }

    // 6. Broadcast update to all connected devices via SSE
    broadcastDataUpdated(data);
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

// Broadcast SSE event to all connected devices with complete data
function broadcastDataUpdated(dataToSend?: any) {
  const current = dataToSend || cachedDB;
  const payload = `data: ${JSON.stringify({
    type: 'DATA_UPDATED',
    version: dataVersion,
    timestamp: Date.now(),
    data: current,
  })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
      (client as any).flush?.();
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// Admin auth middleware
function requireAdminAuth(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!verifyAdminToken(token) && req.headers['x-admin-pass'] !== ADMIN_PASS) {
    return res.status(401).json({ success: false, message: 'Autenticación requerida para realizar cambios' });
  }

  next();
}

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SHADDAI',
    version: dataVersion,
    activeConnections: sseClients.size,
  });
});

// SSE Stream for real-time synchronization across all devices
app.get('/api/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send connection confirmation without overriding client Firestore state
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: dataVersion })}\n\n`);
  (res as any).flush?.();

  sseClients.add(res);

  // Heartbeat every 15s to prevent Cloud Run/proxy socket timeout
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
      (res as any).flush?.();
    } catch (err) {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Lightweight version check for polling or visibility changes
app.get('/api/sync/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ success: true, version: dataVersion });
});

// Admin Login
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Demasiados intentos fallidos. Por seguridad, aguardá 5 minutos.',
    });
  }

  const { email, password } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (cleanEmail === ADMIN_EMAIL.toLowerCase() && cleanPass === ADMIN_PASS) {
    // Generate secure stateless HMAC token valid for 30 days
    const token = generateAdminToken(cleanEmail);
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    activeAdminTokens.set(token, { email: cleanEmail, expiresAt });

    return res.json({
      success: true,
      token,
      message: 'Acceso autorizado',
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Credenciales inválidas',
  });
});

// Verify Admin Token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.slice(7).trim();
  if (verifyAdminToken(token)) {
    return res.json({ authenticated: true, email: ADMIN_EMAIL });
  }
  return res.json({ authenticated: false });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    activeAdminTokens.delete(token);
  }
  res.json({ success: true });
});

// Get Database State (Public read for catalog & client views)
app.get('/api/store', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const data = readDB();
  res.json({ success: true, version: dataVersion, data });
});

// Update Database State (Secured: requires admin token OR bootstrap if db empty)
app.post('/api/store', (req, res) => {
  const payloadData = req.body.data !== undefined ? req.body.data : req.body;
  if (!payloadData || !isValidAppData(payloadData)) {
    return res.status(400).json({ success: false, message: 'Datos incompletos o formato no válido' });
  }

  // If a db already exists, verify admin authorization
  const currentDB = readDB();
  if (currentDB) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const isAuthorized = verifyAdminToken(token) || req.headers['x-admin-pass'] === ADMIN_PASS;

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Iniciá sesión como administrador para guardar cambios.',
      });
    }
  }

  const ok = writeDB(payloadData);
  if (ok) {
    res.json({ success: true, version: dataVersion, message: 'Datos guardados y sincronizados' });
  } else {
    res.status(500).json({ success: false, message: 'Error interno al escribir en base de datos' });
  }
});

// Public Customer Order Submission endpoint:
// Allows catalog shoppers to submit an order safely without granting full write permissions
app.post('/api/orders/submit', (req, res) => {
  try {
    const { order } = req.body;
    if (!order || !order.clientName || !order.items || !Array.isArray(order.items)) {
      return res.status(400).json({ success: false, message: 'Datos de pedido inválidos' });
    }

    const currentDB = readDB();
    if (!currentDB) {
      return res.status(500).json({ success: false, message: 'La base de datos aún no está inicializada' });
    }

    const now = new Date().toISOString();
    const orderCount = (currentDB.orders?.length || 0) + 1;
    const orderNumber = `PED-${String(orderCount + 100).padStart(3, '0')}`;

    // Sanitize customer inputs against XSS and excessive payload length
    const cleanClientName = sanitizeText(order.clientName, 100);
    const cleanClientPhone = sanitizeText(order.clientPhone, 40);
    const cleanClientEmail = sanitizeText(order.clientEmail, 100);
    const cleanClientAddress = sanitizeText(order.clientAddress, 250);
    const cleanNotes = sanitizeText(order.notes, 1000);
    const cleanShippingNote = sanitizeText(order.shippingNote, 200);

    const newOrder = {
      ...order,
      clientName: cleanClientName,
      clientPhone: cleanClientPhone,
      clientEmail: cleanClientEmail || undefined,
      clientAddress: cleanClientAddress || undefined,
      notes: cleanNotes || undefined,
      shippingNote: cleanShippingNote || undefined,
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: now,
      updatedAt: now,
    };

    // Automatic Stock Deduction
    const updatedProducts = (currentDB.products || []).map((prod: any) => {
      if (prod.type === 'stock') {
        const itemInOrder = order.items.find((it: any) => it.productId === prod.id);
        if (itemInOrder) {
          const newStock = Math.max(0, (prod.stockQuantity || 0) - itemInOrder.quantity);
          return { ...prod, stockQuantity: newStock, updatedAt: now };
        }
      }
      return prod;
    });

    // Update or add client with phone normalization & name matching
    const normDigits = (s?: string) => (s || '').replace(/\D/g, '').slice(-10);
    const cleanOrderPhone = normDigits(order.clientPhone);
    const existingClient = (currentDB.clients || []).find((c: any) => {
      const cleanClientPhone = normDigits(c.phone);
      if (cleanOrderPhone && cleanClientPhone && cleanOrderPhone.length >= 8 && cleanOrderPhone === cleanClientPhone) {
        return true;
      }
      if (order.clientName && c.name && c.name.trim().toLowerCase() === order.clientName.trim().toLowerCase()) {
        return true;
      }
      return false;
    });
    let updatedClients = currentDB.clients || [];

    if (existingClient) {
      updatedClients = updatedClients.map((c: any) =>
        c.id === existingClient.id
          ? {
              ...c,
              totalOrders: (c.totalOrders || 0) + 1,
              totalSpent: (c.totalSpent || 0) + order.totalAmount,
              address: order.clientAddress || c.address,
              email: order.clientEmail || c.email,
            }
          : c
      );
    } else {
      const newClient = {
        id: `cli-${Date.now()}`,
        name: order.clientName,
        phone: order.clientPhone,
        email: order.clientEmail,
        address: order.clientAddress,
        totalOrders: 1,
        totalSpent: order.totalAmount,
        createdAt: now.slice(0, 10),
      };
      updatedClients = [newClient, ...updatedClients];
    }

    // Transactions if paid
    let updatedTransactions = currentDB.transactions || [];
    if (order.amountPaid > 0) {
      const newTx = {
        id: `tx-${Date.now()}`,
        type: 'ingreso',
        date: now.slice(0, 10),
        amount: order.amountPaid,
        category: `Venta pedido ${orderNumber}`,
        description: `Cobro de pedido para ${order.clientName}`,
        paymentMethod: order.paymentMethod,
        orderId: newOrder.id,
        isAutoFromOrder: true,
      };
      updatedTransactions = [newTx, ...updatedTransactions];
    }

    const updatedDB = {
      ...currentDB,
      products: updatedProducts,
      orders: [newOrder, ...(currentDB.orders || [])],
      clients: updatedClients,
      transactions: updatedTransactions,
    };

    writeDB(updatedDB);

    res.json({
      success: true,
      order: newOrder,
      message: 'Pedido registrado con éxito',
    });
  } catch (err: any) {
    console.error('Error submitting order:', err);
    res.status(500).json({ success: false, message: 'Error al procesar el pedido' });
  }
});

// Admin Backup Export (JSON Download)
app.get('/api/backup/export', requireAdminAuth, (req, res) => {
  const data = readDB();
  if (!data) {
    return res.status(404).json({ success: false, message: 'Sin datos para respaldar' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="shaddai-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

// Admin Backup Restore
app.post('/api/backup/restore', requireAdminAuth, (req, res) => {
  const { data } = req.body;
  if (!data || !data.catalogSettings || !Array.isArray(data.products)) {
    return res.status(400).json({ success: false, message: 'Archivo de respaldo inválido o dañado' });
  }
  const ok = writeDB(data);
  if (ok) {
    res.json({ success: true, message: 'Base de datos restaurada exitosamente' });
  } else {
    res.status(500).json({ success: false, message: 'Error al restaurar base de datos' });
  }
});

// Vite Dev Server / Static Production Server
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌸 SHADDAI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
