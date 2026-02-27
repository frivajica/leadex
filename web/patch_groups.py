import json

groups_en = {
    "car_services": "Car Services",
    "restaurants_and_dining": "Restaurants & Dining",
    "health_and_medical": "Health & Medical",
    "beauty_and_wellness": "Beauty & Wellness",
    "home_services": "Home Services",
    "shopping_and_retail": "Shopping & Retail",
    "fitness_and_sports": "Fitness & Sports",
    "lodging": "Lodging",
    "entertainment_and_leisure": "Entertainment & Leisure",
    "arts_and_culture": "Arts & Culture",
    "education": "Education",
    "financial_services": "Financial Services",
    "professional_services": "Professional Services",
    "pet_services": "Pet Services",
    "travel_and_transport": "Travel & Transport",
    "religious_places": "Religious Places",
    "government_and_civic": "Government & Civic",
    "real_estate": "Real Estate",
    "nature_and_outdoors": "Nature & Outdoors",
    "agriculture_and_industry": "Agriculture & Industry",
    "other": "Other"
}

groups_es = {
    "car_services": "Servicios Automotrices",
    "restaurants_and_dining": "Restaurantes y Comida",
    "health_and_medical": "Salud y Medicina",
    "beauty_and_wellness": "Belleza y Bienestar",
    "home_services": "Servicios para el Hogar",
    "shopping_and_retail": "Compras y Retail",
    "fitness_and_sports": "Deporte y Fitness",
    "lodging": "Alojamiento",
    "entertainment_and_leisure": "Entretenimiento y Ocio",
    "arts_and_culture": "Arte y Cultura",
    "education": "Educación",
    "financial_services": "Servicios Financieros",
    "professional_services": "Servicios Profesionales",
    "pet_services": "Servicios para Mascotas",
    "travel_and_transport": "Viaje y Transporte",
    "religious_places": "Lugares Religiosos",
    "government_and_civic": "Gobierno y Cívico",
    "real_estate": "Bienes Raíces",
    "nature_and_outdoors": "Naturaleza y Aire Libre",
    "agriculture_and_industry": "Agricultura e Industria",
    "other": "Otro"
}

groups_fr = {
    "car_services": "Services Automobiles",
    "restaurants_and_dining": "Restaurants et Restauration",
    "health_and_medical": "Santé et Médical",
    "beauty_and_wellness": "Beauté et Bien-être",
    "home_services": "Services à Domicile",
    "shopping_and_retail": "Shopping et Vente au Détail",
    "fitness_and_sports": "Forme et Sports",
    "lodging": "Hébergement",
    "entertainment_and_leisure": "Divertissement et Loisirs",
    "arts_and_culture": "Arts et Culture",
    "education": "Éducation",
    "financial_services": "Services Financiers",
    "professional_services": "Services Professionnels",
    "pet_services": "Services pour Animaux",
    "travel_and_transport": "Voyage et Transport",
    "religious_places": "Lieux Religieux",
    "government_and_civic": "Gouvernement et Civique",
    "real_estate": "Immobilier",
    "nature_and_outdoors": "Nature et Plein Air",
    "agriculture_and_industry": "Agriculture et Industrie",
    "other": "Autre"
}

for lang, data in [("en", groups_en), ("es", groups_es), ("fr", groups_fr)]:
    with open(f"public/locales/{lang}.json", "r") as f:
        j = json.load(f)
    
    j["jobs"]["form"]["groups"] = data
    
    with open(f"public/locales/{lang}.json", "w") as f:
        json.dump(j, f, indent='\t', ensure_ascii=False)

