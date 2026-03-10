package api

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"vocab-learn/internal/middleware"
)

type SettingsHandler struct {
	db *sql.DB
}

func NewSettingsHandler(db *sql.DB) *SettingsHandler {
	return &SettingsHandler{db: db}
}

type userSettings struct {
	MaxNewWordsPerDay int `json:"max_new_words_per_day"`
}

var defaultSettings = userSettings{MaxNewWordsPerDay: 10}

// Get serves GET /api/settings — returns the user's settings.
func (h *SettingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())

	var data string
	err := h.db.QueryRow(
		"SELECT data FROM user_settings WHERE user_id = ?", userID,
	).Scan(&data)

	w.Header().Set("Content-Type", "application/json")

	if err == sql.ErrNoRows {
		json.NewEncoder(w).Encode(defaultSettings)
		return
	}
	if err != nil {
		log.Printf("settings get: %v", err)
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	// Parse stored JSON and fill in any missing defaults.
	var s userSettings
	if err := json.Unmarshal([]byte(data), &s); err != nil {
		log.Printf("settings parse: %v", err)
		json.NewEncoder(w).Encode(defaultSettings)
		return
	}
	if s.MaxNewWordsPerDay < 1 {
		s.MaxNewWordsPerDay = defaultSettings.MaxNewWordsPerDay
	}

	json.NewEncoder(w).Encode(s)
}

// Put serves PUT /api/settings — upserts the user's settings.
func (h *SettingsHandler) Put(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())

	var s userSettings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return
	}

	if s.MaxNewWordsPerDay < 1 || s.MaxNewWordsPerDay > 50 {
		http.Error(w, `{"error":"max_new_words_per_day must be between 1 and 50"}`, http.StatusBadRequest)
		return
	}

	data, err := json.Marshal(s)
	if err != nil {
		log.Printf("settings marshal: %v", err)
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	_, err = h.db.Exec(`
		INSERT INTO user_settings (user_id, data, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id)
		DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
	`, userID, string(data))
	if err != nil {
		log.Printf("settings upsert: %v", err)
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
