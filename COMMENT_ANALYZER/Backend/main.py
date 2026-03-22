
from fastapi import FastAPI
import pickle
import re
import numpy as np
from scipy.sparse import hstack
import os

from pydantic import BaseModel


from typing import List


class CommentBatch(BaseModel):
    comments: List[str]


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

sentiment_model = pickle.load(
    open(os.path.join(BASE_DIR, "models/sentiment_model.pkl"), "rb"))
word_vectorizer = pickle.load(
    open(os.path.join(BASE_DIR, "models/word_vectorizer.pkl"), "rb"))
char_vectorizer = pickle.load(
    open(os.path.join(BASE_DIR, "models/char_vectorizer.pkl"), "rb"))

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


@app.post("/analyze_batch")
def analyze_batch(data: CommentBatch):
    comments = data.comments

    clean_sent = [preprocess_sentiment(t) for t in comments]

    X_word = word_vectorizer.transform(clean_sent)
    X_char = char_vectorizer.transform(clean_sent)
    X_sent = hstack([X_word, X_char])

    sent_preds = sentiment_model.predict(X_sent)

    clean_spam = [preprocess_spam(t) for t in comments]
    X_text = spam_vectorizer.transform(clean_spam)

    X_extra = np.array([extract_spam_features(t)[0] for t in comments])
    X_spam = hstack([X_text, X_extra])

    spam_preds = spam_model.predict(X_spam)

    results = []

    for i, text in enumerate(comments):
        sentiment = "positive" if sent_preds[i] == 1 else "negative"
        spam = "spam" if spam_preds[i] == 1 else "not spam"

        results.append({
            "text": text,
            "sentiment": sentiment,
            "spam": spam
        })

    return {"results": results}
