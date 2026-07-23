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