FROM debian:bookworm-slim AS wake-model

ARG SHERPA_KWS_URL=https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01.tar.bz2
ARG SHERPA_KWS_SHA256=f170013b4716e41b62b9bfd809687c207cef798ef9bc6534d524e17af9b6561a

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl bzip2 \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL "$SHERPA_KWS_URL" -o /tmp/sherpa-kws.tar.bz2 \
    && echo "$SHERPA_KWS_SHA256  /tmp/sherpa-kws.tar.bz2" | sha256sum -c - \
    && mkdir -p /models/sherpa-kws /tmp/model \
    && tar -xjf /tmp/sherpa-kws.tar.bz2 -C /tmp/model --strip-components=1 \
    && cp /tmp/model/encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx /models/sherpa-kws/encoder.int8.onnx \
    && cp /tmp/model/decoder-epoch-12-avg-2-chunk-16-left-64.onnx /models/sherpa-kws/decoder.onnx \
    && cp /tmp/model/joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx /models/sherpa-kws/joiner.int8.onnx \
    && cp /tmp/model/tokens.txt /models/sherpa-kws/tokens.txt

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
