FROM python:3.12-slim-bookworm

WORKDIR /workspace

# Fix apt sources to use HTTPS (Debian now requires it)
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list 2>/dev/null || true

# Install required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency configuration
COPY pyproject.toml .

# Install Python dependencies
RUN pip install --no-cache-dir .

# Copy backend code
COPY . .

# Make startup script executable
RUN chmod +x /workspace/startup.sh

EXPOSE 8000

CMD ["/workspace/startup.sh"]
