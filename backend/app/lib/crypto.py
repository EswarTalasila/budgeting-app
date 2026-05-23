import os
from functools import lru_cache
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import TypeDecorator, Text

_ENC_PREFIX = "enc1:"


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY env var is required. Generate one with: "
            "python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )
    return Fernet(key.encode())


def encrypt(plain: str) -> str:
    if plain is None:
        return None
    token = _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")
    return f"{_ENC_PREFIX}{token}"


def decrypt(value: str) -> str:
    if value is None:
        return None
    if not value.startswith(_ENC_PREFIX):
        return value
    raw = value[len(_ENC_PREFIX):]
    try:
        return _fernet().decrypt(raw.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return value


class EncryptedString(TypeDecorator):
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.startswith(_ENC_PREFIX):
            return value
        return encrypt(value)

    def process_result_value(self, value, dialect):
        return decrypt(value) if value is not None else None
