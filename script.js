import { createIcons, Sun, Moon, Clock, CloudSun, Mail } from 'lucide';
import { siDiscord, siGithub, siSpotify } from 'simple-icons';

createIcons({
    icons: {
        Sun,
        Moon,
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

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const dots = [];
const numberOfDots = 50;
const dotSpeed = 0.25;

for (let index = 0; index < numberOfDots; index++) {
    dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        velocityX: Math.random() * dotSpeed - dotSpeed / 2,
        velocityY: Math.random() * dotSpeed - dotSpeed / 2,
        color: `rgb(
            ${Math.floor(Math.random() * 256)},
            ${Math.floor(Math.random() * 256)},
            ${Math.floor(Math.random() * 256)}
        )`
    });
}

let mouseX = 0;
let mouseY = 0;

function getDistance(x1, y1, x2, y2) {
    const xDistance = x2 - x1;
    const yDistance = y2 - y1;

    return Math.sqrt(
        Math.pow(xDistance, 2) + Math.pow(yDistance, 2)
    );
}

function drawDots() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    const auraRadius = 120;

    for (let index = 0; index < numberOfDots; index++) {
        const dot = dots[index];

        dot.x += dot.velocityX;
        dot.y += dot.velocityY;

        const distanceToMouse = getDistance(dot.x, dot.y, mouseX, mouseY);

        if (distanceToMouse < auraRadius) {
            const angle = Math.atan2(dot.y - mouseY, dot.x - mouseX);
            const push = (auraRadius - distanceToMouse) / auraRadius;

            dot.x += Math.cos(angle) * push * 2;
            dot.y += Math.sin(angle) * push * 2;
        }

        if (dot.x < 0 || dot.x > canvas.width) {
            dot.velocityX *= -1;
        }

        if (dot.y < 0 || dot.y > canvas.height) {
            dot.velocityY *= -1;
        }

        context.beginPath();
        context.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
        context.fillStyle = dot.color;
        context.fill();
    }

    requestAnimationFrame(drawDots);
}

drawDots();

window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'dark';
        this.button = document.getElementById('themeToggle');

        this.apply();
        this.button.addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.apply();
        localStorage.setItem('theme', this.theme);
    }

    apply() {
        document.documentElement.setAttribute('data-theme', this.theme);
    }
}

new ThemeManager();

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

const dropdown = document.querySelector('.dropdown');
const dropdownToggle = document.querySelector('.dropdown-toggle');

dropdownToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    dropdown.classList.toggle('open');
});

document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
    }
});