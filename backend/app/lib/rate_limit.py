import os
from slowapi import Limiter
from slowapi.util import get_remote_address

_TESTING = os.getenv("TESTING", "").lower() == "true"

limiter = Limiter(
    key_func=get_remote_address,
    enabled=not _TESTING,
    headers_enabled=True,
)
