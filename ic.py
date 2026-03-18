import os
import re
import shutil

# Folder with your images
SOURCE_DIR = "images-pokemon"  # Change this to your actual folder name

# Folder to move matching files into
DEST_DIR = "images-bulk"

# Create destination folder if it doesn't exist
os.makedirs(DEST_DIR, exist_ok=True)

# Regex: dash + exactly 3 letters before .webp
pattern = re.compile(r"-[a-zA-Z]{3}\.webp$")

for filename in os.listdir(SOURCE_DIR):
    if filename.endswith(".webp") and pattern.search(filename):
        source_path = os.path.join(SOURCE_DIR, filename)
        dest_path = os.path.join(DEST_DIR, filename)

        print(f"Moving: {filename}")
        shutil.move(source_path, dest_path)

print("Done!")