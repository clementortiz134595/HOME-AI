#!/usr/bin/env python3
"""Local Mac microphone adapter for the Home Core wake-word prototype."""

import base64
import io
import json
import os
import queue
import subprocess
import tempfile
import time
import urllib.request
import urllib.error
import wave
from collections import deque
from pathlib import Path

import numpy as np
import sounddevice as sd
from openwakeword.model import Model


SAMPLE_RATE = 16_000
BLOCK_SIZE = 1_280
WAKE_THRESHOLD = float(os.getenv("HOME_CORE_WAKE_THRESHOLD", "0.35"))
INPUT_DEVICE = os.getenv("HOME_CORE_INPUT_DEVICE") or None
CUSTOM_VERIFIER = os.getenv(
    "HOME_CORE_WAKE_VERIFIER",
    "models/hey_jarvis_clement_verifier.joblib",
)
MIN_SILENCE_THRESHOLD = float(os.getenv("HOME_CORE_MIN_SILENCE_THRESHOLD", "100"))
SILENCE_SECONDS = 1.2
MIN_COMMAND_SECONDS = 1.2
MAX_COMMAND_SECONDS = 15.0
PRE_ROLL_FRAMES = 7
CORE_URL = "http://127.0.0.1:18080/v1/assistant/voice"
STATE_URL = "http://127.0.0.1:18080/v1/assistant/voice/state"
TTS_API_KEY = os.getenv("HOME_CORE_TTS_API_KEY") or os.getenv("HOME_CORE_STT_API_KEY", "")
TTS_BASE_URL = os.getenv("HOME_CORE_TTS_BASE_URL", "https://texttospeech.googleapis.com/v1/text:synthesize")
TTS_VOICE = os.getenv("HOME_CORE_TTS_VOICE", "fr-FR-Standard-A")


def generate_google_audio(text: str) -> bytes:
    request_body = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": "fr-FR", "name": TTS_VOICE},
        "audioConfig": {"audioEncoding": "LINEAR16"},
    }).encode()
    url = f"{TTS_BASE_URL}?key={TTS_API_KEY}"
    request = urllib.request.Request(url, data=request_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read())
    return base64.b64decode(payload["audioContent"])


def play_audio(audio: bytes) -> None:
    with tempfile.NamedTemporaryFile(suffix=".wav") as output:
        output.write(audio)
        output.flush()
        subprocess.run(["afplay", output.name], check=False)


def publish_state(state: str, transcript: str = "", answer: str = "") -> None:
    body = json.dumps({"state": state, "transcript": transcript, "answer": answer}).encode()
    request = urllib.request.Request(STATE_URL, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(request, timeout=2).close()
    except Exception as error:
        print(f"État Panel indisponible: {error}", flush=True)


def post_wav(samples: list[np.ndarray]) -> None:
    pcm = np.concatenate(samples).astype(np.int16).tobytes()
    duration = len(pcm) / (SAMPLE_RATE * 2)
    level = float(np.abs(np.frombuffer(pcm, dtype=np.int16).astype(np.int32)).mean())
    print(f"Audio envoyé: durée={duration:.2f}s, niveau moyen={level:.0f}", flush=True)
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
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read())
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Home Core HTTP {error.code}: {detail}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Home Core connexion impossible: {error.reason}") from error
    answer = result.get("answer", {}).get("text", result)
    transcript = str(result.get("transcript", ""))
    print(f"Jarvis: {answer}", flush=True)
    # Prepare the complete TTS audio before exposing the answer, so the text
    # and playback become visible/audible together in the Panel experience.
    audio = generate_google_audio(str(answer))
    play_audio(audio)
    # Keep the answer hidden while the voice is being generated and played.
    # The Panel reveals the transcript and answer only when playback is done.
    publish_state("answered", transcript=transcript, answer=str(answer))
    publish_state("idle")


def main() -> None:
    verifier = Path(CUSTOM_VERIFIER)
    detector = Model(
        wakeword_models=["hey_jarvis"],
        custom_verifier_models={"hey_jarvis": str(verifier)} if verifier.exists() else {},
        custom_verifier_threshold=0.1,
    )
    frames: queue.Queue[np.ndarray] = queue.Queue()
    device = sd.query_devices(INPUT_DEVICE, "input")
    print(
        f"Micro sélectionné: {device['name']} | seuil wake word: {WAKE_THRESHOLD:.2f}",
        flush=True,
    )

    def on_audio(indata: np.ndarray, _frames: int, _time: object, _status: object) -> None:
        frames.put(indata[:, 0].copy())

    recording: list[np.ndarray] = []
    pre_roll: deque[np.ndarray] = deque(maxlen=PRE_ROLL_FRAMES)
    recording_started = 0.0
    quiet_since = 0.0
    noise_floor = MIN_SILENCE_THRESHOLD / 2
    print("Micro actif. Dites « Hey Jarvis » (Ctrl-C pour arrêter).", flush=True)
    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16",
        blocksize=BLOCK_SIZE,
        device=INPUT_DEVICE,
        callback=on_audio,
    ):
        last_diagnostic = 0.0
        while True:
            frame = frames.get()
            if not recording:
                pre_roll.append(frame)
                scores = detector.predict(frame)
                score = max(scores.values(), default=0.0)
                now = time.monotonic()
                frame_level = float(np.abs(frame.astype(np.int32)).mean())
                noise_floor = noise_floor * 0.95 + min(frame_level, MIN_SILENCE_THRESHOLD) * 0.05
                if now - last_diagnostic >= 5.0:
                    level = float(np.abs(frame.astype(np.int32)).mean())
                    print(f"Diagnostic micro: niveau={level:.0f}, score={score:.3f}", flush=True)
                    last_diagnostic = now
                if score >= WAKE_THRESHOLD:
                    recording = list(pre_roll)
                    recording.append(frame)
                    recording_started = time.monotonic()
                    quiet_since = 0.0
                    print("Wake word détecté, je t'écoute…", flush=True)
                    publish_state("listening")
                continue

            recording.append(frame)
            level = float(np.abs(frame.astype(np.int32)).mean())
            silence_threshold = max(MIN_SILENCE_THRESHOLD, noise_floor * 2.2)
            if level < silence_threshold:
                quiet_since = quiet_since or time.monotonic()
            else:
                quiet_since = 0.0
            elapsed = time.monotonic() - recording_started
            if (elapsed >= MIN_COMMAND_SECONDS and quiet_since and time.monotonic() - quiet_since >= SILENCE_SECONDS) or elapsed >= MAX_COMMAND_SECONDS:
                print(f"Fin de phrase: durée={elapsed:.2f}s, seuil silence={silence_threshold:.0f}", flush=True)
                publish_state("transcribing")
                publish_state("thinking")
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
