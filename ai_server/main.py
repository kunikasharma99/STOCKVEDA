import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv() # This loads the .env file

mongo_uri = os.getenv("MONGO_URI") # This pulls the string
client = MongoClient(mongo_uri)

try:
    client.admin.command('ping')
    print("AI Server connected to MongoDB Atlas")
except Exception as e:
    print(f"Connection Error: {e}")