// Offline fallback data keeps the interface usable when the Flask API is unavailable.
const fallbackMovies = [
  {
    title: "The Shawshank Redemption",
    genres: "Drama",
    release_year: 1994,
    rating: 8.7,
    vote_count: 26000,
    popularity: 75.2,
    overview: "Two imprisoned men find hope and friendship.",
  },
  {
    title: "The Godfather",
    genres: "Crime, Drama",
    release_year: 1972,
    rating: 8.7,
    vote_count: 20000,
    popularity: 82.1,
    overview:
      "The aging patriarch of an organized crime dynasty transfers control.",
  },
  {
    title: "The Dark Knight",
    genres: "Action, Crime, Drama",
    release_year: 2008,
    rating: 8.5,
    vote_count: 32000,
    popularity: 95.4,
    overview:
      "Batman faces a criminal mastermind who plunges Gotham into chaos.",
  },
  {
    title: "Spirited Away",
    genres: "Animation, Fantasy",
    release_year: 2001,
    rating: 8.5,
    vote_count: 16000,
    popularity: 88,
    overview:
      "A young girl enters a world ruled by gods, witches, and spirits.",
  },
  {
    title: "Parasite",
    genres: "Comedy, Drama, Thriller",
    release_year: 2019,
    rating: 8.5,
    vote_count: 18000,
    popularity: 91.3,
    overview:
      "A struggling family schemes to become employed by a wealthy household.",
  },
  {
    title: "Interstellar",
    genres: "Adventure, Drama, Science Fiction",
    release_year: 2014,
    rating: 8.4,
    vote_count: 34000,
    popularity: 104.2,
    overview: "Explorers travel through a wormhole in search of a new home.",
  },
  {
    title: "Get Out",
    genres: "Horror, Mystery, Thriller",
    release_year: 2017,
    rating: 7.6,
    vote_count: 17000,
    popularity: 64.8,
    overview:
      "A young man uncovers an unsettling secret during a weekend visit.",
  },
  {
    title: "Toy Story",
    genres: "Animation, Comedy, Family",
    release_year: 1995,
    rating: 8,
    vote_count: 18000,
    popularity: 77.5,
    overview: "Toys come to life when their owner is away.",
  },
];
// `movies` holds the current API page; `currentShown` holds the filtered view.
let movies = [];
const $ = (id) => document.getElementById(id);
// Parse quoted CSV fields so genres and overviews containing commas remain intact.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    ),
  );
}
// Attach UI event handlers after the dataset and DOM are ready.
function setup() {
  if (!$('data-source')) document.querySelector('.status-pill')?.insertAdjacentHTML('beforeend', '<span id="data-source">LOADING DATA</span>');
  const genres = [
    ...new Set(movies.flatMap((m) => m.genres.split(", "))),
  ].sort();
  $("genre").innerHTML += genres.map((g) => `<option>${g}</option>`).join("");
  [
    "search",
    "catalog-search",
    "genre",
    "rating",
    "filter-year-slider",
    "sort",
  ].forEach((id) => $(id)?.addEventListener("input", render));
  $("apply-filter-btn")?.addEventListener("click", render);
  $("reset-filter-btn")?.addEventListener("click", resetFilters);
  $("download-dataset")?.addEventListener("click", downloadDataset);
  document.querySelectorAll(".match-chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".match-chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      updateRecommendation(currentShown, chip.dataset.mode);
    }),
  );
  setupNavbar();
  render();
}
// Navbar behavior: active sections, mobile menu, scroll state, and keyboard search.
function setupNavbar() {
  const nav = document.querySelector(".topbar");
  const links = [...document.querySelectorAll(".topbar nav a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  const setActive = (id) =>
    links.forEach((link) =>
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`),
    );
  links.forEach((link) =>
    link.addEventListener("click", () =>
      setActive(link.getAttribute("href").slice(1)),
    ),
  );
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      }),
    { rootMargin: "-25% 0px -65% 0px" },
  );
  sections.forEach((section) => observer.observe(section));
  window.addEventListener(
    "scroll",
    () => nav.classList.toggle("scrolled", window.scrollY > 12),
    { passive: true },
  );
  const toggle = $("mobile-menu-toggle");
  const mobileNav = $("mobile-nav");
  toggle?.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
  });
  mobileNav?.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
    }),
  );
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      $("search").focus();
    }
  });
}
let currentPage = 1;
const pageSize = 24;
// Render cards, metrics, pagination, charts, and the recommendation panel.
function render(resetPage = true) {
  if (resetPage) currentPage = 1;
  const query = ($("catalog-search")?.value || $("search").value).toLowerCase();
  const genre = $("genre").value;
  const minimumRating = Number($("rating")?.value || 0);
  const minimumYear = Number($("filter-year-slider")?.value || 1900);
  const sort = $("sort").value;
  const yearLabel = $("filter-year-val");
  if (yearLabel) yearLabel.textContent = `${minimumYear}–2025`;
  currentShown = movies.filter(
    (m) =>
      (m.title.toLowerCase().includes(query) || (m.director || '').toLowerCase().includes(query)) &&
      (!genre || m.genres.split(", ").includes(genre)) &&
      Number(m.rating) >= minimumRating &&
      Number(m.release_year) >= minimumYear &&
      (!activeDecade || (Number(m.release_year) >= activeDecade && Number(m.release_year) < activeDecade + 10)),
  );
  currentShown.sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : Number(b[sort === "year" ? "release_year" : sort]) -
        Number(a[sort === "year" ? "release_year" : sort]),
  );
  updateStats(currentShown);
  updateDecadeChart(currentShown);
  $("record-count").textContent = movies.length.toLocaleString();
  $("result-label").textContent =
    `${currentShown.length} result${currentShown.length === 1 ? "" : "s"}${activeDecade ? ` · ${activeDecade}s` : ""}`;
  const totalPages = serverPagination?.total_pages || Math.max(1, Math.ceil(currentShown.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const pageStart = serverPagination ? (serverPagination.page - 1) * pageSize : (currentPage - 1) * pageSize;
  const pageMovies = serverPagination ? currentShown : currentShown.slice(pageStart, pageStart + pageSize);
  if (!$('pagination')) $('movies').insertAdjacentHTML('afterend', '<div id="pagination" class="pagination"></div>');
  $("movies").innerHTML = pageMovies
    .map(
      (m, i) =>
        `<article class="movie-card"><div class="poster-wrap"><div class="poster" ${m.poster_path ? `style="background-image:url('https://image.tmdb.org/t/p/w500${escapeHtml(m.poster_path)}')"` : ""}></div><span class="card-rating">★ ${Number(m.rating).toFixed(1)}</span></div><div class="card-meta">${m.release_year || "—"} · ${m.runtime ? `${m.runtime} min` : "— min"} <span>${Number(m.vote_count || 0).toLocaleString()} votes</span></div><h3>${escapeHtml(m.title)}</h3><p class="director">Director: ${escapeHtml(m.director || "Unknown")}</p><div class="card-footer"><div class="tags">${m.genres
          .split(", ")
          .slice(0, 2)
          .map((g) => `<span class="tag">${escapeHtml(g)}</span>`)
          .join(
            "",
          )}</div><span class="rank">Rank #${pageStart + i + 1}</span></div></article>`,
    )
    .join("");
  $("empty").hidden = currentShown.length > 0;
  $("pagination").innerHTML = totalPages > 1 ? `<button data-page="prev" ${currentPage === 1 ? "disabled" : ""}>← Previous</button><span>Page ${currentPage} of ${totalPages}</span><button data-page="next" ${currentPage === totalPages ? "disabled" : ""}>Next →</button>` : "";
  updateRecommendation(
    currentShown,
    document.querySelector(".match-chip.active")?.dataset.mode || "top",
  );
}
let currentShown = [];
let serverPagination = null;
let activeDecade = null;
document.addEventListener('click', event => { const pageButton = event.target.closest('[data-page]'); if (!pageButton || pageButton.disabled) return; const totalPages = serverPagination?.total_pages || Math.max(1, Math.ceil(currentShown.length / pageSize)); currentPage = pageButton.dataset.page === 'next' ? Math.min(totalPages, currentPage + 1) : Math.max(1, currentPage - 1); if (serverPagination) requestServerMovies(); else render(false); document.getElementById('films')?.scrollIntoView({behavior:'smooth', block:'start'}); });
document.addEventListener('click', event => { const bar = event.target.closest('[data-decade]'); if (!bar) return; activeDecade = Number(bar.dataset.decade); render(false); document.getElementById('films')?.scrollIntoView({behavior:'smooth', block:'start'}); });
// Reset UI state, pagination, and the active decade selection.
function resetFilters() {
  $("catalog-search").value = "";
  $("search").value = "";
  $("genre").value = "";
  $("rating").value = "0";
  $("filter-year-slider").value = "1900";
  $("sort").value = "consensus";
  activeDecade = null;
  serverPagination = null;
  currentPage = 1;
  render();
}
function downloadDataset() {
  const headers = Object.keys(movies[0] || {});
  const csv = [
    headers.join(","),
    ...movies.map((movie) =>
      headers
        .map((header) => `"${String(movie[header] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "cinescope-movies.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
// Populate the recommendation panel from the selected mode or similarity result.
function updateRecommendation(shown, mode) {
  if (!shown.length) {
    const emptyRecommendationArt = document.querySelector('.rec-art');
    if (emptyRecommendationArt) emptyRecommendationArt.style.backgroundImage = "";
    $("rec-title").textContent = "No matching film";
    $("rec-meta").textContent = "Adjust the catalog filters";
    $("rec-overview").textContent =
      "Try widening the year, rating, or genre filters to generate a recommendation.";
    return;
  }
  const ranked = [...shown].sort((a, b) =>
    mode === "popular"
      ? Number(b.popularity) - Number(a.popularity)
      : mode === "recent"
        ? Number(b.release_year) - Number(a.release_year)
        : Number(b.rating) - Number(a.rating),
  );
  const film = ranked[0];
  const recommendationArt = document.querySelector('.rec-art');
  if (recommendationArt) {
    recommendationArt.style.backgroundImage = film.poster_path
      ? `linear-gradient(#0003, #0003), url('https://image.tmdb.org/t/p/w500${film.poster_path}')`
      : "";
    recommendationArt.style.backgroundSize = film.poster_path ? "cover" : "";
    recommendationArt.style.backgroundPosition = "center";
  }
  $("rec-title").textContent = film.title;
  $("rec-meta").textContent =
    `${film.release_year} · ${Number(film.rating).toFixed(1)} rating · ${Number(film.vote_count || 0).toLocaleString()} votes`;
  $("rec-director").textContent = "Selected from the current CineScope dataset";
  $("rec-overview").textContent =
    film.overview || "No overview available for this record.";
  $("rec-rating").textContent = Number(film.rating).toFixed(1);
  $("rec-popularity").textContent = Number(film.popularity || 0).toFixed(1);
  $("rec-genre").textContent = film.genres.split(", ")[0];
  $("rec-match").textContent =
    mode === "popular"
      ? "POPULARITY MATCH"
      : mode === "recent"
        ? "RECENT STANDOUT"
        : "TOP RATED MATCH";
}
function updateStats(shown) {
  $("movie-count").textContent = shown.length;
  $("average-rating").textContent = shown.length
    ? (shown.reduce((s, m) => s + Number(m.rating), 0) / shown.length).toFixed(
        1,
      )
    : "—";
  const counts = {};
  shown
    .flatMap((m) => m.genres.split(", "))
    .forEach((g) => (counts[g] = (counts[g] || 0) + 1));
  $("top-genre").textContent = shown.length
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : "—";
  const years = shown.map((m) => Number(m.release_year)).filter(Boolean);
  $("year-range").textContent = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : "—";
}
// Build decade bars from the visible set; clicking a bar filters the catalog.
function updateDecadeChart(shown) {
  const container = $("decade-bars");
  if (!container) return;
  const groups = {};
  shown.forEach((movie) => {
    const year = Number(movie.release_year);
    if (!year) return;
    const decade = `${Math.floor(year / 10) * 10}s`;
    groups[decade] ??= [];
    groups[decade].push(Number(movie.rating));
  });
  const entries = Object.entries(groups).sort(
    (a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]),
  );
  const max = Math.max(
    ...entries.flatMap(([, ratings]) =>
      ratings.length ? [Math.max(...ratings)] : [0],
    ),
    1,
  );
  container.innerHTML = entries.length
    ? entries
        .map(([decade, ratings]) => {
          const average =
            ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
          return `<i data-decade="${Number.parseInt(decade)}" class="${activeDecade === Number.parseInt(decade) ? "selected" : ""}" style="height:${Math.max(12, (average / max) * 100)}%" title="Filter to ${decade}: ${average.toFixed(1)} average"><b>${average.toFixed(1)}</b><em>${decade}</em></i>`;
        })
        .join("")
    : '<span class="chart-empty">No decade data for this selection.</span>';
}
function requestServerMovies() { const params = new URLSearchParams({search: $('catalog-search')?.value || $('search').value || '', genre: $('genre').value || '', min_rating: $('rating')?.value || '0', year_from: $('filter-year-slider')?.value || '1900', sort: $('sort').value || 'consensus', page: currentPage, page_size: pageSize}); fetch(`/api/movies?${params.toString()}`).then(response => response.ok ? response.json() : Promise.reject(new Error(`API request failed: ${response.status}`))).then(payload => { movies = payload.movies; serverPagination = payload; render(false); $('data-source').textContent = `PYTHON API · ${payload.total_count} RESULTS`; }).catch(error => console.warn('Server filtering unavailable; using local filtering.', error)); }
function loadPythonAnalytics() { fetch('/api/analytics').then(response => response.ok ? response.json() : Promise.reject()).then(data => { const section = document.querySelector('.analytics'); if (!section || $('genre-analysis')) return; section.insertAdjacentHTML('beforeend', '<div id="genre-analysis" class="genre-analysis"><div class="section-head"><div><small>GENRE ANALYSIS · PYTHON / PANDAS</small><h3>Average rating by genre</h3></div><span>Top 8 genres by catalog volume</span></div><div id="genre-bars" class="genre-bars"></div></div>'); const topGenres = data.genres.slice(0, 8); const max = Math.max(...topGenres.map(item => Number(item.average_rating)), 1); $('genre-bars').innerHTML = topGenres.map(item => `<div class="genre-row"><span>${escapeHtml(item.genre)}</span><div><i style="width:${Number(item.average_rating) / max * 100}%"></i></div><b>${Number(item.average_rating).toFixed(1)}</b><small>${item.movie_count} films</small></div>`).join(''); }).catch(error => console.warn('Python analytics unavailable.', error)); }
function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function openMovieModal(movie) { const modal = $("movie-modal"); if (!modal) return; $("modal-title").textContent = movie.title; $("modal-meta").textContent = `${movie.release_year || '—'} · ${movie.runtime ? `${movie.runtime} min` : 'Runtime unavailable'}`; $("modal-director").textContent = `Director: ${movie.director || 'Unknown'}`; $("modal-overview").textContent = movie.overview || 'No overview available.'; $("modal-rating").textContent = Number(movie.rating).toFixed(1); $("modal-votes").textContent = Number(movie.vote_count || 0).toLocaleString(); $("modal-genre").textContent = movie.genres.split(', ')[0]; const poster = $("modal-poster"); poster.style.backgroundImage = movie.poster_path ? `url('https://image.tmdb.org/t/p/w500${movie.poster_path}')` : ''; const saved = JSON.parse(localStorage.getItem('cinescope-watchlist') || '[]'); const button = $("watchlist-button"); const updateWatchlistLabel = list => { const isSaved = list.some(item => item.title === movie.title); button.textContent = isSaved ? '✓  In watchlist' : '♡  Save to watchlist'; button.classList.toggle('saved', isSaved); }; updateWatchlistLabel(saved); button.onclick = () => { const list = JSON.parse(localStorage.getItem('cinescope-watchlist') || '[]'); const next = list.some(item => item.title === movie.title) ? list.filter(item => item.title !== movie.title) : [...list, movie]; localStorage.setItem('cinescope-watchlist', JSON.stringify(next)); updateWatchlistLabel(next); }; modal.hidden = false; document.body.style.overflow = 'hidden'; }
function closeMovieModal() { const modal = $("movie-modal"); if (modal) modal.hidden = true; document.body.style.overflow = ''; }
document.addEventListener('click', event => { if (event.target.closest('[data-close-modal]')) closeMovieModal(); const card = event.target.closest('.movie-card'); if (card && !event.target.closest('button,a')) { const title = card.querySelector('h3')?.textContent; const movie = currentShown.find(item => item.title === title); if (movie) openMovieModal(movie); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMovieModal(); });
function consensusScore(movie, dataset) {
  const ratings = dataset
    .map((item) => Number(item.rating))
    .filter(Number.isFinite);
  const globalMean = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : 0;
  const minimumVotes = 50000;
  const votes = Number(movie.vote_count) || 0;
  const rating = Number(movie.rating) || 0;
  return (
    (votes / (votes + minimumVotes)) * rating +
    (minimumVotes / (votes + minimumVotes)) * globalMean
  );
}
function prepareConsensusSort() {
  const sort = $("sort");
  if (sort && !sort.querySelector('[value="consensus"]'))
    sort.insertAdjacentHTML(
      "afterbegin",
      '<option value="consensus">Consensus score</option>',
    );
  if (sort) sort.value = "consensus";
}
fetch("/api/movies")
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API request failed: ${r.status}`))))
  .then((text) => {
    movies = text.movies;
    movies.forEach(
      (movie) => (movie.consensus = consensusScore(movie, movies)),
    );
    prepareConsensusSort();
    setup();
    document.getElementById('data-source').textContent = 'PYTHON API DATA';
  })
  .catch((error) => {
    console.warn('Live CSV unavailable; using sample fallback.', error);
    movies = fallbackMovies;
    movies.forEach(
      (movie) => (movie.consensus = consensusScore(movie, movies)),
    );
    prepareConsensusSort();
    setup();
    document.getElementById('data-source').textContent = 'SAMPLE FALLBACK';
  });
function getWatchlist() { return JSON.parse(localStorage.getItem('cinescope-watchlist') || '[]'); }
function renderWatchlist() { const list = getWatchlist(); $('watchlist-count').textContent = list.length; $('watchlist-items').innerHTML = list.length ? list.map(movie => `<div class="watchlist-item"><div class="watchlist-thumb" ${movie.poster_path ? `style="background-image:url('https://image.tmdb.org/t/p/w185${escapeHtml(movie.poster_path)}')"` : ''}></div><div class="watchlist-info"><strong>${escapeHtml(movie.title)}</strong><small>${movie.release_year || '—'} · ${movie.runtime ? `${movie.runtime} min` : 'Runtime unavailable'}</small><span>★ ${Number(movie.rating).toFixed(1)} · ${Number(movie.vote_count || 0).toLocaleString()} votes</span></div><button class="watchlist-remove" data-remove-title="${escapeHtml(movie.title)}" aria-label="Remove ${escapeHtml(movie.title)}">×</button></div>`).join('') : '<p class="watchlist-empty">Your watchlist is empty. Open a movie to save it.</p>'; }
function setupWatchlistButton() { const actions = document.querySelector('.top-actions'); if (!actions || $('watchlist-toggle')) return; const button = document.createElement('button'); button.id = 'watchlist-toggle'; button.type = 'button'; button.textContent = 'Watchlist'; button.className = 'watchlist-toggle'; button.onclick = () => { renderWatchlist(); $('watchlist-modal').hidden = false; document.body.style.overflow = 'hidden'; }; actions.insertBefore(button, actions.firstChild); }
function setupSimilarButton() { const content = document.querySelector('.modal-content'); const watchlistButton = $('watchlist-button'); if (!content || !watchlistButton || $('similar-button')) return; const button = document.createElement('button'); button.id = 'similar-button'; button.type = 'button'; button.className = 'similar-button'; button.textContent = 'Find similar films'; button.onclick = () => { const selected = currentShown.find(movie => movie.title === $('modal-title').textContent); if (selected) showSimilarFilms(selected); }; content.insertBefore(button, watchlistButton); }
function showSimilarFilms(selected) { const useRecommendations = (matches) => { const match = matches[0]?.movie; if (!match) return; updateRecommendation([match], 'similar'); closeMovieModal(); document.getElementById('recommendations')?.scrollIntoView({behavior:'smooth'}); $('rec-match').textContent = 'PYTHON API MATCH'; $('rec-director').textContent = `Similar to ${selected.title}`; renderSimilarResults(matches, selected); }; fetch(`/api/recommendations?title=${encodeURIComponent(selected.title)}`).then(response => response.ok ? response.json() : Promise.reject()).then(payload => useRecommendations(payload.recommendations.map(movie => ({movie, score:Number(movie.similarity || movie.consensus || 0)})))).catch(() => { const selectedGenres = new Set(selected.genres.split(', ')); const candidates = movies.filter(movie => movie.title !== selected.title).map(movie => { const overlap = movie.genres.split(', ').filter(genre => selectedGenres.has(genre)).length; const yearDistance = Math.abs(Number(movie.release_year) - Number(selected.release_year)); const score = overlap * 4 + Number(movie.rating) - yearDistance / 40; return {movie, score}; }).sort((a,b) => b.score - a.score); useRecommendations(candidates.slice(0, 5)); }); }
function renderSimilarResults(matches, selected) { let container = $('similar-results'); if (!container) { document.querySelector('.rec-card')?.insertAdjacentHTML('afterend', '<div id="similar-results" class="similar-results"></div>'); container = $('similar-results'); } container.innerHTML = `<div class="similar-heading"><small>TOP MATCHES FOR ${escapeHtml(selected.title).toUpperCase()}</small></div><div class="similar-grid">${matches.map(({movie, score}, index) => `<article class="similar-result" data-similar-title="${escapeHtml(movie.title)}" tabindex="0"><div class="similar-poster" ${movie.poster_path ? `style="background-image:url('https://image.tmdb.org/t/p/w185${escapeHtml(movie.poster_path)}')"` : ''}></div><div><b>#${index + 1} ${escapeHtml(movie.title)}</b><small>${movie.release_year} · ★ ${Number(movie.rating).toFixed(1)}</small><span>${score.toFixed(2)} similarity</span></div></article>`).join('')}</div>`; }
document.addEventListener('DOMContentLoaded', setupWatchlistButton);
document.addEventListener('DOMContentLoaded', setupSimilarButton);
document.addEventListener('click', event => { if (event.target.closest('[data-close-watchlist]')) { $('watchlist-modal').hidden = true; document.body.style.overflow = ''; } const remove = event.target.closest('[data-remove-title]'); if (remove) { const title = remove.dataset.removeTitle; localStorage.setItem('cinescope-watchlist', JSON.stringify(getWatchlist().filter(movie => movie.title !== title))); renderWatchlist(); } });
document.addEventListener('click', event => { const result = event.target.closest('[data-similar-title]'); if (!result) return; const movie = movies.find(item => item.title === result.dataset.similarTitle); if (movie) openMovieModal(movie); });
let compareSelection = [];
function renderComparisonBars() { const [left, right] = compareSelection; const host = $('compare-content'); if (!host || !left || !right) return; const metrics = [['Rating', Number(left.rating), Number(right.rating)],['Votes', Number(left.vote_count || 0), Number(right.vote_count || 0)],['Popularity', Number(left.popularity || 0), Number(right.popularity || 0)],['Consensus', Number(left.consensus || 0), Number(right.consensus || 0)]]; const bars = document.createElement('div'); bars.className = 'compare-bars'; bars.innerHTML = metrics.map(([label, a, b]) => { const max = Math.max(a, b, 1); return `<div class="compare-bar-row"><span>${label}</span><div><i style="width:${a / max * 100}%"></i><b>${a.toFixed(label === 'Votes' ? 0 : 2)}</b></div><div><i style="width:${b / max * 100}%"></i><b>${b.toFixed(label === 'Votes' ? 0 : 2)}</b></div></div>`; }).join(''); host.querySelector('.compare-clear')?.before(bars); }
function syncCompareButton() { const button = $('compare-button'); const title = $('modal-title')?.textContent; if (button && title) button.textContent = compareSelection.some(movie => movie.title === title) ? '✓ Selected for comparison' : '＋ Add to compare'; }
function setupCompareButton() { const content = document.querySelector('.modal-content'); const watchlistButton = $('watchlist-button'); if (!content || !watchlistButton || $('compare-button')) return; const button = document.createElement('button'); button.id = 'compare-button'; button.type = 'button'; button.className = 'compare-button'; button.textContent = '＋ Add to compare'; button.onclick = () => { const movie = currentShown.find(item => item.title === $('modal-title').textContent) || movies.find(item => item.title === $('modal-title').textContent); if (!movie) return; const existing = compareSelection.findIndex(item => item.title === movie.title); if (existing >= 0) compareSelection.splice(existing, 1); else if (compareSelection.length < 2) compareSelection.push(movie); button.textContent = compareSelection.some(item => item.title === movie.title) ? '✓ Selected for comparison' : '＋ Add to compare'; if (compareSelection.length === 2) { renderComparison(); closeMovieModal(); $('compare-modal').hidden = false; document.body.style.overflow = 'hidden'; } }; content.insertBefore(button, watchlistButton); }
document.addEventListener('click', event => { if (event.target.closest('.movie-card,[data-similar-title]')) setTimeout(syncCompareButton, 0); });
function renderComparison() { const [left, right] = compareSelection; $('compare-content').innerHTML = `<div class="compare-films"><div class="compare-film"><div class="compare-poster" ${left.poster_path ? `style="background-image:url('https://image.tmdb.org/t/p/w342${escapeHtml(left.poster_path)}')"` : ''}></div><h3>${escapeHtml(left.title)}</h3></div><div class="compare-vs">VS</div><div class="compare-film"><div class="compare-poster" ${right.poster_path ? `style="background-image:url('https://image.tmdb.org/t/p/w342${escapeHtml(right.poster_path)}')"` : ''}></div><h3>${escapeHtml(right.title)}</h3></div></div><div class="compare-table">${[['Rating', Number(left.rating).toFixed(1), Number(right.rating).toFixed(1)],['Votes', Number(left.vote_count || 0).toLocaleString(), Number(right.vote_count || 0).toLocaleString()],['Popularity', Number(left.popularity || 0).toFixed(1), Number(right.popularity || 0).toFixed(1)],['Runtime', `${left.runtime || '—'} min`, `${right.runtime || '—'} min`],['Consensus', Number(left.consensus || 0).toFixed(2), Number(right.consensus || 0).toFixed(2)]].map(row => `<div><span>${row[0]}</span><b>${row[1]}</b><b>${row[2]}</b></div>`).join('')}</div><button class="compare-clear" type="button" data-clear-compare>Clear selection</button>`; }
document.addEventListener('DOMContentLoaded', setupCompareButton);
document.addEventListener('DOMContentLoaded', loadPythonAnalytics);
document.addEventListener('click', event => { if (event.target.closest('#compare-button')) setTimeout(renderComparisonBars, 0); });
document.addEventListener('click', event => { if (event.target.closest('[data-close-compare]')) { $('compare-modal').hidden = true; document.body.style.overflow = ''; } if (event.target.closest('[data-clear-compare]')) { compareSelection = []; $('compare-modal').hidden = true; document.body.style.overflow = ''; } });
document.addEventListener('click', event => { if (event.target.closest('#apply-filter-btn,#reset-filter-btn')) setTimeout(requestServerMovies, 0); });
