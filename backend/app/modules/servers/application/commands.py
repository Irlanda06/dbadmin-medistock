from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProfileCommand:

    name: str
    host: str
    port: int
    database: str
    username: str

    password: str | None = field(
        default=None,
        repr=False
    )

    reader_username: str | None = None

    reader_password: str | None = field(
        default=None,
        repr=False
    )