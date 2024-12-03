// routes/api.js

const express = require('express');
const router = express.Router();

// Middleware to ensure the user is authenticated
const redirectLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    next();
};

// Apply the authentication middleware to all API routes
router.use(redirectLogin);

/**
 * Helper function to handle database queries
 * @param {string} query - The SQL query string
 * @param {Array} params - The parameters for the SQL query
 * @returns {Promise} - Resolves with the query results or rejects with an error
 */
const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};

/**
 * GET /api/weather
 * Fetch weather data.
 * Optional Query Parameters:
 * - userId: Filter by user ID
 * - city: Filter by city name
 * - limit: Number of records to retrieve (default: 10)
 */
router.get('/weather', async (req, res) => {
    const { userId, city, limit = 10 } = req.query;
    let sql = 'SELECT * FROM weather_data';
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
    }

    if (city) {
        conditions.push('city = ?');
        params.push(city);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY retrieved_at DESC LIMIT ?';
    params.push(parseInt(limit));

    try {
        const results = await executeQuery(sql, params);
        res.json(results);
    } catch (err) {
        console.error('Error fetching weather data:', err);
        res.status(500).json({ error: 'Failed to retrieve weather data' });
    }
});

/**
 * GET /api/earthquakes
 * Fetch earthquake data.
 * Optional Query Parameters:
 * - userId: Filter by user ID
 * - location: Filter by location name
 * - limit: Number of records to retrieve (default: 10)
 */
router.get('/earthquakes', async (req, res) => {
    const { userId, location, limit = 10 } = req.query;
    let sql = 'SELECT * FROM earthquake_data';
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
    }

    if (location) {
        conditions.push('location = ?');
        params.push(location);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY retrieved_at DESC LIMIT ?';
    params.push(parseInt(limit));

    try {
        const results = await executeQuery(sql, params);
        res.json(results);
    } catch (err) {
        console.error('Error fetching earthquake data:', err);
        res.status(500).json({ error: 'Failed to retrieve earthquake data' });
    }
});

/**
 * GET /api/airquality
 * Fetch air quality data.
 * Optional Query Parameters:
 * - userId: Filter by user ID
 * - city: Filter by city name
 * - limit: Number of records to retrieve (default: 10)
 */
router.get('/airquality', async (req, res) => {
    const { userId, city, limit = 10 } = req.query;
    let sql = 'SELECT * FROM air_quality_data';
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
    }

    if (city) {
        conditions.push('city = ?');
        params.push(city);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY retrieved_at DESC LIMIT ?';
    params.push(parseInt(limit));

    try {
        const results = await executeQuery(sql, params);
        res.json(results);
    } catch (err) {
        console.error('Error fetching air quality data:', err);
        res.status(500).json({ error: 'Failed to retrieve air quality data' });
    }
});

/**
 * GET /api/news
 * Fetch news data.
 * Optional Query Parameters:
 * - userId: Filter by user ID
 * - limit: Number of records to retrieve (default: 10)
 */
router.get('/news', async (req, res) => {
    const { userId, limit = 10 } = req.query;
    let sql = 'SELECT * FROM news_data';
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push('user_id = ?');
        params.push(userId);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY retrieved_at DESC LIMIT ?';
    params.push(parseInt(limit));

    try {
        const results = await executeQuery(sql, params);
        res.json(results);
    } catch (err) {
        console.error('Error fetching news data:', err);
        res.status(500).json({ error: 'Failed to retrieve news data' });
    }
});

/**
 * GET /api/preferences/:userId
 * Fetch user preferences by user ID.
 */
router.get('/preferences/:userId', async (req, res) => {
    const userId = req.params.userId;

    const sql = `SELECT * FROM user_preferences WHERE user_id = ?`;

    try {
        const results = await executeQuery(sql, [userId]);
        if (results.length === 0) {
            return res.status(404).json({ error: 'Preferences not found for this user' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Error fetching user preferences:', err);
        res.status(500).json({ error: 'Failed to retrieve user preferences' });
    }
});

module.exports = router;
