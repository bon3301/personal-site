import { createIcons, Sun, Moon, Clock } from 'lucide';

createIcons({
    icons: {
        Sun,
        Moon,
        Clock
    }
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