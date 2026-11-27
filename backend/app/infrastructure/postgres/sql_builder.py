from psycopg import sql

from app.core.exceptions import ValidationError

from app.core.validators import (
    validate_identifier
)


class PostgresSQLBuilder:

    @staticmethod
    def identifier(
        name: str
    ) -> sql.Identifier:

        validate_identifier(name)

        return sql.Identifier(
            name
        )

    @staticmethod
    def qualified_identifier(
        schema: str,
        name: str
    ) -> sql.Identifier:

        validate_identifier(schema)
        validate_identifier(name)

        return sql.Identifier(
            schema,
            name
        )

    @staticmethod
    def literal(
        value
    ) -> sql.Literal:

        return sql.Literal(
            value
        )

    @staticmethod
    def identifier_list(
        names: list[str]
    ) -> sql.Composed:

        if not names:

            raise ValidationError(
                "La lista de identificadores está vacía"
            )

        identifiers = [

            sql.Identifier(
                validate_identifier(name)
            )

            for name in names
        ]

        return sql.SQL(", ").join(
            identifiers
        )