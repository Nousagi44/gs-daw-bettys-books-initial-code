const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt'); // bcrypt is imported for password hashing
const saltRounds = 10; // Number of salt rounds for bcrypt
const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'bettys_books_app',   // Your MySQL username
    password: 'qwertyuiop',     // Your MySQL password
    database: 'bettys_books'     // Your database name
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to the database.');
});

// Route to display the registration form
router.get('/register', function (req, res, next) {
    res.render('register.ejs'); // Render the registration form
});

// Route to handle user registration logic
router.post('/registered', function (req, res, next) {
    const plainPassword = req.body.password;

    // Hash the password before storing it
    bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Server error');
        }

        // SQL query to insert user into the database
        const sql = `INSERT INTO users (username, first_name, last_name, email, hashed_password) VALUES (?, ?, ?, ?, ?)`;
        const values = [
            req.body.username,   // username
            req.body.first,      // first_name
            req.body.last,       // last_name
            req.body.email,      // email
            hashedPassword       // hashed_password
        ];

        // Use db.query to insert data into the MySQL database
        db.query(sql, values, (err) => {
            if (err) {
                console.error('Error saving user to database:', err.stack);
                return res.status(500).send('Error saving user');
            }

            // Success message for debugging
            let response = 'Hello ' + req.body.first + ' ' + req.body.last + ', you are now registered!';
            response += ' We will send an email to you at ' + req.body.email;

            // Send the response back (for debugging purposes)
            res.send(response);
        });
    });
});

// Route to display the list of users
router.get('/list', function (req, res, next) {
    const sql = 'SELECT username, first_name, last_name, email FROM users'; // SQL query to select user data

    // Use db.query to fetch data from the MySQL database
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err); // Log the error
            return res.status(500).send('Error fetching users');
        }

        // Log the results for debugging
        console.log('Fetched users:', results);

        // Render the listusers.ejs view with the fetched users
        res.render('listusers.ejs', { users: results }); // Pass the users data to the view
    });
});

// Route to display the login form
router.get('/login', function (req, res, next) {
    res.render('login.ejs'); // Render the login form
});

// Route to handle login logic
router.post('/loggedin', function (req, res, next) {
    const username = req.body.username;
    const password = req.body.password;

    // SQL query to select the hashed password for the user
    const sql = 'SELECT hashed_password FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).send('Error fetching user');
        }

        // Check if user exists
        if (results.length === 0) {
            return res.send('Login failed: User not found');
        }

        const hashedPassword = results[0].hashed_password;

        // Compare the password supplied with the hashed password in the database
        bcrypt.compare(password, hashedPassword, function(err, result) {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Server error');
            }
            if (result) {
                // Password matches
                res.send(`Welcome back, ${username}! You have successfully logged in.`);
            } else {
                // Password does not match
                res.send('Login failed: Incorrect password');
            }
        });
    });
});

// Export the router object so index.js can access it
module.exports = router;
