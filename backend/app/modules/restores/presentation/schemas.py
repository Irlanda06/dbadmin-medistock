from typing import Literal
from pydantic import Field
from app.modules._shared.common import Input,Name
class ValidateRestore(Input):
    backup_id:int=Field(alias='backupId',ge=1)
    target_server_id:int=Field(alias='targetServerId',ge=1)
    target_database:Name=Field(alias='targetDatabase')
class RestoreRequest(ValidateRestore):
    confirmed:Literal[True]
