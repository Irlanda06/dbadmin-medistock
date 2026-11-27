import re
from app.modules._shared.common import rows
# Redact statements that can contain passwords or connection strings.
def redact(query):
    if query and re.search(r'password|user\s+mapping|conninfo|connection\s+string|postgres(?:ql)?://|dblink|secret|token|create\s+subscription',query,re.I):return '[SQL sensible ocultado]'
    return query
class PostgresMonitoringGateway:
    def __init__(self,access):self.access=access
    def sessions(self,s,pid=None):
        with self.access.connection(s) as c:
            data=rows(c,"""SELECT pid,usename AS username,datname AS database,application_name AS "applicationName",host(client_addr) AS "clientAddress",state,wait_event_type AS "waitEventType",wait_event AS "waitEvent",backend_start AS "backendStart",query_start AS "queryStart",xact_start AS "transactionStart",EXTRACT(EPOCH FROM (clock_timestamp()-query_start))::float8 AS "queryDurationSeconds",EXTRACT(EPOCH FROM (clock_timestamp()-xact_start))::float8 AS "transactionDurationSeconds",query FROM pg_stat_activity WHERE backend_type='client backend' AND pid<>pg_backend_pid() AND (%s::int IS NULL OR pid=%s) ORDER BY pid""",(pid,pid))
        for r in data:r['query']=redact(r['query'])
        return data
    def locks(self,s):
        with self.access.connection(s) as c:
            data=rows(c,"""SELECT blocked.pid AS "blockedPid",p.pid AS "blockingPid",blocked.usename AS "blockedUser",blocker.usename AS "blockingUser",blocked.datname AS database,blocked.wait_event AS "waitEvent",blocked.query AS "blockedQuery",blocker.query AS "blockingQuery",EXTRACT(EPOCH FROM (clock_timestamp()-blocked.query_start))::float8 AS "waitQuerySeconds" FROM pg_stat_activity blocked CROSS JOIN LATERAL unnest(pg_blocking_pids(blocked.pid)) AS p(pid) LEFT JOIN pg_stat_activity blocker ON blocker.pid=p.pid ORDER BY blocked.pid,p.pid""")
        for r in data:
            r['blockedQuery']=redact(r['blockedQuery']);r['blockingQuery']=redact(r['blockingQuery'])
        return data
