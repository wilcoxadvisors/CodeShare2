"""
Startup script for the ML service
"""

import os
from ml_service import app

if __name__ == "__main__":
    port = int(os.environ.get('PYTHON_SERVICE_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)