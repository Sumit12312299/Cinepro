import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// --- Local Auth System (Replaces Supabase) ---
const mockUsers = JSON.parse(localStorage.getItem('cinepro_users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('cinepro_current_user') || 'null');

let allMovies = [];
let user = null; // Store real user object

async function loadDatabase() {
    try {
        const response = await fetch('./movies.json');
        if (!response.ok) throw new Error('Database file not found');
        allMovies = await response.json();
    } catch (error) {
        console.error('Failed to load database:', error);
        showToast("Error: Database connection failed. Please try later.", "warning");
    }
}


// --- Auth & Watchlist State ---
let isLoggedIn = false; // Will be set by Supabase
let watchlist = JSON.parse(localStorage.getItem('watchlist_items') || '[]');

const genres = [
    "Action", "Adventure", "Animation", "Comedy", "Crime", 
    "Documentary", "Drama", "Family", "Fantasy", "History", 
    "Horror", "Music", "Mystery", "Romance", "Sci-Fi", 
    "Thriller", "War", "Western"
];

// --- initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    initLoader();
    await loadDatabase(); // Wait for data before rendering
    renderGrids();
    initNavbarScroll();
    initModal();
    initAdminDashboard(); // Initialize Admin Dashboard
    initMobileNav(); // Initialize Mobile Nav
    initAuth();
    initWatchlistLogic();
    initGenreMenu(); 
    initHeroCarousel(); 
    initSearch(); // Initialize Search
    initThemeToggle(); // Initialize Theme Toggle
    initScrollAnimations(); // Initialize ScrollTrigger
    // Auth state listener handles the UI
});

// --- Hero Carousel Logic ---
let currentHeroSlide = 0;
let heroInterval;

function initHeroCarousel() {
    const slides = document.querySelectorAll('.hero-slide');
    const dotsContainer = document.getElementById('hero-dots');
    const sidebarItems = document.querySelectorAll('.up-next-item');
    
    if (!slides.length) return;

    // Add progress bars to sidebar items
    sidebarItems.forEach(item => {
        const pb = document.createElement('div');
        pb.className = 'progress-bar-container';
        pb.innerHTML = '<div class="progress-bar-fill"></div>';
        item.appendChild(pb);
    });

    // Create dots
    slides.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToHeroSlide(i));
        dotsContainer.appendChild(dot);
    });

    // Sidebar click sync
    sidebarItems.forEach((item, i) => {
        item.addEventListener('click', () => goToHeroSlide(i));
    });

    slides.forEach((slide, i) => {
        // Play Trailer
        const playBtn = slide.querySelector('.btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = playBtn.dataset.video;
                if (videoId) openModal(videoId);
            });
        }

        // Watchlist for Hero
        const watchlistBtn = slide.querySelector('.btn-watchlist');
        if (watchlistBtn) {
            watchlistBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Find matching movie by title in allMovies
                const title = slide.querySelector('h2').textContent;
                const movie = allMovies.find(m => m.title === title);
                if (movie) {
                    handleWatchlist(movie);
                } else {
                    showToast("Movie details not found in database", "error");
                }
            });
        }
    });

    // Auto-slide every 5s
    startHeroTimer();

    function goToHeroSlide(index) {
        if (index === currentHeroSlide) return;
        
        const dots = dotsContainer.querySelectorAll('.dot');
        
        // Update states
        slides[currentHeroSlide].classList.remove('active');
        dots[currentHeroSlide].classList.remove('active');
        sidebarItems[currentHeroSlide].classList.remove('active');

        currentHeroSlide = index;

        slides[currentHeroSlide].classList.add('active');
        dots[currentHeroSlide].classList.add('active');
        sidebarItems[currentHeroSlide].classList.add('active');

        // GSAP Animation for slide content
        const content = slides[currentHeroSlide].querySelector('.hero-content');
        gsap.fromTo(content.children, 
            { opacity: 0, x: -30 }, 
            { opacity: 1, x: 0, duration: 0.8, stagger: 0.2, ease: "power2.out" }
        );

        // Reset timer and sync progress bar
        resetHeroTimer();
    }

    function startHeroTimer() {
        const activeSidebarItem = sidebarItems[currentHeroSlide];
        if (!activeSidebarItem) return;
        
        const progressBar = activeSidebarItem.querySelector('.progress-bar-fill');
        
        // Reset all progress bars
        sidebarItems.forEach(item => {
            gsap.set(item.querySelector('.progress-bar-fill'), { width: '0%' });
        });

        // Animate the current one
        gsap.to(progressBar, { 
            width: '100%', 
            duration: 5, 
            ease: "none",
            onComplete: () => {
                let next = (currentHeroSlide + 1) % slides.length;
                goToHeroSlide(next);
            }
        });
    }

    function resetHeroTimer() {
        gsap.killTweensOf('.progress-bar-fill');
        startHeroTimer();
    }
}

// --- Genre Menu Logic ---
function initGenreMenu() {
    const genreToggle = document.getElementById('genre-toggle');
    const genreMenu = document.getElementById('genre-menu');
    const genreList = document.getElementById('genre-list');
    let isOpen = false;

    // Render sorted genres
    const sortedGenres = [...genres].sort();
    genreList.innerHTML = sortedGenres.map(genre => `
        <a href="#" class="genre-item">${genre}</a>
    `).join('');

    genreToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (isOpen && !genreMenu.contains(e.target)) {
            toggleMenu();
        }
    });

    function toggleMenu() {
        isOpen = !isOpen;
        if (isOpen) {
            genreMenu.style.display = 'block';
            gsap.to(genreMenu, { 
                opacity: 1, 
                y: 0, 
                duration: 0.4, 
                ease: "power2.out" 
            });
        } else {
            gsap.to(genreMenu, { 
                opacity: 0, 
                y: 10, 
                duration: 0.3, 
                ease: "power2.in",
                onComplete: () => genreMenu.style.display = 'none'
            });
        }
    }

    // Handle genre click
    genreList.querySelectorAll('.genre-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const genre = e.target.textContent;
            renderFilteredGrids(null, genre);
            toggleMenu();
        });
    });
}

// --- Search Logic ---
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        renderFilteredGrids(query);
    };

    if (searchInput) searchInput.addEventListener('input', handleSearch);
    if (mobileSearchInput) mobileSearchInput.addEventListener('input', handleSearch);
}

function renderFilteredGrids(query = null, genre = null) {
    const featuredGrid = document.getElementById('featured-grid');
    const popularGrid = document.getElementById('popular-grid');
    const webSeriesGrid = document.getElementById('webseries-grid');
    const animeGrid = document.getElementById('anime-grid');
    const bollywoodGrid = document.getElementById('bollywood-grid');

    const filterFn = (item) => {
        const matchesQuery = query ? item.title.toLowerCase().includes(query) : true;
        const matchesGenre = genre ? item.genre === genre : true;
        return matchesQuery && matchesGenre;
    };

    const updateGrid = (grid, type) => {
        if (!grid) return;
        const filteredData = allMovies.filter(m => m.type === type).filter(filterFn);
        grid.innerHTML = '';
        if (filteredData.length === 0) {
            grid.innerHTML = '<p class="no-results">No movies found match your criteria.</p>';
        } else {
            filteredData.forEach(movie => grid.appendChild(createMovieCard(movie)));
        }
        initScrollAnimations(); // Re-trigger animations for new cards
    };

    updateGrid(featuredGrid, 'featured');
    updateGrid(popularGrid, 'popular');
    updateGrid(webSeriesGrid, 'webseries');
    updateGrid(animeGrid, 'anime');
    updateGrid(bollywoodGrid, 'bollywood');
}

// --- Theme Toggle Logic ---
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    toggleBtn.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
        showToast(`Switched to ${theme} mode`);
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (theme === 'light') {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>`;
    } else {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
        </svg>`;
    }
}

// --- Scroll Animations ---
function initScrollAnimations() {
    gsap.utils.toArray('.movie-card').forEach(card => {
        gsap.to(card, {
            scrollTrigger: {
                trigger: card,
                start: "top 90%",
                toggleActions: "play none none none"
            },
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
        });
    });
}

// --- Loader Animation ---
function initLoader() {
    const tl = gsap.timeline();
    tl.to(".loader-logo", { opacity: 1, y: 0, duration: 1, ease: "power4.out" })
      .to(".loader-logo", { scale: 1.2, duration: 1.5, ease: "slow(0.7, 0.7, false)" }, "-=0.5")
      .to(".loader-overlay", { yPercent: -100, duration: 1, ease: "expo.inOut", delay: 0.5 })
      .from(".hero-main", { opacity: 0, scale: 1.1, duration: 1.5, ease: "power2.out" }, "-=0.5")
      .from(".hero-content > *", { opacity: 0, x: -50, stagger: 0.2, duration: 1 }, "-=1")
      .from(".nav-container", { y: -100, duration: 1 }, "-=1.5");
}

// --- Render Movie Grids ---
function renderGrids() {
    const featuredGrid = document.getElementById('featured-grid');
    const popularGrid = document.getElementById('popular-grid');
    const webSeriesGrid = document.getElementById('webseries-grid');
    const animeGrid = document.getElementById('anime-grid');
    const bollywoodGrid = document.getElementById('bollywood-grid');

    if (featuredGrid) {
        allMovies.filter(m => m.type === 'featured').forEach(movie => {
            featuredGrid.appendChild(createMovieCard(movie));
        });
    }

    if (popularGrid) {
        allMovies.filter(m => m.type === 'popular').forEach(movie => {
            popularGrid.appendChild(createMovieCard(movie));
        });
    }

    if (webSeriesGrid) {
        allMovies.filter(m => m.type === 'webseries').forEach(movie => webSeriesGrid.appendChild(createMovieCard(movie)));
    }
    if (animeGrid) {
        allMovies.filter(m => m.type === 'anime').forEach(movie => animeGrid.appendChild(createMovieCard(movie)));
    }
    if (bollywoodGrid) {
        allMovies.filter(m => m.type === 'bollywood').forEach(movie => bollywoodGrid.appendChild(createMovieCard(movie)));
    }
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <div class="card-poster">
            <img src="${movie.poster}" alt="${movie.title}" loading="lazy" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;">
            <div class="card-rating">★ ${movie.rating}</div>
            <div class="card-overlay">
                <button class="overlay-btn primary btn-view-details">View Details</button>
                <button class="overlay-btn secondary btn-card-watchlist">+ Watchlist</button>
            </div>
        </div>
        <div class="card-content">
            <h4>${movie.title}</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted)">${movie.year} • ${movie.genre}</p>
            <div class="star-rating" data-id="${movie.id}">
                ${[1, 2, 3, 4, 5].map(star => `<span class="star" data-value="${star}">★</span>`).join('')}
            </div>
            <button class="btn-share" data-id="${movie.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                Share
            </button>
        </div>
    `;
    
    // View Details redirects to movie.html
    card.querySelector('.btn-view-details').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `movie.html?id=${movie.id}`;
    });

    // Watchlist
    card.querySelector('.btn-card-watchlist').addEventListener('click', (e) => {
        e.stopPropagation();
        handleWatchlist(movie);
    });

    // Ratings
    const stars = card.querySelectorAll('.star');
    const savedRating = localStorage.getItem(`rating_${movie.id}`);
    if (savedRating) {
        updateStars(stars, savedRating);
    }

    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = star.dataset.value;
            localStorage.setItem(`rating_${movie.id}`, val);
            updateStars(stars, val);
            showToast(`You rated "${movie.title}" ${val} stars!`);
        });
    });

    // Share
    card.querySelector('.btn-share').addEventListener('click', (e) => {
        e.stopPropagation();
        const movieUrl = `${window.location.origin}/movie.html?id=${movie.id}`;
        if (navigator.share) {
            navigator.share({
                title: movie.title,
                text: `Check out ${movie.title} on CinePro`,
                url: movieUrl
            }).catch(() => {
                copyToClipboard(movieUrl);
            });
        } else {
            copyToClipboard(movieUrl);
        }
    });

    card.addEventListener('click', () => {
        window.location.href = `movie.html?id=${movie.id}`;
    });
    
    return card;
}

function updateStars(stars, val) {
    stars.forEach(s => {
        if (parseInt(s.dataset.value) <= parseInt(val)) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Trailer link copied to clipboard!");
    });
}

// --- Auth logic ---
// --- Auth logic (Supabase) ---
function initAuth() {
    const loginBtn = document.querySelector('.btn-signin');
    const loginModal = document.getElementById('login-modal');
    const closeAuthBtn = document.querySelector('.close-auth-modal');
    const loginForm = document.getElementById('login-form');
    const authToggle = document.getElementById('auth-toggle');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchText = document.getElementById('auth-switch-text');

    let isSignUpMode = false;

    // Toggle between Sign In and Sign Up
    authToggle.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        
        if (isSignUpMode) {
            authTitle.textContent = 'Create Account';
            authSubmitBtn.textContent = 'Sign Up';
            authSwitchText.innerHTML = 'Already have an account? <a href="#" id="auth-toggle">Sign In</a>';
        } else {
            authTitle.textContent = 'Sign In to CinePro';
            authSubmitBtn.textContent = 'Sign In';
            authSwitchText.innerHTML = 'Don\'t have an account? <a href="#" id="auth-toggle">Create one</a>';
        }
        
        // Re-attach listener as innerHTML wipes it
        document.getElementById('auth-toggle').addEventListener('click', (ev) => {
            ev.preventDefault();
            authToggle.click();
        });
    });

    loginBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            loginModal.style.display = 'flex';
        } else {
            handleLogout();
        }
    });

    closeAuthBtn.addEventListener('click', () => {
        loginModal.style.display = 'none';
        // Reset to Sign In mode on close
        if (isSignUpMode) authToggle.click();
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (isSignUpMode) {
            handleSignUp(email, password);
        } else {
            handleLogin(email, password);
        }
    });

    // --- State Listener ---
    if (currentUser) {
        user = currentUser;
        isLoggedIn = true;
        updateAuthUI();
        updateWatchlistBadge();
    }
}

async function handleSignUp(email, password) {
    const exists = mockUsers.find(u => u.email === email);
    if (exists) {
        showToast("User already exists", "warning");
        return;
    }

    const newUser = { 
        id: Date.now(), 
        email, 
        password, // In a real app, never store plain text passwords
        watchlist: [] 
    };
    
    mockUsers.push(newUser);
    localStorage.setItem('cinepro_users', JSON.stringify(mockUsers));
    
    showToast("Account created successfully! You can now sign in.");
    // Switch to sign in mode automatically
    document.getElementById('auth-toggle').click();
}

async function handleLogin(email, password) {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
        currentUser = foundUser;
        localStorage.setItem('cinepro_current_user', JSON.stringify(currentUser));
        user = currentUser;
        isLoggedIn = true;
        
        updateAuthUI();
        updateWatchlistBadge();
        document.getElementById('login-modal').style.display = 'none';
        showToast(`Welcome back, ${user.email.split('@')[0]}!`);
    } else {
        showToast("Invalid email or password", "warning");
    }
}

async function handleLogout() {
    if (confirm("Are you sure you want to sign out?")) {
        currentUser = null;
        localStorage.removeItem('cinepro_current_user');
        user = null;
        isLoggedIn = false;
        updateAuthUI();
        showToast("Signed out successfully!");
    }
}

function updateAuthUI() {
    const loginBtn = document.querySelector('.btn-signin');
    if (!loginBtn) return;
    if (isLoggedIn) {
        loginBtn.textContent = 'Sign Out';
        loginBtn.style.background = 'rgba(255,255,255,0.1)';
        loginBtn.style.color = 'white';
        loginBtn.style.border = '1px solid var(--glass-border)';
    } else {
        loginBtn.textContent = 'Sign In';
        loginBtn.style.background = 'var(--primary)';
        loginBtn.style.color = 'black';
        loginBtn.style.border = 'none';
    }
}

// --- Watchlist Management logic ---
function initWatchlistLogic() {
    const navWatchlistBtn = document.getElementById('nav-watchlist');
    const watchlistModal = document.getElementById('watchlist-modal');
    const closeWatchlistBtn = document.querySelector('.close-watchlist-modal');

    navWatchlistBtn.addEventListener('click', () => {
        if (!isLoggedIn) {
            document.getElementById('login-modal').style.display = 'flex';
            showToast("Please Sign In to view your Watchlist", "warning");
        } else {
            renderWatchlistItems();
            watchlistModal.style.display = 'flex';
        }
    });

    closeWatchlistBtn.addEventListener('click', () => {
        watchlistModal.style.display = 'none';
    });
}


function handleWatchlist(movie) {
    if (!isLoggedIn) {
        document.getElementById('login-modal').style.display = 'flex';
        showToast("Please Sign In to add to your Watchlist", "warning");
        return;
    }

    const exists = watchlist.some(item => item.id === movie.id);
    if (exists) {
        showToast(`"${movie.title}" is already in your Watchlist!`, "warning");
    } else {
        watchlist.push(movie);
        saveWatchlist();
        updateWatchlistBadge();
        showToast(`"${movie.title}" added to your Watchlist!`);
    }
}

function saveWatchlist() {
    localStorage.setItem('watchlist_items', JSON.stringify(watchlist));
}

function updateWatchlistBadge() {
    const badge = document.getElementById('watchlist-count');
    if (badge) {
        badge.textContent = watchlist.length;
    }
}

function renderWatchlistItems() {
    const container = document.getElementById('watchlist-items');
    if (!container) return;

    if (watchlist.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Your watchlist is currently empty.</p>`;
        return;
    }

    container.innerHTML = '';
    watchlist.forEach(movie => {
        const item = document.createElement('div');
        item.className = 'watchlist-item';
        item.innerHTML = `
            <div class="watchlist-item-img" style="background-image: url('${movie.poster}')"></div>
            <div class="watchlist-item-info">
                <h4>${movie.title}</h4>
                <p>${movie.year} • ${movie.genre}</p>
            </div>
            <button class="btn-remove-watchlist" data-id="${movie.id}">Remove</button>
        `;

        item.querySelector('.watchlist-item-img').addEventListener('click', () => {
            openModal(movie.trailerId);
        });

        item.querySelector('.btn-remove-watchlist').addEventListener('click', () => {
            removeFromWatchlist(movie.id);
        });

        container.appendChild(item);
    });
}

function removeFromWatchlist(movieId) {
    watchlist = watchlist.filter(m => m.id !== movieId);
    saveWatchlist();
    updateWatchlistBadge();
    renderWatchlistItems();
    showToast("Removed from Watchlist");
}

function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ⓘ'}</span> ${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// --- Admin Dashboard Logic ---
function initAdminDashboard() {
    const adminModal = document.getElementById('admin-modal');
    const trigger = document.getElementById('admin-trigger');
    const closeBtn = document.querySelector('.close-admin');
    const form = document.getElementById('admin-form');
    const exportBtn = document.getElementById('btn-export-json');

    if (!adminModal || !trigger || !form) return;

    trigger.addEventListener('click', () => {
        adminModal.style.display = 'flex';
        gsap.from(".admin-container", { scale: 0.8, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
    });

    closeBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });

    adminModal.addEventListener('click', (e) => {
        if (e.target === adminModal) adminModal.style.display = 'none';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addMovieFromAdmin();
    });

    exportBtn.addEventListener('click', exportDatabaseJSON);
}

function addMovieFromAdmin() {
    const title = document.getElementById('admin-title').value;
    const year = document.getElementById('admin-year').value;
    const rating = document.getElementById('admin-rating').value;
    const type = document.getElementById('admin-type').value;
    const genre = document.getElementById('admin-genre').value;
    const director = document.getElementById('admin-director').value;
    const poster = document.getElementById('admin-poster').value;
    const trailer = document.getElementById('admin-trailer').value;
    const description = document.getElementById('admin-description').value;
    const castRaw = document.getElementById('admin-cast').value;

    // Process cast
    const cast = castRaw.split(',').map(item => {
        const [name, role] = item.split(':');
        return { name: name?.trim() || 'Unknown', role: role?.trim() || 'Actor' };
    });

    const newMovie = {
        id: Date.now(), // Unique ID based on timestamp
        title, year, rating, type, genre, director, poster, 
        trailerId: trailer,
        description,
        cast
    };

    allMovies.unshift(newMovie); // Add to the top
    renderFilteredGrids(); // Re-render everything
    
    document.getElementById('admin-modal').style.display = 'none';
    document.getElementById('admin-form').reset();
    showToast(`"${title}" added to your local database!`);
    
    // Smooth scroll to the new movie's section
    const targetSection = document.getElementById(`${type}-section`) || document.querySelector('main');
    targetSection.scrollIntoView({ behavior: 'smooth' });
}

function exportDatabaseJSON() {
    const jsonString = JSON.stringify(allMovies, null, 4);
    navigator.clipboard.writeText(jsonString).then(() => {
        showToast("Database JSON copied! Paste it into movies.json to save permanently.");
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert("Copy failed. Please check console for JSON string.");
        console.log(jsonString);
    });
}

// --- Mobile Navigation Logic ---
function initMobileNav() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    const adminModal = document.getElementById('admin-modal');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active state
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const id = item.id;
            if (id === 'mobile-nav-home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (id === 'mobile-nav-search') {
                const searchInput = document.getElementById('mobile-search-input') || document.querySelector('.nav-search input');
                if (searchInput) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => searchInput.focus(), 500);
                }
            } else if (id === 'mobile-nav-watchlist') {
                document.getElementById('nav-watchlist').click();
            } else if (id === 'mobile-nav-admin') {
                adminModal.style.display = 'flex';
                gsap.from(".admin-container", { scale: 0.8, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
            }
        });
    });
}

// --- Navbar Effects ---
function initNavbarScroll() {
    const nav = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

// --- Modal Logic ---
function initModal() {
    const modal = document.getElementById('video-modal');
    const closeBtn = document.querySelector('.close-modal');
    if (!modal || !closeBtn) return;
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function closeModal() {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('player-container');
    if (!modal || !container) return;
    
    container.innerHTML = '';
    gsap.to(modal, { 
        opacity: 0, 
        duration: 0.3, 
        onComplete: () => {
            modal.style.display = 'none';
        }
    });
}

function openModal(videoId) {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('player-container');
    if (!modal || !container) return;
    
    container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    
    modal.style.display = 'flex';
    gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.5 });
}



