"""Shared safe trace identifier validation without importing auth dependencies."""

import re


def safe_request_id(value: str | None) -> str | None:
    """Filter unvalidated trace headers before reflecting them into responses.

    Args:
        value: Optional untrusted header; valid IDs have 3..128 ASCII characters.
    Returns:
        Original ID if alphanumeric followed by alphanumeric/dot/underscore/colon/dash;
        otherwise None. No side effects or normalization of operation identities.
    Raises:
        None.
    """
    if value is not None and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{2,127}", value):
        return value
    return None
