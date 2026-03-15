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

// Get serves GET /api/progress/{lang} — returns cards + stats for the user+lang.
// Response: {"cards": {...}, "stats": {...}}
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
		raw := json.RawMessage(data)
		if !json.Valid(raw) {
			continue
		}
		cards[key] = raw
	}

	// Fetch stats.
	var statsJSON json.RawMessage
	var statsStr string
	err = h.db.QueryRow(
		"SELECT data FROM lang_stats WHERE user_id = ? AND lang = ?",
		userID, lang,
	).Scan(&statsStr)
	if err == nil {
		statsJSON = json.RawMessage(statsStr)
	}
	// If no row or error, statsJSON stays nil → encoded as null.

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"cards": cards,
		"stats": statsJSON,
	})
}

// Put serves PUT /api/progress/{lang} — upserts a batch of cards and optionally stats.
// Body: {"cards": {"word::mode": {sm2 data}, ...}, "stats": {...}}
func (h *ProgressHandler) Put(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	lang := r.PathValue("lang")

	var body struct {
		Cards map[string]json.RawMessage `json:"cards"`
		Stats json.RawMessage            `json:"stats"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return
	}

	// Validate each card has the required SM2 fields.
	for key, raw := range body.Cards {
		var card struct {
			Due     *string  `json:"due"`
			Created *string  `json:"created"`
			EF      *float64 `json:"ease_factor"`
			Iv      *int     `json:"interval"`
			Reps    *int     `json:"repetitions"`
		}
		if err := json.Unmarshal(raw, &card); err != nil || card.Due == nil || card.Created == nil || card.EF == nil || card.Iv == nil || card.Reps == nil {
			http.Error(w, `{"error":"invalid card: `+key+`"}`, http.StatusBadRequest)
			return
		}
	}

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if len(body.Cards) > 0 {
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
	}

	// Upsert stats if provided.
	if len(body.Stats) > 0 && string(body.Stats) != "null" {
		_, err := tx.Exec(`
			INSERT INTO lang_stats (user_id, lang, data, updated_at)
			VALUES (?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT (user_id, lang)
			DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
		`, userID, lang, string(body.Stats))
		if err != nil {
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

// Delete serves DELETE /api/progress/{lang} — deletes all cards and stats for the user+lang.
func (h *ProgressHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())
	lang := r.PathValue("lang")

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM progress WHERE user_id = ? AND lang = ?", userID, lang); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec("DELETE FROM lang_stats WHERE user_id = ? AND lang = ?", userID, lang); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}

// DeleteAll serves DELETE /api/progress — deletes all cards and stats for the user.
func (h *ProgressHandler) DeleteAll(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r.Context())

	tx, err := h.db.Begin()
	if err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM progress WHERE user_id = ?", userID); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}
	if _, err := tx.Exec("DELETE FROM lang_stats WHERE user_id = ?", userID); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"ok":true}`))
}
