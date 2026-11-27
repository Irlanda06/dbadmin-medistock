from pydantic import Field
from app.modules._shared.common import Confirmed,Name
class MaintenanceRequest(Confirmed):
    schema_name:Name=Field(alias='schema')
    table:Name
