const API_BASE = "https://portfolio-backend-connor-s-projects44.vercel.app";
const INVENTORY_CSV = "riftboundDatabase/cards.csv";

const searchBar = document.querySelector(".searchBar");
const cardRow = document.getElementById("cardRow");
const noResults = document.getElementById("noResults");
const totalCardCount = document.getElementById("totalCardCount");
const statusMessage = document.getElementById("statusMessage");
const contentVersion = document.getElementById("contentVersion");
const typeFilters = document.getElementById("typeFilters");
const refreshButton = document.getElementById("refreshButton");

let inventoryCards = [];
let riotCards = [];
let mergedCards = [];
let activeType = "all";

init();

async function init() {
  try {
    statusMessage.textContent = "Loading your CSV and Riot card data...";

    const [csvCards, riotContent] = await Promise.all([
      loadInventoryCSV(),
      loadRiotContent()
    ]);

    inventoryCards = csvCards;
    riotCards = flattenRiotCards(riotContent);
    mergedCards = mergeInventoryWithRiotData(inventoryCards, riotCards);

    updateContentVersion(riotContent);
    applyFilters();
    statusMessage.textContent = `Loaded ${inventoryCards.length} inventory rows and ${riotCards.length} Riot cards.`;
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Something failed to load. Check the console and make sure your CSV path and Vercel API are correct.";
  }
}

async function loadInventoryCSV() {
  const response = await fetch(INVENTORY_CSV);

  if (!response.ok) {
    throw new Error(`Could not load ${INVENTORY_CSV}`);
  }

  const csvText = await response.text();
  return parseCSV(csvText);
}

async function loadRiotContent(forceRefresh = false) {
  const refreshParam = forceRefresh ? "?refresh=true" : "";
  const response = await fetch(`${API_BASE}/api/riftbound-content${refreshParam}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Riot backend failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

function parseCSV(csvText) {
  const rows = csvText.trim().split(/\r?\n/);
  const headers = splitCSVRow(rows[0]).map((header) => header.trim().toLowerCase());

  return rows.slice(1)
    .filter((row) => row.trim() !== "")
    .map((row) => {
      const values = splitCSVRow(row);
      const card = {};

      headers.forEach((header, index) => {
        card[header] = values[index]?.trim() || "";
      });

      return normalizeInventoryCard(card);
    });
}

function splitCSVRow(row) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeInventoryCard(card) {
  return {
    name: card.name || card.cardname || "",
    set: card.set || card.setid || "",
    collectorNumber: card.collectornumber || card.number || card.cardnumber || "",
    quantity: Number.parseInt(card.quantity || card.qty || "0", 10) || 0,
    notes: card.notes || ""
  };
}

function flattenRiotCards(content) {
  if (!content || !Array.isArray(content.sets)) return [];

  return content.sets.flatMap((set) => {
    return (set.cards || []).map((card) => ({
      ...card,
      setName: set.name,
      setId: set.id
    }));
  });
}

function mergeInventoryWithRiotData(inventory, riotData) {
  const riotCardMap = buildRiotCardMap(riotData);

  return inventory.map((ownedCard) => {
    const match = findMatchingRiotCardFast(ownedCard, riotCardMap, riotData);

    return {
      ...ownedCard,
      riot: match,
      id: match?.id || "",
      displayName: match?.name || ownedCard.name,
      displaySet: match?.setName || ownedCard.set,
      displaySetId: match?.set || match?.setId || ownedCard.set,
      displayNumber: match?.collectorNumber || ownedCard.collectorNumber,
      type: match?.type || "Unknown",
      rarity: match?.rarity || "Unknown",
      faction: match?.faction || "Unknown",
      description: match?.description || "",
      flavorText: match?.flavorText || "",
      keywords: match?.keywords || [],
      tags: match?.tags || [],
      stats: match?.stats || {},
      art: match?.art || {}
    };
  });
}

function buildRiotCardMap(riotData) {
  const map = new Map();

  riotData.forEach((card) => {
    const nameKey = normalizeText(card.name);
    const setKey = normalizeText(card.set || card.setId || card.setName);
    const numberKey = normalizeNumber(card.collectorNumber);

    map.set(nameKey, card);

    if (setKey) {
      map.set(`${nameKey}|${setKey}`, card);
    }

    if (setKey && numberKey) {
      map.set(`${nameKey}|${setKey}|${numberKey}`, card);
    }
  });

  return map;
}

function findMatchingRiotCardFast(ownedCard, cardMap, riotData) {
  const wantedName = normalizeText(ownedCard.name);
  const wantedSet = normalizeText(ownedCard.set);
  const wantedNumber = normalizeNumber(ownedCard.collectorNumber);

  const exactKey = `${wantedName}|${wantedSet}|${wantedNumber}`;
  const setKey = `${wantedName}|${wantedSet}`;

  return (
    cardMap.get(exactKey) ||
    cardMap.get(setKey) ||
    cardMap.get(wantedName) ||
    findMatchingRiotCard(ownedCard, riotData)
  );
}

function findMatchingRiotCard(ownedCard, riotData) {
  const wantedName = normalizeText(ownedCard.name);
  const wantedSet = normalizeText(ownedCard.set);
  const wantedNumber = normalizeNumber(ownedCard.collectorNumber);

  return riotData.find((card) => {
    const nameMatches = normalizeText(card.name) === wantedName;
    const setMatches = !wantedSet || normalizeText(card.set) === wantedSet || normalizeText(card.setId) === wantedSet || normalizeText(card.setName) === wantedSet;
    const numberMatches = !wantedNumber || normalizeNumber(card.collectorNumber) === wantedNumber;

    return nameMatches && setMatches && numberMatches;
  }) || riotData.find((card) => normalizeText(card.name) === wantedName);
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function normalizeNumber(value) {
  return String(value || "").replace(/^0+/, "").trim();
}

function applyFilters() {
  const searchText = searchBar.value.toLowerCase().trim();

  const filteredCards = mergedCards.filter((card) => {
    const typeMatches = activeType === "all" || typeMatchesFilter(card.type, activeType);

    const searchableText = [
      card.displayName,
      card.displaySet,
      card.displaySetId,
      card.displayNumber,
      card.quantity,
      card.type,
      card.rarity,
      card.faction,
      card.description,
      card.flavorText,
      card.keywords.join(" "),
      card.tags.join(" "),
      card.notes
    ].join(" ").toLowerCase();

    return typeMatches && searchableText.includes(searchText);
  });

  renderCards(filteredCards);
  updateTotalCardCount(filteredCards);
}

function typeMatchesFilter(cardType, filterType) {
  const cleanType = String(cardType || "").toLowerCase();

  if (filterType === "champion") {
    return cleanType.includes("champion") || cleanType.includes("champion unit");
  }

  return cleanType.includes(filterType);
}

function renderCards(cards) {
  cardRow.innerHTML = "";

  const sortedCards = sortCards(cards);

  if (sortedCards.length === 0) {
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";

  let html = "";

  sortedCards.forEach((card) => {
    const imageURL = card.art?.thumbnailURL || card.art?.fullURL || "";
    const stats = formatStats(card.stats);
    const keywords = card.keywords.length ? card.keywords.join(", ") : "None";
    const missingClass = card.riot ? "" : "missing-riot-data";

    html += `
      <div class="col-6 col-md-4 col-lg-3 card-wrapper ${missingClass}"
           data-name="${escapeAttribute(card.displayName)}"
           data-set="${escapeAttribute(card.displaySet)}"
           data-number="${escapeAttribute(card.displayNumber)}"
           data-quantity="${escapeAttribute(card.quantity)}"
           data-type="${escapeAttribute(card.type)}">

        <div class="card-custom">
          ${imageURL
            ? `<img src="${escapeAttribute(imageURL)}" class="card-img" alt="${escapeAttribute(card.displayName)}">`
            : `<div class="card-img placeholder-card">${escapeHTML(card.displayName)}</div>`
          }
        </div>

        <div class="card-caption">
          <strong>${escapeHTML(card.displayName)}</strong><br>
          Quantity: ${escapeHTML(card.quantity)}<br>
          ${escapeHTML(card.type)} • ${escapeHTML(card.rarity)}<br>
          ${escapeHTML(card.displaySetId)} #${escapeHTML(card.displayNumber)}
        </div>

        <div class="card-details">
          <div>${escapeHTML(card.faction)}</div>
          <div>${escapeHTML(stats)}</div>
          <div class="small">Keywords: ${escapeHTML(keywords)}</div>
        </div>
      </div>
    `;
  });

  cardRow.innerHTML = html;
}

function sortCards(cards) {
  const typeOrder = {
    "legend": 0,
    "champion unit": 1,
    "unit": 2,
    "spell": 3,
    "gear": 4,
    "battlefield": 5
  };

  return [...cards].sort((a, b) => {
    const typeA = normalizeTypeForSort(a.type);
    const typeB = normalizeTypeForSort(b.type);

    const typeCompare =
      (typeOrder[typeA] ?? 999) -
      (typeOrder[typeB] ?? 999);

    if (typeCompare !== 0) return typeCompare;

    const setCompare = String(a.displaySetId || "").localeCompare(String(b.displaySetId || ""));
    if (setCompare !== 0) return setCompare;

    return Number(a.displayNumber || 0) - Number(b.displayNumber || 0);
  });
}

function normalizeTypeForSort(type) {
  const cleanType = String(type || "").toLowerCase().trim();

  if (cleanType.includes("legend")) return "legend";
  if (cleanType.includes("champion")) return "champion unit";
  if (cleanType.includes("unit")) return "unit";
  if (cleanType.includes("spell")) return "spell";
  if (cleanType.includes("gear")) return "gear";
  if (cleanType.includes("battlefield")) return "battlefield";

  return cleanType;
}

function updateTotalCardCount(cards) {
  const total = cards.reduce((sum, card) => sum + card.quantity, 0);
  totalCardCount.textContent = `Total Cards: ${total}`;
}

function updateContentVersion(content) {
  if (!content) return;

  const version = content.version ? `Version ${content.version}` : "";
  const updated = content.lastUpdated ? `Updated ${new Date(content.lastUpdated).toLocaleDateString()}` : "";
  contentVersion.textContent = [version, updated].filter(Boolean).join(" • ");
}

function formatStats(stats = {}) {
  const parts = [];

  if (stats.cost !== undefined && stats.cost !== null) parts.push(`Cost ${stats.cost}`);
  if (stats.energy !== undefined && stats.energy !== null) parts.push(`Energy ${stats.energy}`);
  if (stats.might !== undefined && stats.might !== null) parts.push(`Might ${stats.might}`);
  if (stats.power !== undefined && stats.power !== null) parts.push(`Power ${stats.power}`);

  return parts.length ? parts.join(" • ") : "No stats";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

searchBar.addEventListener("input", applyFilters);

typeFilters.addEventListener("click", (event) => {
  const label = event.target.closest("label[data-type]");
  if (!label) return;

  activeType = label.dataset.type;
  applyFilters();
});

refreshButton.addEventListener("click", async () => {
  try {
    statusMessage.textContent = "Refreshing Riot data...";
    const riotContent = await loadRiotContent(true);
    riotCards = flattenRiotCards(riotContent);
    mergedCards = mergeInventoryWithRiotData(inventoryCards, riotCards);
    updateContentVersion(riotContent);
    applyFilters();
    statusMessage.textContent = "Riot data refreshed.";
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Refresh failed. Check your backend route and Riot key.";
  }
});
