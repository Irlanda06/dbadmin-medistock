CREATE TABLE IF NOT EXISTS connection_profiles (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    host TEXT NOT NULL,

    port INTEGER NOT NULL
        CHECK (port BETWEEN 1 AND 65535),

    database_name TEXT NOT NULL,
    username TEXT NOT NULL,

    encrypted_password TEXT NOT NULL,

    reader_username TEXT,
    encrypted_reader_password TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    deleted_at TEXT,

    CHECK (
        (
            reader_username IS NULL
            AND encrypted_reader_password IS NULL
        )
        OR
        (
            reader_username IS NOT NULL
            AND encrypted_reader_password IS NOT NULL
            AND reader_username <> username
        )
    )
);


CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_name
ON connection_profiles(name COLLATE NOCASE)
WHERE deleted_at IS NULL;


CREATE TABLE IF NOT EXISTS operation_history (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    server_id INTEGER,

    server_name TEXT,
    database_name TEXT,

    operation_type TEXT NOT NULL,
    target_object TEXT,

    executed_by TEXT NOT NULL,

    status TEXT NOT NULL CHECK (
        status IN (
            'QUEUED',
            'RUNNING',
            'SUCCEEDED',
            'FAILED'
        )
    ),

    error_code TEXT,
    error_message TEXT,

    result_json TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    started_at TEXT,
    finished_at TEXT,

    FOREIGN KEY (server_id)
        REFERENCES connection_profiles(id)
);


CREATE TABLE IF NOT EXISTS backups (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    server_id INTEGER NOT NULL,
    operation_id INTEGER NOT NULL UNIQUE,

    database_name TEXT NOT NULL,

    schema_name TEXT,
    table_name TEXT,

    format TEXT NOT NULL CHECK (
        format IN (
            'CUSTOM',
            'PLAIN'
        )
    ),

    scope TEXT NOT NULL CHECK (
        scope IN (
            'DATABASE',
            'SCHEMA',
            'TABLE'
        )
    ),

    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,

    size_bytes INTEGER NOT NULL DEFAULT 0
        CHECK (size_bytes >= 0),

    status TEXT NOT NULL CHECK (
        status IN (
            'QUEUED',
            'RUNNING',
            'SUCCEEDED',
            'FAILED'
        )
    ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    finished_at TEXT,

    FOREIGN KEY (server_id)
        REFERENCES connection_profiles(id),

    FOREIGN KEY (operation_id)
        REFERENCES operation_history(id),

    CHECK (
        (
            scope = 'DATABASE'
            AND schema_name IS NULL
            AND table_name IS NULL
        )
        OR
        (
            scope = 'SCHEMA'
            AND schema_name IS NOT NULL
            AND table_name IS NULL
        )
        OR
        (
            scope = 'TABLE'
            AND schema_name IS NOT NULL
            AND table_name IS NOT NULL
        )
    )
);


CREATE TABLE IF NOT EXISTS restores (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    backup_id INTEGER NOT NULL,

    target_server_id INTEGER NOT NULL,

    operation_id INTEGER NOT NULL UNIQUE,

    target_database TEXT NOT NULL,

    verification_json TEXT,

    status TEXT NOT NULL CHECK (
        status IN (
            'QUEUED',
            'RUNNING',
            'SUCCEEDED',
            'FAILED'
        )
    ),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    finished_at TEXT,

    FOREIGN KEY (backup_id)
        REFERENCES backups(id),

    FOREIGN KEY (target_server_id)
        REFERENCES connection_profiles(id),

    FOREIGN KEY (operation_id)
        REFERENCES operation_history(id)
);


CREATE INDEX IF NOT EXISTS idx_history_server
ON operation_history(server_id);


CREATE INDEX IF NOT EXISTS idx_history_type
ON operation_history(operation_type);


CREATE INDEX IF NOT EXISTS idx_history_status
ON operation_history(status);


CREATE INDEX IF NOT EXISTS idx_history_created_at
ON operation_history(created_at);


CREATE INDEX IF NOT EXISTS idx_backups_server
ON backups(server_id);


CREATE INDEX IF NOT EXISTS idx_backups_status
ON backups(status);


CREATE INDEX IF NOT EXISTS idx_restores_backup
ON restores(backup_id);


CREATE INDEX IF NOT EXISTS idx_restores_server
ON restores(target_server_id);