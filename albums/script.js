import { albums } from './data.js';

const coverStage = document.querySelector('#coverStage');
const previousButton = document.querySelector('#previousAlbum');
const nextButton = document.querySelector('#nextAlbum');

const albumPosition = document.querySelector('#albumPosition');
const albumTitle = document.querySelector('#albumTitle');
const albumArtist = document.querySelector('#albumArtist');

const trackCount = document.querySelector('#trackCount');
const trackList = document.querySelector('#trackList');

let activeIndex = 0;
let touchStartX = 0;
let wheelLocked = false;

function getDistance(index) {
    let distance = index - activeIndex;
    const halfway = albums.length / 2;

    if (distance > halfway) {
        distance -= albums.length;
    }

    if (distance < -halfway) {
        distance += albums.length;
    }

    return distance;
}

const coverElements = [];

function createCovers() {
    albums.forEach((album, index) => {
        const cover = document.createElement('button');
        cover.className = 'album-cover';
        cover.type = 'button';

        cover.setAttribute(
            'aria-label',
            `Select ${album.title}`
        );

        const image = document.createElement('img');
        image.src = album.cover;
        image.alt = `${album.title} cover`;
        image.draggable = false;

        cover.append(image);

        cover.addEventListener('click', () => {
            selectAlbum(index);
        });

        coverElements.push(cover);
        coverStage.append(cover);
    });
}

function positionCovers() {
    coverElements.forEach((cover, index) => {
        const distance = getDistance(index);
        const amount = Math.abs(distance);

        cover.hidden = amount > 2;

        cover.setAttribute(
            'aria-pressed',
            String(index === activeIndex)
        );

        cover.style.setProperty(
            '--cover-x',
            `${distance * 72}%`
        );

        cover.style.setProperty(
            '--cover-turn',
            `${distance * -34}deg`
        );

        cover.style.setProperty(
            '--cover-scale',
            Math.max(0.58, 1 - amount * 0.16)
        );

        cover.style.setProperty(
            '--cover-opacity',
            Math.max(0.35, 1 - amount * 0.28)
        );

        cover.style.zIndex = String(10 - amount);
    });
}

function renderDetails() {
    const album = albums[activeIndex];

    albumPosition.textContent = (
        `${activeIndex + 1} / ${albums.length} / ${album.year}`
    );

    albumTitle.textContent = album.title;
    albumArtist.textContent = album.artist;
    trackCount.textContent = `${album.tracks.length} tracks`;

    trackList.replaceChildren();

    album.tracks.forEach((track) => {
        const item = document.createElement('li');
        item.textContent = track;
        trackList.append(item);
    });
}

function render() {
    positionCovers();
    renderDetails();
}

function selectAlbum(index) {
    activeIndex = (
        index + albums.length
    ) % albums.length;

    render();
}

previousButton.addEventListener('click', () => {
    selectAlbum(activeIndex - 1);
});

nextButton.addEventListener('click', () => {
    selectAlbum(activeIndex + 1);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        selectAlbum(activeIndex - 1);
    }

    if (event.key === 'ArrowRight') {
        selectAlbum(activeIndex + 1);
    }
});

coverStage.addEventListener(
    'wheel',
    (event) => {
        event.preventDefault();

        if (wheelLocked) {
            return;
        }

        const movement = (
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
                ? event.deltaX
                : event.deltaY
        );

        if (Math.abs(movement) < 5) {
            return;
        }

        wheelLocked = true;

        selectAlbum(
            activeIndex + (movement > 0 ? 1 : -1)
        );

        window.setTimeout(() => {
            wheelLocked = false;
        }, 350);
    },
    { passive: false }
);

coverStage.addEventListener(
    'touchstart',
    (event) => {
        touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true }
);

coverStage.addEventListener(
    'touchend',
    (event) => {
        const touchEndX = event.changedTouches[0].clientX;
        const distance = touchEndX - touchStartX;

        if (Math.abs(distance) < 40) {
            return;
        }

        selectAlbum(
            activeIndex + (distance < 0 ? 1 : -1)
        );
    },
    { passive: true }
);

createCovers();
render();
