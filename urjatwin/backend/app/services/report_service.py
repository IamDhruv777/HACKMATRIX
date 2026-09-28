import json
import os
from datetime import datetime

def export_run_results(run_id: str, run_db_record) -> dict:
    return {
        "run_id": run_id,
        "scenario": run_db_record.scenario_id,
        "timestamp": datetime.now().isoformat(),
        "config": run_db_record.config_json,
        "results": run_db_record.result_json,
        "status": run_db_record.status
    }
