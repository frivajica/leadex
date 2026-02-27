import os
from typing import Optional

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send an email via Resend or fall back to console mock."""
    if RESEND_API_KEY:
        return _send_via_resend(to, subject, html, text)

    return _mock_send(to, subject, html, text)


def _send_via_resend(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send email using the Resend API."""
    try:
        import resend
        resend.api_key = RESEND_API_KEY

        params: resend.Emails.SendParams = {
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        }

        if text:
            params["text"] = text

        response = resend.Emails.send(params)
        print(f"[Resend] Email sent to {to} (ID: {response['id']})")
        return True
    except Exception as e:
        print(f"[Resend] Error sending email to {to}: {e}")
        return False


def _mock_send(to: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Mock email sender for local development without any API key."""
    print(f"\n{'='*60}")
    print(f"[MOCK EMAIL]")
    print(f"  To:      {to}")
    print(f"  Subject: {subject}")
    print(f"  Body:    {text or html}")
    print(f"{'='*60}\n")
    return True
