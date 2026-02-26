# exporter.py
import os
import json
import pandas as pd
from typing import List, Dict
from datetime import datetime
from lib.config import LEADS_DIR, OUTPUT_CSV, OUTPUT_MD


def export_to_csv(businesses: List[dict], filename: str = None) -> str:
    """
    Export businesses to CSV file in /leads directory.

    Args:
        businesses: List of business dictionaries
        filename: Output filename (default: leads.csv in /leads)

    Returns:
        Path to the created CSV file
    """
    if not businesses:
        return ""

    # Create leads directory if it doesn't exist
    os.makedirs(LEADS_DIR, exist_ok=True)

    # Determine output path
    if filename:
        # If it has extension, use as-is in leads dir
        if "." in filename:
            output_file = os.path.join(LEADS_DIR, filename)
        else:
            output_file = os.path.join(LEADS_DIR, f"{filename}.csv")
    else:
        output_file = os.path.join(LEADS_DIR, OUTPUT_CSV)

    # Flatten the data for CSV
    rows = []
    for b in businesses:
        rows.append({
            "name": b.get("name", ""),
            "business_type": b.get("business_type", ""),
            "address": b.get("address", ""),
            "phone": b.get("phone", ""),
            "rating": b.get("rating", 0),
            "review_count": b.get("review_count", 0),
            "price_level": b.get("price_level_display", ""),
            "photos_count": b.get("photos_count", 0),
            "distance_km": b.get("distance_km"),
            "distance_miles": b.get("distance_miles"),
            "website": b.get("website", ""),
            "social": b.get("social", ""),
            "google_maps_url": b.get("maps_url", ""),
            "description": b.get("description", ""),
            "lat": b.get("lat", 0),
            "lng": b.get("lng", 0),
            "business_status": b.get("business_status", ""),
            "lead_score": b.get("lead_score", 0),
        })

    df = pd.DataFrame(rows)
    df.to_csv(output_file, index=False)

    return output_file


def export_to_markdown(businesses: List[dict], filename: str = None, center_lat: float = None, center_lng: float = None) -> str:
    """
    Export businesses to Markdown table file in /leads directory.

    Args:
        businesses: List of business dictionaries
        filename: Output filename (default: leads.md in /leads)
        center_lat: Center latitude for the search
        center_lng: Center longitude for the search

    Returns:
        Path to the created Markdown file
    """
    if not businesses:
        return ""

    # Create leads directory if it doesn't exist
    os.makedirs(LEADS_DIR, exist_ok=True)

    # Format center coordinates
    if center_lat is not None and center_lng is not None:
        center_str = f"{center_lat}, {center_lng}"
    else:
        center_str = "N/A"

    # Determine output path
    if filename:
        if "." in filename:
            output_file = os.path.join(LEADS_DIR, filename)
        else:
            output_file = os.path.join(LEADS_DIR, f"{filename}.md")
    else:
        output_file = os.path.join(LEADS_DIR, OUTPUT_MD)

    # Build markdown content
    lines = []
    lines.append("# Lead Generation Results")
    lines.append("")
    lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**Search Center:** {center_str}")
    lines.append(f"**Total Leads:** {len(businesses)}")
    lines.append("")
    lines.append("## Top Leads (sorted by score)")
    lines.append("")
    lines.append("| # | Name | Type | Distance | Rating | Reviews | Score | Maps |")
    lines.append("|---|------|------|----------|--------|---------|-------|------|")

    for i, b in enumerate(businesses, 1):
        name = b.get("name", "")
        btype = b.get("business_type", "")
        distance = b.get("distance_km", "-")
        rating = b.get("rating", 0)
        reviews = b.get("review_count", 0)
        score = b.get("lead_score", 0)
        maps_url = b.get("maps_url", "")

        # Format distance
        if distance != "-" and distance is not None:
            distance = f"{distance} km"
        else:
            distance = "-"

        # Format maps link
        maps_link = f"[Map]({maps_url})" if maps_url else "-"

        # Truncate for table readability
        if len(name) > 12:
            name = name[:9] + "..."

        lines.append(f"| {i} | {name} | {btype} | {distance} | {rating} | {reviews} | **{score}** | {maps_link} |")

    lines.append("")
    lines.append("## All Leads Detail")
    lines.append("")

    # Add detailed section for each lead
    for i, b in enumerate(businesses, 1):
        name = b.get("name", "")
        btype = b.get("business_type", "")
        address = b.get("address", "")
        phone = b.get("phone", "N/A")
        rating = b.get("rating", 0)
        reviews = b.get("review_count", 0)
        price = b.get("price_level_display", "-")
        photos = b.get("photos_count", 0)
        website = b.get("website", "")
        social = b.get("social", "")
        maps_url = b.get("maps_url", "")
        description = b.get("description", "")
        score = b.get("lead_score", 0)
        status = b.get("business_status", "Unknown")
        distance_km = b.get("distance_km")
        distance_miles = b.get("distance_miles")

        # Format distance
        if distance_km is not None:
            distance_str = f"{distance_km} km ({distance_miles} mi)"
        else:
            distance_str = "N/A"

        lines.append(f"### {i}. {name}")
        lines.append(f"**Type:** {btype} | **Distance:** {distance_str} | **Score:** {score}/165 | **Status:** {status}")
        lines.append("")
        lines.append(f"- **Address:** {address}")
        lines.append(f"- **Phone:** {phone}")
        lines.append(f"- **Rating:** {rating}/5 ({reviews} reviews)")
        lines.append(f"- **Price Level:** {price}")
        lines.append(f"- **Photos:** {photos}")
        if website:
            lines.append(f"- **Website:** {website}")
        else:
            lines.append(f"- **Website:** None (potential lead!)")
        if social:
            lines.append(f"- **Social:** {social}")
        lines.append(f"- **Google Maps:** [View on Maps]({maps_url})")
        lines.append(f"- **Coordinates:** {b.get('lat', 'N/A')}, {b.get('lng', 'N/A')}")

        if description:
            lines.append("")
            lines.append(f"**Description:** {description}")
        lines.append("")

    # Summary section
    lines.append("## Summary")
    lines.append("")

    # Calculate summary stats
    total = len(businesses)
    avg_rating = sum(b.get("rating", 0) for b in businesses) / total if total else 0
    total_reviews = sum(b.get("review_count", 0) for b in businesses)
    avg_score = sum(b.get("lead_score", 0) for b in businesses) / total if total else 0

    lines.append(f"- **Total leads:** {total}")
    lines.append(f"- **Average rating:** {avg_rating:.2f}")
    lines.append(f"- **Total reviews:** {total_reviews}")
    lines.append(f"- **Average lead score:** {avg_score:.1f}")
    lines.append("")

    # Business type breakdown
    type_counts = {}
    for b in businesses:
        t = b.get("business_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    if type_counts:
        lines.append("## By Business Type")
        lines.append("")
        for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
            lines.append(f"- **{t}:** {count}")

    with open(output_file, "w") as f:
        f.write("\n".join(lines))

    return output_file


def export_to_json(businesses: List[dict]) -> str:
    """
    Export businesses to JSON file.

    Args:
        businesses: List of business dictionaries

    Returns:
        Path to the created JSON file
    """
    if not businesses:
        return ""

    os.makedirs(LEADS_DIR, exist_ok=True)
    output_file = os.path.join(LEADS_DIR, "leads.json")

    with open(output_file, "w") as f:
        json.dump(businesses, f, indent=2)

    return output_file


def export_all(businesses: List[dict], base_filename: str = None, center_lat: float = None, center_lng: float = None) -> tuple[str, str]:
    """
    Export businesses to both CSV and Markdown files.

    Args:
        businesses: List of business dictionaries
        base_filename: Base filename without extension
        center_lat: Center latitude for the search
        center_lng: Center longitude for the search

    Returns:
        Tuple of (csv_path, md_path)
    """
    csv_path = export_to_csv(businesses, base_filename)
    md_path = export_to_markdown(businesses, base_filename, center_lat, center_lng)
    return csv_path, md_path


def print_leads(businesses: List[dict], limit: int = 20):
    """
    Print a summary of leads to console.
    """
    if not businesses:
        print("\nNo leads found!")
        return

    print(f"\n=== Found {len(businesses)} potential leads ===\n")

    for i, b in enumerate(businesses[:limit], 1):
        distance_km = b.get('distance_km')
        distance_miles = b.get('distance_miles')
        if distance_km is not None:
            distance = f"{distance_km} km ({distance_miles} mi)"
        else:
            distance = "N/A"

        print(f"{i}. {b.get('name')} ({b.get('business_type', 'N/A')})")
        print(f"   Distance: {distance}")
        print(f"   Address: {b.get('address')}")
        print(f"   Phone: {b.get('phone', 'N/A')}")
        print(f"   Rating: {b.get('rating')} ({b.get('review_count')} reviews) | Price: {b.get('price_level_display', '-')}")
        print(f"   Website: {b.get('website', 'None (potential lead!)')}")
        print(f"   Maps: {b.get('maps_url', 'N/A')}")
        print(f"   Lead Score: {b.get('lead_score', 0)}/165")
        print(f"   Status: {b.get('business_status', 'Unknown')}")
        print()

    if len(businesses) > limit:
        print(f"... and {len(businesses) - limit} more leads")
        print(f"\nFull results saved to /leads")
