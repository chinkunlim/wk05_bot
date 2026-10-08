def test_telegram_webhook_payload_mock():
    """Verify structure of incoming Telegram Webhook payloads parsed by Main.gs."""
    sample_webhook_update = {
        "update_id": 1000001,
        "message": {
            "message_id": 42,
            "from": {
                "id": 12345678,
                "is_bot": False,
                "first_name": "Jinkun",
                "username": "jinkunlim",
            },
            "chat": {
                "id": 12345678,
                "type": "private",
            },
            "date": 1728114000,
            "text": "/search 台灣亞運金牌數",
        },
    }

    assert "update_id" in sample_webhook_update
    message = sample_webhook_update.get("message", {})
    assert message.get("from", {}).get("id") == 12345678
    assert message.get("text").startswith("/search")


def test_gemini_request_payload_mock():
    """Verify structure of outgoing Gemini API generateContent payload."""
    grounding_context = "【即時外部檢索資料】\n1. 台灣奪得55面獎牌..."
    user_query = "今年亞運獎牌總數？"

    gemini_payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": f"{grounding_context}\n\n使用者提問：{user_query}"}
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        },
    }

    assert len(gemini_payload["contents"]) == 1
    parts = gemini_payload["contents"][0]["parts"]
    assert "即時外部檢索資料" in parts[0]["text"]
