from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr
)

from app.core.contracts import (
    PostgresCredentials
)

from app.modules.servers.application.commands import (
    ProfileCommand
)


class ConnectionFields(BaseModel):

    model_config = ConfigDict(
        populate_by_name=True,
        extra="forbid"
    )

    host: str = Field(
        min_length=1,
        max_length=253
    )

    port: int = Field(
        default=5432,
        ge=1,
        le=65535
    )

    database: str = Field(
        min_length=1,
        max_length=63
    )

    username: str = Field(
        min_length=1,
        max_length=63
    )


class ConnectionTestRequest(ConnectionFields):

    password: SecretStr = Field(
        min_length=1
    )

    def to_credentials(self) -> PostgresCredentials:

        return PostgresCredentials(
            host=self.host,
            port=self.port,
            database=self.database,
            username=self.username,
            password=self.password.get_secret_value()
        )


class ServerProfileRequest(ConnectionFields):

    name: str = Field(
        min_length=1,
        max_length=100
    )

    password: SecretStr | None = Field(
        default=None,
        min_length=1
    )

    reader_username: str | None = Field(
        default=None,
        alias="readerUsername",
        min_length=1,
        max_length=63
    )

    reader_password: SecretStr | None = Field(
        default=None,
        alias="readerPassword",
        min_length=1
    )

    def to_command(self) -> ProfileCommand:

        return ProfileCommand(
            name=self.name,
            host=self.host,
            port=self.port,
            database=self.database,
            username=self.username,
            password=(
                self.password.get_secret_value()
                if self.password is not None
                else None
            ),
            reader_username=self.reader_username,
            reader_password=(
                self.reader_password.get_secret_value()
                if self.reader_password is not None
                else None
            )
        )


class ServerProfileResponse(BaseModel):

    id: int
    name: str
    host: str
    port: int
    database: str
    username: str
    readerUsername: str | None
    readerConfigured: bool
    createdAt: str
    updatedAt: str