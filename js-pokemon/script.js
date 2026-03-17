const searchBar = document.querySelector(".searchBar");
const cardRow = document.getElementById("cardRow");
const noResults = document.getElementById("noResults");

let allCards = [];

// Load CSV and build cards
fetch("Database.csv")
  .then((response) => response.text())
  .then((csvText) => {
    allCards = parseCSV(csvText);
    renderCards(allCards);
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

  cards.forEach((card) => {
    const cardHTML = `
      <div class="col-6 col-md-4 col-lg-3 card-wrapper"
           data-name="${card.name.toLowerCase()}"
           data-set="${card.set.toLowerCase()}"
           data-number="${card.number.toLowerCase()}"
           data-quantity="${card.quantity.toLowerCase()}"
           data-legality="${card.legality.toLowerCase()}">

        <div class="card-custom">
          <img src="images-pokemon/${card.image}.png" class="card-img" alt="${card.name}">
        </div>

        <div class="card-caption">Quantity: ${card.quantity}</div>
      </div>
    `;

    cardRow.innerHTML += cardHTML;
  });
}

// Search cards
searchBar.addEventListener("input", function () {
  const searchText = this.value.toLowerCase().trim();

  const filteredCards = allCards.filter((card) => {
    const searchableText =
      `${card.name} ${card.set} ${card.number} ${card.quantity} ${card.legality}`.toLowerCase();

    return searchableText.includes(searchText);
  });

  renderCards(filteredCards);
});