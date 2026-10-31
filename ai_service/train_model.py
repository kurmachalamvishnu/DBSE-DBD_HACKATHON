"""
Healthcare Queue Management - Machine Learning Waiting Time Model
Implements Queuing Theory + Random Forest Regression for Wait Time Estimation
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

def generate_synthetic_queue_dataset(n_samples=5000, random_state=42):
    """
    Generates realistic historical healthcare queue dataset based on Little's Law,
    hospital triage priorities, doctor fatigue, and consultation complexity.
    """
    np.random.seed(random_state)
    
    # Feature 1: Queue length ahead (0 to 12 patients)
    queue_length_ahead = np.random.randint(0, 13, size=n_samples)
    
    # Feature 2: Doctor baseline average consultation time (8 to 25 minutes)
    avg_consultation_time = np.random.choice([10, 12, 15, 18, 20], size=n_samples)
    
    # Feature 3: Number of emergency/urgent patients ahead
    emergency_ahead = np.array([
        np.random.binomial(n=q, p=0.25) if q > 0 else 0 
        for q in queue_length_ahead
    ])
    
    # Feature 4: Patient Priority Level (1: Routine, 2: Senior/Pediatric, 3: Urgent, 4: Emergency)
    triage_priority = np.random.choice([1, 2, 3, 4], p=[0.55, 0.20, 0.15, 0.10], size=n_samples)
    
    # Feature 5: Hour of Day (8 to 19 - 8 AM to 7 PM)
    hour_of_day = np.random.randint(8, 20, size=n_samples)
    
    # Feature 6: Doctor currently elapsed consultation minutes (0 to 25 mins)
    doctor_elapsed_mins = np.random.randint(0, 26, size=n_samples)
    
    # Feature 7: Is appointment check-in (1) or walk-in (0)
    is_appointment = np.random.binomial(n=1, p=0.45, size=n_samples)

    # Compute realistic target: Actual Waiting Time in minutes
    # Baseline Little's Law wait: queue_length * avg_consultation_time
    # Adjustment for doctor currently midway through consultation
    remaining_curr_patient = np.maximum(0, avg_consultation_time - doctor_elapsed_mins)
    
    # Emergency patients ahead add extra comprehensive triage time
    emergency_penalty = emergency_ahead * 5.0
    
    # Time of day fatigue modifier (peak hours 11 AM - 1 PM and 4 PM - 6 PM slow down slightly)
    fatigue_factor = 1.0 + np.where((hour_of_day >= 12) & (hour_of_day <= 14), 0.15, 0.0) + \
                           np.where(hour_of_day >= 17, 0.10, 0.0)
    
    # If the patient is high emergency, they skip routine patients!
    # Priority adjustment:
    priority_discount = np.where(triage_priority == 4, 0.25,  # Emergency waits 75% less
                        np.where(triage_priority == 3, 0.60,  # Urgent waits 40% less
                        np.where(triage_priority == 2, 0.85, 1.0))) # Senior/Child waits 15% less
    
    # Stochastic clinical variance (noise)
    random_noise = np.random.normal(loc=0, scale=2.5, size=n_samples)
    
    # Pure queuing delay
    raw_wait = (remaining_curr_patient + (queue_length_ahead * avg_consultation_time) + emergency_penalty) * fatigue_factor * priority_discount + random_noise
    
    # Clamp minimum wait time to 0
    actual_wait_time = np.maximum(0.0, np.round(raw_wait, 1))

    df = pd.DataFrame({
        'queue_length_ahead': queue_length_ahead,
        'avg_consultation_time': avg_consultation_time,
        'emergency_ahead': emergency_ahead,
        'triage_priority': triage_priority,
        'hour_of_day': hour_of_day,
        'doctor_elapsed_mins': doctor_elapsed_mins,
        'is_appointment': is_appointment,
        'actual_wait_time': actual_wait_time
    })
    
    return df

def train_and_save_model(output_path="queue_model.joblib"):
    print("Generating synthetic healthcare queue dataset (5,000 encounters)...")
    df = generate_synthetic_queue_dataset()
    
    features = [
        'queue_length_ahead',
        'avg_consultation_time',
        'emergency_ahead',
        'triage_priority',
        'hour_of_day',
        'doctor_elapsed_mins',
        'is_appointment'
    ]
    
    X = df[features]
    y = df['actual_wait_time']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Queue Regression Model...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    
    print("\n--- Model Evaluation Results ---")
    print(f"Mean Absolute Error (MAE): {mae:.2f} minutes")
    print(f"Root Mean Squared Error (RMSE): {rmse:.2f} minutes")
    print(f"R-squared (R2 Score): {r2:.4f}")
    
    importances = dict(zip(features, [round(float(imp), 4) for imp in model.feature_importances_]))
    print(f"Feature Importances: {importances}")
    
    metadata = {
        'model': model,
        'features': features,
        'metrics': {
            'mae': round(float(mae), 2),
            'rmse': round(float(rmse), 2),
            'r2': round(float(r2), 4)
        },
        'feature_importances': importances
    }
    
    joblib.dump(metadata, output_path)
    print(f"\nModel successfully saved to {output_path}")
    return metadata

if __name__ == '__main__':
    train_and_save_model()
