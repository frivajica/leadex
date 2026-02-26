# filters.py
import math
from typing import List, Dict
from lib.config import (
    DEFAULT_MIN_RATING,
    DEFAULT_MIN_REVIEWS,
    DEFAULT_MIN_PHOTOS,
    SCORE_RATING_THRESHOLDS,
    SCORE_REVIEW_THRESHOLDS,
    SCORE_PHOTO_THRESHOLDS,
    DEFAULT_USE_QUALITY_FILTERS,
    NEGATIVE_KEYWORDS,
    NEGATIVE_KEYWORD_PENALTY,
    SCORE_HAS_HOURS,
    SCORE_HAS_PHONE,
    SCORE_HAS_ADDRESS,
    SCORE_OPERATIONAL_BONUS,
)


def filter_businesses_without_websites(businesses: List[dict]) -> List[dict]:
    """
    Filter businesses that don't have a website.
    A business is considered to have no website if:
    - website is None
    - website is empty string
    """
    return [
        b for b in businesses
        if not b.get("website") or b.get("website", "").strip() == ""
    ]


def filter_by_criteria(
    businesses: List[dict],
    min_rating: float = DEFAULT_MIN_RATING,
    min_reviews: int = DEFAULT_MIN_REVIEWS,
    min_photos: int = DEFAULT_MIN_PHOTOS,
) -> List[dict]:
    """
    Filter businesses by optional quality criteria.
    These filters are applied after removing businesses with websites.
    """
    filtered = []
    for b in businesses:
        rating = b.get("rating", 0)
        reviews = b.get("review_count", 0)
        photos = b.get("photos_count", 0)

        if (
            rating >= min_rating
            and reviews >= min_reviews
            and photos >= min_photos
        ):
            filtered.append(b)

    return filtered


def check_quality_compliance(
    business: dict,
    min_rating: float = DEFAULT_MIN_RATING,
    min_reviews: int = DEFAULT_MIN_REVIEWS,
    min_photos: int = DEFAULT_MIN_PHOTOS,
) -> dict:
    """
    Check if a business meets quality criteria and add compliance info.
    Does NOT filter - just adds metadata.
    Returns a dict with compliance details.
    """
    rating = business.get("rating", 0)
    reviews = business.get("review_count", 0)
    photos = business.get("photos_count", 0)

    meets_rating = rating >= min_rating
    meets_reviews = reviews >= min_reviews
    meets_photos = photos >= min_photos

    return {
        "meets_rating": meets_rating,
        "meets_reviews": meets_reviews,
        "meets_photos": meets_photos,
        "meets_quality_criteria": meets_rating and meets_reviews and meets_photos,
    }


def check_negative_keywords(business_name: str) -> bool:
    """Check if business name contains negative keywords."""
    if not business_name:
        return False
    name_lower = business_name.lower()
    return any(neg in name_lower for neg in NEGATIVE_KEYWORDS)


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two coordinates in kilometers using Haversine formula.
    """
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def add_distances(businesses: List[dict], center_lat: float, center_lng: float) -> List[dict]:
    """Add distance from center to each business."""
    for b in businesses:
        lat = b.get("lat", 0)
        lng = b.get("lng", 0)
        if lat and lng:
            distance_km = calculate_distance(center_lat, center_lng, lat, lng)
            b["distance_km"] = round(distance_km, 2)
            b["distance_miles"] = round(distance_km * 0.621371, 2)
        else:
            b["distance_km"] = None
            b["distance_miles"] = None
    return businesses


def score_business(business: dict) -> int:
    """
    Score a business based on multiple quality indicators.
    Higher score = better lead quality (max ~165 points).
    """
    score = 0

    # =========================================================================
    # Base Quality Scores (0-100 points)
    # =========================================================================

    # Rating score
    rating = business.get("rating", 0)
    if rating >= SCORE_RATING_THRESHOLDS["excellent"]:
        score += 30
    elif rating >= SCORE_RATING_THRESHOLDS["good"]:
        score += 20
    elif rating >= SCORE_RATING_THRESHOLDS["fair"]:
        score += 10

    # Review count score
    reviews = business.get("review_count", 0)
    if reviews >= SCORE_REVIEW_THRESHOLDS["high"]:
        score += 30
    elif reviews >= SCORE_REVIEW_THRESHOLDS["medium"]:
        score += 20
    elif reviews >= SCORE_REVIEW_THRESHOLDS["low"]:
        score += 10

    # Photos score
    photos = business.get("photos_count", 0)
    if photos >= SCORE_PHOTO_THRESHOLDS["many"]:
        score += 20
    elif photos >= SCORE_PHOTO_THRESHOLDS["some"]:
        score += 10

    # Business status bonus
    if business.get("business_status") == "OPERATIONAL":
        score += SCORE_OPERATIONAL_BONUS

    # =========================================================================
    # Profile Completeness Bonuses (0-30 points)
    # =========================================================================
    if business.get("has_hours"):
        score += SCORE_HAS_HOURS
    if business.get("has_phone"):
        score += SCORE_HAS_PHONE
    if business.get("address"):
        score += SCORE_HAS_ADDRESS

    # =========================================================================
    # Negative Keyword Penalty (0 to -50 points)
    # =========================================================================
    business_name = business.get("name", "")
    if check_negative_keywords(business_name):
        score -= NEGATIVE_KEYWORD_PENALTY

    # Ensure score doesn't go below 0
    return max(0, score)


def sort_by_distance(businesses: List[dict]) -> List[dict]:
    """Sort businesses by distance (closest first)."""
    return sorted(
        businesses,
        key=lambda b: (b.get("distance_km", float("inf")) or float("inf"))
    )


def sort_by_score(businesses: List[dict], descending: bool = True) -> List[dict]:
    """Sort businesses by lead score."""
    return sorted(businesses, key=lambda b: b.get("lead_score", 0), reverse=descending)


def apply_all_filters(
    businesses: List[dict],
    use_quality_filters: bool = DEFAULT_USE_QUALITY_FILTERS,
    min_rating: float = DEFAULT_MIN_RATING,
    min_reviews: int = DEFAULT_MIN_REVIEWS,
    min_photos: int = DEFAULT_MIN_PHOTOS,
    sort_by: str = "distance",
    center_lat: float = None,
    center_lng: float = None,
) -> List[dict]:
    """
    Apply all filtering and return scored leads.

    Args:
        businesses: List of business dictionaries
        use_quality_filters: Whether to apply quality filters
        min_rating: Minimum rating threshold
        min_reviews: Minimum reviews threshold
        min_photos: Minimum photos threshold
        sort_by: Sort method - "distance" or "score"
        center_lat: Center latitude for distance calculation
        center_lng: Center longitude for distance calculation
    """
    # Step 0: Add distances if center provided
    if center_lat is not None and center_lng is not None:
        businesses = add_distances(businesses, center_lat, center_lng)

    # Step 1: Filter businesses without websites
    leads = filter_businesses_without_websites(businesses)

    # Step 2: Optionally apply quality filters
    if use_quality_filters:
        leads = filter_by_criteria(
            leads,
            min_rating=min_rating,
            min_reviews=min_reviews,
            min_photos=min_photos,
        )

    # Step 3: Add compliance info and scores (always - don't filter, just flag)
    for lead in leads:
        compliance = check_quality_compliance(
            lead,
            min_rating=min_rating,
            min_reviews=min_reviews,
            min_photos=min_photos,
        )
        lead["meets_rating"] = compliance["meets_rating"]
        lead["meets_reviews"] = compliance["meets_reviews"]
        lead["meets_photos"] = compliance["meets_photos"]
        lead["meets_quality_criteria"] = compliance["meets_quality_criteria"]
        lead["lead_score"] = score_business(lead)

    # Step 4: Sort
    if sort_by == "score":
        leads = sort_by_score(leads)
    else:
        leads = sort_by_distance(leads)

    return leads
