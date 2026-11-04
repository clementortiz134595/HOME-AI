FROM debian:bookworm-slim AS wake-model

ARG SHERPA_KWS_BASE_URL=https://huggingface.co/jguerrisi/sherpa-onnx-kws-zipformer-fr-3M-2026-08-08/resolve/main
ARG SHERPA_KWS_ENCODER_SHA256=7bec12683c0d5730fab58ff6e3427c9645f186af619d463e43fcc88838aa7aa4
ARG SHERPA_KWS_DECODER_SHA256=3628efb17bd1edbdbd69eb664a89aba940b8bac3e498eb5383e240de6bc56df2
ARG SHERPA_KWS_JOINER_SHA256=c090840b89767c1e11f3423d157e961332cd80079e2a4da836ea54a0a7cf606b

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /models/sherpa-kws \
    && curl -fsSL "$SHERPA_KWS_BASE_URL/encoder-epoch-20-avg-2-chunk-16-left-64.int8.onnx" -o /models/sherpa-kws/encoder.int8.onnx \
    && curl -fsSL "$SHERPA_KWS_BASE_URL/decoder-epoch-20-avg-2-chunk-16-left-64.int8.onnx" -o /models/sherpa-kws/decoder.onnx \
    && curl -fsSL "$SHERPA_KWS_BASE_URL/joiner-epoch-20-avg-2-chunk-16-left-64.int8.onnx" -o /models/sherpa-kws/joiner.int8.onnx \
    && curl -fsSL "$SHERPA_KWS_BASE_URL/tokens.txt" -o /models/sherpa-kws/tokens.txt \
    && echo "$SHERPA_KWS_ENCODER_SHA256  /models/sherpa-kws/encoder.int8.onnx" | sha256sum -c - \
    && echo "$SHERPA_KWS_DECODER_SHA256  /models/sherpa-kws/decoder.onnx" | sha256sum -c - \
    && echo "$SHERPA_KWS_JOINER_SHA256  /models/sherpa-kws/joiner.int8.onnx" | sha256sum -c -

COPY models/sherpa-kws/keywords.txt /models/sherpa-kws/keywords.txt

FROM golang:1.23-bookworm AS build

ARG TARGETARCH
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o /home-core ./cmd/home-core \
    && case "$TARGETARCH" in \
        amd64) sherpa_arch=x86_64-unknown-linux-gnu ;; \
        arm64) sherpa_arch=aarch64-unknown-linux-gnu ;; \
        *) echo "unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
       esac \
    && mkdir -p /sherpa-libs \
    && cp /go/pkg/mod/github.com/k2-fsa/sherpa-onnx-go-linux@v1.13.8/lib/$sherpa_arch/*.so /sherpa-libs/

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata wget libstdc++6 libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system homecore \
    && useradd --system --gid homecore --home-dir /app homecore

COPY --from=build /sherpa-libs/ /usr/local/lib/
COPY --from=build /home-core /usr/local/bin/home-core
COPY --from=wake-model /models/sherpa-kws /app/models/sherpa-kws
RUN ldconfig

USER homecore
WORKDIR /app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/home-core"]
