from fastapi import APIRouter, Depends
from app.core.responses import success
from app.modules._shared.common import features, ServerId, Limit, Offset
from .schemas import QueryRequest
router=APIRouter(prefix='/servers/{server_id}/databases/{database}',tags=['Explorer'])
@router.get('/schemas')
def schemas(server_id:ServerId,database:str,f=Depends(features)): return success(f.explorer.catalog(server_id,database,'schemas'))
@router.get('/tables')
def tables(server_id:ServerId,database:str,schema:str|None=None,f=Depends(features)): return success(f.explorer.catalog(server_id,database,'tables',schema))
@router.get('/views')
def views(server_id:ServerId,database:str,schema:str|None=None,f=Depends(features)): return success(f.explorer.catalog(server_id,database,'views',schema))
@router.get('/sequences')
def sequences(server_id:ServerId,database:str,schema:str|None=None,f=Depends(features)): return success(f.explorer.catalog(server_id,database,'sequences',schema))
@router.get('/catalogs')
def catalogs(server_id:ServerId,database:str,f=Depends(features)): return success(f.explorer.catalog(server_id,database,'catalogs'))
@router.get('/objects/{schema}/{object_name}/columns')
def columns(server_id:ServerId,database:str,schema:str,object_name:str,f=Depends(features)): return success(f.explorer.columns(server_id,database,schema,object_name))
@router.get('/objects/{schema}/{object_name}/data')
def data(server_id:ServerId,database:str,schema:str,object_name:str,limit:Limit=100,offset:Offset=0,f=Depends(features)): return success(f.explorer.data(server_id,database,schema,object_name,limit,offset))
@router.post('/query')
def query(server_id:ServerId,database:str,body:QueryRequest,f=Depends(features)): return success(f.explorer.query(server_id,database,body.sql,body.limit))
