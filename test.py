import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        port=3306,
        user="root",
        password="",
        database="jamhawi_dev"
    )

    if conn.is_connected():
        print("✅ Connected successfully")
        print("Server version:", conn.get_server_info())

    conn.close()

except mysql.connector.Error as err:
    print("❌ Connection failed:")
    print(err)