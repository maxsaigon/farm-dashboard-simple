# 🏠 Đề Xuất Backend Homeserver — Farm AI Data Hub

> Backend tự host trên Ubuntu homeserver, lưu trữ data + photo từ Farm Dashboard, phục vụ phân tích AI cây sầu riêng.

---

## 1. So Sánh 3 Phương Án

| Tiêu chí | A. FastAPI + SQLite | B. PocketBase | C. Hybrid (PB + Python Worker) |
|---|---|---|---|
| **Ngôn ngữ** | Python | Go (binary) | Go + Python |
| **Thời gian setup** | 2-3 ngày | 30 phút | 1-2 ngày |
| **AI tích hợp** | ⭐ Trực tiếp (Python = AI) | ❌ Cần service riêng | ⚠️ 2 services |
| **Photo storage** | Local filesystem | Built-in (SQLite blob) | Chia đôi |
| **Database** | SQLite (file) | SQLite (built-in) | SQLite × 2 |
| **Admin UI** | Cần build (hoặc SQLite Browser) | ✅ Built-in, đẹp | ✅ PocketBase UI |
| **RAM usage** | ~50-100MB | ~30-50MB | ~100-150MB |
| **Mở rộng AI** | ⭐ Dễ nhất | Khó | Trung bình |
| **Maintenance** | Trung bình | ⭐ Thấp nhất | Cao |
| **Phù hợp** | **AI-first, long-term** | Quick prototype | Nếu cần admin UI |

### ✅ Khuyến nghị: **Phương án A — FastAPI + SQLite + Local FS**

**Lý do:**
1. **Python = ngôn ngữ của AI** → tích hợp Ollama, OpenCV, YOLO, transformers trực tiếp
2. **SQLite đủ mạnh** cho dự án cá nhân (~1000 cây, ~50K ảnh) — không cần PostgreSQL
3. **Photo lưu filesystem** → dễ backup (rsync/rclone), dễ feed vào AI pipeline
4. **Một codebase duy nhất** — không cần quản lý nhiều services
5. **FastAPI tự generate API docs** → dễ debug, dễ kết nối frontend

---

## 2. Kiến Trúc Hệ Thống

```
                           ┌──────────────────────┐
                           │    Ubuntu Homeserver   │
                           │    (LAN / Tailscale)   │
┌─────────────┐           ├──────────────────────┤
│ Farm Dashboard│  ──────▶ │  Caddy (Reverse Proxy)│ ← Auto HTTPS
│ (Next.js PWA)│  HTTP/S  │  :80 / :443           │
└─────────────┘           ├──────────────────────┤
                           │                        │
                           │  FastAPI App (:8000)   │
                           │  ┌──────────────────┐ │
                           │  │ REST API          │ │
                           │  │ • /api/trees      │ │
                           │  │ • /api/photos     │ │
                           │  │ • /api/sync       │ │
                           │  │ • /api/ai/analyze │ │
                           │  └────────┬─────────┘ │
                           │           │             │
                           │  ┌────────▼─────────┐ │
                           │  │ SQLite Database   │ │
                           │  │ farm_data.db      │ │
                           │  └──────────────────┘ │
                           │                        │
                           │  ┌──────────────────┐ │
                           │  │ Photo Storage     │ │
                           │  │ /data/photos/     │ │
                           │  │ (organized dirs)  │ │
                           │  └──────────────────┘ │
                           │                        │
                           │  ┌──────────────────┐ │
                           │  │ Ollama AI Engine  │ │
                           │  │ :11434            │ │
                           │  │ llama3.2-vision   │ │
                           │  └──────────────────┘ │
                           └──────────────────────┘
```

### Kết nối mạng

| Trường hợp | Cách kết nối |
|---|---|
| **Cùng LAN** | `http://192.168.x.x:8000` |
| **Remote** | **Tailscale** (VPN mesh, zero-config) hoặc Caddy + domain |
| **Sync tự động** | Farm Dashboard gọi `/api/sync` khi online |

> [!TIP]
> **Tailscale** là cách đơn giản nhất để truy cập homeserver từ bên ngoài mà không cần mở port, không cần domain, không cần DDNS. Cài 1 lần, dùng mãi.

---

## 3. Tech Stack Chi Tiết

| Component | Công nghệ | Lý do |
|---|---|---|
| **Runtime** | Python 3.12+ | AI ecosystem, async, type hints |
| **Framework** | FastAPI + Uvicorn | Async, auto OpenAPI docs, Pydantic validation |
| **Database** | SQLite (WAL mode) | Zero-config, file-based, đủ cho ~100K records |
| **ORM** | SQLAlchemy 2.0 + Alembic | Type-safe queries, schema migrations |
| **Photo storage** | Local filesystem | Simple, rsync-friendly, AI-accessible |
| **Photo processing** | Pillow + `photo_compression.py` | Resize, thumbnail, EXIF extract |
| **AI inference** | Ollama (local) | Free, private, swap models dễ dàng |
| **AI models** | `llama3.2-vision`, `yolo` | Đếm trái, phát hiện bệnh |
| **Task queue** | `rq` (Redis Queue) | AI jobs chạy background, không block API |
| **Reverse proxy** | Caddy | Auto HTTPS, simple config |
| **Container** | Docker Compose | Reproducible deployment |
| **VPN** | Tailscale (optional) | Remote access không cần mở port |

---

## 4. Database Schema (SQLite)

```sql
-- Cây trồng — đồng bộ từ Firebase
CREATE TABLE trees (
    id TEXT PRIMARY KEY,           -- Firebase tree ID
    farm_id TEXT NOT NULL,
    name TEXT,
    variety TEXT,                   -- Ri6, Monthong, ...
    qr_code TEXT,
    
    -- GPS
    latitude REAL,
    longitude REAL,
    gps_accuracy REAL,
    
    -- Zone
    zone_code TEXT,
    zone_name TEXT,
    
    -- Status
    health_status TEXT DEFAULT 'Good',  -- Excellent/Good/Fair/Poor
    tree_status TEXT DEFAULT 'young',    -- young/mature/old
    needs_attention BOOLEAN DEFAULT 0,
    
    -- Measurements
    tree_height REAL,
    trunk_diameter REAL,
    planting_date TEXT,                  -- ISO date
    
    -- Notes
    notes TEXT,
    health_notes TEXT,
    
    -- Sync tracking
    firebase_updated_at TEXT,            -- Last Firebase update
    local_updated_at TEXT DEFAULT (datetime('now')),
    
    created_at TEXT DEFAULT (datetime('now'))
);

-- Dữ liệu theo niên vụ
CREATE TABLE seasonal_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_id TEXT NOT NULL REFERENCES trees(id),
    season_year INTEGER NOT NULL,
    manual_fruit_count INTEGER DEFAULT 0,
    ai_fruit_count INTEGER DEFAULT 0,
    health_status TEXT,
    notes TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(tree_id, season_year)
);

-- Ảnh cây trồng
CREATE TABLE photos (
    id TEXT PRIMARY KEY,               -- Firebase photo ID hoặc UUID
    tree_id TEXT NOT NULL REFERENCES trees(id),
    farm_id TEXT NOT NULL,
    
    -- File info
    filename TEXT NOT NULL,
    photo_type TEXT NOT NULL,           -- general/health/fruit_count
    season_year INTEGER,
    file_size INTEGER,                  -- bytes
    width INTEGER,
    height INTEGER,
    
    -- Local paths (relative to /data/photos/)
    original_path TEXT,                -- e.g. "2026/trees/abc123/original/photo1.jpg"
    compressed_path TEXT,              -- e.g. "2026/trees/abc123/compressed/photo1.jpg"
    thumbnail_path TEXT,               -- e.g. "2026/trees/abc123/thumb/photo1.jpg"
    
    -- GPS from photo EXIF
    latitude REAL,
    longitude REAL,
    
    -- AI analysis results
    ai_analyzed BOOLEAN DEFAULT 0,
    ai_analysis_date TEXT,
    ai_fruit_count INTEGER,
    ai_health_assessment TEXT,          -- JSON: {"disease": "...", "confidence": 0.95}
    ai_raw_response TEXT,              -- Full AI response (JSON)
    
    -- Sync
    firebase_photo_id TEXT,            -- Original Firebase ID
    synced_from_firebase BOOLEAN DEFAULT 0,
    
    uploaded_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

-- AI analysis jobs
CREATE TABLE ai_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id TEXT REFERENCES photos(id),
    job_type TEXT NOT NULL,             -- fruit_count/health_check/general_analysis
    status TEXT DEFAULT 'pending',      -- pending/processing/completed/failed
    model_name TEXT,                    -- llama3.2-vision, yolov8, etc.
    prompt TEXT,
    result TEXT,                        -- JSON response
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Sync log — theo dõi đồng bộ Firebase ↔ Homeserver
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,          -- tree/photo/seasonal_stats
    entity_id TEXT NOT NULL,
    direction TEXT NOT NULL,            -- firebase_to_local / local_to_firebase
    status TEXT DEFAULT 'success',      -- success/failed/conflict
    details TEXT,                       -- JSON metadata
    synced_at TEXT DEFAULT (datetime('now'))
);

-- Indexes cho query thường dùng
CREATE INDEX idx_photos_tree ON photos(tree_id);
CREATE INDEX idx_photos_type ON photos(photo_type);
CREATE INDEX idx_photos_ai ON photos(ai_analyzed);
CREATE INDEX idx_seasonal_tree ON seasonal_stats(tree_id, season_year);
CREATE INDEX idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX idx_trees_farm ON trees(farm_id);
```

### Photo Storage Layout

```
/data/photos/
├── {farm_id}/
│   ├── {tree_id}/
│   │   ├── original/              ← Ảnh gốc (1-3MB)
│   │   │   ├── 2026_05_28_001.jpg
│   │   │   └── 2026_05_28_002.jpg
│   │   ├── compressed/            ← Ảnh nén (200-500KB)
│   │   │   ├── 2026_05_28_001.jpg
│   │   │   └── 2026_05_28_002.jpg
│   │   ├── thumbnail/             ← Thumbnail (30-50KB)
│   │   │   ├── 2026_05_28_001.jpg
│   │   │   └── 2026_05_28_002.jpg
│   │   └── ai_ready/             ← Ảnh cho AI (1.5MB, chuẩn hóa)
│   │       ├── 2026_05_28_001.jpg
│   │       └── 2026_05_28_002.jpg
│   └── _farm_overview/            ← Ảnh tổng quan farm
└── _ai_training/                   ← Dataset cho fine-tune models
    ├── fruit_count/
    │   ├── images/
    │   └── labels/                 ← YOLO format annotations
    └── disease_detection/
        ├── images/
        └── labels/
```

---

## 5. API Design

### 5.1 API Endpoints

```
Base URL: http://homeserver:8000/api/v1

── Sync (Firebase ↔ Homeserver) ──────────────────────
POST   /sync/trees              ← Bulk sync trees từ Firebase
POST   /sync/photos             ← Sync photo metadata + download files
GET    /sync/status             ← Trạng thái sync gần nhất

── Trees ─────────────────────────────────────────────
GET    /trees                   ← List trees (filter: farm_id, zone, status)
GET    /trees/{id}              ← Chi tiết cây + seasonal stats + photos
GET    /trees/{id}/stats        ← Thống kê theo season
PATCH  /trees/{id}              ← Update tree data

── Photos ────────────────────────────────────────────
POST   /photos/upload           ← Upload ảnh mới (multipart/form-data)
GET    /photos                  ← List photos (filter: tree_id, type, season)
GET    /photos/{id}             ← Photo metadata
GET    /photos/{id}/file        ← Serve file (original/compressed/thumbnail)
DELETE /photos/{id}             ← Xóa ảnh

── AI Analysis ───────────────────────────────────────
POST   /ai/analyze              ← Submit ảnh để AI phân tích
POST   /ai/analyze/batch        ← Phân tích hàng loạt (queue)
GET    /ai/jobs/{job_id}        ← Check job status + result
GET    /ai/stats                ← Thống kê AI: processed, accuracy, models
POST   /ai/fruit-count          ← Đếm trái sầu riêng (specialized)
POST   /ai/health-check         ← Kiểm tra sức khỏe cây (specialized)

── Reports ───────────────────────────────────────────
GET    /reports/season/{year}   ← Báo cáo niên vụ
GET    /reports/comparison      ← So sánh seasons
GET    /reports/export/csv      ← Export data dạng CSV
```

### 5.2 Ví dụ API Request/Response

**Upload + AI Analyze:**
```bash
# 1. Upload ảnh
curl -X POST http://homeserver:8000/api/v1/photos/upload \
  -F "file=@durian_tree.jpg" \
  -F "tree_id=abc123" \
  -F "photo_type=fruit_count" \
  -F "season_year=2026"

# Response:
{
  "id": "photo_xyz789",
  "tree_id": "abc123",
  "original_path": "farm1/abc123/original/2026_05_28_001.jpg",
  "thumbnail_path": "farm1/abc123/thumb/2026_05_28_001.jpg",
  "file_size": 2048000,
  "uploaded_at": "2026-05-28T09:30:00"
}

# 2. Gửi AI phân tích
curl -X POST http://homeserver:8000/api/v1/ai/fruit-count \
  -H "Content-Type: application/json" \
  -d '{"photo_id": "photo_xyz789"}'

# Response (job queued):
{
  "job_id": "job_456",
  "status": "processing",
  "estimated_time_seconds": 15
}

# 3. Check kết quả
curl http://homeserver:8000/api/v1/ai/jobs/job_456

# Response (completed):
{
  "job_id": "job_456",
  "status": "completed",
  "result": {
    "fruit_count": 42,
    "confidence": 0.87,
    "details": [
      {"x": 120, "y": 340, "w": 45, "h": 50, "confidence": 0.92},
      {"x": 280, "y": 150, "w": 38, "h": 42, "confidence": 0.85}
    ],
    "annotated_image_path": "farm1/abc123/ai_ready/2026_05_28_001_annotated.jpg"
  },
  "model": "llama3.2-vision",
  "processing_time_ms": 12400
}
```

---

## 6. AI Pipeline

### 6.1 Kiến trúc AI

```
Photo Upload/Sync
       │
       ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ FastAPI       │────▶│ Redis Queue     │────▶│ AI Worker    │
│ (enqueue job) │     │ (job queue)     │     │ (Python)     │
└──────────────┘     └─────────────────┘     └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │ Ollama       │
                                              │ (LLM server) │
                                              │              │
                                              │ Models:      │
                                              │ • llama3.2-  │
                                              │   vision     │
                                              │ • yolov8     │
                                              │   (future)   │
                                              └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │ Results      │
                                              │ → SQLite     │
                                              │ → Annotated  │
                                              │   image file │
                                              └──────────────┘
```

### 6.2 AI Use Cases (Hiện tại + Tương lai)

| Use Case | Model | Input | Output | Priority |
|---|---|---|---|---|
| **Đếm trái sầu riêng** | `llama3.2-vision` | Ảnh cây | `{count, bounding_boxes}` | ⭐ Cao |
| **Phát hiện bệnh lá** | `llama3.2-vision` | Ảnh lá/thân | `{disease, confidence, recommendation}` | ⭐ Cao |
| **Đánh giá sức khỏe tổng** | `llama3.2-vision` | Ảnh toàn cây | `{health_score, issues[]}` | Trung bình |
| **Auto-label training data** | Vision model | Ảnh + prompt | Annotations (YOLO format) | Thấp (tương lai) |
| **Trend analysis** | LLM text | Seasonal stats | Báo cáo xu hướng | Thấp (tương lai) |

### 6.3 AI Worker Code Skeleton

```python
# ai_worker.py
import ollama
from rq import Queue
from redis import Redis

redis_conn = Redis()
q = Queue(connection=redis_conn)

def analyze_fruit_count(photo_path: str, photo_id: str):
    """Đếm trái sầu riêng bằng Vision LLM"""
    
    response = ollama.chat(
        model='llama3.2-vision',
        messages=[{
            'role': 'user',
            'content': (
                'Bạn là chuyên gia nông nghiệp sầu riêng. '
                'Đếm số lượng trái sầu riêng trong ảnh. '
                'Trả về JSON: {"fruit_count": <số>, '
                '"confidence": <0-1>, "notes": "<ghi chú>"}'
            ),
            'images': [photo_path]
        }],
        format='json'
    )
    
    result = json.loads(response['message']['content'])
    
    # Lưu kết quả vào SQLite
    save_ai_result(photo_id, 'fruit_count', result)
    
    return result

def analyze_tree_health(photo_path: str, photo_id: str):
    """Kiểm tra sức khỏe cây từ ảnh"""
    
    response = ollama.chat(
        model='llama3.2-vision',
        messages=[{
            'role': 'user',
            'content': (
                'Phân tích sức khỏe cây sầu riêng trong ảnh. '
                'Kiểm tra: lá vàng, sâu bệnh, nấm, rụng lá, stress nước. '
                'Trả về JSON: {"health_score": <1-10>, '
                '"issues": [{"type": "...", "severity": "low/medium/high", '
                '"recommendation": "..."}], '
                '"overall": "Excellent/Good/Fair/Poor"}'
            ),
            'images': [photo_path]
        }],
        format='json'
    )
    
    result = json.loads(response['message']['content'])
    save_ai_result(photo_id, 'health_check', result)
    
    return result
```

---

## 7. Sync Strategy: Firebase ↔ Homeserver

### 7.1 Chiến lược đồng bộ

```
Firebase (nguồn chính) ───────────▶ Homeserver (bản sao + AI)
         │                                    │
         │  ①  Scheduled sync                │  ④  AI results
         │     (mỗi 15 phút hoặc manual)     │     push back
         │                                    │
         ▼                                    ▼
   Trees, Photos metadata           SQLite + Photo files
   Seasonal Stats                   AI analysis results
   Zones, Investments               Reports, annotations
```

| Hướng | Data | Tần suất |
|---|---|---|
| Firebase → Homeserver | Trees, photos, stats, zones | Mỗi 15 phút (cron) hoặc manual trigger |
| Firebase → Homeserver | Photo files (download) | Khi sync metadata phát hiện ảnh mới |
| Homeserver → Firebase | AI fruit count, health assessment | Khi AI job hoàn thành |

### 7.2 Sync Flow

```python
# sync_service.py — chạy định kỳ hoặc khi user trigger

async def sync_from_firebase():
    """Đồng bộ data từ Firebase về homeserver"""
    
    # 1. Lấy trees có updatedAt > last_sync_time
    firebase_trees = await firebase_client.get_updated_trees(since=last_sync)
    
    for tree in firebase_trees:
        upsert_tree_to_sqlite(tree)
    
    # 2. Lấy photos mới
    new_photos = await firebase_client.get_new_photos(since=last_sync)
    
    for photo in new_photos:
        # Download file từ Firebase Storage
        file_path = await download_photo(photo.storage_path)
        
        # Tạo thumbnail + compressed locally
        create_thumbnail(file_path)
        create_compressed(file_path)
        
        # Lưu metadata vào SQLite
        upsert_photo_to_sqlite(photo, file_path)
        
        # Auto-queue AI analysis nếu photo_type = fruit_count
        if photo.photo_type == 'fruit_count':
            queue_ai_job(photo.id, 'fruit_count')
    
    # 3. Cập nhật sync timestamp
    update_last_sync_time()
```

> [!IMPORTANT]
> **Firebase là "nguồn sự thật" (source of truth)** cho data cây trồng. Homeserver là bản mirror + AI processor. Nếu có conflict, Firebase wins — trừ AI results (homeserver wins).

---

## 8. Docker Compose Config

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ── FastAPI Application ──────────────────
  app:
    build: .
    restart: unless-stopped
    command: >
      gunicorn main:app 
      -w 2 
      -k uvicorn.workers.UvicornWorker 
      --bind 0.0.0.0:8000
      --timeout 120
    volumes:
      - ./data:/app/data           # SQLite DB + photos
      - ./logs:/app/logs
    environment:
      - DATABASE_URL=sqlite:///app/data/farm_data.db
      - PHOTO_STORAGE_PATH=/app/data/photos
      - OLLAMA_HOST=http://ollama:11434
      - REDIS_URL=redis://redis:6379
      - FIREBASE_SERVICE_ACCOUNT=/app/config/firebase-sa.json
      - SYNC_INTERVAL_MINUTES=15
    depends_on:
      - redis
      - ollama
    expose:
      - "8000"

  # ── AI Worker (background jobs) ──────────
  worker:
    build: .
    restart: unless-stopped
    command: rq worker --url redis://redis:6379
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:///app/data/farm_data.db
      - PHOTO_STORAGE_PATH=/app/data/photos
      - OLLAMA_HOST=http://ollama:11434
    depends_on:
      - redis
      - ollama

  # ── Redis (job queue) ────────────────────
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  # ── Ollama (AI inference) ────────────────
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    # GPU support (uncomment nếu có NVIDIA GPU):
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

  # ── Caddy (reverse proxy) ────────────────
  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  redis_data:
  ollama_data:
  caddy_data:
  caddy_config:
```

**Caddyfile:**
```
# Nếu dùng domain:
farm-ai.yourdomain.com {
    reverse_proxy app:8000
    encode gzip
}

# Hoặc chỉ dùng local IP (không HTTPS):
:80 {
    reverse_proxy app:8000
    encode gzip
}
```

**Dockerfile:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    libsqlite3-dev \
    libjpeg-turbo-progs \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Create data directories
RUN mkdir -p /app/data/photos /app/logs

EXPOSE 8000
```

**requirements.txt:**
```
fastapi==0.115.*
uvicorn[standard]==0.34.*
gunicorn==23.*
sqlalchemy==2.0.*
alembic==1.14.*
pydantic==2.10.*
python-multipart==0.0.18
Pillow==11.*
ollama==0.4.*
rq==2.1.*
redis==5.*
firebase-admin==6.*
httpx==0.28.*
```

---

## 9. Cấu Trúc Project

```
farm-ai-hub/
├── docker-compose.yml
├── Dockerfile
├── Caddyfile
├── requirements.txt
├── main.py                      ← FastAPI app entry
│
├── app/
│   ├── __init__.py
│   ├── config.py                ← Settings (env vars)
│   ├── database.py              ← SQLite connection + session
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── trees.py             ← /api/v1/trees/*
│   │   ├── photos.py            ← /api/v1/photos/*
│   │   ├── ai.py                ← /api/v1/ai/*
│   │   ├── sync.py              ← /api/v1/sync/*
│   │   └── reports.py           ← /api/v1/reports/*
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── tree.py              ← SQLAlchemy + Pydantic models
│   │   ├── photo.py
│   │   ├── ai_job.py
│   │   └── sync_log.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── tree_service.py
│   │   ├── photo_service.py     ← Upload, compress, thumbnail
│   │   ├── ai_service.py        ← Ollama integration
│   │   ├── sync_service.py      ← Firebase sync logic
│   │   └── report_service.py
│   │
│   └── workers/
│       ├── __init__.py
│       └── ai_worker.py         ← RQ worker cho AI jobs
│
├── migrations/                   ← Alembic migrations
│   └── versions/
│
├── config/
│   ├── firebase-sa.json         ← Firebase Service Account (gitignore!)
│   └── .env                     ← Environment variables
│
├── data/                         ← Persistent storage (Docker volume)
│   ├── farm_data.db             ← SQLite database
│   └── photos/                  ← Photo files
│
├── scripts/
│   ├── setup_ollama.sh          ← Pull AI models
│   ├── initial_sync.sh          ← First-time Firebase import
│   └── backup.sh                ← rsync to backup drive
│
└── tests/
    ├── test_api.py
    ├── test_ai.py
    └── test_sync.py
```

---

## 10. Hardware Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **CPU** | 4 cores (x86_64) | 8+ cores |
| **RAM** | 4GB | 8-16GB (cho AI models) |
| **Storage** | 100GB SSD | 500GB+ SSD/HDD |
| **GPU** | Không bắt buộc | NVIDIA GPU 6GB+ VRAM (tăng tốc AI 5-10x) |
| **Network** | LAN 100Mbps | Gigabit Ethernet |

> [!NOTE]
> **Không có GPU?** Ollama vẫn chạy được trên CPU, chỉ chậm hơn (~30-60s/ảnh thay vì 3-5s). Hoàn toàn chấp nhận được cho dự án cá nhân.

---

## 11. Lộ Trình Triển Khai

### Phase 1: Foundation (1-2 ngày)
- [ ] Cài Docker + Docker Compose trên Ubuntu
- [ ] Setup FastAPI + SQLite + schema
- [ ] API CRUD cơ bản: trees, photos
- [ ] Photo upload + thumbnail generation
- [ ] Test local: `docker compose up`

### Phase 2: Firebase Sync (1 ngày)
- [ ] Cài Firebase Admin SDK
- [ ] Viết sync service (trees + photos download)
- [ ] Cron job sync mỗi 15 phút
- [ ] Test: data từ Firebase xuất hiện trong SQLite

### Phase 3: AI Integration (1-2 ngày)
- [ ] Cài Ollama + pull `llama3.2-vision`
- [ ] Setup Redis + RQ worker
- [ ] Viết AI endpoints: fruit-count, health-check
- [ ] Test: upload ảnh → nhận kết quả AI

### Phase 4: Polish (1 ngày)
- [ ] Caddy reverse proxy
- [ ] Tailscale cho remote access
- [ ] Backup script (rsync)
- [ ] Monitoring: `/health` endpoint + basic logging

### Phase 5: Frontend Integration (tương lai)
- [ ] Farm Dashboard gọi homeserver API cho AI features
- [ ] Hiển thị AI results trong FullscreenTreeShowcase
- [ ] Auto-sync trigger khi user upload ảnh mới

---

## 12. Lưu Ý Quan Trọng

> [!WARNING]
> **Security cho dự án cá nhân:**
> - **KHÔNG expose port ra internet** nếu không có Tailscale/VPN
> - Firebase Service Account key phải nằm trong `.gitignore`
> - Nếu dùng domain + Caddy → Caddy tự lo HTTPS
> - Dùng API key đơn giản (header `X-API-Key`) thay vì full auth system

> [!CAUTION]
> **SQLite concurrent writes:**
> - Bật **WAL mode**: `PRAGMA journal_mode=WAL;`
> - FastAPI + 1 AI worker đồng thời → OK với WAL
> - Nếu scale lên > 3 writers → migrate sang PostgreSQL

> [!TIP]
> **Backup strategy đơn giản:**
> ```bash
> # Chạy hàng ngày (cron):
> rsync -avz /data/photos/ /backup-drive/farm-photos/
> cp /data/farm_data.db /backup-drive/farm-data-$(date +%Y%m%d).db
> ```

---

*Đề xuất này tối ưu cho dự án cá nhân: đơn giản, nhẹ, tập trung vào AI analysis. Có thể scale lên bằng cách thêm GPU và swap models khi cần.*

---

## Appendix A — PocketBase: Phân Tích Chuyên Sâu

> Phân tích PocketBase như phương án thay thế hoặc bổ sung cho FastAPI stack, với focus vào use case Farm Dashboard + AI.

### A.1 PocketBase Là Gì?

PocketBase là **Backend-as-a-Service (BaaS) dạng single binary**, viết bằng Go, gói gọn trong 1 file duy nhất:

```
pocketbase (17MB binary)
├── SQLite Database        ← Relational DB, auto-managed
├── REST + Realtime API    ← CRUD + WebSocket/SSE subscriptions
├── Auth System            ← Email/password + 15+ OAuth2 providers
├── File Storage           ← Local disk hoặc S3-compatible
├── Admin Dashboard        ← UI quản lý đẹp, chạy trên :8090/_/
└── JS/Go Hooks            ← Extend business logic
```

**Chạy:**
```bash
# Chỉ 1 lệnh duy nhất:
./pocketbase serve --http=0.0.0.0:8090

# Xong. Backend hoàn chỉnh đang chạy.
```

---

### A.2 Điểm Mạnh Cho Use Case Farm Dashboard

| Điểm mạnh | Chi tiết |
|---|---|
| **⚡ Setup 5 phút** | Download binary → chạy → có backend. Không cần Docker, Python, Node, hay bất cứ gì |
| **🎨 Admin UI sẵn** | Dashboard đẹp tại `/_/` — tạo collections, quản lý data, xem logs. Giống Firebase Console nhưng tự host |
| **📁 File storage built-in** | Upload ảnh qua API → tự lưu + tự generate thumbnail. Hỗ trợ cả S3 |
| **🔄 Real-time** | `pb.collection('trees').subscribe('*', callback)` — giống Firestore `onSnapshot`. Farm Dashboard dùng pattern này rồi |
| **🔐 Auth sẵn** | Email/password, OAuth — migrate từ Firebase Auth dễ hơn |
| **💾 ~30MB RAM** | Nhẹ hơn FastAPI stack đáng kể |
| **🔗 SDK chính thức** | JavaScript SDK → Next.js integration trực tiếp |
| **📦 Backup = copy file** | Cả database + files nằm trong 1 thư mục `pb_data/` |

### A.3 Điểm Yếu & Rủi Ro

| Điểm yếu | Mức độ | Ảnh hưởng đến dự án |
|---|---|---|
| **Không có Python** | 🔴 Nghiêm trọng | AI/ML cần Python — phải chạy service riêng |
| **Pre-v1.0** | 🟠 Trung bình | API có thể thay đổi giữa versions, cần manual migration khi upgrade |
| **Solo maintainer** | 🟠 Trung bình | 1 người phát triển (Gani Georgiev) — bus factor risk |
| **No horizontal scale** | 🟢 Không ảnh hưởng | Dự án cá nhân, 1 server đủ |
| **JS hooks hạn chế** | 🟠 Trung bình | Có thể extend bằng JS/Go nhưng không mạnh bằng viết code Python thuần |
| **Không có Python SDK chính thức** | 🟡 Nhẹ | Dùng `httpx` gọi REST API — OK nhưng không tiện bằng SDK |

---

### A.4 Kiến Trúc PocketBase + AI Sidecar

Vì PocketBase không chạy Python, AI phải là **service riêng** chạy song song:

```
┌──────────────────────────────────────────────────────────────┐
│                    Ubuntu Homeserver                           │
│                                                               │
│  ┌─────────────────────┐      ┌────────────────────────────┐ │
│  │  PocketBase (:8090)  │      │  Python AI Worker (:8001)  │ │
│  │                      │      │                            │ │
│  │  Collections:        │ HTTP │  FastAPI (mini)            │ │
│  │  • trees             │◀────▶│  • /process/fruit-count    │ │
│  │  • photos            │      │  • /process/health-check   │ │
│  │  • seasonal_stats    │      │                            │ │
│  │  • ai_jobs           │      │  ┌──────────────────────┐  │ │
│  │  • sync_log          │      │  │ Ollama Client        │  │ │
│  │                      │      │  │ → llama3.2-vision    │  │ │
│  │  File Storage:       │      │  └──────────────────────┘  │ │
│  │  pb_data/storage/    │      │                            │ │
│  │  (ảnh cây trồng)    │      │  ┌──────────────────────┐  │ │
│  │                      │      │  │ Redis Queue          │  │ │
│  │  JS Hooks:           │      │  │ (background jobs)    │  │ │
│  │  pb_hooks/           │      │  └──────────────────────┘  │ │
│  │  • ai_trigger.js     │      │                            │ │
│  └─────────────────────┘      └────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────┐      ┌────────────────────────────┐ │
│  │  Ollama (:11434)     │      │  Caddy (Reverse Proxy)     │ │
│  │  AI inference engine │      │  :80 / :443                │ │
│  └──────────────────────┘      └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Luồng hoạt động:**
```
1. User upload ảnh qua Farm Dashboard
         │
         ▼
2. PocketBase nhận file → lưu vào pb_data/storage/
   → Tạo record trong collection "photos"
         │
         ▼
3. JS Hook (onRecordAfterCreate) trigger:
   → Gọi HTTP POST tới Python Worker
         │
         ▼
4. Python Worker:
   a. Đọc ảnh từ PocketBase (GET /api/files/...)
   b. Gửi tới Ollama để phân tích
   c. Nhận kết quả AI
   d. Gọi PocketBase API để update record "ai_jobs"
         │
         ▼
5. Farm Dashboard subscribe real-time:
   → Nhận update ngay khi AI hoàn thành
```

---

### A.5 PocketBase Collections Schema

Tạo qua Admin UI (`http://homeserver:8090/_/`) hoặc qua Go/JS hooks:

```
Collection: trees
├── id                    (auto, text)
├── firebase_id           (text, unique)
├── farm_id               (text, required)
├── name                  (text)
├── variety               (text)
├── qr_code               (text)
├── latitude              (number)
├── longitude             (number)
├── gps_accuracy          (number)
├── zone_code             (text)
├── zone_name             (text)
├── health_status         (select: Excellent/Good/Fair/Poor)
├── tree_status           (select: young/mature/old)
├── needs_attention       (bool)
├── tree_height           (number)
├── trunk_diameter        (number)
├── planting_date         (date)
├── notes                 (editor)
├── health_notes          (editor)
├── firebase_updated_at   (date)
└── created/updated       (auto)

Collection: photos
├── id                    (auto, text)
├── tree                  (relation → trees, required)
├── farm_id               (text, required)
├── photo                 (file, required)          ← PB tự quản lý!
├── photo_type            (select: general/health/fruit_count)
├── season_year           (number)
├── latitude              (number)
├── longitude             (number)
├── firebase_photo_id     (text)
├── ai_analyzed           (bool, default: false)
├── ai_fruit_count        (number)
├── ai_health_assessment  (json)
├── ai_raw_response       (json)
└── created/updated       (auto)

Collection: seasonal_stats
├── id                    (auto, text)
├── tree                  (relation → trees, required)
├── season_year           (number, required)
├── manual_fruit_count    (number, default: 0)
├── ai_fruit_count        (number, default: 0)
├── health_status         (text)
├── notes                 (editor)
└── created/updated       (auto)
  ↳ Unique index: (tree, season_year)

Collection: ai_jobs
├── id                    (auto, text)
├── photo                 (relation → photos)
├── job_type              (select: fruit_count/health_check/general)
├── status                (select: pending/processing/completed/failed)
├── model_name            (text)
├── prompt                (text)
├── result                (json)
├── error_message         (text)
├── processing_time_ms    (number)
├── completed_at          (date)
└── created/updated       (auto)

Collection: sync_log
├── id                    (auto, text)
├── entity_type           (select: tree/photo/seasonal_stats)
├── entity_id             (text)
├── direction             (select: firebase_to_local/local_to_firebase)
├── status                (select: success/failed/conflict)
├── details               (json)
└── created               (auto)
```

---

### A.6 JS Hooks — Auto-Trigger AI

```javascript
// pb_hooks/ai_trigger.js
/// <reference path="../pb_data/types.d.ts" />

// Khi photo mới được tạo → tự động gửi AI phân tích
onRecordAfterCreate((e) => {
    const record = e.record;
    const photoType = record.get("photo_type");
    
    // Chỉ auto-analyze ảnh fruit_count và health
    if (photoType === "fruit_count" || photoType === "health") {
        
        // Tạo AI job record
        const aiJobsCollection = $app.findCollectionByNameOrId("ai_jobs");
        const job = new Record(aiJobsCollection);
        job.set("photo", record.id);
        job.set("job_type", photoType === "fruit_count" ? "fruit_count" : "health_check");
        job.set("status", "pending");
        job.set("model_name", "llama3.2-vision");
        $app.save(job);
        
        // Notify Python AI worker
        try {
            $http.send({
                url: "http://ai-worker:8001/process",
                method: "POST",
                body: JSON.stringify({
                    job_id: job.id,
                    photo_id: record.id,
                    photo_type: photoType,
                    // PocketBase file URL
                    photo_url: $app.settings().meta.appURL + 
                        "/api/files/" + record.collectionId + 
                        "/" + record.id + "/" + record.get("photo")
                }),
                headers: { 
                    "Content-Type": "application/json",
                    "X-API-Key": $os.getenv("AI_WORKER_API_KEY")
                },
                timeout: 5 // 5 seconds timeout
            });
        } catch (err) {
            // Worker không available — job vẫn pending, sẽ retry sau
            $app.logger().error("AI Worker unreachable", "error", err);
        }
    }
}, "photos");
```

```javascript
// pb_hooks/firebase_sync.js
/// <reference path="../pb_data/types.d.ts" />

// Cron job: sync từ Firebase mỗi 15 phút
cronAdd("firebase_sync", "*/15 * * * *", () => {
    try {
        const result = $http.send({
            url: "http://ai-worker:8001/sync/firebase",
            method: "POST",
            headers: { "X-API-Key": $os.getenv("AI_WORKER_API_KEY") },
            timeout: 300 // 5 min timeout cho sync
        });
        
        $app.logger().info("Firebase sync completed", "result", result.raw);
    } catch (err) {
        $app.logger().error("Firebase sync failed", "error", err);
    }
});
```

---

### A.7 Frontend Integration: Next.js + PocketBase

```typescript
// lib/pocketbase.ts
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
// e.g. 'http://homeserver:8090' hoặc 'https://farm-ai.yourdomain.com'

export default pb;
```

```typescript
// Ví dụ: Real-time subscribe tree updates
import pb from '@/lib/pocketbase';

// Trong component React:
useEffect(() => {
    // Subscribe tất cả thay đổi trees
    pb.collection('trees').subscribe('*', (e) => {
        if (e.action === 'update') {
            // AI vừa cập nhật fruit count → refresh UI
            console.log('Tree updated:', e.record);
            refreshTreeData(e.record.id);
        }
    });
    
    return () => pb.collection('trees').unsubscribe('*');
}, []);
```

```typescript
// Upload ảnh trực tiếp tới PocketBase
async function uploadPhoto(file: File, treeId: string, photoType: string) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('tree', treeId);
    formData.append('photo_type', photoType);
    formData.append('season_year', '2026');
    formData.append('farm_id', currentFarm.id);
    
    const record = await pb.collection('photos').create(formData);
    // → JS Hook tự động trigger AI analysis
    // → Client subscribe sẽ nhận kết quả real-time
    return record;
}
```

```typescript
// Lấy ảnh từ PocketBase (có thumbnail tự động)
function getPhotoUrl(record: any, filename: string, thumb?: string) {
    // PocketBase tự generate thumbnail!
    return pb.files.getURL(record, filename, { thumb: thumb || '200x200' });
}
```

---

### A.8 Docker Compose: PocketBase + AI Stack

```yaml
# docker-compose.pocketbase.yml
services:
  # ── PocketBase (Database + API + Files + Admin) ──
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    restart: unless-stopped
    ports:
      - "8090:8090"
    volumes:
      - pb_data:/pb/pb_data           # Database + uploaded files
      - ./pb_hooks:/pb/pb_hooks       # JS hooks
      - ./pb_migrations:/pb/pb_migrations
    environment:
      - AI_WORKER_API_KEY=${AI_WORKER_API_KEY}
    command: serve --http=0.0.0.0:8090

  # ── Python AI Worker ──
  ai-worker:
    build: ./ai-worker
    restart: unless-stopped
    expose:
      - "8001"
    volumes:
      - pb_data:/pb/pb_data:ro        # Read-only access to photo files
      - ai_cache:/app/cache
    environment:
      - POCKETBASE_URL=http://pocketbase:8090
      - POCKETBASE_ADMIN_EMAIL=${PB_ADMIN_EMAIL}
      - POCKETBASE_ADMIN_PASSWORD=${PB_ADMIN_PASSWORD}
      - OLLAMA_HOST=http://ollama:11434
      - AI_WORKER_API_KEY=${AI_WORKER_API_KEY}
      - FIREBASE_SERVICE_ACCOUNT=/app/config/firebase-sa.json
    depends_on:
      - pocketbase
      - ollama

  # ── Ollama (AI) ──
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama

  # ── Caddy (Reverse Proxy) ──
  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - pocketbase
      - ai-worker

volumes:
  pb_data:
  ai_cache:
  ollama_data:
  caddy_data:
```

**Caddyfile cho PocketBase:**
```
:80 {
    # PocketBase API + Admin UI
    handle /api/* {
        reverse_proxy pocketbase:8090
    }
    handle /_/* {
        reverse_proxy pocketbase:8090
    }
    
    # AI Worker endpoints
    handle /ai/* {
        reverse_proxy ai-worker:8001
    }
    
    # Default: PocketBase
    handle {
        reverse_proxy pocketbase:8090
    }
    
    encode gzip
}
```

---

### A.9 So Sánh Chi Tiết: FastAPI vs PocketBase

| Tiêu chí | FastAPI + SQLite | PocketBase + AI Sidecar |
|---|---|---|
| **Thời gian lên MVP** | 2-3 ngày | ⭐ 1 ngày |
| **Admin UI** | ❌ Phải tự build hoặc dùng SQLite Browser | ⭐ Built-in, đẹp, functional |
| **Real-time** | ❌ Phải thêm WebSocket/SSE manually | ⭐ Built-in, 1 dòng code subscribe |
| **Photo management** | ⚠️ Tự code upload/thumbnail/serve | ⭐ Built-in, auto thumbnail |
| **Auth** | ❌ Phải tự implement | ⭐ Built-in (email, OAuth) |
| **AI integration** | ⭐ Trực tiếp trong cùng codebase | ⚠️ 2 services riêng, giao tiếp HTTP |
| **Firebase sync** | ⭐ Python SDK chính thức | ⚠️ Phải gọi qua Python sidecar |
| **Code phức tạp** | Trung bình (~20 files) | ⭐ Ít hơn (~5 files JS hooks + AI worker) |
| **Debugging AI** | ⭐ Cùng 1 process, dễ debug | ⚠️ 2 process, xem log 2 nơi |
| **Số containers Docker** | 4 (app, worker, redis, ollama) | 4 (pb, ai-worker, ollama, caddy) |
| **RAM tổng** | ~150-200MB | ~100-150MB |
| **Mở rộng AI phức tạp** | ⭐ Dễ — cùng Python | ⚠️ OK nhưng boundary rõ ràng |
| **Backup** | `cp data/ backup/` | `cp pb_data/ backup/` |
| **Migrate away** | Trung bình (custom code) | Dễ (SQLite standard) |
| **Community** | Rất lớn (Python + FastAPI) | Nhỏ hơn, đang grow nhanh |
| **Stability** | Stable (FastAPI 0.115+) | ⚠️ Pre-v1.0 |
| **Học thêm** | Python, SQLAlchemy, Alembic | PocketBase SDK, JS hooks, Go (optional) |

---

### A.10 Khi Nào Chọn PocketBase?

#### ✅ Chọn PocketBase NẾU:

1. **Muốn có backend hoạt động NGAY trong 30 phút** — không cần viết API, schema setup qua UI
2. **Cần real-time subscriptions** — Farm Dashboard đã dùng pattern `onSnapshot` của Firebase → PocketBase subscribe tương tự
3. **Muốn admin dashboard đẹp** — xem/sửa data, quản lý users trực quan
4. **Photo là feature chính** — PocketBase xử lý file upload/serve/thumbnail tốt hơn tự code
5. **AI chỉ là feature phụ** — chạy AI sidecar khi cần, không phải core
6. **Có thể thay thế Firebase luôn** — PocketBase làm được hầu hết những gì Firebase làm (auth, db, storage, real-time)

#### ❌ KHÔNG chọn PocketBase NẾU:

1. **AI là mục tiêu chính** — cần iterate nhanh trên AI pipeline, debug thuận tiện
2. **Muốn 1 codebase duy nhất** — PocketBase bắt buộc phải tách AI thành service riêng
3. **Cần custom query phức tạp** — PocketBase filter syntax đơn giản hơn SQL thuần
4. **Lo ngại stability** — pre-v1.0, breaking changes có thể xảy ra

---

### A.11 Recommendation Update

Sau khi phân tích sâu PocketBase, tôi cập nhật khuyến nghị:

```
┌─────────────────────────────────────────────────────────────┐
│                    QUYẾT ĐỊNH MATRIX                         │
│                                                              │
│  "Tôi muốn AI là trọng tâm,      → FastAPI + SQLite        │
│   data hub phục vụ AI analysis"     (Phương án A - gốc)     │
│                                                              │
│  "Tôi muốn backend thay thế       → PocketBase + AI Sidecar│
│   Firebase luôn, AI là bonus"       (Phương án C)            │
│                                                              │
│  "Tôi muốn cả hai: backend đẹp    → PocketBase + FastAPI   │
│   + AI mạnh + ít maintenance"       AI Worker               │
│                                     (Phương án C+)           │
└─────────────────────────────────────────────────────────────┘
```

> [!TIP]
> **Nếu bạn chưa quyết:** Bắt đầu với **PocketBase** (30 phút có backend). Khi cần AI, thêm Python sidecar. PocketBase rất dễ backup/migrate nếu sau này muốn chuyển sang full FastAPI.

> [!IMPORTANT]
> **Lưu ý quan trọng về PocketBase:**
> - Vẫn đang **pre-v1.0** — chấp nhận rủi ro breaking changes
> - Solo maintainer — project có thể bị abandon (tuy nhiên community rất active)
> - Nếu dùng thay Firebase hoàn toàn: cần migration password (Firebase dùng scrypt, PocketBase dùng bcrypt → force password reset)

