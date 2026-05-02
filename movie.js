import { gsap } from 'gsap';

let allMovies = [];
const watchlist = JSON.parse(localStorage.getItem('cinepro_watchlist')) || [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadDatabase();
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        const movie = allMovies.find(m => m.id == id);
        if (movie) {
            renderMovieDetails(movie);
            renderSimilarMovies(movie);
        } else {
            document.getElementById('movie-content').innerHTML = `
                <div class="error-container" style="text-align: center; padding: 100px;">
                    <h2>Movie Not Found</h2>
                    <p>Sorry, we couldn't find the movie you're looking for.</p>
                    <a href="index.html" class="btn-play" style="display:inline-block; margin-top:20px;">Back to Home</a>
                </div>
            `;
        }
    } else {
        window.location.href = 'index.html';
    }

    initNavbarScroll();
    initGenreMenu();
    initWatchlistLogic();
    initModal();
    initThemeToggle();
    updateWatchlistBadge();
});

async function loadDatabase() {
    try {
        const response = await fetch('./movies.json');
        allMovies = await response.json();
    } catch (error) {
        console.error('Error loading movies:', error);
    }
}

function renderMovieDetails(movie) {
    const poster = document.getElementById('detail-poster');
    const header = document.getElementById('detail-header');
    const title = document.getElementById('detail-title');
    const meta = document.getElementById('detail-meta');
    const description = document.getElementById('detail-description');
    const castGallery = document.getElementById('cast-gallery');
    const playBtn = document.getElementById('detail-play-btn');
    const watchlistBtn = document.getElementById('detail-watchlist-btn');

    // Smooth entry GSAP
    gsap.from(".detail-content-wrapper", { opacity: 0, y: 30, duration: 1, delay: 0.2 });

    header.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.5), var(--bg-dark)), url(${movie.poster})`;
    poster.style.backgroundImage = `url(${movie.poster})`;
    title.innerText = movie.title;
    meta.innerHTML = `<span>★ ${movie.rating}</span> <span>${movie.year}</span> <span class="badge">${movie.type}</span> <span>Dir: ${movie.director}</span>`;
    description.innerText = movie.description;

    // Render Cast
    castGallery.innerHTML = movie.cast.map(actor => `
        <div class="cast-card">
            <div class="cast-avatar">${actor.name.charAt(0)}</div>
            <div class="cast-info">
                <h4>${actor.name}</h4>
                <p>${actor.role}</p>
            </div>
        </div>
    `).join('');

    // Watch Trailer
    playBtn.onclick = () => showTrailer(movie.trailerId);

    // Watchlist
    const isInWatchlist = watchlist.some(m => m.id === movie.id);
    updateWatchlistBtn(watchlistBtn, isInWatchlist);
    watchlistBtn.onclick = () => toggleWatchlist(movie, watchlistBtn);
}

function renderSimilarMovies(currentMovie) {
    const grid = document.getElementById('similar-grid');
    const similar = allMovies
        .filter(m => m.id !== currentMovie.id && (m.genre.includes(currentMovie.genre.split(',')[0]) || m.type === currentMovie.type))
        .slice(0, 4);

    grid.innerHTML = similar.map(movie => `
        <div class="movie-card" onclick="window.location.href='movie.html?id=${movie.id}'">
            <div class="card-image" style="background-image: url(${movie.poster})"></div>
            <div class="card-info">
                <h4>${movie.title}</h4>
                <p>${movie.year} • ${movie.genre.split(',')[0]}</p>
            </div>
        </div>
    `).join('');
}

// Reuse logic from main.js (simplified or shared)
function initNavbarScroll() {
    const nav = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

function initGenreMenu() {
    const toggle = document.getElementById('genre-toggle');
    const menu = document.getElementById('genre-menu');
    const list = document.getElementById('genre-list');

    const genres = ["Action", "Sci-Fi", "Drama", "Crime", "Anime", "Bollywood", "Horror"];
    list.innerHTML = genres.map(g => `<a href="index.html?genre=${g}" class="genre-item">${g}</a>`).join('');

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => menu.style.display = 'none');
}

function initWatchlistLogic() {
    const navWatchlistBtn = document.getElementById('nav-watchlist');
    const watchlistModal = document.getElementById('watchlist-modal');
    const closeBtn = document.querySelector('.close-watchlist-modal');

    navWatchlistBtn.addEventListener('click', () => {
        renderWatchlist();
        watchlistModal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => watchlistModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === watchlistModal) watchlistModal.style.display = 'none';
    });
}

function renderWatchlist() {
    const container = document.getElementById('watchlist-items');
    if (watchlist.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Your watchlist is empty.</p>';
        return;
    }

    container.innerHTML = watchlist.map(movie => `
        <div class="watchlist-item">
            <img src="${movie.poster}" alt="${movie.title}" onclick="window.location.href='movie.html?id=${movie.id}'">
            <div class="watchlist-item-info">
                <h4 onclick="window.location.href='movie.html?id=${movie.id}'">${movie.title}</h4>
                <p>${movie.year} • ★ ${movie.rating}</p>
            </div>
            <button class="btn-remove-watchlist" onclick="removeFromWatchlist(${movie.id})">Remove</button>
        </div>
    `).join('');
}

window.removeFromWatchlist = (id) => {
    const index = watchlist.findIndex(m => m.id === id);
    if (index !== -1) {
        watchlist.splice(index, 1);
        localStorage.setItem('cinepro_watchlist', JSON.stringify(watchlist));
        renderWatchlist();
        updateWatchlistBadge();
        showToast("Removed from watchlist");
    }
};

function toggleWatchlist(movie, btn) {
    const index = watchlist.findIndex(m => m.id === movie.id);
    if (index === -1) {
        watchlist.push(movie);
        updateWatchlistBtn(btn, true);
        showToast("Added to watchlist");
    } else {
        watchlist.splice(index, 1);
        updateWatchlistBtn(btn, false);
        showToast("Removed from watchlist");
    }
    localStorage.setItem('cinepro_watchlist', JSON.stringify(watchlist));
    updateWatchlistBadge();
}

function updateWatchlistBtn(btn, isActive) {
    if (isActive) {
        btn.innerText = "✓ On Watchlist";
        btn.style.background = "var(--primary)";
        btn.style.color = "black";
    } else {
        btn.innerText = "+ Watchlist";
        btn.style.background = "transparent";
        btn.style.color = "var(--text-main)";
    }
}

function updateWatchlistBadge() {
    const badge = document.getElementById('watchlist-count');
    if (badge) badge.innerText = watchlist.length;
}

function initModal() {
    const modal = document.getElementById('video-modal');
    const closeBtn = document.querySelector('.close-modal');
    closeBtn.onclick = () => {
        modal.style.display = "none";
        document.getElementById('player-container').innerHTML = "";
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById('player-container').innerHTML = "";
        }
    };
}

function showTrailer(id) {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('player-container');
    modal.style.display = "flex";
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    renderThemeIcon(toggle, currentTheme);

    toggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        renderThemeIcon(toggle, theme);
    });
}

function renderThemeIcon(el, theme) {
    el.innerHTML = theme === 'dark' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.innerHTML = `<span>✓</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
