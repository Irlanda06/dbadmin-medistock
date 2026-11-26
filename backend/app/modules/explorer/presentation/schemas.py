from pydantic import Field
from app.modules._shared.common import Input
class QueryRequest(Input):
    sql: str=Field(min_length=1,max_length=50000)
    limit: int=Field(default=1000,ge=1,le=1000)
