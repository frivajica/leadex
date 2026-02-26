# google_places.py
import time
import asyncio
import aiohttp
from typing import Optional, List, Callable, Awaitable
from lib.config import (
    GOOGLE_MAPS_API_KEY,
    DEFAULT_RADIUS,
    MAX_RESULTS_PER_CATEGORY,
    VALID_PLACE_TYPES,
)

# Type alias for progress callback
ProgressCallback = Callable[[str, int, int], Awaitable[None]]


class RateLimiter:
    """
    Manages API rate limiting to prevent exceeding request quotas.

    Default behavior: max 550 requests per 60-second window (buffer under 600 limit).
    """

    def __init__(
        self,
        max_requests_per_minute: int = 550,
        time_window_seconds: int = 60,
        is_enabled: bool = True,
    ):
        self.max_requests_per_window = max_requests_per_minute
        self.window_duration_seconds = time_window_seconds
        self.is_enabled = is_enabled
        self._request_timestamps: List[float] = []
        self._lock = asyncio.Lock()

    async def wait_if_needed(self, verbose: bool = False) -> None:
        """Check if we need to wait before making another request."""
        if not self.is_enabled:
            return

        async with self._lock:
            current_time = time.time()
            self._request_timestamps = [
                timestamp for timestamp in self._request_timestamps
                if current_time - timestamp < self.window_duration_seconds
            ]

            requests_at_limit = len(self._request_timestamps) >= self.max_requests_per_window
            if requests_at_limit:
                oldest_timestamp = self._request_timestamps[0]
                seconds_to_wait = self.window_duration_seconds - (current_time - oldest_timestamp) + 1

                if verbose:
                    print(f"    Rate limit reached ({self.max_requests_per_window}/{self.window_duration_seconds}s), waiting {seconds_to_wait:.1f}s...")

                await asyncio.sleep(seconds_to_wait)

                current_time = time.time()
                self._request_timestamps = [
                    timestamp for timestamp in self._request_timestamps
                    if current_time - timestamp < self.window_duration_seconds
                ]

            self._request_timestamps.append(time.time())

    def reset(self) -> None:
        """Clear the request history (useful for testing)."""
        self._request_timestamps = []


class GooglePlacesClient:
    def __init__(
        self,
        api_key: str = None,
        verbose: bool = False,
        enable_rate_limit: bool = True,
        progress_callback: ProgressCallback = None,
    ):
        self.api_key = api_key or GOOGLE_MAPS_API_KEY
        if not self.api_key:
            raise ValueError("Google Maps API key is required")
        self.base_url = "https://places.googleapis.com/v1"
        self.verbose = verbose
        self.rate_limiter = RateLimiter(is_enabled=enable_rate_limit)
        self.progress_callback = progress_callback
        self._is_cancelled = False

    def cancel(self) -> None:
        """Cancel the current extraction job."""
        self._is_cancelled = True

    def _get_valid_type(self, category: str) -> Optional[str]:
        """Check if category is a valid API type."""
        if not category:
            return None

        category_lower = category.lower().strip()

        if category_lower in VALID_PLACE_TYPES:
            return category_lower

        singular_form = category_lower[:-1] if category_lower.endswith("s") else None
        if singular_form and singular_form in VALID_PLACE_TYPES:
            return singular_form

        return None

    async def search_nearby(
        self,
        lat: float,
        lng: float,
        category: str = None,
        radius: int = DEFAULT_RADIUS,
    ) -> list[dict]:
        """
        Search for businesses near a location using Places API (New).
        Supports pagination to get more than 20 results.

        Args:
            lat: Latitude
            lng: Longitude
            category: Business category (e.g., "restaurant", "plumber")
            radius: Search radius in meters (max 50000)

        Returns:
            List of business details
        """
        if self._is_cancelled:
            return []

        search_type = self._get_valid_type(category)

        if not search_type:
            if self.verbose:
                print(f"    Warning: '{category}' is not a valid type, skipping...")
            return []

        api_url = f"{self.base_url}/places:searchNearby"
        request_headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.photos,places.location,places.businessStatus,places.types,places.regularOpeningHours,places.currentOpeningHours,places.nationalPhoneNumber,places.priceLevel,places.editorialSummary,places.utcOffsetMinutes,places.shortFormattedAddress",
        }

        all_places = []
        next_page_token = None
        max_pagination_pages = 5
        api_required_delay_seconds = 2

        async with aiohttp.ClientSession() as session:
            for page_number in range(max_pagination_pages):
                if self._is_cancelled:
                    break

                is_first_page = page_number == 0

                if is_first_page:
                    request_body = {
                        "locationRestriction": {
                            "circle": {
                                "center": {"latitude": lat, "longitude": lng},
                                "radius": radius,
                            }
                        },
                        "includedTypes": [search_type],
                    }
                else:
                    if not next_page_token:
                        break
                    request_body = {"pageToken": next_page_token}

                try:
                    await self.rate_limiter.wait_if_needed(verbose=self.verbose)

                    async with session.post(api_url, headers=request_headers, json=request_body) as response:
                        response.raise_for_status()
                        response_data = await response.json()

                        places_on_page = response_data.get("places", [])
                        all_places.extend(places_on_page)

                        if self.verbose:
                            print(f"    Page {page_number + 1}: {len(places_on_page)} results")

                        next_page_token = response_data.get("nextPageToken")
                        has_more_pages = next_page_token is not None

                        if not has_more_pages:
                            break

                        await asyncio.sleep(api_required_delay_seconds)

                except aiohttp.ClientError as e:
                    if self.verbose:
                        print(f"    API Error for '{category}': {e}")
                    break
                except Exception as e:
                    if self.verbose:
                        print(f"    API Error: {e}")
                    break

        if self.verbose:
            print(f"    Total: {len(all_places)} results")

        businesses = []
        for place in all_places[:MAX_RESULTS_PER_CATEGORY]:
            if self._is_cancelled:
                break
            business = self._extract_business_details(place, category)
            if business:
                businesses.append(business)

        return businesses

    async def search_multiple_categories(
        self,
        lat: float,
        lng: float,
        categories: List[str],
        radius: int = DEFAULT_RADIUS,
        max_parallel: int = 10,
    ) -> List[dict]:
        """
        Search multiple categories in parallel.

        Args:
            lat: Latitude
            lng: Longitude
            categories: List of business categories
            radius: Search radius in meters
            max_parallel: Maximum parallel requests

        Returns:
            List of all business details
        """
        semaphore = asyncio.Semaphore(max_parallel)

        async def search_with_semaphore(category: str) -> tuple[str, list]:
            async with semaphore:
                if self.progress_callback:
                    await self.progress_callback(category, 0, len(categories))
                results = await self.search_nearby(lat, lng, category, radius)
                return category, results

        tasks = [search_with_semaphore(cat) for cat in categories]

        all_businesses = []
        completed = 0

        for coro in asyncio.as_completed(tasks):
            if self._is_cancelled:
                break
            category, results = await coro
            all_businesses.extend(results)
            completed += 1
            if self.progress_callback:
                await self.progress_callback(category, completed, len(categories))

        return all_businesses

    def _extract_business_details(self, place: dict, category: str = None) -> Optional[dict]:
        """Extract relevant details from a place result."""
        try:
            location = place.get("location", {})
            photos = place.get("photos", [])
            opening_hours = place.get("regularOpeningHours", {})
            current_hours = place.get("currentOpeningHours", {})
            phone = place.get("nationalPhoneNumber", "")
            types = place.get("types", [])
            price_level = place.get("priceLevel", "")
            editorial = place.get("editorialSummary", {})
            overview = editorial.get("overview", {}) if isinstance(editorial, dict) else {}
            description = overview.get("text", "") or editorial.get("text", "")
            place_id = place.get("id", "")
            short_address = place.get("shortFormattedAddress", "")

            maps_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}" if place_id else ""
            reviews_url = f"https://www.google.com/maps/search/?api=1&query=open+now&query_place_id={place_id}" if place_id else ""

            business_name = place.get("displayName", {}).get("text", "")
            social_links = self._build_social_links(business_name, place.get("primaryType", ""))

            regular_hours = self._format_hours(opening_hours)
            current_hours_formatted = self._format_hours(current_hours)

            is_open = current_hours.get("openNow") if current_hours else False
            website, social = self._extract_website(place.get("websiteUri", ""))

            return {
                "name": business_name,
                "address": place.get("formattedAddress", ""),
                "short_address": short_address,
                "rating": place.get("rating", 0) or 0,
                "review_count": place.get("userRatingCount", 0) or 0,
                "website": website,
                "social": social,
                "photos_count": len(photos),
                "lat": location.get("latitude"),
                "lng": location.get("longitude"),
                "place_id": place_id,
                "business_status": place.get("businessStatus", ""),
                "business_type": category or place.get("primaryType", types[0] if types else ""),
                "has_hours": bool(opening_hours.get("openNow")),
                "has_phone": bool(phone),
                "phone": phone,
                "types": types,
                "price_level": price_level,
                "price_level_display": self._format_price_level(price_level),
                "description": description,
                "regular_hours": regular_hours,
                "current_hours": current_hours_formatted,
                "is_currently_open": is_open,
                "maps_url": maps_url,
                "reviews_url": reviews_url,
                **social_links,
            }
        except Exception as e:
            if self.verbose:
                print(f"Error extracting details: {e}")
            return None

    def _build_social_links(self, business_name: str, primary_type: str) -> dict:
        """Build social media search URLs for the business."""
        if not business_name:
            return {}

        return {
            "facebook_url": "",
            "instagram_url": "",
            "twitter_url": "",
            "yelp_url": "",
            "bing_url": "",
        }

    def _is_social_media(self, url: str) -> bool:
        """Check if URL is a social media profile rather than an actual website."""
        if not url:
            return False
        url_lower = url.lower()
        social_domains = [
            "facebook.com",
            "instagram.com",
            "twitter.com",
            "x.com",
            "tiktok.com",
            "linkedin.com",
            "yelp.com",
            "yelp.ie",
            "goo.gl",
            "maps.google",
        ]
        return any(domain in url_lower for domain in social_domains)

    def _extract_website(self, url: str) -> tuple:
        """Extract website URL and social URL separately."""
        if not url:
            return ("", "")
        if self._is_social_media(url):
            return ("", url)
        return (url, "")

    def _format_price_level(self, price_level: str) -> str:
        """Convert price level to display string."""
        mapping = {
            "PRICE_LEVEL_UNSPECIFIED": "",
            "PRICE_LEVEL_FREE": "Free",
            "PRICE_LEVEL_INEXPENSIVE": "$",
            "PRICE_LEVEL_MODERATE": "$$",
            "PRICE_LEVEL_EXPENSIVE": "$$$",
            "PRICE_LEVEL_VERY_EXPENSIVE": "$$$$",
        }
        return mapping.get(price_level, "")

    def _format_hours(self, hours: dict) -> str:
        """Format opening hours for display."""
        if not hours:
            return ""

        open_now = hours.get("openNow")
        weekday_descriptions = hours.get("weekdayDescription", [])

        if weekday_descriptions:
            return "; ".join(weekday_descriptions)

        periods = hours.get("periods", [])
        if not periods:
            return ""

        lines = []
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        max_periods_to_show = 14

        for period in periods[:max_periods_to_show]:
            open_time = period.get("open", {}).get("time", "")
            close_time = period.get("close", {}).get("time", "")
            day = period.get("open", {}).get("day", 0)

            is_valid_day = 1 <= day <= 7
            if is_valid_day and open_time and close_time:
                day_name = day_names[day - 1]
                open_formatted = f"{open_time[:2]}:{open_time[2:]}" if len(open_time) >= 4 else open_time
                close_formatted = f"{close_time[:2]}:{close_time[2:]}" if len(close_time) >= 4 else close_time
                lines.append(f"{day_name}: {open_formatted} - {close_formatted}")

        return "; ".join(lines) if lines else ""
