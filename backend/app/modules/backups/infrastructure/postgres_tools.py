import os, re, shutil, subprocess
from pathlib import Path
from psycopg.conninfo import make_conninfo
from app.core.exceptions import AppError, ValidationError, DatabaseOperationError, QueryTimeoutError

class PostgresTools:
    def __init__(self, factory): self.factory=factory
    def executable(self, name):
        path=shutil.which(name)
        if not path and os.name=='nt':
            candidate=Path(os.environ.get('ProgramFiles',r'C:\Program Files'))/'PostgreSQL'/'18'/'bin'/(name+'.exe')
            if candidate.is_file(): path=str(candidate)
        if not path: raise ValidationError(f'Instala el cliente PostgreSQL 18: {name} no encontrado')
        try:
            result=subprocess.run([path,'--version'],capture_output=True,text=True,timeout=10,check=True)
        except (OSError,subprocess.SubprocessError): raise ValidationError(f'No se pudo verificar {name}') from None
        if not re.search(r'\b18(?:\.|\b)',result.stdout): raise ValidationError(f'Se requiere {name} de PostgreSQL 18')
        return path
    def run(self,name,args,credentials=None,timeout=1800):
        executable=self.executable(name)
        env={k:v for k,v in os.environ.items() if not k.upper().startswith('PG')}
        command=[executable]
        if credentials is not None:
            params=self.factory.build_parameters(credentials)
            dsn=make_conninfo(host=params['host'],hostaddr=params['hostaddr'],port=params['port'],dbname=params['dbname'],user=params['user'],connect_timeout=params['connect_timeout'])
            command.extend(['--no-password','--dbname='+dsn])
            env['PGPASSWORD']=credentials.password
            env['PGCLIENTENCODING']='UTF8'
        command.extend(args)
        try:
            result=subprocess.run(command,env=env,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,timeout=timeout,check=False)
        except subprocess.TimeoutExpired: raise QueryTimeoutError() from None
        except OSError: raise DatabaseOperationError(f'No se pudo ejecutar {name}') from None
        if result.returncode:
            # Never return stderr: PostgreSQL utilities can echo sensitive SQL.
            raise DatabaseOperationError(f'{name} terminó con código {result.returncode}')
