package main

import (
	"crypto/rand"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"vocab-learn/internal/api"
	"vocab-learn/internal/db"
)

func main() {
	port := envOr("PORT", "8080")
	dataDir := envOr("DATA_DIR", "./data")
	dbPath := envOr("DB_PATH", "./vocab-learn.db")
	jwtSecret := loadSecret()
	distDir := envOr("DIST_DIR", "./frontend/dist")

	database, err := db.Open(dbPath)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer database.Close()

	apiRouter := api.NewRouter(database, jwtSecret, dataDir)

	mux := http.NewServeMux()

	// API routes
	mux.Handle("/api/", apiRouter)

	// Static files (production): serve built frontend
	if info, err := os.Stat(distDir); err == nil && info.IsDir() {
		spa := spaHandler{root: http.Dir(distDir)}
		mux.Handle("/", spa)
		log.Printf("serving frontend from %s", distDir)
	} else {
		// Dev mode: no static serving, Vite handles it
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				http.NotFound(w, r)
				return
			}
			http.Error(w, "frontend not built — use Vite dev server", http.StatusNotFound)
		})
		log.Printf("no dist dir found at %s — API-only mode", distDir)
	}

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadSecret() []byte {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return []byte(s)
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Fatal(err)
	}
	log.Println("warning: using random JWT_SECRET (set JWT_SECRET env var for persistence)")
	return b
}

// spaHandler serves static files, falling back to index.html for SPA routing.
type spaHandler struct {
	root http.FileSystem
}

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Try to serve the exact file.
	f, err := h.root.Open(r.URL.Path)
	if err != nil {
		h.serveIndex(w, r)
		return
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		h.serveIndex(w, r)
		return
	}

	// If it's a directory (e.g. /study), serve index.html for SPA routing.
	if stat.IsDir() {
		h.serveIndex(w, r)
		return
	}

	http.ServeContent(w, r, stat.Name(), stat.ModTime(), f.(io.ReadSeeker))
}

func (h spaHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	f, err := h.root.Open("/index.html")
	if err != nil {
		http.Error(w, "index.html not found", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	stat, _ := f.Stat()
	http.ServeContent(w, r, "index.html", stat.ModTime(), f.(io.ReadSeeker))
}
