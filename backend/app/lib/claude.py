import os
import anthropic

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

CATEGORIES = [
    "Food & Dining",
    "Shopping",
    "Transportation",
    "Entertainment",
    "Bills & Utilities",
    "Health",
    "Travel",
    "Income",
    "Other",
]


async def categorize_transaction(description: str, amount: float) -> str:
    prompt = (
        f"Categorize this bank transaction into exactly one of these categories: {', '.join(CATEGORIES)}.\n"
        f"Transaction: {description} (amount: ${amount})\n"
        f"Reply with only the category name, nothing else."
    )
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[{"role": "user", "content": prompt}],
    )
    category = message.content[0].text.strip()
    return category if category in CATEGORIES else "Other"
