import { gsap } from 'gsap';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBvZktK1hJew86anYsGS25uYF6O1gpFd34",
    authDomain: "cinepro-8b537.firebaseapp.com",
    projectId: "cinepro-8b537",
    storageBucket: "cinepro-8b537.firebasestorage.app",
    messagingSenderId: "279721685100",
    appId: "1:279721685100:web:adea4327a9ad49b4c0e849",
    measurementId: "G-3M3G2WTXVL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

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
    initThemeToggle();
    updateWatchlistBadge();

    // Firebase Auth Listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        const authMessage = document.getElementById('auth-status-review');
        const reviewForm = document.getElementById('review-form');
        
        if (user) {
            authMessage.style.display = 'none';
            reviewForm.style.display = 'block';
        } else {
            authMessage.style.display = 'block';
            reviewForm.style.display = 'none';
        }
    });

    if (id) {
        initReviewSystem(id);
    }
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

    updateThemeColor(movie.poster);

    // Render Cast
    castGallery.innerHTML = movie.cast.map(actor => `
        <div class="cast-card" onclick="window.location.href='index.html?search=${actor.name}'" style="cursor: pointer;">
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

    // Render Where to Watch
    const platformList = document.getElementById('platform-list');
    if (movie.streaming && movie.streaming.length > 0) {
        platformList.innerHTML = movie.streaming.map(p => `
            <div class="platform-item">
                <span class="platform-icon">${p.charAt(0)}</span>
                <span class="platform-name">${p}</span>
            </div>
        `).join('');
    } else {
        platformList.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">Not currently streaming.</p>';
    }
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
    const badges = document.querySelectorAll('.count-badge');
    badges.forEach(badge => {
        badge.innerText = watchlist.length;
    });
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

// --- Review System Functions ---
function initReviewSystem(movieId) {
    const form = document.getElementById('review-form');
    const stars = document.querySelectorAll('#star-input .star');
    let selectedRating = 5;

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = star.dataset.value;
            stars.forEach(s => {
                s.classList.toggle('active', s.dataset.value <= selectedRating);
            });
        });
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const text = document.getElementById('review-text').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Posting...";

        try {
            await addDoc(collection(db, "reviews"), {
                movieId: movieId,
                userId: currentUser.uid,
                userEmail: currentUser.email,
                text: text,
                rating: selectedRating,
                createdAt: serverTimestamp()
            });

            form.reset();
            selectedRating = 5;
            stars.forEach(s => s.classList.add('active'));
            showToast("Review posted successfully!");
            loadReviews(movieId);
        } catch (error) {
            console.error("Error adding review: ", error);
            alert("Failed to post review. Please try again.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Post Review";
        }
    };

    loadReviews(movieId);
}

async function loadReviews(movieId) {
    const container = document.getElementById('reviews-list');
    const q = query(collection(db, "reviews"), where("movieId", "==", movieId), orderBy("createdAt", "desc"));

    try {
        const querySnapshot = await getDocs(q);
        container.innerHTML = '';

        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">No reviews yet. Be the first to review!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Just now';
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-header">
                    <div class="user-info">
                        <div class="user-avatar">${data.userEmail.charAt(0).toUpperCase()}</div>
                        <div class="user-email">${data.userEmail.split('@')[0]}</div>
                    </div>
                    <div class="review-date">${date}</div>
                </div>
                <div class="star-rating" style="margin-bottom: 10px;">
                    ${Array.from({length: 5}, (_, i) => `<span class="star ${i < data.rating ? 'active' : ''}">★</span>`).join('')}
                </div>
                <div class="review-text">${data.text}</div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading reviews: ", error);
        container.innerHTML = '<p class="text-muted">Failed to load reviews.</p>';
    }
}

function updateThemeColor(posterUrl) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = posterUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 10;
        canvas.height = 10;
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i+1];
            b += data[i+2];
        }
        r = Math.floor(r / (data.length / 4));
        g = Math.floor(g / (data.length / 4));
        b = Math.floor(b / (data.length / 4));
        
        // Adjust brightness/saturation for primary color
        const hsl = rgbToHsl(r, g, b);
        document.documentElement.style.setProperty('--primary', `hsl(${hsl[0]}, 80%, 60%)`);
    };
}

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.floor(h * 360), Math.floor(s * 100), Math.floor(l * 100)];
}
