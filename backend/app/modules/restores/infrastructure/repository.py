import json
from app.core.exceptions import NotFoundError,ConflictError
class SQLiteRestoreRepository:
    def __init__(self,database): self.database=database
    def create(self,backup_id,server_id,operation_id,database):
        with self.database.connection() as c:
            return c.execute("INSERT INTO restores(backup_id,target_server_id,operation_id,target_database,status) VALUES(?,?,?,?,'QUEUED')",(backup_id,server_id,operation_id,database)).lastrowid
    def get(self,restore_id):
        with self.database.connection() as c:
            r=c.execute('SELECT * FROM restores WHERE id=?',(restore_id,)).fetchone()
            if r is None: raise NotFoundError('Restauración no encontrada')
            return dict(r)
    def list(self,server_id=None,status=None,limit=50,offset=0):
        where=' WHERE 1=1';p=[]
        if server_id is not None: where+=' AND target_server_id=?';p.append(server_id)
        if status is not None: where+=' AND status=?';p.append(status)
        with self.database.connection() as c:
            total=c.execute('SELECT COUNT(*) FROM restores'+where,p).fetchone()[0]
            items=[dict(r) for r in c.execute('SELECT * FROM restores'+where+' ORDER BY id DESC LIMIT ? OFFSET ?',(*p,limit,offset))]
        return {'items':items,'total':total,'limit':limit,'offset':offset,'hasMore':offset+len(items)<total}
    def status(self,restore_id,status,verification=None):
        allowed={'RUNNING':('QUEUED',),'SUCCEEDED':('RUNNING',),'FAILED':('QUEUED','RUNNING')}[status]
        placeholders=','.join('?' for _ in allowed)
        with self.database.connection() as c:
            cur=c.execute(f"UPDATE restores SET status=?,verification_json=?,finished_at=CASE WHEN ? IN ('SUCCEEDED','FAILED') THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=? AND status IN ({placeholders})",(status,json.dumps(verification,ensure_ascii=False) if verification is not None else None,status,restore_id,*allowed))
            if cur.rowcount!=1: raise ConflictError('Estado de restauración no válido')
