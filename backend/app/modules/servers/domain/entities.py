from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProfileData:

    name: str
    host: str
    port: int
    database_name: str
    username: str

    encrypted_password: str = field(repr=False)

    reader_username: str | None

    encrypted_reader_password: str | None = field(
        repr=False
    )


@dataclass(frozen=True)
class ServerProfile(ProfileData):

    id: int
    created_at: str
    updated_at: str

    def to_public_dict(self) -> dict:

        return {
            "id": self.id,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "database": self.database_name,
            "username": self.username,
            "readerUsername": self.reader_username,
            "readerConfigured": (
                self.reader_username is not None
                and self.encrypted_reader_password is not None
            ),
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }