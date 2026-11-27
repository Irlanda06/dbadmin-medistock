from pydantic import Field
from app.modules._shared.common import Confirmed,Input,Name
class ForeignServerRequest(Confirmed):
    name:Name
    remote_server_id:int=Field(alias='remoteServerId',ge=1)
class MappingRequest(Confirmed):
    server:Name
    remote_server_id:int=Field(alias='remoteServerId',ge=1)
    local_role:Name|None=Field(default=None,alias='localRole')
class ForeignTableRequest(Confirmed):
    server:Name
    remote_schema:Name=Field(default='medistock',alias='remoteSchema')
    remote_table:Name=Field(default='inventario',alias='remoteTable')
    local_schema:Name=Field(default='medistock',alias='localSchema')
    local_table:Name=Field(default='inventario_sur',alias='localTable')
class TestRequest(Input):
    schema_name:Name=Field(default='medistock',alias='schema')
    table:Name='inventario_sur'
class ViewRequest(Confirmed):
    schema_name:Name=Field(default='medistock',alias='schema')
    name:Name='inventario_global'
    local_schema:Name=Field(default='medistock',alias='localSchema')
    local_table:Name=Field(default='inventario',alias='localTable')
    remote_schema:Name=Field(default='medistock',alias='remoteSchema')
    remote_table:Name=Field(default='inventario_sur',alias='remoteTable')
