from app.core.contracts import (
    PasswordEncryptor,
    HostValidator,
    ServerConnectionControl
)

from app.core.exceptions import (
    NotFoundError,
    ValidationError
)

from app.core.validators import (
    validate_identifier,
    validate_port,
    validate_required_text
)

from app.modules.servers.domain.contracts import (
    ServerRepository
)

from app.modules.servers.domain.entities import (
    ProfileData,
    ServerProfile
)

from app.modules.servers.application.commands import (
    ProfileCommand
)


class ProfileService:

    def __init__(
        self,
        repository: ServerRepository,
        password_encryptor: PasswordEncryptor,
        host_validator: HostValidator,
        connection_control: ServerConnectionControl
    ):

        self._repository = repository
        self._password_encryptor = password_encryptor
        self._host_validator = host_validator
        self._connection_control = connection_control

    def list_servers(self) -> list[ServerProfile]:

        return self._repository.find_all()

    def get_server(
        self,
        server_id: int
    ) -> ServerProfile:

        profile = self._repository.find_by_id(
            server_id
        )

        if profile is None:

            raise NotFoundError(
                "Servidor no encontrado"
            )

        return profile

    def _prepare_data(
        self,
        command: ProfileCommand,
        previous: ServerProfile | None = None
    ) -> ProfileData:

        name = validate_required_text(
            command.name,
            "name"
        )

        host = validate_required_text(
            command.host,
            "host"
        )

        self._host_validator.resolve(host)

        validate_port(command.port)

        validate_identifier(command.database)
        validate_identifier(command.username)

        # Contraseña administrativa

        if command.password:

            encrypted_password = (
                self._password_encryptor.encrypt(
                    command.password
                )
            )

        elif (
            previous is not None
            and previous.username == command.username
        ):

            encrypted_password = (
                previous.encrypted_password
            )

        else:

            raise ValidationError(
                "La contraseña administrativa es obligatoria"
            )

        # Credenciales de lectura

        reader_username = command.reader_username
        encrypted_reader_password = None

        if reader_username is not None:

            validate_identifier(reader_username)

            if reader_username == command.username:

                raise ValidationError(
                    "El usuario de lectura debe ser diferente "
                    "del usuario administrativo"
                )

            if command.reader_password:

                encrypted_reader_password = (
                    self._password_encryptor.encrypt(
                        command.reader_password
                    )
                )

            elif (
                previous is not None
                and previous.reader_username == reader_username
                and previous.encrypted_reader_password is not None
            ):

                encrypted_reader_password = (
                    previous.encrypted_reader_password
                )

            else:

                raise ValidationError(
                    "La contraseña del usuario de lectura "
                    "es obligatoria"
                )

        elif command.reader_password is not None:

            raise ValidationError(
                "Debes proporcionar el usuario de lectura"
            )

        return ProfileData(
            name=name,
            host=host,
            port=command.port,
            database_name=command.database,
            username=command.username,
            encrypted_password=encrypted_password,
            reader_username=reader_username,
            encrypted_reader_password=encrypted_reader_password
        )

    def create_server(
        self,
        command: ProfileCommand
    ) -> ServerProfile:

        data = self._prepare_data(command)

        return self._repository.create(data)

    def update_server(
        self,
        server_id: int,
        command: ProfileCommand
    ) -> ServerProfile:

        previous = self.get_server(server_id)

        data = self._prepare_data(
            command,
            previous
        )

        profile = self._repository.update(
            server_id,
            data
        )

        # Evitar reutilizar conexiones con datos anteriores.

        self._connection_control.disconnect(
            server_id
        )

        return profile

    def delete_server(
        self,
        server_id: int
    ) -> None:

        self.get_server(server_id)

        self._repository.delete(server_id)

        self._connection_control.disconnect(
            server_id
        )