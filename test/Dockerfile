FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir flask flask-cors python-socketio watchdog
COPY sequence_server.py .
CMD ["python", "sequence_server.py", "--file", "/data/sequence.json", "--hardware-file", "/data/hardware.json"]
