# Lead Extractor - Scoring System

The **Lead Score** measures the quality of a lead on a scale of 0 to ~165 points. Higher scores indicate established, highly-rated local businesses that are prime candidates for services.

## Base Quality (Max 80 points)

### Rating (0-30 points)
- **4.5 - 5.0**: +30 points
- **4.0 - 4.4**: +20 points
- **3.5 - 3.9**: +10 points

### Review Count (0-30 points)
- **50+ reviews**: +30 points
- **10-49 reviews**: +20 points
- **1-9 reviews**: +10 points

### Photos count (0-20 points)
- **10+ photos**: +20 points
- **3-9 photos**: +10 points

## Operational Status (Max 5 points)
- Business is confirmed `OPERATIONAL`: +5 points

## Profile Completeness (Max 30 points)
- Has published opening hours: +10 points
- Has a phone number: +10 points
- Has a physical address: +10 points

## Negative Keyword Penalty (up to -50 points)
If the business name contains "negative keywords" (massive corporations, giant chains, institutions), the score takes a massive penalty.
- Contains keyword (e.g., Walmart, Target, Starbucks, McDonald's): -50 points

*Note: The final score is floor-capped at 0.*
