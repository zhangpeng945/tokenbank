.PHONY: install dev migrate migrate-new backend frontend up down logs

# ── Backend ───────────────────────────────────────────────
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev: backend

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

# ── Database ──────────────────────────────────────────────
# External PostgreSQL: 192.168.100.221:31432, database: tokenshare
migrate:
	cd backend && alembic upgrade head

migrate-new:
	cd backend && alembic revision --autogenerate -m "$(m)"

# ── Docker (backend + frontend only; DB and Redis are external) ───
up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=100
