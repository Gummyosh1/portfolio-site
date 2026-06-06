import csv
import re
from pathlib import Path

CSV_PATH = Path(__file__).parent / "cards.csv"
HEADER = ["name", "set", "quantity", "type", "color", "altArt", "overnumbered", "image"]


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


def prompt_bool(prompt: str) -> bool:
    while True:
        response = input(f"{prompt} [y/n]: ").strip().lower()
        if response in {"y", "yes"}:
            return True
        if response in {"n", "no"}:
            return False
        print("Please enter y or n.")


def load_cards() -> list[dict[str, str]]:
    if not CSV_PATH.exists():
        return []

    with CSV_PATH.open("r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        return [row for row in reader]


def save_cards(cards: list[dict[str, str]]) -> None:
    with CSV_PATH.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=HEADER)
        writer.writeheader()
        writer.writerows(cards)


def normalize_card_key(card: dict[str, str]) -> tuple[str, str, str, str, str, str]:
    return (
        card["name"].strip().lower(),
        card["set"].strip().lower(),
        card["type"].strip().lower(),
        card["color"].strip().lower(),
        str(card["altArt"]).strip().lower(),
        str(card["overnumbered"]).strip().lower(),
    )


def find_existing_card(cards: list[dict[str, str]], new_card: dict[str, str]) -> int | None:
    new_key = normalize_card_key(new_card)
    for index, card in enumerate(cards):
        if normalize_card_key(card) == new_key:
            return index
    return None


def build_image_filename(name: str, set_code: str, alt_art: bool, overnumbered: bool) -> str:
    image = f"{slugify(name)}-{slugify(set_code)}"
    if alt_art:
        image += "-a"
    if overnumbered:
        image += "-o"
    return f"{image}.avif"


ALLOWED_COLORS = {"CALM", "FURY", "MIND", "BODY", "CHAOS", "ORDER"}

def main() -> None:
    print("Add or update Riftbound card entries")
    print("Type 'exit' for card name to quit.\n")

    while True:
        card_color = input("Color for this session (calm, fury, mind, body, chaos, order): ").strip().upper()
        if not card_color:
            print("Color cannot be empty.")
            continue
        if card_color not in ALLOWED_COLORS:
            print("Color must be one of: calm, fury, mind, body, chaos, order.")
            continue
        break

    while True:
        name = input("Card name (or 'exit'): ").strip()
        if name.lower() == "exit":
            print("Done!")
            break
        if not name:
            print("Card name cannot be empty.")
            continue

        while True:
            set_code = input("Set (3 letters): ").strip().upper()
            if not set_code:
                print("Set cannot be empty.")
                continue
            if len(set_code) != 3:
                print("Set must be exactly 3 letters.")
                continue
            break

        card_type = input("Type (Legend/Unit/Rune/Spell/Gear/Battlefield/Token): ").strip().upper()
        if not card_type:
            print("Type cannot be empty.")
            continue

        alt_art = prompt_bool("Alt art?")
        overnumbered = prompt_bool("Overnumbered?")

        image = build_image_filename(name, set_code, alt_art, overnumbered)

        cards = load_cards()
        new_card = {
            "name": name,
            "set": set_code,
            "quantity": "1",
            "type": card_type,
            "color": card_color,
            "altArt": str(alt_art).lower(),
            "overnumbered": str(overnumbered).lower(),
            "image": image,
        }

        existing_index = find_existing_card(cards, new_card)

        if existing_index is not None:
            existing_card = cards[existing_index]
            quantity = int(existing_card.get("quantity", "0") or "0") + 1
            existing_card["quantity"] = str(quantity)
            print(f"Updated existing card: {existing_card['name']} ({existing_card['set']}) now quantity {existing_card['quantity']}")
        else:
            cards.append(new_card)
            print(f"Added new card: {name} ({set_code}) with image '{image}'")

        save_cards(cards)


if __name__ == "__main__":
    main()
