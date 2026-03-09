package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type WordsHandler struct {
	dataDir string
}

func NewWordsHandler(dataDir string) *WordsHandler {
	return &WordsHandler{dataDir: dataDir}
}

// Index serves GET /api/words/{lang} → _index.json
func (h *WordsHandler) Index(w http.ResponseWriter, r *http.Request) {
	lang := r.PathValue("lang")
	if !isCleanSegment(lang) {
		http.Error(w, `{"error":"invalid lang"}`, http.StatusBadRequest)
		return
	}

	path := filepath.Join(h.dataDir, lang, "_index.json")
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// Word serves GET /api/words/{lang}/{word} → {word}.json
func (h *WordsHandler) Word(w http.ResponseWriter, r *http.Request) {
	lang := r.PathValue("lang")
	word := r.PathValue("word")
	if !isCleanSegment(lang) || !isCleanSegment(word) {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}

	path := filepath.Join(h.dataDir, lang, word+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// isCleanSegment rejects path traversal attempts.
func isCleanSegment(s string) bool {
	return s != "" &&
		!strings.Contains(s, "/") &&
		!strings.Contains(s, "\\") &&
		s != "." && s != ".."
}
