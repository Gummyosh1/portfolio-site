export default async function handler(req, res) {
  const allowedOrigin = "https://gummyosh1.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const origin = req.headers.origin;
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Missing card name" });
  }

  const RIOT_API_KEY = process.env.RIOT_API_KEY;

  try {
    // Replace this URL with Riot's actual Riftbound content endpoint
    const riotUrl = `https://americas.api.riotgames.com/riftbound/content/v1/cards?name=${encodeURIComponent(name)}`;

    const riotResponse = await fetch(riotUrl, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY
      }
    });

    const data = await riotResponse.json();

    return res.status(riotResponse.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}