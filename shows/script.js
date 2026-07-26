import { shows } from './data.js';

const showCollage = document.querySelector('#showCollage');

shows.forEach((show, index) => {
    const card = document.createElement('article');
    card.className = 'show-card';
    card.dataset.show = show.id;

    const poster = document.createElement('img');
    poster.src = show.poster;
    poster.alt = `${show.title} poster`;
    poster.loading = index < 2 ? 'eager' : 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'show-overlay';

    const meta = document.createElement('p');
    meta.className = 'show-meta';
    meta.textContent = `${show.year} / ${show.genre}`;

    const title = document.createElement('h2');
    title.className = 'show-title';
    title.textContent = show.title;

    overlay.append(meta, title);
    card.append(poster, overlay);
    showCollage.append(card);
});
