import { createIcons, Clock, CloudSun, Mail } from 'lucide';
import { siDiscord, siGithub, siSpotify } from 'simple-icons';

createIcons({
    icons: {
        Clock,
        CloudSun,
        Mail
    }
});

const brandIcons = {
    discord: siDiscord,
    github: siGithub,
    spotify: siSpotify
};

document.querySelectorAll('[data-brand]').forEach((element) => {
    const icon = brandIcons[element.dataset.brand];

    if (!icon) return;

    element.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="${icon.path}"></path>
        </svg>
    `;
});

function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';

    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function updateClock() {
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { day: 'numeric' });
    const month = now.toLocaleDateString('en-US', { month: 'long' });
    const year = now.toLocaleDateString('en-US', { year: 'numeric' });

    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();

    const amOrPm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    const formattedMinute = minute.toString().padStart(2, '0');
    const formattedSecond = second.toString().padStart(2, '0');

    const formattedDate = `${day}${getOrdinalSuffix(day)} ${month} ${year} • ${formattedHour}:${formattedMinute}:${formattedSecond} ${amOrPm}`;

    document.getElementById('clock').textContent = formattedDate;
}

updateClock();
setInterval(updateClock, 1000);

class WeatherWidget {
    constructor() {
        this.weatherText = document.getElementById('weather-text');
        this.tempCelsius = null;
        this.useCelsius = true;
        this.weatherCode = 0;

        this.load();
    }

    async load() {
        try {
            const response = await fetch(
                'https://api.open-meteo.com/v1/forecast?latitude=24.8607&longitude=67.0011&current=temperature_2m,weather_code&temperature_unit=celsius'
            );

            const data = await response.json();

            if (!data.current) {
                throw new Error('No current weather data');
            }

            this.tempCelsius = data.current.temperature_2m;
            this.weatherCode = data.current.weather_code;
            this.render();
        } catch (error) {
            console.error('Failed to load weather:', error);

            this.tempCelsius = 19.4;
            this.weatherCode = 0;
            this.render();
        }
    }

    getWeatherDescription(code) {
        const weatherMap = {
            0: 'clear sky',
            1: 'mainly clear',
            2: 'partly cloudy',
            3: 'overcast',
            45: 'foggy',
            48: 'foggy',
            51: 'drizzle',
            53: 'drizzle',
            55: 'drizzle',
            61: 'rain',
            63: 'rain',
            65: 'rain',
            71: 'snow',
            73: 'snow',
            75: 'snow',
            77: 'snow',
            80: 'rain showers',
            81: 'rain showers',
            82: 'rain showers',
            85: 'snow showers',
            86: 'snow showers',
            95: 'thunderstorm',
            96: 'thunderstorm with hail',
            99: 'thunderstorm with hail'
        };

        return weatherMap[code] || 'unknown';
    }

    getEmoji(temp) {
        if (temp < 22) return '❄️';
        if (temp > 30) return '🔥';
        return '';
    }

    toggleTemp() {
        this.useCelsius = !this.useCelsius;
        this.render();
    }

    render() {
        const fahrenheit = (this.tempCelsius * 9) / 5 + 32;
        const temp = this.useCelsius
            ? Math.round(this.tempCelsius)
            : Math.round(fahrenheit);

        const unit = this.useCelsius ? '°C' : '°F';
        const emoji = this.getEmoji(this.tempCelsius);
        const description = this.getWeatherDescription(this.weatherCode);

        this.weatherText.innerHTML = `It's currently ${emoji} <span class="temp-toggle">${temp}${unit}</span> <span class="weather-description">(${description})</span> in <a href="https://www.accuweather.com/en/pk/karachi/127657/weather-forecast/127657" target="_blank" rel="noopener noreferrer" class="weather-link">Karachi</a>.`;

        const tempToggle = document.querySelector('.temp-toggle');

        if (tempToggle) {
            tempToggle.addEventListener('click', () => this.toggleTemp());
        }
    }
 }

new WeatherWidget();

class SpotifyWidget {
    constructor() {
        this.apiUrl = '/api/current-song';
        this.widget = document.getElementById('spotify-widget');
        this.albumArt = document.querySelector('.spotify-album-art');
        this.title = document.getElementById('spotify-title');
        this.artist = document.getElementById('spotify-artist');
        this.statusText = document.getElementById('spotify-status-text');
        this.statusDot = document.querySelector('.spotify-status-dot');

        this.load();
        setInterval(() => this.load(), 30000);
    }

    async load() {
        try {
            const response = await fetch(this.apiUrl);

            if (!response.ok) {
                throw new Error('Failed to fetch Spotify data');
            }

            const data = await response.json();
            this.render(data);
        } catch (error) {
            console.error('Spotify widget error:', error);
            this.renderError();
        }
    }

    render(data) {
        if (data.album_image) {
            this.albumArt.innerHTML =
                `<img src="${data.album_image}" alt="${data.album}">`;

            this.albumArt.classList.remove('loading');
        }

        this.title.textContent = data.song;
        this.artist.textContent = data.artist;
        this.widget.href = data.spotify_url;

        if (data.is_playing) {
            this.statusText.textContent = 'Listening on Spotify';
            this.statusDot.classList.remove('inactive');
        } else {
            this.statusText.textContent = 'Last played on Spotify';
            this.statusDot.classList.add('inactive');
        }
    }

    renderError() {
        this.title.textContent = 'Unable to load';
        this.artist.textContent = 'Check back later';
        this.statusText.textContent = 'Offline';
        this.statusDot.classList.add('inactive');
        this.albumArt.classList.remove('loading');
    }
}

new SpotifyWidget();