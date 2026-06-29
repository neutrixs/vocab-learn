package api

import (
	"net/http"
	"os"
	"path/filepath"
)

type TextsHandler struct {
	dataDir string
}

func NewTextsHandler(dataDir string) *TextsHandler {
	return &TextsHandler{dataDir: dataDir}
}

// Index serves GET /api/texts/{lang} → data/{lang}/texts/_index.json
func (h *TextsHandler) Index(w http.ResponseWriter, r *http.Request) {
	lang := r.PathValue("lang")
	if !isCleanSegment(lang) {
		http.Error(w, `{"error":"invalid lang"}`, http.StatusBadRequest)
		return
	}

	path := filepath.Join(h.dataDir, lang, "texts", "_index.json")
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// Topics serves GET /api/texts/{lang}/topics → data/{lang}/texts/_topics.json
func (h *TextsHandler) Topics(w http.ResponseWriter, r *http.Request) {
	lang := r.PathValue("lang")
	if !isCleanSegment(lang) {
		http.Error(w, `{"error":"invalid lang"}`, http.StatusBadRequest)
		return
	}

	path := filepath.Join(h.dataDir, lang, "texts", "_topics.json")
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// Text serves GET /api/texts/{lang}/{id} → data/{lang}/texts/{id}.json
func (h *TextsHandler) Text(w http.ResponseWriter, r *http.Request) {
	lang := r.PathValue("lang")
	id := r.PathValue("id")
	if !isCleanSegment(lang) || !isCleanSegment(id) {
		http.Error(w, `{"error":"invalid path"}`, http.StatusBadRequest)
		return
	}

	path := filepath.Join(h.dataDir, lang, "texts", id+".json")
	data, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}
