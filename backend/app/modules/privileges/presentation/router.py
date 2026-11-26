from fastapi import APIRouter,Depends,Query
from app.core.responses import success
from app.modules._shared.common import features,ServerId
from .schemas import ObjectType,PrivilegeRequest
router=APIRouter(prefix='/servers/{server_id}/databases/{database}/privileges',tags=['Privileges'])
@router.get('')
def list_privileges(server_id:ServerId,database:str,object_type:ObjectType=Query(alias='objectType'),schema:str|None=None,obj:str|None=Query(default=None,alias='object'),role:str|None=None,f=Depends(features)):return success(f.privileges.list(server_id,database,object_type,schema,obj,role))
@router.get('/effective')
def effective(server_id:ServerId,database:str,role:str,object_type:ObjectType=Query(alias='objectType'),schema:str|None=None,obj:str|None=Query(default=None,alias='object'),f=Depends(features)):return success(f.privileges.effective(server_id,database,object_type,schema,obj,role))
@router.post('/grant')
def grant(server_id:ServerId,database:str,body:PrivilegeRequest,f=Depends(features)):return success(f.privileges.change(server_id,database,body,True))
@router.post('/revoke')
def revoke(server_id:ServerId,database:str,body:PrivilegeRequest,f=Depends(features)):return success(f.privileges.change(server_id,database,body,False))
