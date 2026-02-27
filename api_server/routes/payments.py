import os
import stripe
from fastapi import APIRouter, Header, HTTPException, Request, Depends
from typing import Dict, Any
from ..auth import get_current_user
from ..database import update_user_subscription

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Pricing Configuration
# MXN prices
PRICE_MXN_SINGLE = 7500   # $75.00 MXN in cents
PRICE_MXN_WEEK = 20000    # $200.00 MXN in cents
PRICE_MXN_MONTH = 40000   # $400.00 MXN in cents

# USD prices
PRICE_USD_SINGLE = 400    # $4.00 USD in cents
PRICE_USD_WEEK = 1000     # $10.00 USD in cents
PRICE_USD_MONTH = 2000    # $20.00 USD in cents

router = APIRouter()

def get_currency_from_request(request: Request) -> str:
    """Determine currency based on IP geolocation headers."""
    # Standard CDN headers
    country = request.headers.get("CF-IPCountry") or \
              request.headers.get("X-Vercel-IP-Country") or \
              request.headers.get("CloudFront-Viewer-Country")
    
    if not country:
        # Fallback to local dev or missing headers
        # For a robust implementation, you could call an external API here,
        # e.g., ipapi.co based on request.client.host
        # Defaulting to MX if local dev for testing, but in production, default to US if unknown
        client_ip = request.client.host if request.client else "127.0.0.1"
        if client_ip in ("127.0.0.1", "::1"):
            return "mxn" # Or "usd" depending on your primary test case
        return "usd"

    return "mxn" if country.upper() == "MX" else "usd"


@router.post("/api/payments/checkout")
async def create_checkout_session(request: Request, data: Dict[str, Any], user=Depends(get_current_user)):
    """Create a Stripe Checkout Session."""
    tier = data.get("tier")
    if tier not in ["single", "week", "month"]:
        raise HTTPException(status_code=400, detail="Invalid tier selection")

    currency = get_currency_from_request(request)
    
    # Determine price and details based on tier and currency
    if currency == "mxn":
        if tier == "single":
            unit_amount = PRICE_MXN_SINGLE
            product_name = "1 Job (Lead Extraction)"
        elif tier == "week":
            unit_amount = PRICE_MXN_WEEK
            product_name = "1 Week Unlimited Access"
        else:
            unit_amount = PRICE_MXN_MONTH
            product_name = "1 Month Unlimited Access"
    else:
        if tier == "single":
            unit_amount = PRICE_USD_SINGLE
            product_name = "1 Job (Lead Extraction)"
        elif tier == "week":
            unit_amount = PRICE_USD_WEEK
            product_name = "1 Week Unlimited Access"
        else:
            unit_amount = PRICE_USD_MONTH
            product_name = "1 Month Unlimited Access"

    # Assume frontend is at same origin as backend if not configured
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4321")

    try:
        # Create a new Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=user["email"], # Pre-fill email
            line_items=[
                {
                    'price_data': {
                        'currency': currency,
                        'product_data': {
                            'name': product_name,
                        },
                        'unit_amount': unit_amount,
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=f"{frontend_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/checkout?canceled=true",
            client_reference_id=f"{user['id']}_{tier}", # Crucial for fulfillment
        )
        return {"checkout_url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/payments/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe Webhooks for payment fulfillment."""
    print("Received Stripe Webhook request")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        print("Error: Missing stripe-signature header")
        raise HTTPException(status_code=400, detail="Missing signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        print(f"Webhook event received and verified: {event['type']}")
    except ValueError as e:
        print(f"Webhook Error (Invalid payload): {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        print(f"Webhook Error (Invalid signature): {str(e)}")
        print(f"Provided Secret: {STRIPE_WEBHOOK_SECRET[:10]}...")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Fulfill the purchase...
        client_reference_id = session.get('client_reference_id')
        print(f"Processing checkout.session.completed. Client Reference ID: {client_reference_id}")
        
        if client_reference_id:
            try:
                user_id_str, tier = client_reference_id.split('_')
                user_id = int(user_id_str)
                
                print(f"Fulfilling payment for User {user_id}, Tier: {tier}")
                from ..database import update_user_subscription
                success = update_user_subscription(user_id, tier)
                print(f"Database update success: {success}")
            except Exception as e:
                print(f"Error in fulfillment logic: {str(e)}")
        else:
            print("Warning: No client_reference_id found in session")

    return {"status": "success"}

