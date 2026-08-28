/* =========================================================
   PUBLIC API DIRECTORY
   Main JavaScript
========================================================= */


const state = {

  apis: [],

  filtered: [],

  categories: [],

  selectedCategory: "All",

  search: "",

  page: 1,

  perPage: 12,

  selectedApi: null,

  favorites:
    JSON.parse(localStorage.getItem("apiFavorites") || "[]")

};


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const apiGrid = $("apiGrid");

const categoryList = $("categoryList");

const searchInput = $("searchInput");

const currentCategory = $("currentCategory");

const resultCount = $("resultCount");

const pagination = $("pagination");

const loading = $("loading");

const emptyState = $("emptyState");

const apiModal = $("apiModal");

const toast = $("toast");


/* =========================================================
   MUSIC
========================================================= */

const music =
  $("backgroundMusic");

const musicToggle =
  $("musicToggle");

const volumeControl =
  $("volumeControl");


music.volume = 0.35;


/*
   Browsers normally block audible autoplay.

   We try autoplay first.
   If browser blocks it, first user interaction
   starts the music.
*/

window.addEventListener("load", () => {

  music.play()
    .then(() => {

      musicToggle.textContent = "❚❚";

    })
    .catch(() => {

      musicToggle.textContent = "▶";

    });

});


musicToggle.addEventListener("click", () => {

  if (music.paused) {

    music.play()
      .then(() => {

        musicToggle.textContent = "❚❚";

      })
      .catch(() => {

        showToast("Tap again to start music");

      });

  } else {

    music.pause();

    musicToggle.textContent = "▶";

  }

});


volumeControl.addEventListener("input", () => {

  music.volume =
    Number(volumeControl.value);

});


/*
   Start music after first interaction if autoplay
   was blocked.
*/

document.addEventListener(
  "click",
  () => {

    if (music.paused) {

      music.play()
        .then(() => {

          musicToggle.textContent = "❚❚";

        })
        .catch(() => {});

    }

  },
  { once: true }
);


/* =========================================================
   API DATA
========================================================= */


/*
   Main source:

   public-apis/public-apis

   We use a small reliable fallback dataset so
   the website never becomes completely empty
   if GitHub cannot be reached.
*/


const fallbackApis = [

  {
    name: "Cat Facts",
    description: "Daily cat facts.",
    auth: "No",
    https: "Yes",
    cors: "No",
    category: "Animals",
    url: "https://catfact.ninja/"
  },

  {
    name: "Dog Facts",
    description: "Random facts about dogs.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Animals",
    url: "https://dog-api.kinduff.com/"
  },

  {
    name: "The Cat API",
    description: "Pictures and information about cats.",
    auth: "apiKey",
    https: "Yes",
    cors: "Yes",
    category: "Animals",
    url: "https://thecatapi.com/"
  },

  {
    name: "RandomUser",
    description: "Generate random user data.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Development",
    url: "https://randomuser.me/"
  },

  {
    name: "JSONPlaceholder",
    description: "Fake REST API for testing and prototyping.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Development",
    url: "https://jsonplaceholder.typicode.com/"
  },

  {
    name: "Open-Meteo",
    description: "Free weather forecast API.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Weather",
    url: "https://open-meteo.com/"
  },

  {
    name: "CoinGecko",
    description: "Cryptocurrency market data.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Cryptocurrency",
    url: "https://www.coingecko.com/"
  },

  {
    name: "Open Library",
    description: "Open book and library data.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Books",
    url: "https://openlibrary.org/developers/api"
  },

  {
    name: "NASA",
    description: "NASA data including imagery and space information.",
    auth: "apiKey",
    https: "Yes",
    cors: "Yes",
    category: "Science & Math",
    url: "https://api.nasa.gov/"
  },

  {
    name: "PokéAPI",
    description: "The RESTful Pokémon API.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Games & Comics",
    url: "https://pokeapi.co/"
  },

  {
    name: "Jikan",
    description: "Unofficial MyAnimeList API.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Anime",
    url: "https://jikan.moe/"
  },

  {
    name: "Advice Slip",
    description: "Random advice generator.",
    auth: "No",
    https: "Yes",
    cors: "Yes",
    category: "Personality",
    url: "https://api.adviceslip.com/"
  }

];


/* =========================================================
   LOAD API DIRECTORY
========================================================= */


async function loadApis() {

  showLoading(true);

  try {

    /*
       Try GitHub raw README first.
    */

    const githubUrl =
      "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";


    const response =
      await fetch(githubUrl, {
        cache: "no-store"
      });


    if (!response.ok) {

      throw new Error(
        "GitHub request failed"
      );

    }


    const markdown =
      await response.text();


    const parsed =
      parsePublicApis(markdown);


    /*
       If parser finds enough APIs, use them.
    */

    if (parsed.length > 20) {

      state.apis = parsed;

    } else {

      state.apis = fallbackApis;

    }

  }

  catch (error) {

    console.warn(
      "Using fallback API data:",
      error
    );

    state.apis =
      fallbackApis;

  }


  buildCategories();

  applyFilters();

  showLoading(false);

}


/* =========================================================
   PARSE PUBLIC-APIS README
========================================================= */


function parsePublicApis(markdown) {

  const result = [];

  const lines =
    markdown.split("\n");

  let category =
    "Other";


  for (let line of lines) {

    line = line.trim();


    /*
       Detect category headings.

       Example:

       ### Animals
    */

    const heading =
      line.match(/^###\s+(.+)$/);


    if (heading) {

      category =
        cleanMarkdown(heading[1]);

      continue;

    }


    /*
       API table rows.

       Format:

       | API | Description | Auth | HTTPS | CORS |
    */

    if (!line.startsWith("|")) {

      continue;

    }


    const parts =
      line
        .split("|")
        .slice(1, -1)
        .map(x => x.trim());


    if (parts.length < 5) {

      continue;

    }


    /*
       Ignore table header.
    */

    if (
      parts[0].toLowerCase() === "api" ||
      parts[0].includes("---")
    ) {

      continue;

    }


    const apiCell =
      parts[0];


    const description =
      cleanMarkdown(parts[1]);


    const auth =
      cleanMarkdown(parts[2]);


    const https =
      cleanMarkdown(parts[3]);


    const cors =
      cleanMarkdown(parts[4]);


    /*
       Extract API name and URL.
    */

    let name =
      cleanMarkdown(apiCell);


    let url = "";


    const link =
      apiCell.match(
        /\[([^\]]+)\]\(([^)]+)\)/
      );


    if (link) {

      name =
        cleanMarkdown(link[1]);

      url =
        link[2];

    }


    /*
       Remove empty/broken rows.
    */

    if (!name || name.length < 2) {

      continue;

    }


    result.push({

      name,

      description,

      auth,

      https,

      cors,

      category,

      url

    });

  }


  return result;

}


/* =========================================================
   CLEAN MARKDOWN
========================================================= */

function cleanMarkdown(text) {

  return text

    .replace(/<[^>]*>/g, "")

    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

    .replace(/`/g, "")

    .replace(/\*\*/g, "")

    .replace(/\*/g, "")

    .trim();

}


/* =========================================================
   CATEGORIES
========================================================= */

function buildCategories() {

  const set =
    new Set(
      state.apis.map(api => api.category)
    );


  state.categories =
    Array.from(set)
      .filter(Boolean)
      .sort();


  $("categoryCount").textContent =
    state.categories.length;


  categoryList.innerHTML = "";


  state.categories.forEach(category => {

    const button =
      document.createElement("button");


    button.className =
      "category-btn";


    button.dataset.category =
      category;


    button.textContent =
      category;


    button.addEventListener(
      "click",
      () => {

        state.selectedCategory =
          category;

        state.page = 1;

        updateCategoryButtons();

        applyFilters();

      }
    );


    categoryList.appendChild(button);

  });

}


/* =========================================================
   CATEGORY BUTTONS
========================================================= */

function updateCategoryButtons() {

  document
    .querySelectorAll(".category-btn")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.category ===
        state.selectedCategory
      );

    });

}


/*
   All APIs button
*/

document
  .querySelector(
    '[data-category="All"]'
  )
  .addEventListener(
    "click",
    () => {

      state.selectedCategory =
        "All";

      state.page = 1;

      updateCategoryButtons();

      applyFilters();

    }
  );


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
  "input",
  event => {

    state.search =
      event.target.value
        .toLowerCase()
        .trim();

    state.page = 1;

    applyFilters();

  }
);


$("clearSearch")
  .addEventListener(
    "click",
    () => {

      searchInput.value = "";

      state.search = "";

      state.page = 1;

      applyFilters();

      searchInput.focus();

    }
  );


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

  let data =
    [...state.apis];


  /*
     Category
  */

  if (
    state.selectedCategory !==
    "All"
  ) {

    data =
      data.filter(
        api =>
          api.category ===
          state.selectedCategory
      );

  }


  /*
     Search
  */

  if (state.search) {

    data =
      data.filter(api => {

        const text = [

          api.name,

          api.description,

          api.category,

          api.auth,

          api.https,

          api.cors

        ]
          .join(" ")
          .toLowerCase();


        return text.includes(
          state.search
        );

      });

  }


  /*
     Sort
  */

  const sort =
    $("sortSelect").value;


  if (sort === "name") {

    data.sort(
      (a, b) =>
        a.name.localeCompare(b.name)
    );

  }


  if (sort === "category") {

    data.sort(
      (a, b) =>
        a.category.localeCompare(
          b.category
        )
    );

  }


  state.filtered =
    data;


  currentCategory.textContent =
    state.selectedCategory === "All"
      ? "All APIs"
      : state.selectedCategory;


  resultCount.textContent =
    `${data.length} APIs found`;


  renderApis();

}


/* =========================================================
   SORT
========================================================= */

$("sortSelect")
  .addEventListener(
    "change",
    () => {

      state.page = 1;

      applyFilters();

    }
  );


/* =========================================================
   RENDER API CARDS
========================================================= */

function renderApis() {

  apiGrid.innerHTML = "";

  emptyState.style.display =
    state.filtered.length
      ? "none"
      : "block";


  if (!state.filtered.length) {

    pagination.innerHTML = "";

    return;

  }


  const start =
    (state.page - 1) *
    state.perPage;


  const end =
    start +
    state.perPage;


  const pageData =
    state.filtered.slice(
      start,
      end
    );


  pageData.forEach(
    (api, index) => {

      const card =
        document.createElement("article");


      card.className =
        "api-card";


      card.style.animationDelay =
        `${index * 35}ms`;


      card.innerHTML = `

        <div class="card-top">

          <span class="category-tag">
            ${escapeHTML(api.category)}
          </span>

          <button
            class="favorite-small"
            data-name="${escapeAttr(api.name)}">
            ${isFavorite(api.name) ? "★" : "☆"}
          </button>

        </div>


        <h3>
          ${escapeHTML(api.name)}
        </h3>


        <p>
          ${escapeHTML(api.description)}
        </p>


        <div class="badges">

          <span class="badge">
            Auth:
            ${escapeHTML(api.auth || "Unknown")}
          </span>

          <span class="badge">
            HTTPS:
            ${escapeHTML(api.https || "Unknown")}
          </span>

          <span class="badge">
            CORS:
            ${escapeHTML(api.cors || "Unknown")}
          </span>

        </div>


        <button
          class="details-button">
          View Details
        </button>

      `;


      /*
         Card click
      */

      card
        .querySelector(
          ".details-button"
        )
        .addEventListener(
          "click",
          () => openModal(api)
        );


      /*
         Favorite
      */

      card
        .querySelector(
          ".favorite-small"
        )
        .addEventListener(
          "click",
          event => {

            event.stopPropagation();

            toggleFavorite(
              api.name
            );

            renderApis();

          }
        );


      apiGrid.appendChild(card);

    }
  );


  renderPagination();

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination() {

  const pages =
    Math.ceil(
      state.filtered.length /
      state.perPage
    );


  pagination.innerHTML = "";


  if (pages <= 1) {

    return;

  }


  const previous =
    document.createElement("button");


  previous.textContent =
    "Previous";


  previous.disabled =
    state.page === 1;


  previous.onclick =
    () => {

      state.page--;

      renderApis();

      window.scrollTo({
        top: 300,
        behavior: "smooth"
      });

    };


  pagination.appendChild(
    previous
  );


  for (
    let i = 1;
    i <= pages;
    i++
  ) {

    /*
       Keep pagination compact
       on large directories.
    */

    if (
      pages > 10 &&
      i > 3 &&
      i < pages - 2 &&
      Math.abs(i - state.page) > 1
    ) {

      if (
        !pagination.querySelector(
          ".dots"
        )
      ) {

        const dots =
          document.createElement(
            "span"
          );

        dots.className =
          "dots";

        dots.textContent =
          "...";

        pagination.appendChild(
          dots
        );

      }

      continue;

    }


    const button =
      document.createElement(
        "button"
      );


    button.textContent =
      i;


    button.className =
      i === state.page
        ? "active"
        : "";


    button.onclick =
      () => {

        state.page = i;

        renderApis();

        window.scrollTo({
          top: 300,
          behavior: "smooth"
        });

      };


    pagination.appendChild(
      button
    );

  }


  const next =
    document.createElement("button");


  next.textContent =
    "Next";


  next.disabled =
    state.page === pages;


  next.onclick =
    () => {

      state.page++;

      renderApis();

      window.scrollTo({
        top: 300,
        behavior: "smooth"
      });

    };


  pagination.appendChild(
    next
  );

}


/* =========================================================
   MODAL
========================================================= */

function openModal(api) {

  state.selectedApi =
    api;


  $("modalName").textContent =
    api.name;


  $("modalCategory").textContent =
    api.category;


  $("modalCategory2").textContent =
    api.category;


  $("modalDescription").textContent =
    api.description;


  $("modalAuth").textContent =
    api.auth || "Unknown";


  $("modalHttps").textContent =
    api.https || "Unknown";


  $("modalCors").textContent =
    api.cors || "Unknown";


  $("modalUrl").value =
    api.url || "URL unavailable";


  $("visitApi").href =
    api.url || "#";


  $("favoriteBtn").textContent =
    isFavorite(api.name)
      ? "Remove from Favorites"
      : "Add to Favorites";


  $("testerUrl").value =
    api.url || "";


  $("testerResult").textContent =
    "Ready to test.";


  /*
     Dynamic API image.

     We keep your image.png as
     the default visual.
  */

  $("modalImage").src =
    "image.png";


  apiModal.classList.add(
    "show"
  );


  document.body.classList.add(
    "modal-open"
  );

}


/* =========================================================
   CLOSE MODAL
========================================================= */

$("closeModal")
  .addEventListener(
    "click",
    closeModal
  );


document
  .querySelector(
    ".modal-backdrop"
  )
  .addEventListener(
    "click",
    closeModal
  );


function closeModal() {

  apiModal.classList.remove(
    "show"
  );

  document.body.classList.remove(
    "modal-open"
  );

}


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      closeModal();

    }

  }
);


/* =========================================================
   COPY URL
========================================================= */

$("copyUrl")
  .addEventListener(
    "click",
    async () => {

      const url =
        $("modalUrl").value;


      if (!url) {

        return;

      }


      try {

        await navigator.clipboard.writeText(
          url
        );

        showToast(
          "API URL copied"
        );

      }

      catch {

        $("modalUrl").select();

        document.execCommand(
          "copy"
        );

        showToast(
          "API URL copied"
        );

      }

    }
  );


/* =========================================================
   FAVORITES
========================================================= */

function isFavorite(name) {

  return state.favorites.includes(
    name
  );

}


function toggleFavorite(name) {

  if (
    isFavorite(name)
  ) {

    state.favorites =
      state.favorites.filter(
        item => item !== name
      );

    showToast(
      "Removed from favorites"
    );

  } else {

    state.favorites.push(
      name
    );

    showToast(
      "Added to favorites"
    );

  }


  localStorage.setItem(
    "apiFavorites",
    JSON.stringify(
      state.favorites
    )
  );


  if (
    state.selectedApi &&
    state.selectedApi.name === name
  ) {

    $("favoriteBtn").textContent =
      isFavorite(name)
        ? "Remove from Favorites"
        : "Add to Favorites";

  }

}


/* =========================================================
   FAVORITE BUTTON IN MODAL
========================================================= */

$("favoriteBtn")
  .addEventListener(
    "click",
    () => {

      if (
        !state.selectedApi
      ) {

        return;

      }


      toggleFavorite(
        state.selectedApi.name
      );

    }
  );


/* =========================================================
   API TESTER
========================================================= */

$("sendRequest")
  .addEventListener(
    "click",
    testApi
  );


async function testApi() {

  const url =
    $("testerUrl").value.trim();


  const result =
    $("testerResult");


  if (!url) {

    result.textContent =
      "Please enter an API URL.";

    return;

  }


  result.textContent =
    "Sending request...";


  try {

    const start =
      performance.now();


    const response =
      await fetch(
        url,
        {
          method: "GET"
        }
      );


    const elapsed =
      Math.round(
        performance.now() -
        start
      );


    const contentType =
      response.headers.get(
        "content-type"
      ) || "";


    let data;


    if (
      contentType.includes(
        "application/json"
      )
    ) {

      data =
        await response.json();

    } else {

      data =
        await response.text();

    }


    result.textContent =
      JSON.stringify(
        {
          status:
            response.status,

          statusText:
            response.statusText,

          responseTime:
            `${elapsed} ms`,

          data

        },
        null,
        2
      );

  }

  catch (error) {

    result.textContent =
`REQUEST FAILED

${error.message}

Possible reasons:

• CORS blocked the request
• API requires authentication
• Invalid URL
• API is offline
• Rate limit
• Network problem`;

  }

}


/* =========================================================
   THEME
========================================================= */

$("themeToggle")
  .addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "light-mode"
      );


      const light =
        document.body.classList.contains(
          "light-mode"
        );


      localStorage.setItem(
        "theme",
        light
          ? "light"
          : "dark"
      );

    }
  );


/*
   Restore theme
*/

if (
  localStorage.getItem(
    "theme"
  ) === "light"
) {

  document.body.classList.add(
    "light-mode"
  );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(message) {

  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


/* =========================================================
   LOADING
========================================================= */

function showLoading(show) {

  loading.style.display =
    show
      ? "flex"
      : "none";

}


/* =========================================================
   SECURITY HELPERS
========================================================= */

function escapeHTML(value) {

  return String(value || "")
    .replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char])
    );

}


function escapeAttr(value) {

  return escapeHTML(value);

}


/* =========================================================
   INITIALIZE
========================================================= */

loadApis();