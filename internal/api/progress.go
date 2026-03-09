package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"vocab-learn/internal/middleware"
)

type ProgressHandler struct {
	db *sql.DB
}

func NewProgressHandler(db *sql.DB) *ProgressHandler {
	return &ProgressHandler{db: db}
}

type cardEntry struct {
	CardKey string          `json:"card_key"`
	Data    json.RawMessage `json:"data"`
}

// Get serves GET /api/progress/{lang} — returns all cards for the user+lang.
func (h *ProgressHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	lang := r.PathValue("lang")

	rows, err := h.db.Query(
		"SELECT card_key, data FROM progress WHERE user_id = ? AND lang = ?",
		userID, lang,
	)
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	cards := make(map[string]json.RawMessage)
	for rows.Next() {
		var key string
		var data string
		if err := rows.Scan(&key, &data); err != nil {
			http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
			return
		}
		cards[key] = json.RawMessage(data)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cards)
}

// Put serves PUT /api/progress/{lang} — upserts a batch of cards.
// Body: {"cards": {"word::mode": {sm2 data}, ...}}
func (h *ProgressHandler) Put(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	lang := r.PathValue("lang")

	var body struct {
		Cards map[string]json.RawMessage `json:"cards"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO progress (user_id, lang, card_key, data, updated_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, lang, card_key)
		DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
	`)
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer stmt.Close()

	for key, data := range body.Cards {
		if _, err := stmt.Exec(userID, lang, key, string(data)); err != nil {
			http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// Delete serves DELETE /api/progress/{lang} — deletes all cards for the user+lang.
func (h *ProgressHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	lang := r.PathValue("lang")

	_, err := h.db.Exec(
		"DELETE FROM progress WHERE user_id = ? AND lang = ?",
		userID, lang,
	)
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// DeleteAll serves DELETE /api/progress — deletes all cards for the user.
func (h *ProgressHandler) DeleteAll(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())

	_, err := h.db.Exec("DELETE FROM progress WHERE user_id = ?", userID)
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
