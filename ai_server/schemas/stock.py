from pydantic import BaseModel, Field

class StockAnalysisRequest(BaseModel):
    # Regex: ^[A-Z]{1,5}$ means "Start, then 1 to 5 uppercase letters, then End"
    ticker: str = Field(
        ..., 
        pattern=r"^[A-Z]{1,5}$", 
        description="The stock ticker symbol (e.g., AAPL, TSLA)",
        examples=["AAPL"]
    )

class StockAnalysisResponse(BaseModel):
    ticker: str
    verdict: str
    confidence: float
    technical_score: float
    sentiment_score: float
    reasoning: str


"""Explanation: Why we do this
The "..." (Ellipsis): This tells Pydantic that ticker is required. If the Node.js backend forgets to send it, FastAPI will automatically return a 422 Unprocessable Entity error.

The Pattern (Regex): This is your first line of defense. By forcing uppercase and a length limit (1-5), you prevent weird data from crashing your AI calculations later.

Response Model: Notice we also created a StockAnalysisResponse. This ensures that your Python Brain always returns the same structured JSON to Node.js, making the frontend easier to build."""  