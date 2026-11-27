import json
from pglast import parse_sql, parser
from pglast.stream import RawStream
from app.core.exceptions import ReadOnlyViolationError, ValidationError

# Conservative function allowlist for the free-form editor; ordinary SQL operators,
# joins, CTEs, CASE, casts and aggregates remain available.
SAFE = set('count sum avg min max abs round ceil ceiling floor trunc sqrt power mod lower upper length char_length concat concat_ws substring substr trim btrim ltrim rtrim replace split_part position strpos left right repeat reverse initcap md5 encode decode now current_date current_timestamp date_trunc date_part extract to_char to_date to_timestamp age greatest least coalesce nullif array_agg string_agg json_agg jsonb_agg json_build_object jsonb_build_object row_number rank dense_rank lag lead first_value last_value ntile percentile_cont percentile_disc stddev variance generate_series current_database current_schema version pg_typeof'.split())

SENSITIVE_RELATIONS = {'pg_authid','pg_shadow','pg_user_mapping','pg_user_mappings','pg_subscription','pg_stat_activity','pg_stat_replication','pg_file_settings','pg_hba_file_rules','pg_ident_file_mappings'}

def validate_select(statement):
    if not statement.strip() or len(statement)>50000:
        raise ValidationError('Consulta vacía o demasiado extensa')
    try:
        tree=json.loads(parser.parse_sql_json(statement))['stmts']
        parsed=parse_sql(statement)
    except Exception:
        raise ValidationError('Sintaxis SQL no válida') from None
    if len(tree)!=1 or 'SelectStmt' not in tree[0]['stmt']:
        raise ReadOnlyViolationError()
    def visit(node):
        if isinstance(node,list):
            for child in node: visit(child)
        elif isinstance(node,dict):
            for key,value in node.items():
                if key.endswith('Stmt') and key!='SelectStmt':
                    raise ReadOnlyViolationError()
                if key in {'IntoClause','LockingClause'}:
                    raise ReadOnlyViolationError()
                if key=='RangeVar' and value.get('relname','').lower() in SENSITIVE_RELATIONS:
                    raise ReadOnlyViolationError()
                if key=='FuncCall':
                    names=[x.get('String',{}).get('sval','') for x in value.get('funcname',[])]
                    if not names or names[-1] not in SAFE or (len(names)>1 and names[:-1]!=['pg_catalog']):
                        raise ReadOnlyViolationError()
                visit(value)
    visit(tree[0]['stmt'])
    return RawStream()(parsed[0].stmt)
