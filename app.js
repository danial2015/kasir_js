const express = require('express');
const mysql = require('mysql');
const path = require('path');

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
  
  
// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
