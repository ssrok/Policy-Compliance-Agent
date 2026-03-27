import sys
import os

# Append the absolute path of the backend directory
backend_path = r"c:\Users\a\Desktop\Desktop Files\Hackathon\CODE_APEX\Vikrant\Policy-Compliance-Agent\Policy-Compliance-Agent\backend"
sys.path.append(backend_path)

try:
    from app.rule_engine.row_evaluator import evaluate_row
    print("SUCCESS: Import worked!")
except ImportError as e:
    print(f"FAILURE: ImportError: {e}")
except Exception as e:
    print(f"FAILURE: Other error: {e}")
