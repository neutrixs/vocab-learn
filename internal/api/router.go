package api

import (
	"database/sql"
	"net/http"

	"vocab-learn/internal/middleware"
)

func NewRouter(db *sql.DB, jwtSecret []byte, dataDir string) http.Handler {
	mux := http.NewServeMux()

	auth := NewAuthHandler(db, jwtSecret)
	words := NewWordsHandler(dataDir)
	progress := NewProgressHandler(db)
	settings := NewSettingsHandler(db)

	requireAuth := middleware.Auth(jwtSecret)

	// Auth (public)
	mux.HandleFunc("POST /api/auth/register", auth.Register)
	mux.HandleFunc("POST /api/auth/login", auth.Login)

	// Words (public)
	mux.HandleFunc("GET /api/words/{lang}", words.Index)
	mux.HandleFunc("GET /api/words/{lang}/{word}", words.Word)

	// Progress (authenticated)
	mux.Handle("GET /api/progress/{lang}", requireAuth(http.HandlerFunc(progress.Get)))
	mux.Handle("PUT /api/progress/{lang}", requireAuth(http.HandlerFunc(progress.Put)))
	mux.Handle("DELETE /api/progress/{lang}", requireAuth(http.HandlerFunc(progress.Delete)))
	mux.Handle("DELETE /api/progress", requireAuth(http.HandlerFunc(progress.DeleteAll)))

	// Settings (authenticated)
	mux.Handle("GET /api/settings", requireAuth(http.HandlerFunc(settings.Get)))
	mux.Handle("PUT /api/settings", requireAuth(http.HandlerFunc(settings.Put)))

	return mux
}
