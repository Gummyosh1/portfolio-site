import csv
import os

CSV_FILE = "Database.csv"

FIELDNAMES = ["name", "set", "number", "quantity", "legality", "image"]

def load_cards():
    cards = []
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, mode="r", newline="", encoding="utf-8-sig") as file:
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

def add_card(name, card_set, number, legality, quantity):
    cards = load_cards()

    for card in cards:
        if (
            card["name"].strip().lower() == name.strip().lower()
            and card["number"].strip().lower() == number.strip().lower()
        ):
            card["quantity"] += quantity
            save_cards(cards)
            print(f"Updated quantity: {card['name']} now has quantity {card['quantity']}")
            return

    new_card = {
        "name": name,
        "set": card_set.upper(),
        "number": number,
        "quantity": quantity,
        "legality": "LEGAL" + legality.upper(),
        "image": name.strip().lower().replace(" ", "-") + "-" + number.strip().lower().replace(" ", "-")
    }

    cards.append(new_card)
    save_cards(cards)
    print(f"Added new card: {name}")

number = input("Type (e.g. Item, Supporter, Tool, Stadiun): ")
number = number.upper()

while (True):
    name = input("Card name: ")
    if name.lower() == "exit":
        print("Stopping...")
        break

    card_set = input("Ace Spec? y/n: ")
    if (card_set.lower() == "y"):
        card_set = "ACE SPEC"
    else:
        card_set = "N/A"
    
    quantity = int(input("Quantity: "))

    legality = input("Legality: ")
    while (len(legality) != 1):
        print("Legality must be 1 character long.")
        legality = input("Legality: ")

    add_card(name, card_set, number, legality, quantity)