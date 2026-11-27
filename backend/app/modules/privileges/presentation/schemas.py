from typing import Literal
from pydantic import Field
from app.modules._shared.common import Confirmed,Name
ObjectType=Literal['DATABASE','SCHEMA','TABLE','SEQUENCE']
class PrivilegeRequest(Confirmed):
    object_type:ObjectType=Field(alias='objectType')
    schema_name:Name|None=Field(default=None,alias='schema')
    object_name:Name|None=Field(default=None,alias='object')
    role:Name
    privilege:Literal['CONNECT','USAGE','SELECT','INSERT','UPDATE','DELETE']
