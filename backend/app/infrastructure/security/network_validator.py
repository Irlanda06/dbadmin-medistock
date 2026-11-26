import ipaddress
import socket

from app.core.exceptions import ValidationError


class NetworkValidator:

    def __init__(
        self,
        allowed_networks: tuple[str, ...]
    ):

        self._networks = tuple(

            ipaddress.ip_network(
                network,
                strict=False
            )

            for network in allowed_networks
        )

        if not self._networks:

            raise ValueError(
                "Debe configurar al menos una red autorizada"
            )

    def resolve(self, host: str) -> str:

        if not host or not host.strip():

            raise ValidationError(
                "El host es obligatorio"
            )

        if "\x00" in host:

            raise ValidationError(
                "El host contiene caracteres inválidos"
            )

        try:

            addresses = socket.getaddrinfo(
                host,
                None,
                type=socket.SOCK_STREAM
            )

        except (socket.gaierror, UnicodeError):

            raise ValidationError(
                "No se pudo resolver el host"
            ) from None

        resolved_addresses = {

            address[4][0]

            for address in addresses
        }

        if not resolved_addresses:

            raise ValidationError(
                "El host no tiene direcciones disponibles"
            )

        for address in resolved_addresses:

            ip = ipaddress.ip_address(address)

            authorized = any(

                ip in network

                for network in self._networks
            )

            if not authorized:

                raise ValidationError(
                    "Host fuera de las redes autorizadas"
                )

        return sorted(resolved_addresses)[0]