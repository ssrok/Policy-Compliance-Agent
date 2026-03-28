import pandas as pd
import random

def get_demo_dataset():
    """
    Returns a generated demo dataset with 200 random rows for testing simulations.
    """
    rows = []

    for i in range(1, 201):
        rows.append({
            "id": i,
            "amount": random.choice([200, 500, 1200, 4500, 7000, 10000, 15000]),
            "status": random.choice(["ACTIVE", "INACTIVE"]),
            "country": random.choice(["US", "UK", "IN", "DE", "FR"]),
            "transaction_type": random.choice(["CARD", "CASH", "TRANSFER"]),
        })

    return pd.DataFrame(rows)
