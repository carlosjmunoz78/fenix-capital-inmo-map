"""Newsletter composition/rendering for Brevo weekly campaigns."""
from __future__ import annotations

from html import escape
from typing import Iterable

from cerebro.runtime.brevo_newsletter_contract import WeeklyNewsletterEdition


def render_html(edition: WeeklyNewsletterEdition, *, brand_name: str = "Fénix Capital") -> str:
    edition.validate()
    parts = [
        "<!doctype html>",
        '<html><body style="font-family:Arial,sans-serif;line-height:1.55;color:#231f20">',
        f"<h1>{escape(edition.subject)}</h1>",
        f"<p>{escape(edition.preview_text)}</p>",
    ]
    for block in edition.blocks:
        parts.append("<section>")
        parts.append(f"<h2>{escape(block.title)}</h2>")
        parts.append(f"<p>{escape(block.body)}</p>")
        if block.primary_url:
            parts.append(
                f'<p><a href="{escape(block.primary_url, quote=True)}">Ver recurso</a></p>'
            )
        parts.append("</section>")
    parts.append(
        f"<hr><p>{escape(brand_name)} · Has recibido este correo porque aceptaste comunicaciones de marketing. "
        "Puedes darte de baja desde el enlace de cancelación de Brevo.</p>"
    )
    parts.append("</body></html>")
    return "".join(parts)


def campaign_payload(
    edition: WeeklyNewsletterEdition,
    *,
    sender_email: str,
    sender_name: str,
    list_ids: Iterable[int],
    scheduled_at: str,
    reply_to: str,
) -> dict:
    edition.validate()
    ids = [int(x) for x in list_ids]
    if not ids:
        raise ValueError("at least one Brevo recipient list is required")
    if "@" not in sender_email or "@" not in reply_to:
        raise ValueError("valid sender/reply-to required")
    return {
        "name": edition.edition_id,
        "sender": {"name": sender_name, "email": sender_email},
        "subject": edition.subject,
        "previewText": edition.preview_text,
        "htmlContent": render_html(edition, brand_name=sender_name),
        "recipients": {"listIds": ids},
        "replyTo": reply_to,
        "scheduledAt": scheduled_at,
    }
