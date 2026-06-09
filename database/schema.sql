PRAGMA foreign_keys = ON;

CREATE TABLE test_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_no TEXT UNIQUE,
    inspection_type TEXT,
    report_name TEXT,
    testing_agency TEXT,
    device_name TEXT,
    device_model TEXT,
    issue_date DATE,
    expiry_date TEXT,
    certificate_no TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_table TEXT NOT NULL,
    row_id INTEGER,
    file_name TEXT,
    modify_reason TEXT,
    modified_by TEXT,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    column_name TEXT,
    old_value TEXT,
    new_value TEXT
);
