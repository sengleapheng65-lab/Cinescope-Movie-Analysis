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
let movies = [];
const $ = (id) => document.getElementById(id);
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
function render() {
  const query = ($("catalog-search")?.value || $("search").value).toLowerCase();
  const genre = $("genre").value;
  const minimumRating = Number($("rating")?.value || 0);
  const minimumYear = Number($("filter-year-slider")?.value || 1900);
  const sort = $("sort").value;
  const yearLabel = $("filter-year-val");
  if (yearLabel) yearLabel.textContent = `${minimumYear}–2025`;
  currentShown = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(query) &&
      (!genre || m.genres.split(", ").includes(genre)) &&
      Number(m.rating) >= minimumRating &&
      Number(m.release_year) >= minimumYear,
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
    `${currentShown.length} result${currentShown.length === 1 ? "" : "s"}`;
  $("movies").innerHTML = currentShown
    .map(
      (m, i) =>
        `<article class="movie-card"><div class="poster-wrap"><div class="poster" ${m.poster_path ? `style="background-image:url('https://image.tmdb.org/t/p/w500${escapeHtml(m.poster_path)}')"` : ""}></div><span class="card-rating">★ ${Number(m.rating).toFixed(1)}</span></div><div class="card-meta">${m.release_year || "—"} · ${m.runtime ? `${m.runtime} min` : "— min"} <span>${Number(m.vote_count || 0).toLocaleString()} votes</span></div><h3>${escapeHtml(m.title)}</h3><p class="director">Dir. ${escapeHtml(m.director || "Unknown")}</p><div class="card-footer"><div class="tags">${m.genres
          .split(", ")
          .slice(0, 2)
          .map((g) => `<span class="tag">${escapeHtml(g)}</span>`)
          .join(
            "",
          )}</div><span class="rank">Rank #${i + 1}</span></div></article>`,
    )
    .join("");
  $("empty").hidden = currentShown.length > 0;
  updateRecommendation(
    currentShown,
    document.querySelector(".match-chip.active")?.dataset.mode || "top",
  );
}
let currentShown = [];
function resetFilters() {
  $("catalog-search").value = "";
  $("search").value = "";
  $("genre").value = "";
  $("rating").value = "0";
  $("filter-year-slider").value = "1900";
  $("sort").value = "consensus";
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
function updateRecommendation(shown, mode) {
  if (!shown.length) {
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
          return `<i style="height:${Math.max(12, (average / max) * 100)}%" title="${decade}: ${average.toFixed(1)} average"><b>${average.toFixed(1)}</b><em>${decade}</em></i>`;
        })
        .join("")
    : '<span class="chart-empty">No decade data for this selection.</span>';
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
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
fetch("../data/movies.csv")
  .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`CSV request failed: ${r.status}`))))
  .then((text) => {
    movies = parseCsv(text);
    movies.forEach(
      (movie) => (movie.consensus = consensusScore(movie, movies)),
    );
    prepareConsensusSort();
    setup();
    document.getElementById('data-source').textContent = 'LIVE CSV DATA';
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
