const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

// Database configuration
const host = "localhost"; // Ubah jika perlu
const username = "root"; // Ubah jika perlu
const password = ""; // Ubah jika perlu
const database = "kasir_db"; // Ubah jika perlu

// Create database connection
const connection = mysql.createConnection({
  host: host,
  user: username,
  password: password,
  database: database
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database: ' + err.stack);
    return;
  }

  console.log('Connected to the database');
});

// Create Express app
const app = express();

// Set views directory
app.set('views', path.join(__dirname, 'views'));

// Set view engine to EJS
app.set('view engine', 'ejs');

// Set up session
app.use(session({
  secret: 'secret-key',
  resave: true,
  saveUninitialized: true
}));

//Set Body Parser 
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware untuk memeriksa status login
function checkLogin(req, res, next) {
  if (req.session.user) {
    next(); // Lanjutkan jika pengguna sudah login
  } else {
    res.redirect('/login'); // Arahkan ke halaman login jika pengguna belum login
  }
}

app.get('/', checkLogin, (req, res) => {
  const sql = "SELECT * FROM menu";
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Error retrieving menu items: ' + err.stack);
      return;
    }

    res.render('index', { menuItems: result });
  });
});

app.get('/menu', checkLogin, (req, res) => {
  const sql = "SELECT * FROM menu";
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Error retrieving menu items: ' + err.stack);
      return;
    }

    res.render('menu', { menuItems: result });
  });
});

app.get('/add-to-cart', checkLogin, (req, res) => {
  const menuId = req.query.menu_id;
  const quantity = req.query.quantity;

  const sql = "INSERT INTO cart (menu_id, quantity) VALUES (?, ?)";
  connection.query(sql, [menuId, quantity], (err, result) => {
    if (err) {
      console.error('Error adding item to cart: ' + err.stack);
      return;
    }

    res.redirect('/cart');
  });
});

app.post('/remove-from-cart', checkLogin, (req, res) => {
  const cartId = req.body.cart_id;

  const sql = "DELETE FROM cart WHERE id = ?";
  connection.query(sql, [cartId], (err, result) => {
    if (err) {
      console.error('Error removing item from cart: ' + err.stack);
      return;
    }

    res.redirect('/cart');
  });
});

app.get('/cart', checkLogin, (req, res) => {
  const sql = "SELECT c.id, m.name, m.description, c.quantity FROM cart c JOIN menu m ON c.menu_id = m.id";
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Error retrieving cart items: ' + err.stack);
      return;
    }

    res.render('cart', { cartItems: result });
  });
});

app.post('/checkout', checkLogin, (req, res) => {
  const sql = `
    INSERT INTO riwayat_pemesanan (order_date, menu_name, quantity, total)
    SELECT CURRENT_TIMESTAMP, m.name, c.quantity, (c.quantity * m.price)
    FROM cart c
    JOIN menu m ON c.menu_id = m.id
  `;
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Error checking out cart items: ' + err.stack);
      return;
    }

    const deleteCartQuery = 'DELETE FROM cart';
    connection.query(deleteCartQuery, (err) => {
      if (err) {
        console.error('Error deleting cart items: ' + err.stack);
        return;
      }

      res.redirect('/riwayat_pemesanan');
    });
  });
});

app.get('/riwayat_pemesanan', checkLogin, (req, res) => {
  const dayFilter = req.query.day;
  let sql = "SELECT * FROM riwayat_pemesanan";
  if (dayFilter) {
    sql += ` WHERE DATE(order_date) = '${dayFilter}'`;
  }
  sql += " ORDER BY order_date DESC LIMIT 5";
  connection.query(sql, (err, result) => {
    if (err) {
      console.error('Error retrieving order history: ' + err.stack);
      return;
    }

    res.render('riwayat_pemesanan', {
      orders: result,
      today: new Date().toISOString().split('T')[0],
      yesterday: (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
      })()
    });
  });
});

app.post('/cetak_struk', checkLogin, (req, res) => {
  const orderId = req.body.order_id;

  // Ambil data pesanan dari database berdasarkan orderId
  const sql = "SELECT * FROM riwayat_pemesanan WHERE id = ?";
  connection.query(sql, [orderId], (err, result) => {
    if (err) {
      console.error('Error retrieving order data: ' + err.stack);
      return;
    }

    // Periksa apakah pesanan ditemukan
    if (result.length === 0) {
      console.error('Order not found');
      return;
    }

    const order = result[0];

    // Kirim data pesanan ke template cetak_struk.ejs
    res.render('cetak_struk', { order: order });
  });
});

app.get('/cetak_struk/:orderId', checkLogin, (req, res) => {
  const orderId = req.params.orderId;
  const sql = `SELECT * FROM riwayat_pemesanan WHERE id = ?`;
  connection.query(sql, [orderId], (err, result) => {
    if (err) {
      console.error('Error retrieving order details: ' + err.stack);
      return;
    }

    if (result.length === 0) {
      // Order not found
      res.status(404).send('Order not found');
      return;
    }

    const order = result[0];
    res.render('cetak_struk', { order });
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';
  connection.query(sql, [username], (err, result) => {
    if (err) {
      console.error('Error retrieving user: ' + err.stack);
      return;
    }

    if (result.length === 0) {
      // User not found
      res.redirect('/login');
      return;
    }

    const user = result[0];
    bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
      if (bcryptErr) {
        console.error('Error comparing passwords: ' + bcryptErr.stack);
        return;
      }

      if (bcryptResult) {
        // Passwords match, set user in session
        req.session.user = user;
        res.redirect('/');
      } else {
        // Passwords don't match
        res.redirect('/login');
      }
    });
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';
  connection.query(sql, [username], (err, result) => {
    if (err) {
      console.error('Error retrieving user: ' + err.stack);
      return;
    }

    if (result.length > 0) {
      // User already exists
      res.redirect('/register');
      return;
    }

    bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error('Error hashing password: ' + hashErr.stack);
        return;
      }

      const insertSql = 'INSERT INTO users (username, password) VALUES (?, ?)';
      connection.query(insertSql, [username, hashedPassword], (insertErr) => {
        if (insertErr) {
          console.error('Error inserting user: ' + insertErr.stack);
          return;
        }

        res.redirect('/login');
      });
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error logging out: ' + err.stack);
      return;
    }
    res.redirect('/login'); // Arahkan ke halaman login setelah logout
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
