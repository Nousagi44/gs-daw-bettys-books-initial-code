// routes/data.js

const express = require('express');
const router = express.Router();
const axios = require('axios');

// Middleware to redirect non-logged-in users to the login page
const redirectLogin = (req, res, next) => {
    if (!req.session.user) {
        res.redirect('/users/login'); // Redirect to login if not logged in
    } else {
        next(); // Continue to the next middleware if logged in
    }
};

// Function to execute SQL queries (assuming db is globally available)
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

// Route: Fetch and display weather data by city
router.get('/weather', redirectLogin, async (req, res) => {
    const city = req.query.city;
    const userId = req.session.user.id; // Get user ID from session

    if (!city) {
        res.render('weather', { city: null, weatherData: null, error: null });
    } else {
        try {
            const weatherData = await getWeatherData(city);

            if (weatherData) {
                // Insert weather data into the database
                const insertQuery = `
                    INSERT INTO weather_data (user_id, city, temperature, humidity, conditions, uv_index)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                const insertParams = [
                    userId,
                    city,
                    weatherData.temp,
                    weatherData.rh,
                    weatherData.weather.description,
                    weatherData.uv
                ];

                await executeQuery(insertQuery, insertParams);
            }

            res.render('weather', { weatherData, city, error: null });
        } catch (err) {
            console.error('Error fetching/storing weather data:', err);
            res.render('weather', { error: "Could not retrieve weather data", city, weatherData: null });
        }
    }
});



// Function: Fetch weather data from Weatherbit API
async function getWeatherData(city) {
    try {
        const apiKey = process.env.WEATHERBIT_API_KEY || '24db3939b32e4192bb6d80966f2c2c4b'; // Use env variable if set
        const url = `https://api.weatherbit.io/v2.0/current?city=${encodeURIComponent(city)}&key=${apiKey}`;
        const response = await axios.get(url);
        const weatherDataArray = response.data.data;

        if (weatherDataArray && weatherDataArray.length > 0) {
            const weatherData = weatherDataArray[0];
            return {
                temp: weatherData.temp,
                rh: weatherData.rh,
                weather: weatherData.weather,
                uv: weatherData.uv,
                wind_spd: weatherData.wind_spd // Include wind_spd
            };
        } else {
            throw new Error("No weather data available");
        }
    } catch (err) {
        console.error('Error fetching weather data:', err);
        throw err;
    }
}

// Route: Fetch earthquake data
router.get('/earthquakes', redirectLogin, async (req, res) => {
    const city = req.query.city;
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lon);
    const userId = req.session.user.id; // Get user ID from session

    if (city) {
        await getEarthquakeDataByCity(city, res, userId);
    } else if (!isNaN(latitude) && !isNaN(longitude)) {
        await getEarthquakeDataByCoordinates(latitude, longitude, res, userId);
    } else {
        res.render('earthquakes', { city: null, earthquakes: null, error: null });
    }
});

// Function: Get earthquake data by city
async function getEarthquakeDataByCity(city, res, userId) {
    try {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
        const geocodeResponse = await axios.get(geocodeUrl);
        const geocodeData = geocodeResponse.data;

        if (!geocodeData.results || geocodeData.results.length === 0) {
            res.render('earthquakes', { error: "City not found", city, earthquakes: null });
            return;
        }

        const latitude = geocodeData.results[0].latitude;
        const longitude = geocodeData.results[0].longitude;

        await getEarthquakeDataByCoordinates(latitude, longitude, res, userId, city);
    } catch (err) {
        console.error('Error fetching geocoding data:', err);
        res.render('earthquakes', { error: "Could not retrieve location data", city, earthquakes: null });
    }
}

// Function: Get earthquake data by coordinates
async function getEarthquakeDataByCoordinates(lat, lon, res, userId, cityName = 'Your Location') {
    try {
        const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${getPastDate(30)}&minmagnitude=2.5`;
        const response = await axios.get(url);
        const earthquakeData = response.data;

        if (earthquakeData.features && earthquakeData.features.length > 0) {
            const earthquakesWithDistance = earthquakeData.features.map(feature => {
                const quakeLat = feature.geometry.coordinates[1];
                const quakeLon = feature.geometry.coordinates[0];
                const distance = getDistanceFromLatLonInKm(lat, lon, quakeLat, quakeLon);
                return { ...feature, distance };
            });

            earthquakesWithDistance.sort((a, b) => a.distance - b.distance);
            const closestEarthquakes = earthquakesWithDistance.slice(0, 12);

            // Insert earthquake data into the database
            const insertQuery = `
                INSERT INTO earthquake_data (user_id, location, magnitude, depth)
                VALUES ?
            `;
            const insertValues = closestEarthquakes.map(eq => [
                userId,
                eq.properties.place,
                eq.properties.mag,
                eq.geometry.coordinates[2]
            ]);

            await executeQuery(insertQuery, [insertValues]);

            res.render('earthquakes', { earthquakes: closestEarthquakes, city: cityName, error: null });
        } else {
            res.render('earthquakes', { error: "No recent earthquakes found", city: cityName, earthquakes: null });
        }
    } catch (err) {
        console.error('Error fetching earthquake data:', err);
        res.render('earthquakes', { error: "Could not retrieve earthquake data", city: cityName, earthquakes: null });
    }
}

// Helper function: Calculate distance between coordinates in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    const R = 6371; // Radius of Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Helper function: Get date 'n' days ago in YYYY-MM-DD format
function getPastDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

// Function: Fetch air quality data by city or coordinates
router.get('/airquality', redirectLogin, async (req, res) => {
    const city = req.query.city;
    const latitude = req.query.lat;
    const longitude = req.query.lon;
    const userId = req.session.user.id; // Get user ID from session

    if (city) {
        await getAirQualityDataByCity(city, res, userId);
    } else if (latitude && longitude) {
        await getAirQualityDataByCoordinates(latitude, longitude, res, userId);
    } else {
        res.render('airquality', { city: null, airQualityData: null, error: null });
    }
});

// Function: Fetch air quality data by city
async function getAirQualityDataByCity(city, res, userId) {
    try {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
        const geocodeResponse = await axios.get(geocodeUrl);
        const geocodeData = geocodeResponse.data;

        if (!geocodeData.results || geocodeData.results.length === 0) {
            res.render('airquality', { error: "City not found", city, airQualityData: null });
            return;
        }

        const latitude = geocodeData.results[0].latitude;
        const longitude = geocodeData.results[0].longitude;

        await getAirQualityDataByCoordinates(latitude, longitude, res, userId, city);
    } catch (err) {
        console.error('Error fetching geocoding data:', err);
        res.render('airquality', { error: "Could not retrieve location data", city, airQualityData: null });
    }
}

// Function: Fetch air quality data by coordinates
async function getAirQualityDataByCoordinates(lat, lon, res, userId, cityName = 'Your Location') {
    try {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,us_aqi`;
        const response = await axios.get(url);
        const airQualityData = response.data;

        if (airQualityData.hourly && airQualityData.hourly.time.length > 0) {
            const latestIndex = airQualityData.hourly.time.length - 1;
            const pm10 = airQualityData.hourly.pm10[latestIndex] || 'N/A';
            const pm2_5 = airQualityData.hourly.pm2_5[latestIndex] || 'N/A';
            const aqi = airQualityData.hourly.us_aqi[latestIndex] || 'N/A';

            const airQualityRecord = {
                pm10,
                pm2_5,
                aqi
            };

            // Insert air quality data into the database
            const insertQuery = `
                INSERT INTO air_quality_data (user_id, city, aqi_index, pollutant_level)
                VALUES (?, ?, ?, ?)
            `;
            const pollutantLevel = `PM2.5: ${pm2_5}, PM10: ${pm10}`; // Example of combining pollutant levels
            const insertParams = [
                userId,
                cityName,
                aqi !== 'N/A' ? parseInt(aqi) : null,
                pollutantLevel
            ];

            await executeQuery(insertQuery, insertParams);

            res.render('airquality', { airQualityData: { pm10, pm2_5, aqi }, city: cityName, error: null });
        } else {
            res.render('airquality', { error: "No air quality data available", city: cityName, airQualityData: null });
        }
    } catch (err) {
        console.error('Error fetching air quality data:', err);
        res.render('airquality', { error: "Could not retrieve air quality data", city: cityName, airQualityData: null });
    }
};

// Route to fetch and display news data based on location and categories
router.get('/news', redirectLogin, async (req, res) => {
    const city = req.query.city;
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lon);
    const userId = req.session.user.id; // Get user ID from session

    if (city) {
        // Fetch data using city name
        await getNewsByCity(city, res, userId);
    } else if (!isNaN(latitude) && !isNaN(longitude)) {
        // Fetch data using coordinates
        await getNewsByCoordinates(latitude, longitude, res, userId);
    } else {
        // Render the form for city input with variables initialized
        res.render('news', {
            city: null,
            globalConflictArticles: [],
            disasterNewsArticles: [],
            financialRiskArticles: [],
            supplyShortagesArticles: [],
            urbanSurvivalArticles: [],
            disasterPreparationArticles: [],
            error: null
        });
    }
});

async function getNewsByCity(city, res, userId) {
    try {
        // Get the coordinates of the city using Open-Meteo Geocoding API
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
        const geocodeResponse = await axios.get(geocodeUrl);
        const geocodeData = geocodeResponse.data;

        if (!geocodeData.results || geocodeData.results.length === 0) {
            res.render('news', {
                city,
                globalConflictArticles: [],
                disasterNewsArticles: [],
                financialRiskArticles: [],
                supplyShortagesArticles: [],
                urbanSurvivalArticles: [],
                disasterPreparationArticles: [],
                error: "City not found"
            });
            return;
        }

        const latitude = geocodeData.results[0].latitude;
        const longitude = geocodeData.results[0].longitude;

        // Now get news data using the coordinates
        await getNewsByCoordinates(latitude, longitude, res, userId, city);
    } catch (err) {
        console.error('Error fetching geocoding data:', err);
        res.render('news', {
            city,
            globalConflictArticles: [],
            disasterNewsArticles: [],
            financialRiskArticles: [],
            supplyShortagesArticles: [],
            urbanSurvivalArticles: [],
            disasterPreparationArticles: [],
            error: "Could not retrieve location data"
        });
    }
}

async function getNewsByCoordinates(lat, lon, res, userId, cityName = 'Your Location') {
    try {
        const apiKey = 'aa789e8d-6d12-447a-a151-c9601440defc';  // Replace with your actual Event Registry API key

        // Define the concept URIs for the topics
        const topics = {
            globalConflict: 'http://en.wikipedia.org/wiki/War',
            disasterNews: 'http://en.wikipedia.org/wiki/Natural_disaster',
            financialRisk: 'http://en.wikipedia.org/wiki/Financial_risk',
            supplyShortages: 'http://en.wikipedia.org/wiki/Shortage',
            urbanSurvival: 'http://en.wikipedia.org/wiki/Survival_skills',
            disasterPreparation: 'http://en.wikipedia.org/wiki/Emergency_preparedness'
        };

        // Function to fetch articles for a given concept URI and location
        async function fetchArticles(conceptUri) {
            const url = `https://eventregistry.org/api/v1/article/getArticles?apiKey=${apiKey}&resultType=articles&articlesSortBy=date&articlesCount=5&conceptUri=${encodeURIComponent(conceptUri)}&locationRadius=${lat},${lon},100km&lang=eng`;
            const response = await axios.get(url);
            const newsData = response.data;
            if (newsData && newsData.articles && newsData.articles.results.length > 0) {
                return newsData.articles.results;
            } else {
                return [];
            }
        }

        // Fetch articles for each topic
        const [
            globalConflictArticles,
            disasterNewsArticles,
            financialRiskArticles,
            supplyShortagesArticles,
            urbanSurvivalArticles,
            disasterPreparationArticles
        ] = await Promise.all([
            fetchArticles(topics.globalConflict),
            fetchArticles(topics.disasterNews),
            fetchArticles(topics.financialRisk),
            fetchArticles(topics.supplyShortages),
            fetchArticles(topics.urbanSurvival),
            fetchArticles(topics.disasterPreparation)
        ]);

        // Insert news data into the database
        const insertQuery = `
            INSERT INTO news_data (user_id, title, description, url, source, published_at)
            VALUES ?
        `;
        const insertValues = [];

        const allArticles = [
            ...globalConflictArticles,
            ...disasterNewsArticles,
            ...financialRiskArticles,
            ...supplyShortagesArticles,
            ...urbanSurvivalArticles,
            ...disasterPreparationArticles
        ];

        allArticles.forEach(article => {
            insertValues.push([
                userId,
                article.title || 'No Title',
                article.body || 'No Description',
                article.url || '#',
                article.source?.title || 'Unknown Source',
                article.date || new Date() // Assuming 'date' field exists
            ]);
        });

        if (insertValues.length > 0) {
            await executeQuery(insertQuery, [insertValues]);
        }

        // Render the news template with articles organized into sections
        res.render('news', {
            city: cityName,
            globalConflictArticles,
            disasterNewsArticles,
            financialRiskArticles,
            supplyShortagesArticles,
            urbanSurvivalArticles,
            disasterPreparationArticles,
            error: null
        });
    } catch (err) {
        console.error('Error fetching news data:', err);

        // Extract error message from the response if available
        let errorMessage = "Could not retrieve news data";
        if (err.response && err.response.data && err.response.data.status) {
            errorMessage = err.response.data.status.message;
        }

        // Ensure all variables are defined, even if empty arrays
        res.render('news', {
            city: 'Your Location',
            globalConflictArticles: [],
            disasterNewsArticles: [],
            financialRiskArticles: [],
            supplyShortagesArticles: [],
            urbanSurvivalArticles: [],
            disasterPreparationArticles: [],
            error: errorMessage
        });
    }
}

// Route for YouTube Guides Page
router.get('/youtube-guides', (req, res) => {
    res.render('youtube-guides'); 
});

// Get user preferences by user ID
router.get('/preferences/:userId', async (req, res) => {
    const userId = req.params.userId;

    const sql = `SELECT * FROM user_preferences WHERE user_id = ?`;

    try {
        const results = await executeQuery(sql, [userId]);
        if (results.length === 0) {
            res.status(404).json({ error: 'Preferences not found' });
        } else {
            res.json(results[0]); // Return the preferences for the user
        }
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ error: 'Failed to retrieve preferences' });
    }
});

module.exports = router;
