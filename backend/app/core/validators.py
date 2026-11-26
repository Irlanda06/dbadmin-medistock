from app.core.exceptions import ValidationError


def validate_identifier(value: str) -> str:

    if not value or not value.strip():

        raise ValidationError(
            "El identificador no puede estar vacío"
        )

    if "\x00" in value:

        raise ValidationError(
            "El identificador contiene caracteres inválidos"
        )

    if len(value.encode("utf-8")) > 63:

        raise ValidationError(
            "El identificador supera los 63 bytes permitidos"
        )

    return value


def validate_port(port: int) -> int:

    if not 1 <= port <= 65535:

        raise ValidationError(
            "El puerto debe estar entre 1 y 65535"
        )

    return port


def validate_required_text(
    value: str,
    field_name: str
) -> str:

    if not value or not value.strip():

        raise ValidationError(
            f"El campo {field_name} es obligatorio"
        )

    return value.strip()