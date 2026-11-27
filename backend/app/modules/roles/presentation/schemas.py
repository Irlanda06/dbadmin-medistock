from pydantic import Field,SecretStr
from app.modules._shared.common import Confirmed,Name
class CreateRole(Confirmed):
    name:Name
    login:bool=True
    inherit:bool=True
    create_db:bool=Field(default=False,alias='createDb')
    create_role:bool=Field(default=False,alias='createRole')
    password:SecretStr|None=Field(default=None,min_length=1,max_length=256)
class UpdateRole(Confirmed):
    login:bool|None=None
    inherit:bool|None=None
    create_db:bool|None=Field(default=None,alias='createDb')
    create_role:bool|None=Field(default=None,alias='createRole')
class ChangePassword(Confirmed):
    password:SecretStr=Field(min_length=1,max_length=256)
class AddMember(Confirmed):
    member:Name
