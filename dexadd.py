import csv
import os

CSV_FILE = "dexDatabase.csv"

FIELDS = ["number", "name", "set", "index", "buydata", "image"]
INPUT_FIELDS = ["number", "name", "set", "index", "buydata"]


def load_cards(filename):
    if not os.path.exists(filename):
        return []

    with open(filename, "r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def save_cards(filename, cards):
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(cards)


def normalize(value):
    return str(value).strip().lower()


def make_image_name(name, set_name, index_value):
    return f"{name}-{set_name}-{index_value}".lower().replace(" ", "")


def prompt_card_data():
    print("\nEnter card info:")
    card = {}

    for field in INPUT_FIELDS:
        card[field] = input(f"{field}: ").strip()

    card["image"] = make_image_name(card["name"], card["set"], card["index"])
    return card


def find_row_by_number(cards, number):
    for i, card in enumerate(cards):
        if normalize(card.get("number", "")) == normalize(number):
            return i
    return -1


def row_has_data(card):
    return any(normalize(card.get(field, "")) != "" for field in ["name", "set", "index", "buyData", "image"])


def print_card(card, title="Card"):
    print(f"\n{title}:")
    for field in FIELDS:
        print(f"  {field}: {card.get(field, '')}")


def main():
    cards = load_cards(CSV_FILE)
    print(f"Loaded {len(cards)} rows from {CSV_FILE}")

    while True:
        new_card = prompt_card_data()
        row_index = find_row_by_number(cards, new_card["number"])

        if row_index == -1:
            print(f"\nNo row with number {new_card['number']} exists in the CSV.")
        else:
            existing_row = cards[row_index]

            if row_has_data(existing_row):
                print(f"\nRow with number {new_card['number']} already contains data.")
                print_card(existing_row, "Existing row")
                print_card(new_card, "New card")

                choice = input("\nReplace this row? (y/n): ").strip().lower()
                if choice == "y":
                    cards[row_index] = new_card
                    save_cards(CSV_FILE, cards)
                    print(f"Replaced row {new_card['number']}.")
                else:
                    print("No changes made.")
            else:
                cards[row_index] = new_card
                save_cards(CSV_FILE, cards)
                print(f"Filled empty row {new_card['number']}.")

        again = input("\nEdit another row? (y/n): ").strip().lower()
        if again != "y":
            print("Done.")
            break


if __name__ == "__main__":
    main()