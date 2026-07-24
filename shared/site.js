  import { createIcons, Sun, Moon } from 'lucide';

  createIcons({
      icons: {
          Sun,
          Moon
      }
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


const dropdown = document.querySelector('.dropdown');
const dropdownToggle = document.querySelector('.dropdown-toggle');

dropdownToggle.addEventListener('click', (event) => {
    event.stopPropagation();

    const isOpen = dropdown.classList.toggle('open');
    dropdownToggle.setAttribute('aria-expanded', isOpen.toString());
});

document.addEventListener('click', (event) => {
    if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('open');
        dropdownToggle.setAttribute('aria-expanded', 'false');
    }
});

document.addEventListener('keydown', (event) => {
    if (
        event.key === 'Escape' &&
        dropdown.classList.contains('open')
    ) {
        dropdown.classList.remove('open');
        dropdownToggle.setAttribute('aria-expanded', 'false');
        dropdownToggle.focus();
    }
});