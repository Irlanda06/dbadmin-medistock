from fastapi import APIRouter, Depends, BackgroundTasks, Query
from typing import Annotated,Literal
from app.core.responses import success
from app.modules._shared.common import features,ObjectId,Limit,Offset
from .schemas import ValidateRestore,RestoreRequest
router=APIRouter(prefix='/restores',tags=['Restores'])
@router.post('/validate')
def validate(body:ValidateRestore,f=Depends(features)): return success(f.restores.validate(body))
@router.post('',status_code=202)
def create(body:RestoreRequest,tasks:BackgroundTasks,f=Depends(features)):
    item=f.restores.enqueue(body);tasks.add_task(f.restores.run,item['id']);return success(item)
@router.get('')
def list_restores(server_id:Annotated[int|None,Query(alias='serverId',ge=1)]=None,status:Literal['QUEUED','RUNNING','SUCCEEDED','FAILED']|None=None,limit:Limit=50,offset:Offset=0,f=Depends(features)): return success(f.restores.list(server_id,status,limit,offset))
@router.get('/{restore_id}')
def get(restore_id:ObjectId,f=Depends(features)): return success(f.restores.get(restore_id))
@router.get('/{restore_id}/verification')
def verification(restore_id:ObjectId,f=Depends(features)): return success(f.restores.verification(restore_id))
