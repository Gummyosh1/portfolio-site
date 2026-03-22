import csv
import os

CSV_FILE = "pokemonDatabase.csv"

FIELDNAMES = ["name", "set", "number", "quantity", "legality", "storage", "image"]

def load_cards():
    cards = []
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, mode="r", newline="", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            for row in reader:
                row["quantity"] = int(row["quantity"])
                cards.append(row)
    return cards

def save_cards(cards):
    with open(CSV_FILE, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(cards)

def add_card(name, card_set, number, legality, type):
    cards = load_cards()

    for card in cards:
        if (
            card["name"].strip().lower() == name.strip().lower()
            and card["set"].strip().lower() == card_set.strip().lower()
        ):
            card["quantity"] += 1
            save_cards(cards)
            print(f"Updated quantity: {card['name']} now has quantity {card['quantity']}")
            return

    new_card = {
        "name": name,
        "set": card_set.upper(),
        "number": type,
        "quantity": 1,
        "legality": "LEGAL" + legality.upper(),
        "storage": "secondbox",
        "image": name.strip().lower().replace(" ", "-") + "-" + card_set.strip().lower().replace(" ", "-")
    }

    cards.append(new_card)
    save_cards(cards)
    print(f"Added new card: {name}")

type = input("Type: ")

while (True):
    name = input("Pokemon name: ")
    if name.lower() == "exit":
        print("Stopping...")
        break
    card_set = "POR"
    legality = input("Legality: ")
    while (len(legality) != 1):
        print("Legality must be 1 character long.")
        legality = input("Legality: ")
    add_card(name, card_set, "", legality, type)