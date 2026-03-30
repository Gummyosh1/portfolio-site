const searchBar = document.querySelector(".searchBar");
const cardRow = document.getElementById("cardRow");
const noResults = document.getElementById("noResults");
const searchButton = document.querySelector("#searchButton");

let allCards = [];

// Load CSV and build cards
fetch("dexDatabase.csv")
  .then((response) => response.text())
  .then((csvText) => {
    allCards = parseCSV(csvText);
    renderCards(allCards);
    updateCollectionProgress();
  })
  .catch((error) => {
    console.error("Error loading CSV:", error);
  });

// Turn CSV text into objects
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    let card = {};

    headers.forEach((header, index) => {
      card[header.trim()] = values[index]?.trim() || "";
    });

    return card;
  });
}

// Build the cards in HTML
function renderCards(cards) {
  cardRow.innerHTML = "";

  if (cards.length === 0) {
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";

  let html = "";

  cards.forEach((card) => {
    if (card.name && card.name.trim() !== "") {
      html += `
        <div class="col-6 col-md-4 col-lg-3 card-wrapper"
            data-number="${(card.number).toLowerCase()}"
            data-name="${(card.name).toLowerCase()}"
            data-set="${(card.set).toLowerCase()}"
            data-index="${(card.index).toLowerCase()}"
            data-buydata="${(card.buydata).toLowerCase()}"
            data-image="${(card.image).toLowerCase()}">
  
          <div class="card-custom">
            <img src="images-dex/${card.image}.png" class="card-img" alt="${card.name}">
          </div>
  
          <div class="card-caption">${card.buydata}</div>
        </div>
      `;
    } else {
      html += `
        <div class="col-6 col-md-4 col-lg-3 card-wrapper"
            data-number="${(card.number || "").toLowerCase()}"
            data-name="${(card.name || "").toLowerCase()}"
            data-set="${(card.set || "").toLowerCase()}"
            data-index="${(card.index || "").toLowerCase()}"
            data-buydata="${(card.buydata || "").toLowerCase()}"
            data-image="${(card.image || "").toLowerCase()}">
  
          <div class="card-custom position-relative">
            <img src="images-dex/HOLDER.png" class="card-img" alt="HOLDER">
            <div class="card-number">${card.number || ""}</div>
          </div>
  
          <div class="card-caption">Unowned</div>
        </div>
      `;
    }
  });

  cardRow.innerHTML = html;
}

function filterCards(searchText) {
  const text = searchText.toLowerCase().trim();

  // SPECIAL CASE: "owned"
  if (text === "owned") {
    return allCards.filter((card) => {
      return card.name && card.name.trim() !== "";
    });
  }

  // NORMAL SEARCH
  return allCards.filter((card) => {
    const searchableText =
      `${card.name || ""} ${card.set || ""} ${card.number || ""}`.toLowerCase();

    return searchableText.includes(text);
  });
}

// ENTER KEY
searchBar.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();

    const filteredCards = filterCards(searchBar.value);
    renderCards(filteredCards);
  }
});

// BUTTON CLICK
searchButton.addEventListener("click", function () {
  const filteredCards = filterCards(searchBar.value);
  renderCards(filteredCards);
});

function updateCollectionProgress() {
  const totalPokemon = 1025;

  const collectedCount = allCards.filter((card) => {
    return card.name && card.name.trim() !== "";
  }).length;

  const percent = (collectedCount / totalPokemon) * 100;

  const progressText = document.getElementById("collectionProgressText");
  const progressBar = document.getElementById("collectionProgressBar");

  progressText.textContent = `Collected ${collectedCount} / ${totalPokemon}`;
  progressBar.style.width = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", collectedCount);
  progressBar.textContent = `${percent.toFixed(1)}%`;
}