FROM python:3.13-alpine
WORKDIR /app
RUN pip install --no-cache-dir paho-mqtt==2.1.0
COPY code/mqtt_bridge.py /app/mqtt_bridge.py
USER nobody
ENTRYPOINT ["python", "/app/mqtt_bridge.py"]
