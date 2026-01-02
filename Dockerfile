# syntax=docker/dockerfile:1
FROM alpine:3.20

LABEL org.opencontainers.image.title="Wildlings"
LABEL org.opencontainers.image.description="Placeholder image; full build added in later slices."

RUN adduser -D -g '' wildlings
USER wildlings
WORKDIR /home/wildlings

CMD ["sh","-c","echo 'Wildlings image placeholder; no app configured yet.'"]
