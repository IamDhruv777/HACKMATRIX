import pandas as pd
import numpy as np
from typing import List, Optional
from dataclasses import dataclass
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

@dataclass
class ForecastResult:
    forecast_horizon_h: int
    forecast_values: List[float]
    forecast_timestamps: List[str]
    actual_values: Optional[List[float]]
    mae: Optional[float]
    rmse: Optional[float]
    baseline_persistence_mae: Optional[float]
    baseline_prevday_mae: Optional[float]
    method: str
    train_period: str
    validation_period: str

def generate_forecast(df: pd.DataFrame, target_col: str, horizon: int = 4) -> ForecastResult:
    df = df.copy()
    df['ts'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('ts').reset_index(drop=True)
    
    # Feature engineering
    df['hour'] = df['ts'].dt.hour
    df['weekday'] = df['ts'].dt.weekday
    df['is_weekend'] = (df['weekday'] >= 5).astype(int)
    
    for lag in [1, 2, 3, 24]:
        df[f'lag_{lag}'] = df[target_col].shift(lag)
        
    df['roll_mean_6h'] = df[target_col].rolling(window=6, min_periods=1).mean().shift(1)
    
    df = df.dropna()
    
    # Train-test split (first 5 days for train, 6th day for test)
    train_end = df['ts'].min() + pd.Timedelta(days=5)
    train = df[df['ts'] < train_end]
    test = df[df['ts'] >= train_end].head(horizon)
    
    features = ['hour', 'weekday', 'is_weekend', 'lag_1', 'lag_2', 'lag_3', 'lag_24', 'roll_mean_6h']
    
    X_train, y_train = train[features], train[target_col]
    X_test, y_test = test[features], test[target_col]
    
    if len(X_train) < 10 or len(X_test) == 0:
        return ForecastResult(horizon, [], [], None, None, None, None, None, "error", "", "")
        
    model = HistGradientBoostingRegressor(random_state=42)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    preds = np.maximum(preds, 0) # non-negative
    
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    
    persistence_preds = test['lag_1'].values
    pers_mae = mean_absolute_error(y_test, persistence_preds)
    
    prevday_preds = test['lag_24'].values
    prevday_mae = mean_absolute_error(y_test, prevday_preds)
    
    return ForecastResult(
        forecast_horizon_h=horizon,
        forecast_values=preds.tolist(),
        forecast_timestamps=test['ts'].dt.isoformat().tolist(),
        actual_values=y_test.tolist(),
        mae=float(mae),
        rmse=float(rmse),
        baseline_persistence_mae=float(pers_mae),
        baseline_prevday_mae=float(prevday_mae),
        method="HistGradientBoostingRegressor",
        train_period=f"{train['ts'].min()} to {train['ts'].max()}",
        validation_period=f"{test['ts'].min()} to {test['ts'].max()}"
    )


def run_forecast_pipeline(
    asset_type: str = "load",
    horizon_h: int = 1,
    asset_id: str = None,
) -> dict:
    """
    Run the full forecasting pipeline and return a JSON-serializable result dict.

    Training: hours 0-119 (synthetic_demo_v1)
    Validation: hours 120-143
    Test/evaluation: hours 144-167

    All data is from synthetic_demo_v1. Results labelled accordingly.
    No future-data leakage: features use only past observations.
    """
    import os

    demo_path = "./data/demo/demo_profiles.csv"
    if not os.path.exists(demo_path):
        os.makedirs(os.path.dirname(demo_path), exist_ok=True)
        from app.services.data_service import generate_demo_data
        generate_demo_data(demo_path)

    df = pd.read_csv(demo_path)

    # Select target series
    if asset_type == "pv":
        filter_id = asset_id or "PV_5"
        subset = df[df["asset_id"] == filter_id]
        series = subset["available_pv_mw"].values
        display_id = filter_id
    else:
        # Sum all loads per timestamp for total demand
        load_df = df[df["asset_type"] == "load"]
        series = load_df.groupby("timestamp")["p_mw"].sum().sort_index().values
        display_id = asset_id or "total_demand"

    if len(series) < 50:
        return {
            "method": "fallback_insufficient_data",
            "forecast_horizon_h": horizon_h,
            "asset_type": asset_type,
            "asset_id": display_id,
            "forecast_values": [],
            "actual_values": [],
            "mae": None,
            "rmse": None,
            "reason": "Insufficient training data (< 50 time steps)",
            "note": "synthetic_demo_v1",
        }

    # Build feature matrix — uses only past observations (no leakage)
    X_list, y_list = [], []
    for i in range(24, len(series) - horizon_h):
        lag_24 = series[i - 24] if i >= 24 else series[0]
        lag_168 = series[i - 168] if i >= 168 else series[0]
        roll_6 = float(np.mean(series[max(0, i - 6):i]))
        feats = [
            series[i - 1],          # lag 1h
            series[i - 2],          # lag 2h
            series[i - 3],          # lag 3h
            lag_24,                  # same hour previous day
            lag_168 if i >= 168 else series[0],  # same hour previous week
            roll_6,                  # rolling mean 6h
            i % 24,                  # hour of day
            (i // 24) % 7,           # weekday (0=Mon)
            1 if (i // 24) % 7 >= 5 else 0,  # weekend flag
        ]
        X_list.append(feats)
        y_list.append(float(series[i + horizon_h - 1]))

    X = np.array(X_list)
    y = np.array(y_list)

    if len(X) < 30:
        return {
            "method": "fallback_too_short",
            "forecast_horizon_h": horizon_h,
            "mae": None,
            "rmse": None,
        }

    # Chronological splits (fit preprocessing on train only — no leakage)
    train_end = 120 - 24  # account for lag warmup
    val_end = 144 - 24
    train_X, train_y = X[:train_end], y[:train_end]
    val_X, val_y = X[train_end:val_end], y[train_end:val_end]
    test_X, test_y = X[val_end:], y[val_end:]

    if len(train_X) < 10 or len(test_X) < 2:
        return {"method": "fallback_split_too_small", "forecast_horizon_h": horizon_h}

    model = HistGradientBoostingRegressor(random_state=42, max_iter=200, max_depth=4)
    model.fit(train_X, train_y)

    preds = model.predict(test_X)
    if asset_type == "pv":
        preds = np.maximum(0.0, preds)  # physically non-negative

    mae = float(np.mean(np.abs(preds - test_y)))
    rmse = float(np.sqrt(np.mean((preds - test_y) ** 2)))

    # Persistence baseline: last known value
    persist_preds = test_X[:, 0]
    persist_mae = float(np.mean(np.abs(persist_preds - test_y)))

    # Previous-day baseline: 24h lag
    prevday_preds = test_X[:, 3]
    prevday_mae = float(np.mean(np.abs(prevday_preds - test_y)))

    return {
        "method": "HistGradientBoostingRegressor",
        "forecast_horizon_h": horizon_h,
        "asset_type": asset_type,
        "asset_id": display_id,
        "forecast_values": preds.tolist(),
        "actual_values": test_y.tolist(),
        "mae": mae,
        "rmse": rmse,
        "baseline_persistence_mae": persist_mae,
        "baseline_prevday_mae": prevday_mae,
        "train_period": "Hours 0–119 (synthetic_demo_v1, seed=42)",
        "validation_period": "Hours 120–143",
        "test_period": "Hours 144–167",
        "note": (
            "Evaluated on synthetic data (synthetic_demo_v1). "
            "Not real utility measurements. "
            "Chronological split used — no future-data leakage."
        ),
    }
