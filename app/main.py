from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

from app.config_store import (
    delete_server,
    get_server_by_id,
    init_storage,
    list_history,
    load_servers,
    log_operation,
    upsert_server,
)
from app.pg_client import (
    list_relations,
    ping_server,
    preview_relation,
    run_readonly_query,
)

app = FastAPI(title="DBAdmin - PostgreSQL 18", version="0.2.0")


class ServerPayload(BaseModel):
    id: str = Field(..., min_length=1, max_length=40)
    name: str = Field(..., min_length=1, max_length=80)
    host: str = Field(..., min_length=1, max_length=120)
    port: int = Field(..., ge=1, le=65535)
    dbname: str = Field(..., min_length=1, max_length=80)
    user: str = Field(..., min_length=1, max_length=80)
    password: Optional[str] = None


class SqlQueryPayload(BaseModel):
    server_id: str
    sql: str
    max_rows: int = Field(default=200, ge=1, le=500)


@app.on_event("startup")
def on_startup() -> None:
    init_storage()


@app.get("/")
def index():
    return FileResponse("app/static/index.html")


@app.get("/api/servers")
def api_list_servers():
    return {"servers": load_servers(include_password=False)}


@app.post("/api/servers")
def api_save_server(payload: ServerPayload):
    saved = upsert_server(payload.model_dump())
    log_operation(
        operation_type="SERVIDOR",
        server_name=saved["name"],
        target_object=f"{saved['host']}:{saved['port']}/{saved['dbname']}",
        executor_user=saved["user"],
        status="Correcto",
        detail="Perfil de conexión registrado/actualizado.",
    )
    return {"server": saved}


@app.delete("/api/servers/{server_id}")
def api_delete_server(server_id: str):
    srv = get_server_by_id(server_id)
    if not srv or not delete_server(server_id):
        raise HTTPException(status_code=404, detail="Servidor no encontrado.")
    log_operation(
        operation_type="SERVIDOR",
        server_name=srv["name"],
        target_object=f"{srv['host']}:{srv['port']}/{srv['dbname']}",
        executor_user=srv["user"],
        status="Correcto",
        detail="Perfil de conexión eliminado.",
    )
    return {"deleted": True, "id": server_id}


@app.get("/api/servers/{server_id}/ping")
def api_ping_server(server_id: str, record_history: bool = False):
    srv = get_server_by_id(server_id)
    if not srv:
        raise HTTPException(status_code=404, detail="Servidor no encontrado.")
    result = ping_server(srv)
    if record_history:
        log_operation(
            operation_type="CONEXION",
            server_name=srv["name"],
            target_object=f"{srv['host']}:{srv['port']}/{srv['dbname']}",
            executor_user=srv["user"],
            status="Correcto" if result["online"] else "Error",
            detail=result["version"] or result["error"] or "Sin respuesta",
        )
    return result


@app.get("/api/servers/{server_id}/relations")
def api_list_relations(server_id: str):
    srv = get_server_by_id(server_id)
    if not srv:
        raise HTTPException(status_code=404, detail="Servidor no encontrado.")
    try:
        items = list_relations(srv)
        return {"relations": items}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/servers/{server_id}/preview")
def api_preview_relation(
    server_id: str,
    schema: str = Query(...),
    table: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
):
    srv = get_server_by_id(server_id)
    if not srv:
        raise HTTPException(status_code=404, detail="Servidor no encontrado.")
    try:
        data = preview_relation(srv, schema, table, limit)
        log_operation(
            operation_type="CONSULTA_SQL",
            server_name=srv["name"],
            target_object=f"{schema}.{table}",
            executor_user=srv["user"],
            status="Correcto",
            detail=f"Vista previa ({data['row_count']} filas).",
        )
        return data
    except Exception as exc:
        log_operation(
            operation_type="CONSULTA_SQL",
            server_name=srv["name"],
            target_object=f"{schema}.{table}",
            executor_user=srv["user"],
            status="Error",
            detail=str(exc),
        )
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/sql/readonly")
def api_run_readonly(payload: SqlQueryPayload):
    srv = get_server_by_id(payload.server_id)
    if not srv:
        raise HTTPException(status_code=404, detail="Servidor no encontrado.")
    try:
        data = run_readonly_query(srv, payload.sql, payload.max_rows)
        log_operation(
            operation_type="CONSULTA_SQL",
            server_name=srv["name"],
            target_object=srv["dbname"],
            executor_user=srv["user"],
            status="Correcto",
            detail=f"Consulta SELECT ejecutada ({data['row_count']} filas).",
        )
        return data
    except Exception as exc:
        log_operation(
            operation_type="CONSULTA_SQL",
            server_name=srv["name"],
            target_object=srv["dbname"],
            executor_user=srv["user"],
            status="Error",
            detail=str(exc),
        )
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/history")
def api_get_history(
    operation_type: Optional[str] = None,
    server_name: Optional[str] = None,
    limit: int = 200,
):
    return {
        "items": list_history(
            operation_type=operation_type or None,
            server_name=server_name or None,
            limit=limit,
        )
    }


    