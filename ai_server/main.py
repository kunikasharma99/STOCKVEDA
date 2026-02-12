import os
from dotenv import load_dotenv
from pymongo import MongoClient
from fastapi import FastAPI
from pydantic import BaseModel

# 1. Load Environment & Setup FastAPI
load_dotenv() # This loads the .env file
app = FastAPI()

# 2. MongoDB Connection
mongo_uri = os.getenv("MONGO_URI") # This pulls the string
client = MongoClient(mongo_uri)

# Test connection once at startup
try:
    client.admin.command('ping')
    print("AI Server connected to MongoDB Atlas")
except Exception as e:
    print(f"Connection Error: {e}")

# 3. Request Schema (What Node.js will send)
class AnalysisRequest(BaseModel):
    ticker: str

# 4. Endpoints
@app.get("/health")
def health():
    return {"status": "online", "database": "connected"}

@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    # Dummy logic for Monday; Llama 3 goes here on Wednesday!
    return {
        "ticker": request.ticker.upper(),
        "recommendation": "STABLE",
        "analysis": "Python Brain is successfully receiving data from Node.js."
    }