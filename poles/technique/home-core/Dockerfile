FROM golang:1.23-alpine AS build

WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /home-core ./cmd/home-core

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S homecore \
    && adduser -S -G homecore -h /app homecore

USER homecore
WORKDIR /app
COPY --from=build /home-core /usr/local/bin/home-core

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/home-core"]
