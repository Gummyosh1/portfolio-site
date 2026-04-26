// Paste this full file over your current script.js

const API_BASE = "https://play.limitlesstcg.com/api";
const TCGDEX_BASE = "https://api.tcgdex.net/v2/en";

const deckGrid = document.getElementById("deckGrid");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");
const copyDecklistBtn = document.getElementById("copyDecklistBtn");

const showTournamentsBtn = document.getElementById("showTournamentsBtn");
const tournamentListBox = document.getElementById("tournamentListBox");
const tournamentList = document.getElementById("tournamentList");

const deckModal = document.getElementById("deckModal");
const closeModal = document.getElementById("closeModal");
const modalDeckName = document.getElementById("modalDeckName");
const modalInfo = document.getElementById("modalInfo");
const modalDecklist = document.getElementById("modalDecklist");
const cardImageGrid = document.getElementById("cardImageGrid");
const imageStatus = document.getElementById("imageStatus");

const TOURNAMENT_LIMIT = 100;
const MIN_PLAYERS = 20;
const DAYS_TO_LOOK_BACK = 21;
const GAME = "PTCG";
const FORMAT = "STANDARD";

let savedStandings = [];
let imageCache = {};

const LIMITLESS_TO_TCGDEX_SETS = {
  SVI: "sv01",
  PAL: "sv02",
  OBF: "sv03",
  MEW: "sv03.5",
  PAR: "sv04",
  PAF: "sv04.5",
  TEF: "sv05",
  TWM: "sv06",
  SFA: "sv06.5",
  SCR: "sv07",
  SSP: "sv08",
  PRE: "sv08.5",
  JTG: "sv09",
  DRI: "sv10",
  BLK: "sv10.5b",
  WHT: "sv10.5w",

  MEG: "me01",
  PFL: "me02",
  ASC: "me02.5",
  POR: "me03",
  MEE: "mee",
  MEP: "mep",

  SSH: "swsh1",
  RCL: "swsh2",
  DAA: "swsh3",
  CPA: "swsh3.5",
  VIV: "swsh4",
  SHF: "swsh4.5",
  BST: "swsh5",
  CRE: "swsh6",
  EVS: "swsh7",
  CEL: "cel25",
  FST: "swsh8",
  BRS: "swsh9",
  ASR: "swsh10",
  PGO: "pgo",
  LOR: "swsh11",
  SIT: "swsh12",
  CRZ: "swsh12.5",

  SVP: "svp",
  PR: "swshp",
  SVE: "sve"
};

refreshBtn.addEventListener("click", loadTopDecks);

closeModal.addEventListener("click", () => {
  deckModal.classList.add("hidden");
});

showTournamentsBtn.addEventListener("click", () => {
  tournamentListBox.classList.toggle("hidden");

  if (!tournamentListBox.classList.contains("hidden")) {
    showTournamentsBtn.textContent = "Hide Tournaments Used";
  } else {
    showTournamentsBtn.textContent = "Show Tournaments Used";
  }
});

deckModal.addEventListener("click", event => {
  if (event.target === deckModal) {
    deckModal.classList.add("hidden");
  }
});

async function loadTopDecks() {
  deckGrid.innerHTML = "";
  savedStandings = [];
  statusEl.textContent = "Loading recent tournaments...";

  try {
    const tournaments = await getRecentTournaments();

    renderTournamentList(tournaments);

    if (tournaments.length === 0) {
      statusEl.textContent = "No recent tournaments found.";
      return;
    }

    statusEl.textContent = `Checking standings from ${tournaments.length} tournaments...`;

    for (const tournament of tournaments) {
      const standings = await getTournamentStandings(tournament.id);

      standings.forEach(player => {
        player.tournamentName = tournament.name;
        player.tournamentDate = tournament.date;
      });

      savedStandings.push(...standings);
    }

    const topDecks = calculateTopDecks(savedStandings);

    if (topDecks.length === 0) {
      statusEl.textContent = "No deck data found.";
      return;
    }

    renderDecks(topDecks);
    statusEl.textContent = `Updated from ${tournaments.length} recent tournaments.`;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not load deck data. Check the console.";
  }
}

async function getRecentTournaments() {
  const qualified = [];
  const maxPages = 30;
  const perPage = 50;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_LOOK_BACK);

  for (let page = 1; page <= maxPages; page++) {
    const url = `${API_BASE}/tournaments?game=${GAME}&format=${FORMAT}&limit=${perPage}&page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch tournaments page ${page}`);
    }

    const tournaments = await response.json();

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      break;
    }

    for (const tournament of tournaments) {
      const playerCount = Number(tournament.players || 0);
      const tournamentDate = getTournamentDate(tournament);

      if (!tournamentDate) continue;

      if (tournamentDate < cutoffDate) {
        return qualified;
      }

      if (playerCount > MIN_PLAYERS) {
        qualified.push(tournament);
      }
    }
  }

  return qualified;
}

function getTournamentDate(tournament) {
  const dateValue =
    tournament.date ||
    tournament.startDate ||
    tournament.start ||
    tournament.created_at;

  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

async function getTournamentStandings(tournamentId) {
  const url = `${API_BASE}/tournaments/${tournamentId}/standings`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch standings for ${tournamentId}.`);
  }

  return await response.json();
}

function calculateTopDecks(standings) {
  const deckMap = {};

  standings.forEach(player => {
    if (!player.deck || !player.deck.name) return;

    const deckName = player.deck.name;

    if (!deckMap[deckName]) {
      deckMap[deckName] = {
        name: deckName,
        appearances: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        bestPlacement: Infinity
      };
    }

    deckMap[deckName].appearances++;

    if (player.record) {
      deckMap[deckName].wins += player.record.wins || 0;
      deckMap[deckName].losses += player.record.losses || 0;
      deckMap[deckName].ties += player.record.ties || 0;
    }

    if (player.placing && player.placing < deckMap[deckName].bestPlacement) {
      deckMap[deckName].bestPlacement = player.placing;
    }
  });

  return Object.values(deckMap)
    .map(deck => {
      const totalGames = deck.wins + deck.losses + deck.ties;
      const winRate = totalGames > 0 ? (deck.wins / totalGames) * 100 : 0;

      return {
        ...deck,
        winRate: winRate.toFixed(1)
      };
    })
    .sort((a, b) => {
      if (b.appearances !== a.appearances) return b.appearances - a.appearances;
      return Number(b.winRate) - Number(a.winRate);
    })
    .slice(0, 10);
}

function renderDecks(decks) {
  deckGrid.innerHTML = decks.map((deck, index) => {
    return `
      <article class="deck-card" onclick="showExampleDeck('${escapeForClick(deck.name)}')">
        <div class="pokemon-card-top">
          <h2 class="deck-name">${escapeHtml(deck.name)}</h2>
          <div class="rank">#${index + 1}</div>
        </div>

        <div class="deck-preview-art">
          <div class="deck-preview-loading">Loading preview...</div>
        </div>

        <div class="deck-info-box">
          <p class="deck-stat"><strong>Appearances:</strong> ${deck.appearances}</p>
          <p class="deck-stat"><strong>Win Rate:</strong> ${deck.winRate}%</p>
          <p class="deck-stat"><strong>Best Placement:</strong> #${deck.bestPlacement}</p>
        </div>

        <div class="deck-attack-box">
          Click to view image decklist
        </div>
      </article>
    `;
  }).join("");

  loadDeckPreviewImages(decks);
}

async function loadDeckPreviewImages(decks) {
  const deckCards = document.querySelectorAll(".deck-card");

  for (let i = 0; i < decks.length; i++) {
    const deck = decks[i];
    const cardEl = deckCards[i];
    const previewBox = cardEl.querySelector(".deck-preview-art");

    const bestPlayer = getBestPlayerWithDecklist(deck.name);

    if (!bestPlayer) {
      previewBox.innerHTML = `<div class="deck-preview-loading">No preview</div>`;
      continue;
    }

    const parsedDeck = parseDecklist(bestPlayer.decklist);

    if (parsedDeck.allCards.length === 0) {
      previewBox.innerHTML = `<div class="deck-preview-loading">No preview</div>`;
      continue;
    }

    const previewCard = getDeckTitlePreviewCard(deck.name, parsedDeck);

    const imageUrl = await getCardImage(previewCard);

    if (imageUrl) {
      previewBox.innerHTML = `<img src="${imageUrl}" alt="${escapeHtml(previewCard.name)}">`;
    } else {
      previewBox.innerHTML = `<div class="deck-preview-loading">${escapeHtml(previewCard.name)}</div>`;
    }
  }
}

function getDeckTitlePreviewCard(deckName, parsedDeck) {
  const pokemonCards = parsedDeck.pokemon.length > 0
    ? parsedDeck.pokemon
    : parsedDeck.allCards;

  const normalizedDeckName = normalizeNameForPreview(deckName);
  const titleWords = normalizedDeckName.split(" ");

  // PRIORITY: match first word in deck title
  for (const titleWord of titleWords) {
    const match = pokemonCards.find(card => {
      const cleanCardName = getBasePokemonName(card.name);
      return cleanCardName.split(" ").includes(titleWord);
    });

    if (match) return match;
  }

  // fallback
  return parsedDeck.pokemon[0] || parsedDeck.allCards[0];
}

function getBasePokemonName(name) {
  return normalizeNameForPreview(name)
    .replace(/\bex\b/g, "")
    .replace(/\bvmax\b/g, "")
    .replace(/\bvstar\b/g, "")
    .replace(/\bv\b/g, "")
    .replace(/\bmega\b/g, "")
    .replace(/\bradiant\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNameForPreview(name) {
  return String(name)
    .toLowerCase()

    // REMOVE problematic prefixes
    .replace(/\bn'?s\b/g, "")               // removes "n's" or "ns"
    .replace(/team\s+rockets?/g, "")        // removes "team rocket" or "team rockets"

    // normal cleanup
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function showExampleDeck(deckName) {
  const bestPlayer = getBestPlayerWithDecklist(deckName);

  modalDeckName.textContent = deckName;
  modalInfo.textContent = "";
  modalDecklist.textContent = "";
  cardImageGrid.innerHTML = "";
  imageStatus.textContent = "";

  deckModal.classList.remove("hidden");

  if (!bestPlayer) {
    modalInfo.textContent = "No submitted decklist was available for this deck.";
    return;
  }

  const parsedDeck = parseDecklist(bestPlayer.decklist);

  modalInfo.textContent =
    `${bestPlayer.name} placed #${bestPlayer.placing} at ${bestPlayer.tournamentName}. ` +
    `Record: ${bestPlayer.record?.wins || 0}-${bestPlayer.record?.losses || 0}-${bestPlayer.record?.ties || 0}`;

  if (parsedDeck.allCards.length === 0) {
    modalDecklist.textContent = "Could not parse this decklist.";
    return;
  }

  modalDecklist.textContent = formatForTCGLive(parsedDeck);

  imageStatus.textContent = "Loading card images...";
  await renderCardImages(parsedDeck.allCards);
  imageStatus.textContent = "";
}

function getBestPlayerWithDecklist(deckName) {
  const firstPlacePlayer = savedStandings.find(player => {
    return (
      player.deck &&
      player.deck.name === deckName &&
      player.decklist &&
      Number(player.placing) === 1
    );
  });

  if (firstPlacePlayer) {
    return firstPlacePlayer;
  }

  return savedStandings
    .filter(player => player.deck && player.deck.name === deckName && player.decklist)
    .sort((a, b) => (a.placing || 9999) - (b.placing || 9999))[0];
}

function parseDecklist(decklist) {
  let rawLines = [];

  if (typeof decklist === "string") {
    rawLines = decklist.split("\n");
  } else if (Array.isArray(decklist)) {
    rawLines = decklist.map(card => {
      if (typeof card === "string") return card;
      return `${card.count || card.quantity || 1} ${card.name || ""} ${card.set || card.setCode || ""} ${card.number || card.localId || ""}`;
    });
  } else if (typeof decklist === "object" && decklist !== null) {
    Object.entries(decklist).forEach(([sectionName, section]) => {
      rawLines.push(sectionName);

      if (Array.isArray(section)) {
        section.forEach(card => {
          if (typeof card === "string") {
            rawLines.push(card);
          } else {
            rawLines.push(`${card.count || card.quantity || 1} ${card.name || ""} ${card.set || card.setCode || ""} ${card.number || card.localId || ""}`);
          }
        });
      }
    });
  }

  const parsedDeck = {
    pokemon: [],
    trainers: [],
    energy: [],
    other: [],
    allCards: []
  };

  let currentSection = "other";

  rawLines.forEach(rawLine => {
    const line = String(rawLine).trim();
    if (!line) return;

    const detectedSection = getSectionFromHeader(line);

    if (detectedSection) {
      currentSection = detectedSection;
      return;
    }

    const card = parseDeckLine(line, currentSection);

    if (!card) {
      console.warn("Could not parse deck line:", line);
      return;
    }

    const finalSection = forceCorrectSection(card, currentSection);
    card.section = finalSection;

    parsedDeck[finalSection].push(card);
    parsedDeck.allCards.push(card);
  });

  return parsedDeck;
}

function getSectionFromHeader(line) {
  const lower = line.toLowerCase();

  if (lower.includes("pokémon") || lower.includes("pokemon")) return "pokemon";
  if (lower.includes("trainer")) return "trainers";

  if (lower.includes("energy") && !/^\d+\s+/.test(line)) return "energy";

  return null;
}

function forceCorrectSection(card, currentSection) {
  const name = card.name.toLowerCase();

  if (isEnergyCardName(name)) return "energy";
  if (isTrainerCardName(name)) return "trainers";

  if (currentSection === "pokemon") return "pokemon";
  if (currentSection === "trainers") return "trainers";

  if (currentSection === "energy") {
    return isLikelyPokemonName(name) ? "pokemon" : "trainers";
  }

  return "pokemon";
}

function isEnergyCardName(name) {
  return name.includes("energy");
}

function isLikelyPokemonName(name) {
  return !isTrainerCardName(name) && !isEnergyCardName(name);
}

function isTrainerCardName(name) {
  const trainerWords = [
    "ball", "candy", "switch", "catcher", "stretcher", "vessel", "poffin", "puffin",
    "rod", "belt", "machine", "capsule", "booster", "cart", "blender", "exchange",
    "search", "whistle", "vacuum", "hammer", "incense", "orders", "research",
    "iono", "boss", "professor", "arven", "colress", "roxanne", "cyrano", "lillie",
    "xerosic", "black belt", "determination", "training", "machinations", "bravery",
    "counter", "stadium", "town", "city", "gym", "temple", "stop", "tower", "castle",
    "pokégear", "pokegear", "poké pad", "poke pad", "pad", "tool", "cape", "board",
    "rescue", "stamp", "mochi", "jamming", "unfair", "binding", "buddy-buddy",
    "ultra", "nest", "rare", "night", "technical machine", "tm:"
  ];

  return trainerWords.some(word => name.includes(word));
}

function parseDeckLine(line, currentSection = "other") {
  const fullMatch = line.match(/^(\d+)\s+(.+?)\s+([A-Z0-9]{2,6})\s+([A-Z0-9]+)$/);

  if (fullMatch) {
    return {
      count: Number(fullMatch[1]),
      name: fullMatch[2].trim(),
      setCode: fullMatch[3].trim(),
      number: fullMatch[4].trim(),
      originalLine: line,
      section: currentSection
    };
  }

  const energyMatch = line.match(/^(\d+)\s+(.+?Energy)$/i);

  if (energyMatch) {
    const energyName = normalizeEnergyName(energyMatch[2].trim());
    const meeNumber = getBasicEnergyMEENumber(energyName);

    return {
      count: Number(energyMatch[1]),
      name: energyName,
      setCode: "MEE",
      number: meeNumber || "",
      originalLine: line,
      section: "energy"
    };
  }

  return null;
}

function normalizeEnergyName(name) {
  return name.replace(/^Basic\s+/i, "").trim();
}

function getBasicEnergyMEENumber(name) {
  const lower = name.toLowerCase();

  if (lower.includes("grass")) return "1";
  if (lower.includes("fire")) return "2";
  if (lower.includes("water")) return "3";
  if (lower.includes("lightning")) return "4";
  if (lower.includes("psychic")) return "5";
  if (lower.includes("fighting")) return "6";
  if (lower.includes("darkness")) return "7";
  if (lower.includes("metal")) return "8";

  return null;
}

function formatForTCGLive(parsedDeck) {
  const sections = [];

  if (parsedDeck.pokemon.length > 0) {
    sections.push(formatTCGSection("Pokémon", parsedDeck.pokemon));
  }

  if (parsedDeck.trainers.length > 0) {
    sections.push(formatTCGSection("Trainer", parsedDeck.trainers));
  }

  if (parsedDeck.energy.length > 0) {
    sections.push(formatTCGSection("Energy", parsedDeck.energy));
  }

  if (parsedDeck.other.length > 0) {
    sections.push(formatTCGSection("Other", parsedDeck.other));
  }

  return sections.join("\n\n");
}

function formatTCGSection(sectionName, cards) {
  const total = cards.reduce((sum, card) => sum + card.count, 0);

  const lines = cards.map(card => {
    const number = formatCardNumberTCGLive(card.number);

    if (card.setCode && number) {
      return `${card.count} ${card.name} ${card.setCode} ${number}`;
    }

    return `${card.count} ${card.name}`;
  });

  return `${sectionName}: ${total}\n${lines.join("\n")}`;
}

async function renderCardImages(cards) {
  cardImageGrid.innerHTML = "";

  for (const card of cards) {
    const formattedNumber = formatCardNumber(card.number);
    const imageUrl = await getCardImage(card);

    const cardBox = document.createElement("div");
    cardBox.className = "card-img-box";

    if (imageUrl) {
      cardBox.innerHTML = `
        <img src="${imageUrl}" alt="${escapeHtml(card.name)} ${card.setCode} ${formattedNumber}">
        <p>${card.count}x ${escapeHtml(card.name)}</p>
        <small>${card.setCode} ${formatCardNumberTCGLive(card.number)}</small>
      `;
    } else {
      cardBox.innerHTML = `
        <div style="height:150px; display:grid; place-items:center; color:#526675;">
          No image
        </div>
        <p>${card.count}x ${escapeHtml(card.name)}</p>
        <small>${card.setCode || ""} ${formatCardNumberTCGLive(card.number)}</small>
      `;
    }

    cardImageGrid.appendChild(cardBox);
  }
}

async function getCardImage(card) {
  if (!card.setCode || !card.number) return null;

  const formattedNumber = formatCardNumber(card.number);
  const cacheKey = `${card.setCode}-${formattedNumber}-${card.name}`;

  if (imageCache[cacheKey]) return imageCache[cacheKey];

  if (card.setCode === "MEE") {
    const fallbackEnergyImage = getFallbackEnergyImage(card.name);

    if (fallbackEnergyImage) {
      imageCache[cacheKey] = fallbackEnergyImage;
      return fallbackEnergyImage;
    }
  }

  const tcgdexSetId = LIMITLESS_TO_TCGDEX_SETS[card.setCode];

  if (tcgdexSetId) {
    try {
      const exactUrl = `${TCGDEX_BASE}/sets/${tcgdexSetId}/${encodeURIComponent(formattedNumber)}`;
      const exactResponse = await fetch(exactUrl);

      if (exactResponse.ok) {
        const exactData = await exactResponse.json();

        if (exactData.image) {
          const imageUrl = `${exactData.image}/low.webp`;
          imageCache[cacheKey] = imageUrl;
          return imageUrl;
        }
      }
    } catch (error) {
      console.warn("Exact lookup failed:", card, error);
    }
  }

  try {
    const searchUrl = `${TCGDEX_BASE}/cards?name=eq:${encodeURIComponent(card.name)}`;
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) return null;

    const results = await searchResponse.json();

    const fallbackMatch = results.find(result => {
      const sameNumber =
        result.localId === formattedNumber ||
        result.localId === formatCardNumberTCGLive(card.number);

      const setId = result.set?.id?.toLowerCase() || "";
      const mappedSet = tcgdexSetId?.toLowerCase() || "";

      if (mappedSet) return sameNumber && setId === mappedSet;
      return sameNumber;
    });

    if (!fallbackMatch?.image) {
      console.warn(`No TCGdex image match for ${card.name} ${card.setCode} ${formattedNumber}`);
      return null;
    }

    const imageUrl = `${fallbackMatch.image}/low.webp`;
    imageCache[cacheKey] = imageUrl;
    return imageUrl;
  } catch (error) {
    console.error(`Fallback lookup failed for ${card.name}`, error);
    return null;
  }
}

function getFallbackEnergyImage(name) {
  const lower = name.toLowerCase();

  if (lower.includes("grass")) return "https://images.pokemontcg.io/sve/1.png";
  if (lower.includes("fire")) return "https://images.pokemontcg.io/sve/2.png";
  if (lower.includes("water")) return "https://images.pokemontcg.io/sve/3.png";
  if (lower.includes("lightning")) return "https://images.pokemontcg.io/sve/4.png";
  if (lower.includes("psychic")) return "https://images.pokemontcg.io/sve/5.png";
  if (lower.includes("fighting")) return "https://images.pokemontcg.io/sve/6.png";
  if (lower.includes("darkness")) return "https://images.pokemontcg.io/sve/7.png";
  if (lower.includes("metal")) return "https://images.pokemontcg.io/sve/8.png";

  return null;
}

function formatCardNumber(num) {
  const str = String(num).trim();

  if (/^\d+$/.test(str)) {
    return str.padStart(3, "0");
  }

  return str;
}

function formatCardNumberTCGLive(num) {
  const str = String(num).trim();

  if (/^\d+$/.test(str)) {
    return String(Number(str));
  }

  return str;
}

function escapeForClick(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

copyDecklistBtn.addEventListener("click", async () => {
  const text = modalDecklist.textContent.trim();

  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyDecklistBtn.textContent = "Copied!";

    setTimeout(() => {
      copyDecklistBtn.textContent = "Copy Decklist";
    }, 1500);
  } catch (error) {
    console.error("Copy failed:", error);
    copyDecklistBtn.textContent = "Copy failed";
  }
});

function renderTournamentList(tournaments) {
  if (!tournaments || tournaments.length === 0) {
    tournamentList.innerHTML = `<p>No tournaments found.</p>`;
    return;
  }

  tournamentList.innerHTML = tournaments.map(tournament => {
    const name = tournament.name || tournament.title || "Unknown Tournament";
    const players = tournament.players || tournament.player_count || tournament.numPlayers || "Unknown";
    const rawDate = tournament.date || tournament.startDate || tournament.start || "";
    const date = rawDate ? formatTournamentDate(rawDate) : "Unknown date";

    return `
      <div class="tournament-row">
        <div class="tournament-name">${escapeHtml(name)}</div>
        <div class="tournament-date">${escapeHtml(date)}</div>
        <div class="tournament-players">${escapeHtml(players)} players</div>
      </div>
    `;
  }).join("");
}

function formatTournamentDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

loadTopDecks();