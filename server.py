from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Allow React frontend to access from different port

SHARED_DATA_FILE = '/tmp/sensor_data.json'

@app.route('/data')
def get_sensor_data():
    """Endpoint that returns the latest sensor data"""
    try:
        if os.path.exists(SHARED_DATA_FILE):
            with open(SHARED_DATA_FILE, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify({'error': 'No data available yet. Is main.py running?'}), 503
    except json.JSONDecodeError:
        return jsonify({'error': 'Data file is corrupted or being written'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    print("Endpoints:")
    print("  - GET /data - Returns latest sensor data")
    print("  - GET /health - Health check")
    app.run(host='0.0.0.0', port=5000, debug=True)
