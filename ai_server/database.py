import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# 1. Load the .env file into the system environment
load_dotenv()

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    # 2. Access the URI from the environment
    mongo_uri = os.getenv("MONGO_URI")
    
    if not mongo_uri:
        raise ValueError("CRITICAL: MONGO_URI not found in .env file")

    db_instance.client = AsyncIOMotorClient(mongo_uri)
    # 3. Specify your database name
    db_instance.db = db_instance.client.stockVeda_Portfolio
    print("AI Server successfully linked to MongoDB Atlas")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("MongoDB connection closed safely")