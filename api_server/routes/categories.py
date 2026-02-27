# routes/categories.py - Categories endpoint
from fastapi import APIRouter, HTTPException, Depends

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from lib.config import VALID_PLACE_TYPES, CATEGORY_GROUPS
from lib.translations import get_category_translation, get_available_locales, get_translations
from api_server.auth import get_current_user

def require_auth(user=Depends(get_current_user)) -> dict:
    """Require authentication."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

router = APIRouter(prefix="/api", tags=["categories"])


@router.get("/categories")
async def get_categories(
    locale: str = "en",
    user: dict = Depends(require_auth)
):
    """Get all available business categories with translations."""
    
    # Validate locale
    available_locales = get_available_locales()
    if locale not in available_locales:
        locale = "en"
    
    icons = {
        'restaurant': '🍽️', 'cafe': '☕', 'coffee_shop': '☕',
        'bar': '🍸', 'bakery': '🥐', 'fast_food_restaurant': '🍔',
        'pizza_restaurant': '🍕', 'sushi_restaurant': '🍣',
        'chinese_restaurant': '🥡', 'mexican_restaurant': '🌮',
        'italian_restaurant': '🍝', 'indian_restaurant': '🍛',
        'thai_restaurant': '🍜', 'japanese_restaurant': '🍣',
        'korean_restaurant': '🥘', 'vietnamese_restaurant': '🍜',
        'mediterranean_restaurant': '🫓', 'steak_house': '🥩',
        'seafood_restaurant': '🦐', 'breakfast_restaurant': '🥞',
        'brunch_restaurant': '🥗', 'ice_cream_shop': '🍦',
        'dessert_shop': '🍰', 'juice_shop': '🧃', 'tea_house': '🍵',
        'wine_bar': '🍷', 'brewery': '🍺', 'winery': '🍇',
        'doctor': '👨‍⚕️', 'dentist': '🦷', 'hospital': '🏥',
        'pharmacy': '💊', 'physiotherapist': '💆', 'chiropractor': '🦴',
        'massage': '💆', 'spa': '🧖', 'yoga_studio': '🧘',
        'fitness_center': '💪', 'gym': '🏋️',
        'beauty_salon': '💇', 'hair_salon': '💇', 'nail_salon': '💅',
        'barber_shop': '💈', 'plumber': '🔧', 'electrician': '⚡',
        'painter': '🎨', 'locksmith': '🔐', 'roofing_contractor': '🏠',
        'florist': '💐', 'laundry': '👕', 'pet_store': '🐾',
        'veterinary_care': '🐕', 'shopping_mall': '🛍️',
        'supermarket': '🛒', 'grocery_store': '🥬',
        'convenience_store': '🏪', 'clothing_store': '👕',
        'shoe_store': '👟', 'jewelry_store': '💍',
        'electronics_store': '📱', 'furniture_store': '🛋️',
        'hardware_store': '🔨', 'home_goods_store': '🏠',
        'book_store': '📚', 'toy_store': '🧸', 'gift_shop': '🎁',
        'hotel': '🏨', 'motel': '🏢', 'bed_and_breakfast': '🛏️',
        'hostel': '🎒', 'resort_hotel': '🏝️',
        'movie_theater': '🎬', 'museum': '🏛️', 'library': '📖',
        'park': '🌳', 'zoo': '🦁', 'aquarium': '🐠',
        'amusement_park': '🎢', 'golf_course': '⛳',
        'swimming_pool': '🏊', 'real_estate_agency': '🏠',
        'insurance_agency': '📋', 'lawyer': '⚖️', 'accounting': '📊',
        'bank': '🏦', 'atm': '💳', 'post_office': '📮',
        'travel_agency': '✈️', 'car_dealer': '🚗', 'car_rental': '🚙',
        'car_repair': '🔧', 'car_wash': '🚿', 'gas_station': '⛽',
        'parking': '🅿️', 'tire_shop': '🔩',
    }
    
    categories = []
    for cat_id in VALID_PLACE_TYPES:
        categories.append({
            'id': cat_id,
            'label': get_category_translation(cat_id, locale),
            'icon': icons.get(cat_id, '📁')
        })
    
    return {
        'categories': categories,
        'total': len(categories),
        'locale': locale,
    }


GROUP_ICONS = {
    "car_services": "🚗",
    "restaurants_and_dining": "🍽️",
    "health_and_medical": "🏥",
    "beauty_and_wellness": "💇",
    "home_services": "🔧",
    "shopping_and_retail": "🛍️",
    "fitness_and_sports": "💪",
    "lodging": "🏨",
    "entertainment_and_leisure": "🎭",
    "arts_and_culture": "🎨",
    "education": "🎓",
    "financial_services": "🏦",
    "professional_services": "💼",
    "pet_services": "🐾",
    "travel_and_transport": "✈️",
    "religious_places": "⛪",
    "government_and_civic": "🏛️",
    "real_estate": "🏠",
    "nature_and_outdoors": "🌿",
    "agriculture_and_industry": "🏭",
    "other": "📁",
}

GROUP_LABELS = {
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
    "other": "Other",
}


@router.get("/category-groups")
async def get_category_groups(
    user: dict = Depends(require_auth),
):
    """Get category groups for the job creation form."""
    groups = []
    for group_id, members in CATEGORY_GROUPS.items():
        groups.append({
            "id": group_id,
            "label": GROUP_LABELS.get(group_id, group_id.replace("_", " ").title()),
            "icon": GROUP_ICONS.get(group_id, "📁"),
            "count": len(members),
            "categories": members,
        })
    return {"groups": groups, "total": len(groups)}
