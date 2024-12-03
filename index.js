// index.js

// Import required modules
const express = require('express');
const ejs = require('ejs');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const apiRoutes = require('./routes/api');
const cors = require('cors');
// Create the express application object
const app = express();
const port = 8000;
// Tell Express that we want to use EJS as the templating engine
app.set('view engine', 'ejs');

// Set up the body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api', apiRoutes);
// Set up public folder (for css and static js)
app.use(express.static(path.join(__dirname, 'public')));

// Define the database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'prepper_app',
    password: 'Nandos123',
    database: 'prepper_db'
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to database');
    }
});
global.db = db;

// Create a session
app.use(session({
    secret: 'somerandomstuff',  // Replace this with a strong secret in a production environment
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000  // Session expires in 10 minutes
    }
}));

// Middleware to make 'user' available in all templates
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// Load the route handlers
const mainRoutes = require("./routes/main");
app.use('/', mainRoutes);

// Load the route handlers for /users
const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);

// Load the route handlers for disaster data
const dataRoutes = require('./routes/data');
app.use('/data', dataRoutes);

// Start the web app listening
app.listen(port, () => console.log(`Prepper app listening on port ${port}!`));
