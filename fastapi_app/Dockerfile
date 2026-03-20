FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache
COPY . .
CMD ["uvicorn","fastapi_app.main:app","--host","0.0.0.0","--port","8000"]