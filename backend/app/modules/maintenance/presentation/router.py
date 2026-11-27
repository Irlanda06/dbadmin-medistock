from fastapi import APIRouter,Depends
from app.core.responses import success
from app.modules._shared.common import features,ServerId,Limit,Offset
from .schemas import MaintenanceRequest
router=APIRouter(prefix='/servers/{server_id}',tags=['Maintenance'])
@router.post('/databases/{database}/maintenance/analyze')
def analyze(server_id:ServerId,database:str,body:MaintenanceRequest,f=Depends(features)):return success(f.maintenance.execute(server_id,database,body,False))
@router.post('/databases/{database}/maintenance/vacuum')
def vacuum(server_id:ServerId,database:str,body:MaintenanceRequest,f=Depends(features)):return success(f.maintenance.execute(server_id,database,body,True))
@router.get('/databases/{database}/maintenance/statistics')
def statistics(server_id:ServerId,database:str,schema:str|None=None,table:str|None=None,f=Depends(features)):return success(f.maintenance.statistics(server_id,database,schema,table))
@router.get('/maintenance/history')
def history(server_id:ServerId,limit:Limit=50,offset:Offset=0,f=Depends(features)):return success(f.maintenance.history(server_id,limit,offset))
