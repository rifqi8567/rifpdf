FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      libreoffice \
      libreoffice-writer \
      libreoffice-calc \
      libreoffice-impress \
      fonts-crosextra-caladea \
      fonts-crosextra-carlito \
      fonts-dejavu \
      fonts-liberation \
      fonts-noto-core \
      fonts-noto-cjk \
      fonts-noto-color-emoji \
      fontconfig \
      procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app
COPY worker.py ./worker.py
COPY fonts/local.conf /etc/fonts/local.conf

RUN fc-cache -f -v && mkdir -p /data/conversions

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
