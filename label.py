import pandas as pd

# Load your CSV
df = pd.read_csv("dexDatabase.csv")

# Fill the 'number' column with 1 → 1025
df["number"] = range(1, 1026)

# Save back to CSV
df.to_csv("dexDatabase.csv", index=False)

print("Done!")