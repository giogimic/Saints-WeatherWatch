package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/cams"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

type AddCustomCamRequest struct {
	Title      string  `json:"title"`
	StreamType string  `json:"streamType"`
	FeedURL    string  `json:"feedUrl"`
	Lat        float64 `json:"lat,omitempty"`
	Lng        float64 `json:"lng,omitempty"`
}

func getCustomCamsHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		customCams, err := st.Client.UserCamera.FindMany().Exec(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		res := make([]cams.CameraMeta, 0, len(customCams))
		for _, cam := range customCams {
			meta := cams.CameraMeta{
				ID:          "custom_" + cam.ID,
				Title:       cam.Title,
				Group:       "cams",
				Category:    "other",
				Attribution: "👤 Community Added",
				Status:      "online",
				Health:      "ok",
				SourceURL:   cam.FeedURL,
				Type:        cam.StreamType,
				LastUpdated: cam.CreatedAt.Format(time.RFC3339),
			}
			
			lat, okLat := cam.Lat()
			lng, okLng := cam.Lng()
			if okLat && okLng {
				meta.Lat = lat
				meta.Lng = lng
			}

			if cam.StreamType == "iframe" {
				meta.EmbedURL = cam.FeedURL
			} else if cam.StreamType == "burst" {
				meta.BurstURLs = []string{cam.FeedURL}
			} else {
				meta.ImageURL = cam.FeedURL
			}

			res = append(res, meta)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
	}
}

func addCustomCamHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		user, ok := auth.UserFromContext(ctx)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req AddCustomCamRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.FeedURL) == "" {
			http.Error(w, "missing title or feedUrl", http.StatusBadRequest)
			return
		}
		
		stype := req.StreamType
		if stype != "image" && stype != "burst" && stype != "iframe" {
			stype = "image"
		}

		var ops []db.UserCameraSetParam
		if req.Lat != 0 || req.Lng != 0 {
			ops = append(ops, db.UserCamera.Lat.Set(req.Lat), db.UserCamera.Lng.Set(req.Lng))
		}

		newCam, err := st.Client.UserCamera.CreateOne(
			db.UserCamera.Title.Set(req.Title),
			db.UserCamera.StreamType.Set(stype),
			db.UserCamera.FeedURL.Set(req.FeedURL),
			db.UserCamera.User.Link(db.User.ID.Equals(user.ID)),
			ops...
		).Exec(ctx)

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(newCam)
	}
}

func downvoteCustomCamHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		id := chi.URLParam(r, "id")
		
		// ID comes prefixed with "custom_" from the frontend
		id = strings.TrimPrefix(id, "custom_")

		// Identify voter
		user, ok := auth.UserFromContext(ctx)
		clientIP := r.Header.Get("X-Forwarded-For")
		if clientIP == "" {
			clientIP = r.RemoteAddr
		}
		if idx := strings.IndexByte(clientIP, ','); idx >= 0 {
			clientIP = clientIP[:idx]
		}
		if idx := strings.LastIndexByte(clientIP, ':'); idx >= 0 {
			clientIP = clientIP[:idx]
		}

		// Check if camera exists
		_, err := st.Client.UserCamera.FindUnique(db.UserCamera.ID.Equals(id)).Exec(ctx)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		// Enforce unique downvote
		var existingVote *db.UserCameraDownvoteModel
		if ok {
			existingVote, _ = st.Client.UserCameraDownvote.FindFirst(
				db.UserCameraDownvote.UserCameraID.Equals(id),
				db.UserCameraDownvote.UserID.Equals(user.ID),
			).Exec(ctx)
		} else {
			existingVote, _ = st.Client.UserCameraDownvote.FindFirst(
				db.UserCameraDownvote.UserCameraID.Equals(id),
				db.UserCameraDownvote.ClientIP.Equals(clientIP),
			).Exec(ctx)
		}

		if existingVote != nil {
			// Already voted
			w.WriteHeader(http.StatusConflict)
			return
		}

		// Create vote
		var voteOps []db.UserCameraDownvoteSetParam
		if ok {
			voteOps = append(voteOps, db.UserCameraDownvote.User.Link(db.User.ID.Equals(user.ID)))
		} else {
			voteOps = append(voteOps, db.UserCameraDownvote.ClientIP.Set(clientIP))
		}

		_, err = st.Client.UserCameraDownvote.CreateOne(
			db.UserCameraDownvote.UserCamera.Link(db.UserCamera.ID.Equals(id)),
			voteOps...
		).Exec(ctx)
		
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Increment downvote count safely
		updatedCam, err := st.Client.UserCamera.FindUnique(db.UserCamera.ID.Equals(id)).Update(
			db.UserCamera.Downvotes.Increment(1),
		).Exec(ctx)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Check removal threshold
		if updatedCam.Downvotes >= 25 {
			_, _ = st.Client.UserCamera.FindUnique(db.UserCamera.ID.Equals(id)).Delete().Exec(ctx)
		}

		w.WriteHeader(http.StatusOK)
	}
}
