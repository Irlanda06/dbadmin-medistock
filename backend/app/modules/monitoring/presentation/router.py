from fastapi import APIRouter,Depends
from app.core.responses import success
from app.modules._shared.common import features,ServerId,ObjectId
router=APIRouter(prefix='/servers/{server_id}',tags=['Monitoring'])
@router.get('/sessions')
def sessions(server_id:ServerId,f=Depends(features)):return success(f.monitoring.sessions(server_id))
@router.get('/sessions/{pid}')
def session(server_id:ServerId,pid:ObjectId,f=Depends(features)):return success(f.monitoring.session(server_id,pid))
@router.get('/locks')
def locks(server_id:ServerId,f=Depends(features)):return success(f.monitoring.locks(server_id))
