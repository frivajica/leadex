# Dockerfile for API Server
FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Install dependencies
COPY api_server/requirements.txt .
RUN uv pip install --system --no-cache-dir -r requirements.txt

# Copy code
COPY api_server/ .
COPY lib/ ./lib/

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite:///./data/leads.db

# Expose port
EXPOSE 8000

# Run the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
