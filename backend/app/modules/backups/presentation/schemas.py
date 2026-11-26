from typing import Literal
from pydantic import Field
from app.modules._shared.common import Confirmed,Name
class BackupRequest(Confirmed):
    server_id:int=Field(alias='serverId',ge=1)
    database:Name
    scope:Literal['DATABASE','SCHEMA','TABLE']='DATABASE'
    format:Literal['CUSTOM','PLAIN']='CUSTOM'
    schema_name:Name|None=Field(default=None,alias='schema')
    table_name:Name|None=Field(default=None,alias='table')
    file_name:str|None=Field(default=None,alias='fileName',max_length=120)
    directory:str|None=Field(default=None,max_length=200)
