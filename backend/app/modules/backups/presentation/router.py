from fastapi import APIRouter, Depends, BackgroundTasks, Query
from fastapi.responses import FileResponse
from typing import Annotated,Literal
from app.core.responses import success
from app.modules._shared.common import features,ObjectId,Limit,Offset
from .schemas import BackupRequest
router=APIRouter(prefix='/backups',tags=['Backups'])
@router.post('',status_code=202)
def create(body:BackupRequest,tasks:BackgroundTasks,f=Depends(features)):
    item=f.backups.enqueue(body);tasks.add_task(f.backups.run,item['id']);return success(item)
@router.get('')
def list_backups(server_id:Annotated[int|None,Query(alias='serverId',ge=1)]=None,status:Literal['QUEUED','RUNNING','SUCCEEDED','FAILED']|None=None,limit:Limit=50,offset:Offset=0,f=Depends(features)): return success(f.backups.list(server_id,status,limit,offset))
@router.get('/{backup_id}')
def get(backup_id:ObjectId,f=Depends(features)): return success(f.backups.get(backup_id))
@router.get('/{backup_id}/download')
def download(backup_id:ObjectId,f=Depends(features)):
    path=f.backups.path(backup_id);return FileResponse(path,filename=path.name,media_type='application/octet-stream')
