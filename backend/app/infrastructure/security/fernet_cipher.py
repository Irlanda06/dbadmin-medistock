from cryptography.fernet import (
    Fernet,
    InvalidToken
)

from app.core.exceptions import StorageError


class FernetCipher:

    def __init__(
        self,
        encryption_key: str
    ):

        self._cipher = Fernet(
            encryption_key.encode("utf-8")
        )

    def encrypt(self, value: str) -> str:

        encrypted = self._cipher.encrypt(
            value.encode("utf-8")
        )

        return encrypted.decode("utf-8")

    def decrypt(self, value: str) -> str:

        try:

            decrypted = self._cipher.decrypt(
                value.encode("utf-8")
            )

            return decrypted.decode("utf-8")

        except (InvalidToken, UnicodeError):

            raise StorageError() from None