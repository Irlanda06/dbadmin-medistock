from psycopg import sql
from app.modules._shared.common import ident,rows
from app.core.exceptions import NotFoundError,ValidationError
from datetime import datetime,timezone
class PostgresMaintenanceGateway:
    def __init__(self,access):self.access=access
    def statistics(self,s,db,schema=None,table=None):
        with self.access.connection(s,db) as c:
            return rows(c,"""SELECT schemaname AS schema,relname AS name,n_live_tup AS "estimatedLiveRows",n_dead_tup AS "estimatedDeadRows",last_vacuum AS "lastVacuum",last_autovacuum AS "lastAutovacuum",last_analyze AS "lastAnalyze",last_autoanalyze AS "lastAutoanalyze",vacuum_count AS "vacuumCount",analyze_count AS "analyzeCount" FROM pg_stat_user_tables WHERE (%s::text IS NULL OR schemaname=%s) AND (%s::text IS NULL OR relname=%s) ORDER BY 1,2""",(schema,schema,table,table))
    def execute(self,s,db,schema,table,vacuum):
        if schema.startswith('pg_') or schema=='information_schema':raise ValidationError('Selecciona una tabla de usuario')
        with self.access.connection(s,db,autocommit=True,limited=False) as c:
            if not c.execute("SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=%s AND t.relname=%s AND t.relkind IN ('r','p','m')",(schema,table)).fetchone():raise NotFoundError('Tabla no encontrada')
            c.execute("SET statement_timeout = '10min'")
            c.execute(sql.SQL('VACUUM (ANALYZE) {}' if vacuum else 'ANALYZE {}').format(ident(schema,table)))
        return {'schema':schema,'table':table,'operation':'VACUUM' if vacuum else 'ANALYZE','completedAt':datetime.now(timezone.utc).isoformat(),'description':'Recupera espacio reutilizable y actualiza estadísticas' if vacuum else 'Actualiza estadísticas del optimizador','statistics':self.statistics(s,db,schema,table)}

    def history(self,s,limit,offset):
        from app.modules.history.infrastructure.repository import SQLiteHistoryRepository
        with self.access.sqlite.connection() as c:
            where="WHERE server_id=? AND operation_type IN ('ANALYZE','VACUUM')"
            total=c.execute('SELECT count(*) FROM operation_history '+where,(s,)).fetchone()[0]
            result=[]
            for r in c.execute('SELECT * FROM operation_history '+where+' ORDER BY id DESC LIMIT ? OFFSET ?',(s,limit,offset)):
                result.append(SQLiteHistoryRepository._map_row(r).to_public_dict())
        return {'items':result,'total':total,'limit':limit,'offset':offset,'hasMore':offset+len(result)<total}
