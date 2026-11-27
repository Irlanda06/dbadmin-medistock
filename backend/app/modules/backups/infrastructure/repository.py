from app.core.exceptions import NotFoundError, ConflictError
class SQLiteBackupRepository:
    def __init__(self,database): self.database=database
    def create(self,v):
        with self.database.connection() as c:
            return c.execute("""INSERT INTO backups(server_id,operation_id,database_name,schema_name,table_name,format,scope,file_name,file_path,status) VALUES(?,?,?,?,?,?,?,?,?,'QUEUED')""",tuple(v[k] for k in ('server_id','operation_id','database_name','schema_name','table_name','format','scope','file_name','file_path'))).lastrowid
    def get(self,backup_id):
        with self.database.connection() as c:
            row=c.execute('SELECT * FROM backups WHERE id=?',(backup_id,)).fetchone()
            if row is None: raise NotFoundError('Respaldo no encontrado')
            return dict(row)
    def list(self,server_id=None,status=None,limit=50,offset=0):
        where=' WHERE 1=1'; params=[]
        if server_id is not None: where+=' AND server_id=?';params.append(server_id)
        if status is not None: where+=' AND status=?';params.append(status)
        with self.database.connection() as c:
            total=c.execute('SELECT COUNT(*) FROM backups'+where,params).fetchone()[0]
            items=[dict(r) for r in c.execute('SELECT * FROM backups'+where+' ORDER BY id DESC LIMIT ? OFFSET ?',(*params,limit,offset))]
        return {'items':items,'total':total,'limit':limit,'offset':offset,'hasMore':offset+len(items)<total}
    def status(self,backup_id,status,size=0):
        allowed={'RUNNING':('QUEUED',),'SUCCEEDED':('RUNNING',),'FAILED':('QUEUED','RUNNING')}[status]
        placeholders=','.join('?' for _ in allowed)
        with self.database.connection() as c:
            cur=c.execute(f"UPDATE backups SET status=?,size_bytes=?,finished_at=CASE WHEN ? IN ('SUCCEEDED','FAILED') THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=? AND status IN ({placeholders})",(status,size,status,backup_id,*allowed))
            if cur.rowcount!=1: raise ConflictError('Estado de respaldo no válido')
