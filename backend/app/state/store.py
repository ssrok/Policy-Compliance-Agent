import pandas as pd
from typing import Optional

DATASTORE: dict[str, pd.DataFrame] = {}

def save_dataset(session_id: str, df: pd.DataFrame) -> None:
    DATASTORE[session_id] = df

def get_dataset(session_id: str) -> Optional[pd.DataFrame]:
    return DATASTORE.get(session_id)

def has_dataset(session_id: str) -> bool:
    return session_id in DATASTORE and not DATASTORE[session_id].empty
