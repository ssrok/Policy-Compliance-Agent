import random
import pandas as pd
from datetime import datetime, timedelta

def generate_demo_dataset(n: int = 750, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)

    CUSTOMERS   = [f"CUST_{i:03d}" for i in range(1, 81)]
    ACCOUNTS    = [f"ACC_{i:04d}"  for i in range(1, 201)]
    COUNTRIES   = ["IN", "US", "GB", "AE", "SG", "CN", "DE", "NG", "PK", "RU"]
    DEVICES     = ["mobile", "web", "atm", "branch", "api"]
    TXN_TYPES   = ["transfer", "withdrawal", "deposit", "payment", "refund"]
    KYC_LEVELS  = ["low", "medium", "high"]

    # Customers with risky behaviour patterns
    HIGH_FREQ_CUSTOMERS  = set(random.sample(CUSTOMERS, 8))
    MULTI_COUNTRY_CUSTS  = set(random.sample(CUSTOMERS, 6))
    REPEAT_FLAG_CUSTS    = set(random.sample(CUSTOMERS, 10))

    def pick_amount() -> float:
        r = random.random()
        if r < 0.40:
            return round(random.uniform(100, 5_000), 2)
        elif r < 0.70:
            return round(random.uniform(5_000, 50_000), 2)
        elif r < 0.90:
            return round(random.uniform(50_000, 500_000), 2)
        else:
            return round(random.uniform(500_000, 2_000_000), 2)

    base_time = datetime(2024, 1, 1, 9, 0, 0)
    rows = []

    for i in range(1, n + 1):
        cust = random.choice(CUSTOMERS)
        acc  = random.choice(ACCOUNTS)

        amount = pick_amount()

        # Inject borderline values around common thresholds
        if random.random() < 0.06:
            amount = round(random.uniform(990_000, 1_010_000), 2)
        if random.random() < 0.04:
            amount = round(random.uniform(498_000, 502_000), 2)

        # High-freq customers transact more at odd hours
        if cust in HIGH_FREQ_CUSTOMERS:
            offset_hours = random.randint(0, 23)
        else:
            offset_hours = random.randint(8, 20)

        ts = base_time + timedelta(
            days=random.randint(0, 364),
            hours=offset_hours,
            minutes=random.randint(0, 59)
        )

        is_international = cust in MULTI_COUNTRY_CUSTS or random.random() < 0.18
        country = random.choice(COUNTRIES) if is_international else "IN"

        prev_flags = 0
        if cust in REPEAT_FLAG_CUSTS:
            prev_flags = random.randint(1, 5)
        elif random.random() < 0.12:
            prev_flags = 1

        # KYC risk correlates loosely with amount and flags
        if amount > 500_000 or prev_flags >= 3:
            kyc = random.choices(KYC_LEVELS, weights=[10, 40, 50])[0]
        elif amount > 50_000 or prev_flags >= 1:
            kyc = random.choices(KYC_LEVELS, weights=[30, 50, 20])[0]
        else:
            kyc = random.choices(KYC_LEVELS, weights=[60, 30, 10])[0]

        rows.append({
            "transaction_id":     f"TXN_{i:04d}",
            "customer_id":        cust,
            "account_id":         acc,
            "transaction_amount": amount,
            "transaction_type":   random.choice(TXN_TYPES),
            "timestamp":          ts.strftime("%Y-%m-%d %H:%M:%S"),
            "country":            country,
            "device_type":        random.choice(DEVICES),
            "is_international":   is_international,
            "kyc_risk_level":     kyc,
            "previous_flag_count": prev_flags,
        })

    return pd.DataFrame(rows)


def load_demo_dataset() -> pd.DataFrame:
    return generate_demo_dataset()
