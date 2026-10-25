import asyncio
import json as json_module
import sys
from pathlib import Path

import numpy as np
import pytest
from scipy.sparse import csr_matrix

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main


def test_parse_structured_five_labels():
    response = json_module.dumps(
        {"labels": ["positive", "negative", "neutral", "positive", "negative"]}
    )
    assert main.parse_sentiment_labels(response, 5) == [
        "positive",
        "negative",
        "neutral",
        "positive",
        "negative",
    ]


def test_parse_repeated_output_is_rejected():
    response = "\n".join(
        ["1. Positive", "2. Negative", "3. Neutral", "4. Positive", "5. Negative"] * 2
    )
    with pytest.raises(ValueError):
        main.parse_sentiment_labels(response, 5)


def test_parse_labels_with_explanations():
    response = "\n".join(
        [
            "Positive: This video is incredibly helpful!",
            "Negative: This is the worst video ever.",
            "Neutral: The video was uploaded yesterday.",
            "Positive: Amazing explanation!",
            "Negative:",
        ]
    )
    assert main.parse_sentiment_labels(response, 5) == [
        "positive",
        "negative",
        "neutral",
        "positive",
        "negative",
    ]


def test_parse_incomplete_output_is_rejected():
    with pytest.raises(ValueError):
        main.parse_sentiment_labels('{"labels": ["positive", "neutral"]}', 3)


class FakeResponse:
    def __init__(self, content):
        self.content = content

    def raise_for_status(self):
        return None

    def json(self):
        return {"message": {"content": self.content}}


class FakeOllamaClient:
    def __init__(self, responses=None):
        self.responses = list(responses or [])
        self.calls = []

    async def post(self, url, json):
        self.calls.append(json)
        if self.responses:
            return FakeResponse(self.responses.pop(0))
        count = json["format"]["properties"]["labels"]["minItems"]
        labels = ["positive", "negative", "neutral"]
        return FakeResponse(json_module.dumps({"labels": [labels[i % 3] for i in range(count)]}))


def run(coro):
    return asyncio.run(coro)


def test_malformed_response_retries_without_duplicate_aggregation(monkeypatch):
    repeated = "\n".join(
        ["1. Positive", "2. Negative", "3. Neutral", "4. Positive", "5. Negative"] * 2
    )
    client = FakeOllamaClient(
        [repeated, json_module.dumps({"labels": ["positive"] * 5})]
    )
    monkeypatch.setattr(main.app.state, "ollama_client", client, raising=False)

    labels = run(main.classify_sentiment_batch(["a"] * 5))

    assert labels == ["positive"] * 5
    assert len(labels) == 5
    assert len(client.calls) == 2


def test_short_final_batch_and_one_hundred_comments(monkeypatch):
    client = FakeOllamaClient()
    monkeypatch.setattr(main.app.state, "ollama_client", client, raising=False)

    labels = run(main.analyze_sentiment(main.CommentBatch(comments=["comment"] * 100)))

    assert sum(labels.values()) == 100
    assert labels == {"positive": 34, "negative": 33, "neutral": 33}
    assert [call["format"]["properties"]["labels"]["minItems"] for call in client.calls] == [
        8
    ] * 12 + [4]


def test_empty_input_is_rejected():
    with pytest.raises(Exception):
        main.CommentBatch(comments=[])


def test_spam_endpoint_is_preserved(monkeypatch):
    class Vectorizer:
        def transform(self, comments):
            return csr_matrix(np.ones((len(comments), 1)))

    class Model:
        def predict(self, features):
            return np.array([1, 0])

    monkeypatch.setattr(main, "spam_vectorizer", Vectorizer())
    monkeypatch.setattr(main, "spam_model", Model())

    result = main.analyze_spam(main.CommentBatch(comments=["buy now!", "hello"]))

    assert result == {"counts": {"spam": 1, "not_spam": 1}}
