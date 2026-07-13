import mysql.connector
from mysql.connector import errorcode


def create_database(config):
    """Create the database if it doesn't exist."""
    try:
        temp_config = config.copy()
        db_name = temp_config.pop("database")

        conn = mysql.connector.connect(**temp_config)
        cursor = conn.cursor()

        cursor.execute(f"CREATE DATABASE `{db_name}`")
        print(f"✅ Database '{db_name}' created successfully.")

        cursor.close()
        conn.close()

    except mysql.connector.Error as err:
        print(f"❌ Failed to create database: {err}")


def connect_database(config):
    """Attempt to connect to the database."""
    try:
        conn = mysql.connector.connect(**config)

        print("✅ Connected successfully")
        print("Server version:", conn.get_server_info())

        return conn

    except mysql.connector.Error as err:

        if err.errno == errorcode.ER_BAD_DB_ERROR:
            print(f"\n❌ Database '{config['database']}' does not exist.")

            while True:
                choice = input(
                    "\nWould you like to:\n"
                    "1. Create the database\n"
                    "2. Quit\n"
                    "Choice: "
                )

                if choice == "1":
                    create_database(config)
                    return connect_database(config)

                elif choice == "2":
                    print("Goodbye.")
                    return None

                else:
                    print("Invalid choice.")

        elif err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("❌ Invalid username or password.")

        elif err.errno == errorcode.CR_CONN_HOST_ERROR:
            print("❌ Cannot reach MySQL server.")

        else:
            print(f"❌ Unexpected error:\n{err}")

        return None


config = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "my_database"
}

connection = connect_database(config)

if connection:
    # Your application starts here
    connection.close()