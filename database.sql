-- Create the prepper_db database if it doesn't exist
CREATE DATABASE IF NOT EXISTS prepper_db;

-- Use the prepper_db database for subsequent operations
USE prepper_db;

-- Create the 'users' table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,              
  username VARCHAR(50) UNIQUE NOT NULL,           
  password VARCHAR(255) NOT NULL,                 
  email VARCHAR(100) UNIQUE NOT NULL,             
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
);

-- Create the 'user_preferences' table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INT PRIMARY KEY,                         
  default_city VARCHAR(100),                       
  alert_thresholds JSON,                           
  notification_preferences JSON,                   
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the 'weather_data' table
CREATE TABLE IF NOT EXISTS weather_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  city VARCHAR(100),
  temperature DECIMAL(5, 2),
  humidity INT,
  conditions VARCHAR(100),
  uv_index DECIMAL(3, 1),
  retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the 'earthquake_data' table
CREATE TABLE IF NOT EXISTS earthquake_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  location VARCHAR(100),
  magnitude DECIMAL(3, 1),
  depth DECIMAL(5, 1),
  retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the 'air_quality_data' table
CREATE TABLE IF NOT EXISTS air_quality_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  city VARCHAR(100),
  aqi_index INT,
  pollutant_level VARCHAR(50),
  retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create the 'news_data' table
CREATE TABLE IF NOT EXISTS news_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  description TEXT,
  url VARCHAR(255),
  source VARCHAR(100),
  published_at DATETIME,
  retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create necessary indexes
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_weather_city ON weather_data(city);
CREATE INDEX idx_earthquake_location ON earthquake_data(location);
CREATE INDEX idx_air_quality_city ON air_quality_data(city);
CREATE INDEX idx_news_published_at ON news_data(published_at);

USE prepper_db;

SELECT * FROM weather_data WHERE user_id = 1;
