
from fastapi import FastAPI, HTTPException, Request, Body, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pickle
import re
import numpy as np
from scipy.sparse import hstack
import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import logging

from pydantic import BaseModel


from typing import List


class CommentBatch(BaseModel):
    comments: List[str]


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
)
logger = logging.getLogger("comment-analyzer-api")


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SENTIMENT_MODEL_DIR = os.path.join(
    BASE_DIR, "results", "distilbert")
ID2LABEL = {0: "negative", 1: "neutral", 2: "positive"}

tokenizer = None
sentiment_model = None

try:
    tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL_DIR)
    sentiment_model = AutoModelForSequenceClassification.from_pretrained(
        SENTIMENT_MODEL_DIR)
    sentiment_model.eval()
    logger.info("Sentiment model loaded successfully from %s", SENTIMENT_MODEL_DIR)
except Exception as e:
    # Safe fallback mode: API still works with heuristic aggregation until real model is available.
    logger.exception("Failed to load sentiment model. Falling back to stub inference. Error: %s", e)

# spam models
spam_model = pickle.load(
    open(os.path.join(BASE_DIR, "models/spam_model.pkl"), "rb"))
spam_vectorizer = pickle.load(
    open(os.path.join(BASE_DIR, "models/spam_vectorizer.pkl"), "rb"))

# functions for preprocssing the data


def preprocess_sentiment(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+', ' URL ', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    return text


def preprocess_spam(text):
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+', ' URL ', text)
    text = re.sub(r'(.)\1+', r'\1\1', text)
    return text


def extract_spam_features(text):
    text = str(text)
    return np.array([[
        int(bool(re.search(r'http\S+|www\S+', text))),
        int(bool(re.search(r'\d', text))),
        text.count('!'),
        len(text),
        int(text.isupper())
    ]])


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing. In production, use your explicit extension origin.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.middleware("http")
async def basic_request_logger(request: Request, call_next):
    logger.info("request method=%s path=%s", request.method, request.url.path)
    return await call_next(request)


def analyze_sentiment_batch(comments: List[str], chunk_size: int = 8):
    """
    Batch-safe inference helper.
    - Accepts up to 1000 comments per API request (validated in route).
    - Internally processes in chunks to avoid very large single forward passes.
    Returns either aggregated counts dict OR list of labels.
    """
    if not comments:
        return {"positive": 0, "negative": 0, "neutral": 0}

    if tokenizer is None or sentiment_model is None:
        # Safe fallback stub: heuristic keyword matching so endpoint stays operational.
        positive_keywords = {"love", "great", "awesome", "good", "nice", "best"}
        negative_keywords = {"bad", "worst", "hate", "awful", "terrible", "poor"}
        pos, neg, neu = 0, 0, 0

        for text in comments:
            lower_text = str(text).lower()
            has_pos = any(k in lower_text for k in positive_keywords)
            has_neg = any(k in lower_text for k in negative_keywords)
            if has_pos and not has_neg:
                pos += 1
            elif has_neg and not has_pos:
                neg += 1
            else:
                neu += 1

        return {"positive": pos, "negative": neg, "neutral": neu}

    labels: List[str] = []
    for start in range(0, len(comments), chunk_size):
        chunk = comments[start:start + chunk_size]
        clean_comments = [preprocess_sentiment(t) for t in chunk]

        inputs = tokenizer(
            clean_comments,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128
        )

        with torch.no_grad():
            outputs = sentiment_model(**inputs)
            preds = torch.argmax(outputs.logits, dim=1).tolist()

        labels.extend(ID2LABEL.get(int(p), f"label_{int(p)}") for p in preds)

    return labels


def aggregate_pos_neg(result) -> dict:
    if isinstance(result, dict):
        return {
            "positive": int(result.get("positive", 0)),
            "negative": int(result.get("negative", 0)),
            "neutral": int(result.get("neutral", 0)),
        }

    if isinstance(result, list):
        pos, neg, neu = 0, 0, 0
        for label in result:
            label_text = str(label).lower()
            if "pos" in label_text:
                pos += 1
            elif "neg" in label_text:
                neg += 1
            else:
                neu += 1
        return {"positive": pos, "negative": neg, "neutral": neu}

    raise ValueError("Unsupported inference return type. Expected dict or list.")


@app.post("/analyze_sentiment")
def analyze_sentiment(data: dict = Body(...)):
    try:
        if not isinstance(data, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid payload. Expected JSON object with key 'comments'."
            )

        comments = data.get("comments")

        if comments is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required field: 'comments'."
            )

        if not isinstance(comments, list):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="'comments' must be an array of strings."
            )

        if len(comments) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="'comments' cannot be empty."
            )

        if len(comments) > 1000:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="'comments' supports at most 1000 items per request."
            )

        if any(not isinstance(item, str) for item in comments):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="All items in 'comments' must be strings."
            )

        logger.info(
            "request method=POST path=/analyze_sentiment comment_count=%s",
            len(comments)
        )

        raw_result = analyze_sentiment_batch(comments)
        return aggregate_pos_neg(raw_result)

    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.exception("Unhandled server error in /analyze_sentiment: %s", e)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Internal server error while analyzing sentiment."}
        )


@app.post("/analyze_spam")
def analyze_spam(data: CommentBatch):
    try:
        comments = data.comments
        clean_spam = [preprocess_spam(t) for t in comments]

        X_text = spam_vectorizer.transform(clean_spam)
        X_extra = np.array([extract_spam_features(t)[0] for t in comments])
        X_spam = hstack([X_text, X_extra])

        spam_preds = spam_model.predict(X_spam)

        results = []

        #  counters
        spam_count, not_spam_count = 0, 0

        for i, text in enumerate(comments):
            if spam_preds[i] == 1:
                
                spam_count += 1
            else:
            
                not_spam_count += 1

           

        return {
            "counts": {
                "spam": spam_count,
                "not_spam": not_spam_count
            },
            
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Spam error: {str(e)}")

