// OpenWeatherMap API Configuration
const API_KEY = 'a6d3f3a0f9d8c6b5e4a9b7c8d1e2f3a4'; // Free tier API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const suggestionsDropdown = document.getElementById('suggestions');
const mainContent = document.getElementById('mainContent');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const welcome = document.getElementById('welcome');

// Current weather elements
const currentWeatherCard = document.getElementById('currentWeatherCard');
const cityName = document.getElementById('cityName');
const weatherDate = document.getElementById('weatherDate');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const weatherDesc = document.getElementById('weatherDesc');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const feelsLike = document.getElementById('feelsLike');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const cloudiness = document.getElementById('cloudiness');

// Forecast elements
const forecastSection = document.getElementById('forecastSection');
const forecastContainer = document.getElementById('forecastContainer');
const hourlySection = document.getElementById('hourlySection');
const hourlyContainer = document.getElementById('hourlyContainer');

// Event Listeners
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchWeatherByCity();
});

searchBtn.addEventListener('click', fetchWeatherByCity);
locationBtn.addEventListener('click', fetchWeatherByLocation);
searchInput.addEventListener('input', handleSearchInput);

/**
 * Fetch weather by city name
 */
async function fetchWeatherByCity() {
    const city = searchInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    try {
        showLoading(true);
        suggestionsDropdown.classList.remove('active');
        
        // Get coordinates for the city
        const geoResponse = await fetch(
            `${GEO_API_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        );

        if (!geoResponse.ok) throw new Error('City not found');
        
        const geoData = await geoResponse.json();
        if (geoData.length === 0) {
            showError('City not found. Please try another name.');
            return;
        }

        const { lat, lon, name, country } = geoData[0];
        await fetchWeatherByCoordinates(lat, lon, name, country);
        searchInput.value = '';

    } catch (err) {
        console.error('Error:', err);
        showError('Failed to fetch weather data. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch weather by user's current location
 */
async function fetchWeatherByLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading(true);
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoordinates(latitude, longitude);
            showLoading(false);
        },
        (err) => {
            showError('Unable to get your location. Please enable location services.');
            showLoading(false);
        }
    );
}

/**
 * Fetch weather using coordinates (latitude, longitude)
 */
async function fetchWeatherByCoordinates(lat, lon, cityName = null, country = null) {
    try {
        showLoading(true);
        showError('');

        // Fetch current weather
        const currentResponse = await fetch(
            `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );

        // Fetch forecast (5 day / 3 hour)
        const forecastResponse = await fetch(
            `${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );

        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        displayCurrentWeather(currentData, cityName, country);
        displayForecast(forecastData);
        displayHourlyForecast(forecastData);

        welcome.style.display = 'none';
        showLoading(false);

    } catch (err) {
        console.error('Error:', err);
        showError('Failed to fetch weather data. Please try again.');
        showLoading(false);
    }
}

/**
 * Display current weather information
 */
function displayCurrentWeather(data, cityName = null, country = null) {
    currentWeatherCard.style.display = 'block';

    const location = cityName ? `${cityName}, ${country}` : data.name;
    const date = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    cityName.textContent = location;
    weatherDate.textContent = date;

    // Weather icon
    const iconCode = data.weather[0].icon;
    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    weatherIcon.alt = data.weather[0].main;

    // Temperature and description
    temperature.textContent = Math.round(data.main.temp);
    weatherDesc.textContent = data.weather[0].description;

    // Details
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(data.wind.speed)} m/s`;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    pressure.textContent = `${data.main.pressure} hPa`;
    visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    cloudiness.textContent = `${data.clouds.all}%`;
}

/**
 * Display 5-day forecast
 */
function displayForecast(data) {
    forecastSection.style.display = 'block';
    forecastContainer.innerHTML = '';

    // Group forecasts by day
    const dailyForecasts = {};
    
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                temps: [],
                icon: forecast.weather[0].icon,
                description: forecast.weather[0].description,
                rain: 0
            };
        }

        dailyForecasts[date].temps.push(forecast.main.temp);
        if (forecast.rain) {
            dailyForecasts[date].rain += forecast.rain['3h'] || 0;
        }
    });

    // Display first 5 days
    Object.entries(dailyForecasts).slice(0, 5).forEach(([date, data]) => {
        const maxTemp = Math.round(Math.max(...data.temps));
        const minTemp = Math.round(Math.min(...data.temps));

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-date">${date}</div>
            <div class="forecast-icon">
                <img src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}">
            </div>
            <div class="forecast-desc">${data.description}</div>
            <div class="forecast-temps">
                <span class="forecast-temp-high">↑ ${maxTemp}°</span>
                <span class="forecast-temp-low">↓ ${minTemp}°</span>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

/**
 * Display hourly forecast (next 24 hours)
 */
function displayHourlyForecast(data) {
    hourlySection.style.display = 'block';
    hourlyContainer.innerHTML = '';

    // Get next 8 forecasts (3-hour intervals = 24 hours)
    data.list.slice(0, 8).forEach(forecast => {
        const time = new Date(forecast.dt * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const temp = Math.round(forecast.main.temp);
        const icon = forecast.weather[0].icon;
        const rainChance = Math.round((forecast.pop || 0) * 100);

        const card = document.createElement('div');
        card.className = 'hourly-card';
        card.innerHTML = `
            <div class="hourly-time">${time}</div>
            <div class="hourly-icon">
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather">
            </div>
            <div class="hourly-temp">${temp}°C</div>
            <div class="hourly-rain">🌧️ ${rainChance}%</div>
        `;
        hourlyContainer.appendChild(card);
    });
}

/**
 * Handle search input with suggestions
 */
async function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        suggestionsDropdown.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(
            `${GEO_API_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
        );

        const data = await response.json();
        
        if (data.length === 0) {
            suggestionsDropdown.classList.remove('active');
            return;
        }

        suggestionsDropdown.innerHTML = '';
        data.forEach(location => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<strong>${location.name}</strong><small>${location.country}</small>`;
            div.addEventListener('click', () => {
                searchInput.value = location.name;
                fetchWeatherByCoordinates(location.lat, location.lon, location.name, location.country);
            });
            suggestionsDropdown.appendChild(div);
        });

        suggestionsDropdown.classList.add('active');
    } catch (err) {
        console.error('Error fetching suggestions:', err);
    }
}

/**
 * Show/hide loading spinner
 */
function showLoading(isLoading) {
    if (isLoading) {
        loading.style.display = 'block';
        currentWeatherCard.style.display = 'none';
        forecastSection.style.display = 'none';
        hourlySection.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (message) {
        error.textContent = `❌ ${message}`;
        error.style.display = 'block';
    } else {
        error.style.display = 'none';
    }
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== searchInput) {
        suggestionsDropdown.classList.remove('active');
    }
});
