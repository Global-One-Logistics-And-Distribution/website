input_file = "products_fixed.sql"
output_file = "products_clean.sql"

with open(input_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

cleaned = []

for line in lines:
    # Fix COPY end marker
    if line.strip() == r"\.":
        cleaned.append("\\.\n")
    else:
        cleaned.append(line.rstrip() + "\n")

with open(output_file, "w", encoding="utf-8") as f:
    f.writelines(cleaned)

print("Cleaned file saved as products_clean.sql")