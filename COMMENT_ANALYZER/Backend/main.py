
from fastapi import FastAPI, HTTPException
import pickle
import re
import numpy as np
from scipy.sparse import hstack
import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from pydantic import BaseModel


from typing import List


class CommentBatch(BaseModel):
    comments: List[str]


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SENTIMENT_MODEL_DIR = os.path.join(
    BASE_DIR, "results", "final_distilbert_sentiment")
ID2LABEL = {0: "negative", 1: "neutral", 2: "positive"}

tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL_DIR)
sentiment_model = AutoModelForSequenceClassification.from_pretrained(
    SENTIMENT_MODEL_DIR)
sentiment_model.eval()

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


@app.post("/analyze_sentiment")
def analyze_sentiment(data: CommentBatch):
    try:
        comments = data.comments
        clean_comments = [preprocess_sentiment(t) for t in comments]

        inputs = tokenizer(
            clean_comments,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )

        with torch.no_grad():
            outputs = sentiment_model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)
            preds = torch.argmax(probs, dim=1).tolist()
            confs = torch.max(probs, dim=1).values.tolist()

        results = []

        # 🔥 counters
        pos, neg, neu = 0, 0, 0

        for i, text in enumerate(comments):
            label_idx = int(preds[i])
            label = ID2LABEL.get(label_idx, f"label_{label_idx}")

            if label == "positive":
                pos += 1
            elif label == "negative":
                neg += 1
            else:
                neu += 1

            

        return {
            "counts": {
                "positive": pos,
                "negative": neg,
                "neutral": neu
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Sentiment error: {str(e)}")


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

        # 🔥 counters
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

