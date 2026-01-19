FROM alpine:latest

ARG PB_VERSION=0.25.9

RUN apk add --no-cache \
    unzip \
    ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

# Copy migrations if they exist
COPY pb_migrations/ /pb/pb_migrations/

# Copy hooks if they exist
COPY pb_hooks/ /pb/pb_hooks/

EXPOSE 8090

CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
