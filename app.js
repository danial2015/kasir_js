const express = require('express');
const mysql = require('mysql');
const path = require('path');
const bodyParser = require('body-parser');

// Database configuration
const host = "localhost"; // Ubah jika perlu
const username = "root"; // Ubah jika perlu
const password = ""; // Ubah jika perlu
const database = "kasir_donat_modern"; // Ubah jika perlu

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

//Set Body Parser 
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    const sql = "SELECT * FROM menu";
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error retrieving menu items: ' + err.stack);
        return;
      }
  
      res.render('index', { menuItems: result });
    });
  });
  // Define route for /menu
app.get('/menu', (req, res) => {
    // Retrieve menu items from the database
    const sql = "SELECT * FROM menu";
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error retrieving menu items: ' + err.stack);
        return;
      }
  
      res.render('menu', { menuItems: result });
    });
  });
  
  app.get('/add-to-cart', (req, res) => {
    const menuId = req.query.menu_id;
    const quantity = req.query.quantity;
  
    // Insert the item into the cart table in the database
    const sql = "INSERT INTO cart (menu_id, quantity) VALUES (?, ?)";
    connection.query(sql, [menuId, quantity], (err, result) => {
      if (err) {
        console.error('Error adding item to cart: ' + err.stack);
        return;
      }
    
      res.redirect('/cart'); // Redirect to the cart page after adding the item
    });
  });

  app.post('/remove-from-cart', (req, res) => {
    const cartId = req.body.cart_id;
  
    // Delete the item from the cart table in the database
    const sql = "DELETE FROM cart WHERE id = ?";
    connection.query(sql, [cartId], (err, result) => {
      if (err) {
        console.error('Error removing item from cart: ' + err.stack);
        return;
      }
    
      res.redirect('/cart'); // Redirect to the cart page after removing the item
    });
  });
  
 
  app.get('/cart', (req, res) => {
    // Retrieve cart items from the database
    const sql = "SELECT c.id, m.name, m.description, c.quantity FROM cart c JOIN menu m ON c.menu_id = m.id";
    connection.query(sql, (err, result) => {
      if (err) {
        console.error('Error retrieving cart items: ' + err.stack);
        return;
      }
    
      res.render('cart', { cartItems: result });
    });
  });
  



// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
