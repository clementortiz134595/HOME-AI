#!/usr/bin/env python3
"""Local Mac microphone adapter for the Home Core wake-word prototype."""

import io
import json
import queue
import time
import urllib.request
import wave

import numpy as np
import sounddevice as sd
from openwakeword.model import Model


SAMPLE_RATE = 16_000
BLOCK_SIZE = 1_280
WAKE_THRESHOLD = 0.5
SILENCE_THRESHOLD = 450
SILENCE_SECONDS = 1.0
MAX_COMMAND_SECONDS = 10.0
CORE_URL = "http://127.0.0.1:18080/v1/assistant/voice"


def post_wav(samples: list[np.ndarray]) -> None:
    pcm = np.concatenate(samples).astype(np.int16).tobytes()
    payload = io.BytesIO()
    with wave.open(payload, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)
    request = urllib.request.Request(
        CORE_URL,
        data=payload.getvalue(),
        headers={"Content-Type": "audio/wav"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.loads(response.read())
    print(f"Jarvis: {result.get('answer', {}).get('text', result)}", flush=True)


def main() -> None:
    detector = Model(wakeword_models=["hey_jarvis"])
    frames: queue.Queue[np.ndarray] = queue.Queue()

    def on_audio(indata: np.ndarray, _frames: int, _time: object, _status: object) -> None:
        frames.put(indata[:, 0].copy())

    recording: list[np.ndarray] = []
    recording_started = 0.0
    quiet_since = 0.0
    print("Micro actif. Dites « Hey Jarvis » (Ctrl-C pour arrêter).", flush=True)
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16",
        blocksize=BLOCK_SIZE,
        callback=on_audio,
    ):
        while True:
            frame = frames.get()
            if not recording:
                scores = detector.predict(frame)
                if max(scores.values(), default=0.0) >= WAKE_THRESHOLD:
                    recording = [frame]
                    recording_started = time.monotonic()
                    quiet_since = 0.0
                    print("Wake word détecté, je t'écoute…", flush=True)
                continue

            recording.append(frame)
            level = float(np.abs(frame.astype(np.int32)).mean())
            if level < SILENCE_THRESHOLD:
                quiet_since = quiet_since or time.monotonic()
            else:
                quiet_since = 0.0
            if (quiet_since and time.monotonic() - quiet_since >= SILENCE_SECONDS) or time.monotonic() - recording_started >= MAX_COMMAND_SECONDS:
                try:
                    post_wav(recording)
                except Exception as error:
                    print(f"Erreur Home Core: {error}", flush=True)
                recording = []


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Micro arrêté.", flush=True)
