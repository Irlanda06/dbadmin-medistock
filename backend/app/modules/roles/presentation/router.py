from fastapi import APIRouter,Depends,Query
from typing import Literal
from app.core.responses import success
from app.modules._shared.common import features,ServerId
from .schemas import CreateRole,UpdateRole,ChangePassword,AddMember
router=APIRouter(prefix='/servers/{server_id}/roles',tags=['Roles'])
@router.get('')
def list_roles(server_id:ServerId,f=Depends(features)):return success(f.roles.list(server_id))
@router.post('',status_code=201)
def create(server_id:ServerId,body:CreateRole,f=Depends(features)):return success(f.roles.create(server_id,body))
@router.get('/{role}')
def get(server_id:ServerId,role:str,f=Depends(features)):return success(f.roles.get(server_id,role))
@router.patch('/{role}')
def update(server_id:ServerId,role:str,body:UpdateRole,f=Depends(features)):return success(f.roles.update(server_id,role,body))
@router.patch('/{role}/password')
def password(server_id:ServerId,role:str,body:ChangePassword,f=Depends(features)):return success(f.roles.password(server_id,role,body.password.get_secret_value()))
@router.get('/{role}/members')
def members(server_id:ServerId,role:str,f=Depends(features)):return success(f.roles.members(server_id,role))
@router.post('/{role}/members')
def add(server_id:ServerId,role:str,body:AddMember,f=Depends(features)):return success(f.roles.membership(server_id,role,body.member,True))
@router.delete('/{role}/members/{member}')
def remove(server_id:ServerId,role:str,member:str,confirmed:Literal['true']=Query(...),f=Depends(features)):return success(f.roles.membership(server_id,role,member,False))
