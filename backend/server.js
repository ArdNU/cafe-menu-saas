const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');
const db = require('./db');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_cafe_saas';

app.use(cors());
app.use(express.json());

// For serving uploaded images
const dataDir = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Also serve frontend static files if we are in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- AUTHENTICATION ROUTES ---

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

    // Ensure cafe name is valid for a URL (alphanumeric and dashes only)
    const urlSafeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    db.get(`SELECT * FROM cafes WHERE email = ? OR name = ?`, [email, urlSafeName], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: 'Email or Cafe Name already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run(`INSERT INTO cafes (name, email, password) VALUES (?, ?, ?)`, [urlSafeName, email, hashedPassword], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Registered successfully', cafeId: this.lastID, name: urlSafeName });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get(`SELECT * FROM cafes WHERE email = ?`, [email], async (err, cafe) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cafe) return res.status(400).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, cafe.password);
        if (!match) return res.status(400).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: cafe.id, name: cafe.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, cafe: { id: cafe.id, name: cafe.name, email: cafe.email } });
    });
});

// Middleware for auth
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.cafeId = decoded.id;
        next();
    });
};

// --- DASHBOARD ROUTES (PROTECTED) ---

app.get('/api/dashboard/items', authenticate, (req, res) => {
    db.all(`SELECT * FROM items WHERE cafe_id = ?`, [req.cafeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/dashboard/items', authenticate, upload.single('image'), (req, res) => {
    const { category, name, description, price } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(`INSERT INTO items (cafe_id, category, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.cafeId, category, name, description, price, imageUrl],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, category, name, description, price, image_url: imageUrl });
        }
    );
});

app.put('/api/dashboard/items/:id', authenticate, upload.single('image'), (req, res) => {
    const { category, name, description, price } = req.body;
    const id = req.params.id;
    
    if (req.file) {
        const imageUrl = `/uploads/${req.file.filename}`;
        db.run(`UPDATE items SET category=?, name=?, description=?, price=?, image_url=? WHERE id=? AND cafe_id=?`,
            [category, name, description, price, imageUrl, id, req.cafeId],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, image_url: imageUrl });
            }
        );
    } else {
        db.run(`UPDATE items SET category=?, name=?, description=?, price=? WHERE id=? AND cafe_id=?`,
            [category, name, description, price, id, req.cafeId],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    }
});

app.delete('/api/dashboard/items/:id', authenticate, (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM items WHERE id=? AND cafe_id=?`, [id, req.cafeId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/dashboard/qr', authenticate, async (req, res) => {
    db.get(`SELECT name FROM cafes WHERE id = ?`, [req.cafeId], async (err, cafe) => {
        if (err || !cafe) return res.status(500).json({ error: 'Cafe not found' });
        
        const publicUrl = `${req.protocol}://${req.get('host')}/menu/${cafe.name}`;
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);
            res.json({ qrCode: qrCodeDataUrl, url: publicUrl });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate QR code' });
        }
    });
});

// --- PUBLIC MENU ROUTES ---

app.get('/api/menu/:cafeName', (req, res) => {
    const cafeName = req.params.cafeName;
    db.get(`SELECT id, name FROM cafes WHERE name = ?`, [cafeName], (err, cafe) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cafe) return res.status(404).json({ error: 'Cafe not found' });

        db.all(`SELECT * FROM items WHERE cafe_id = ?`, [cafe.id], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ cafe: cafe.name, items });
        });
    });
});

// Fallback to React app for all other routes
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('API is running. Frontend build not found.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
