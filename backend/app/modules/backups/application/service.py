from pathlib import Path
from uuid import uuid4
import re, hashlib
from app.core.exceptions import ValidationError, ConflictError, DatabaseOperationError
from app.modules._shared.common import ident
from app.modules.backups.domain.contracts import BackupRepository

class BackupService:
    def __init__(self,repo:BackupRepository,access,tools): self.repo=repo;self.access=access;self.tools=tools
    def _root(self): return self.access.settings.backup_path.resolve()
    def _safe_path(self,path):
        p=Path(path).resolve()
        if not p.is_relative_to(self._root()): raise ValidationError('Ruta fuera de storage/backups')
        return p
    @staticmethod
    def public(row):
        fields={'server_id':'serverId','operation_id':'operationId','database_name':'database','schema_name':'schema','table_name':'table','file_name':'fileName','file_path':'filePath','size_bytes':'sizeBytes','created_at':'createdAt','finished_at':'finishedAt'}
        return {fields.get(k,k):v for k,v in row.items()}
    def get(self,backup_id): return self.public(self.repo.get(backup_id))
    def list(self,*args):
        page=self.repo.list(*args);page['items']=[self.public(x) for x in page['items']];return page
    def path(self,backup_id):
        row=self.repo.get(backup_id);p=self._safe_path(row['file_path'])
        if row['status']!='SUCCEEDED' or not p.is_file() or p.stat().st_size!=row['size_bytes'] or not row['size_bytes']:
            raise ConflictError('Respaldo no disponible o tamaño incorrecto')
        return p
    def enqueue(self,body):
        s=body.server_id; db=body.database; schema=body.schema_name; table=body.table_name
        if (body.scope=='DATABASE' and (schema or table)) or (body.scope=='SCHEMA' and (not schema or table)) or (body.scope=='TABLE' and (not schema or not table)):
            raise ValidationError('Alcance y esquema/tabla incompatibles')
        creds=self.access.credentials(s,db)
        self.tools.executable('pg_dump')
        with self.access.connection(s,db) as c:
            if schema and not c.execute('SELECT 1 FROM pg_namespace WHERE nspname=%s',(schema,)).fetchone(): raise ValidationError('Esquema inexistente')
            if table and not c.execute("SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=%s AND t.relname=%s AND t.relkind IN ('r','p','v','m','S','f')",(schema,table)).fetchone(): raise ValidationError('Tabla inexistente')
        ext='.dump' if body.format=='CUSTOM' else '.sql'
        name=body.file_name or 'backup'+ext
        if not re.fullmatch(r'[A-Za-z0-9_-][A-Za-z0-9_.-]{0,119}',name) or not name.lower().endswith(ext): raise ValidationError('Nombre o extensión de respaldo inválidos')
        directory=Path(body.directory or '.')
        if directory.is_absolute() or '..' in directory.parts or any(not re.fullmatch(r'[A-Za-z0-9_-]+',x) for x in directory.parts): raise ValidationError('Directorio relativo inválido')
        path=self._safe_path(self._root()/directory/uuid4().hex/name)
        path.parent.mkdir(parents=True,exist_ok=False)
        op=self.access.history.enqueue(self.access.context(s,db,'BACKUP',f'{schema}.{table}' if table else schema or db))
        try:
            bid=self.repo.create(dict(server_id=s,operation_id=op,database_name=db,schema_name=schema,table_name=table,format=body.format,scope=body.scope,file_name=name,file_path=str(path)))
        except Exception as exc:
            self.access.history.fail(op,exc);raise
        return self.get(bid)
    def run(self,bid):
        row=self.repo.get(bid);op=row['operation_id'];path=self._safe_path(row['file_path']);temp=path.with_name(path.name+'.partial')
        try:
            self.access.history.start(op);self.repo.status(bid,'RUNNING')
            creds=self.access.credentials(row['server_id'],row['database_name'])
            args=['--format='+('custom' if row['format']=='CUSTOM' else 'plain'),'--no-owner','--no-privileges','--file='+str(temp),'--strict-names']
            if row['scope']=='SCHEMA': args+=['--schema='+self._pattern(row['schema_name'])]
            if row['scope']=='TABLE': args+=['--table='+self._pattern(row['schema_name'])+'.'+self._pattern(row['table_name'])]
            self.tools.run('pg_dump',args,creds)
            if not temp.is_file() or temp.stat().st_size==0: raise DatabaseOperationError('Archivo de respaldo vacío')
            if row['format']=='CUSTOM': self.tools.run('pg_restore',['--list',str(temp)],timeout=60)
            with temp.open('rb') as f: digest=hashlib.file_digest(f,'sha256').hexdigest()
            temp.replace(path);size=path.stat().st_size
        except Exception as exc:
            temp.unlink(missing_ok=True)
            self.repo.status(bid,'FAILED');self.access.history.fail(op,exc);return
        self.repo.status(bid,'SUCCEEDED',size)
        self.access.history.succeed(op,{'backupId':bid,'sizeBytes':size,'sha256':digest,'format':row['format']})
    @staticmethod
    def _pattern(name):
        ident(name)
        return '"'+name.replace('"','""')+'"'
