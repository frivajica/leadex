import json

def get_keys(obj, prefix=""):
    keys = set()
    for k, v in obj.items():
        current_key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_keys(v, current_key))
        else:
            keys.add(current_key)
    return keys

with open("public/locales/en.json", "r") as f:
    en_keys = get_keys(json.load(f))
    
with open("public/locales/es.json", "r") as f:
    es_keys = get_keys(json.load(f))
    
with open("public/locales/fr.json", "r") as f:
    fr_keys = get_keys(json.load(f))

# What is missing in ES compared to EN
missing_in_es = en_keys - es_keys
# What is missing in FR compared to EN
missing_in_fr = en_keys - fr_keys

print(f"--- Missing in ES ({len(missing_in_es)}) ---")
for k in sorted(missing_in_es): print(k)

print(f"\n--- Missing in FR ({len(missing_in_fr)}) ---")
for k in sorted(missing_in_fr): print(k)
