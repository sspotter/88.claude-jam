"""Interactive MySQL database manager.

Install the dependency first:
    pip install mysql-connector-python

The program creates ``config.json`` next to this file on its first run.  Keep
passwords out of that file where possible: DB_PASSWORD takes precedence.
"""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from getpass import getpass
from pathlib import Path
from typing import Any

try:
    import mysql.connector
    from mysql.connector import Error, errorcode
except ImportError:  # Allows a helpful message rather than an opaque traceback.
    mysql = None  # type: ignore[assignment]
    Error = Exception
    errorcode = None  # type: ignore[assignment]


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
LOG_PATH = BASE_DIR / "database_manager.log"
IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)


@dataclass
class DatabaseConfig:
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = ""
    database: str = "inventory"
    connection_timeout: int = 5

    def connection_options(self, include_database: bool = True) -> dict[str, Any]:
        options = asdict(self)
        if not include_database:
            options.pop("database")
        options["password"] = os.getenv("DB_PASSWORD", self.password)
        options["autocommit"] = False
        return options


def notice(message: str) -> None:
    print(f"\n✓ {message}")


def warning(message: str) -> None:
    print(f"\n! {message}")


def fail(message: str) -> None:
    print(f"\n✗ {message}")
    logging.error(message)


def load_config() -> DatabaseConfig:
    if not CONFIG_PATH.exists():
        config = DatabaseConfig()
        save_config(config)
        notice(f"Created {CONFIG_PATH.name}. Review its settings before connecting.")
        return config

    try:
        values = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        values["password"] = os.getenv("DB_PASSWORD", values.get("password", ""))
        return DatabaseConfig(**values)
    except (OSError, json.JSONDecodeError, TypeError) as exc:
        raise ValueError(f"Unable to read {CONFIG_PATH.name}: {exc}") from exc


def save_config(config: DatabaseConfig) -> None:
    values = asdict(config)
    values["password"] = ""  # Do not persist a password entered during a session.
    CONFIG_PATH.write_text(json.dumps(values, indent=2) + "\n", encoding="utf-8")


def validate_config(config: DatabaseConfig) -> list[str]:
    errors: list[str] = []
    if not config.host.strip():
        errors.append("Host cannot be empty.")
    if not config.user.strip():
        errors.append("User cannot be empty.")
    if not IDENTIFIER.fullmatch(config.database):
        errors.append("Database name must contain only letters, numbers, and underscores.")
    if not 1 <= config.port <= 65535:
        errors.append("Port must be between 1 and 65535.")
    return errors


def edit_settings(config: DatabaseConfig) -> DatabaseConfig:
    print("\nLeave a field blank to keep its current value.")
    for field, label in (("host", "Host"), ("port", "Port"), ("user", "User"), ("database", "Database")):
        value = input(f"{label} [{getattr(config, field)}]: ").strip()
        if not value:
            continue
        if field == "port":
            try:
                config.port = int(value)
            except ValueError:
                warning("Port was not changed; it must be a number.")
        else:
            setattr(config, field, value)

    if input("Change password for this session? (y/N): ").strip().lower() == "y":
        config.password = getpass("Password: ")
    errors = validate_config(config)
    if errors:
        for message in errors:
            fail(message)
    else:
        save_config(config)
        notice("Settings saved (the password was not saved).")
    return config


def connect(config: DatabaseConfig):
    if mysql is None:
        fail("Missing dependency. Run: pip install mysql-connector-python")
        return None
    errors = validate_config(config)
    if errors:
        for message in errors:
            fail(message)
        return None
    try:
        connection = mysql.connector.connect(**config.connection_options())
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        notice(f"Connected to MySQL {connection.get_server_info()}")
        logging.info("Connected to %s/%s as %s", config.host, config.database, config.user)
        return connection
    except Error as exc:
        logging.exception("Connection failed")
        handle_connection_error(exc, config)
        return None


def handle_connection_error(error: Exception, config: DatabaseConfig) -> None:
    errno = getattr(error, "errno", None)
    if errorcode and errno == errorcode.ER_BAD_DB_ERROR:
        fail(f"Database '{config.database}' does not exist.")
    elif errorcode and errno == errorcode.ER_ACCESS_DENIED_ERROR:
        fail("Access denied. Check your MySQL username and password.")
    elif errorcode and errno in {errorcode.CR_CONN_HOST_ERROR, errorcode.CR_CONNECTION_ERROR}:
        fail(f"Cannot reach MySQL at {config.host}:{config.port}.")
    else:
        fail(f"Connection failed: {error}")


def create_database_and_schema(config: DatabaseConfig, seed_data: bool) -> bool:
    if mysql is None:
        return False
    try:
        connection = mysql.connector.connect(**config.connection_options(include_database=False))
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{config.database}`")
        connection.commit()
        connection.close()
        connection = mysql.connector.connect(**config.connection_options())
        with connection.cursor() as cursor:
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS customers (
                    customer_id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )"""
            )
            if seed_data:
                cursor.executemany(
                    "INSERT IGNORE INTO customers (name, email) VALUES (%s, %s)",
                    [("Ada Lovelace", "ada@example.com"), ("Grace Hopper", "grace@example.com")],
                )
        connection.commit()
        connection.close()
        notice(f"Database '{config.database}' and its customers table are ready.")
        return True
    except Error as exc:
        fail(f"Setup failed: {exc}")
        return False


def show_status(connection, config: DatabaseConfig) -> None:
    print("\nStatus: Connected")
    print(f"Host: {config.host}:{config.port}\nDatabase: {config.database}\nUser: {config.user}")
    print(f"Server: MySQL {connection.get_server_info()}")


def list_tables(connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
    print("\nTables: " + (", ".join(tables) if tables else "(none)"))


def insert_customer(connection) -> None:
    name = input("Customer name: ").strip()
    email = input("Customer email: ").strip()
    if not name or not email:
        warning("Name and email are required.")
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO customers (name, email) VALUES (%s, %s)", (name, email))
        connection.commit()
        notice("Customer added.")
    except Error as exc:
        connection.rollback()
        fail(f"Could not add customer: {exc}")


def run_query(connection) -> None:
    query = input("SQL query: ").strip()
    if not query:
        return
    if not query.rstrip().endswith(";"):
        warning("Enter one complete query ending in a semicolon.")
        return
    if ";" in query.rstrip()[:-1]:
        warning("Only one query at a time is allowed.")
        return
    try:
        with connection.cursor() as cursor:
            cursor.execute(query[:-1])
            if cursor.with_rows:
                columns = [column[0] for column in cursor.description]
                print(" | ".join(columns))
                for row in cursor.fetchall():
                    print(" | ".join(map(str, row)))
            else:
                connection.commit()
                notice(f"Query completed; {cursor.rowcount} row(s) affected.")
    except Error as exc:
        connection.rollback()
        fail(f"Query failed: {exc}")


def backup_database(config: DatabaseConfig) -> None:
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output = backup_dir / f"{config.database}_{timestamp}.sql"
    command = ["mysqldump", "-h", config.host, "-P", str(config.port), "-u", config.user, f"--result-file={output}", config.database]
    password = os.getenv("DB_PASSWORD", config.password)
    environment = os.environ.copy()
    if password:
        environment["MYSQL_PWD"] = password
    try:
        subprocess.run(command, check=True, env=environment, capture_output=True, text=True)
        notice(f"Backup created: {output}")
    except FileNotFoundError:
        fail("mysqldump was not found. Install MySQL client tools or add them to PATH.")
    except subprocess.CalledProcessError as exc:
        fail(f"Backup failed: {exc.stderr.strip() or exc}")


def database_menu(connection, config: DatabaseConfig) -> None:
    while connection and connection.is_connected():
        print("\n======== Database Menu ========\n1. Connection status\n2. View tables\n3. Add customer\n4. Run SQL query\n5. Backup database\n6. Disconnect")
        choice = input("Choice: ").strip()
        if choice == "1":
            show_status(connection, config)
        elif choice == "2":
            list_tables(connection)
        elif choice == "3":
            insert_customer(connection)
        elif choice == "4":
            run_query(connection)
        elif choice == "5":
            backup_database(config)
        elif choice == "6":
            connection.close()
            notice("Disconnected.")
        else:
            warning("Invalid choice.")


def main() -> int:
    try:
        config = load_config()
    except ValueError as exc:
        fail(str(exc))
        return 1

    while True:
        print("\n======== Database Manager ========\n1. Connect\n2. Test connection\n3. Create database and tables\n4. Settings\n5. Quit")
        choice = input("Choice: ").strip()
        if choice in {"1", "2"}:
            connection = connect(config)
            if connection:
                if choice == "1":
                    database_menu(connection, config)
                else:
                    connection.close()
                    notice("Health check passed; connection closed.")
        elif choice == "3":
            seed = input("Populate sample customers? (y/N): ").strip().lower() == "y"
            create_database_and_schema(config, seed)
        elif choice == "4":
            config = edit_settings(config)
        elif choice == "5":
            print("Goodbye.")
            return 0
        else:
            warning("Invalid choice.")


if __name__ == "__main__":
    sys.exit(main())
