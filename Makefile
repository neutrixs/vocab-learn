.PHONY: dev-server dev-frontend build clean

dev-server:
	DB_DIR=./devdata go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

build:
	cd frontend && npm run build
	go build -o bin/server ./cmd/server

clean:
	rm -rf bin frontend/dist
