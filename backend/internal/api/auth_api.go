package api

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
	"github.com/saints-weatherwatch/backend/internal/vehicles"
	"github.com/saints-weatherwatch/backend/internal/world"
)

type authBody struct {
	ChaserName string  `json:"chaserName"`
	Pin        string  `json:"pin"`
	Email      *string `json:"email,omitempty"`
}

func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func signupHandler(st *store.Store, limiter *auth.PINLimiter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}
		var req authBody
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		name := strings.TrimSpace(req.ChaserName)
		if len(name) < 3 || len(name) > 24 {
			http.Error(w, "Chaser name must be 3–24 characters", http.StatusBadRequest)
			return
		}
		if !auth.ValidPIN(req.Pin) {
			http.Error(w, "PIN must be exactly 4 digits", http.StatusBadRequest)
			return
		}
		norm := auth.NormalizeName(name)
		existing, _ := st.Client.User.FindUnique(db.User.ChaserNameNorm.Equals(norm)).Exec(r.Context())
		if existing != nil {
			http.Error(w, "That chaser name is taken", http.StatusConflict)
			return
		}

		pinHash, err := auth.HashPIN(req.Pin)
		if err != nil {
			http.Error(w, "Could not secure PIN", http.StatusInternalServerError)
			return
		}

		opts := []db.UserSetParam{
			db.User.EquippedVehicleKey.Set(vehicles.StarterKey),
		}
		if req.Email != nil {
			em := strings.TrimSpace(strings.ToLower(*req.Email))
			if em != "" {
				opts = append(opts, db.User.Email.Set(em))
			}
		}

		user, err := st.Client.User.CreateOne(
			db.User.ChaserName.Set(name),
			db.User.ChaserNameNorm.Set(norm),
			db.User.PinHash.Set(pinHash),
			append(opts, db.User.StormCredits.Set(world.StartingCredits))...,
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Could not create account", http.StatusInternalServerError)
			return
		}
		_ = vehicles.Grant(st, r.Context(), user.ID, vehicles.StarterKey) // starter always granted

		if err := issueSession(w, r, st, user); err != nil {
			http.Error(w, "Account created but session failed", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(auth.ToUserView(st, r.Context(), user))
	}
}

func loginHandler(st *store.Store, limiter *auth.PINLimiter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}
		var req authBody
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		ip := clientIP(r)
		if ok, wait := limiter.Allowed(ip, req.ChaserName); !ok {
			w.Header().Set("Retry-After", strings.TrimSuffix(wait.Round(time.Second).String(), "0s"))
			http.Error(w, "Too many attempts — try again later", http.StatusTooManyRequests)
			return
		}
		norm := auth.NormalizeName(req.ChaserName)
		user, err := st.Client.User.FindUnique(db.User.ChaserNameNorm.Equals(norm)).Exec(r.Context())
		if err != nil || user == nil || !auth.ValidPIN(req.Pin) || !auth.CheckPIN(user.PinHash, req.Pin) {
			limiter.Fail(ip, req.ChaserName)
			http.Error(w, "Invalid chaser name or PIN", http.StatusUnauthorized)
			return
		}
		limiter.Success(ip, req.ChaserName)
		if err := issueSession(w, r, st, user); err != nil {
			http.Error(w, "Login failed", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(auth.ToUserView(st, r.Context(), user))
	}
}

func logoutHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if st != nil {
			if c, err := r.Cookie(auth.CookieName); err == nil && c.Value != "" {
				hash := auth.HashToken(c.Value)
				_, _ = st.Client.Session.FindUnique(db.Session.TokenHash.Equals(hash)).Delete().Exec(r.Context())
			}
		}
		auth.ClearSessionCookie(w, r)
		w.WriteHeader(http.StatusNoContent)
	}
}

func meHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			_ = json.NewEncoder(w).Encode(map[string]any{"user": nil})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"user": auth.ToUserView(st, r.Context(), user),
		})
	}
}

func issueSession(w http.ResponseWriter, r *http.Request, st *store.Store, user *db.UserModel) error {
	raw, hash, err := auth.NewToken()
	if err != nil {
		return err
	}
	expires := time.Now().UTC().Add(auth.SessionTTL)
	_, err = st.Client.Session.CreateOne(
		db.Session.TokenHash.Set(hash),
		db.Session.ExpiresAt.Set(expires),
		db.Session.User.Link(db.User.ID.Equals(user.ID)),
	).Exec(r.Context())
	if err != nil {
		return err
	}
	auth.SetSessionCookie(w, r, raw, expires)
	return nil
}

func vehiclesCatalogHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(vehicles.Catalog)
	}
}

type equipBody struct {
	VehicleKey string `json:"vehicleKey"`
}

func equipVehicleHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		var req equipBody
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !vehicles.IsKnown(req.VehicleKey) {
			http.Error(w, "Invalid vehicle", http.StatusBadRequest)
			return
		}
		owned, err := st.Client.UserVehicle.FindFirst(
			db.UserVehicle.UserID.Equals(user.ID),
			db.UserVehicle.VehicleKey.Equals(req.VehicleKey),
		).Exec(r.Context())
		if err != nil || owned == nil {
			http.Error(w, "Vehicle locked", http.StatusForbidden)
			return
		}
		updated, err := st.Client.User.FindUnique(db.User.ID.Equals(user.ID)).Update(
			db.User.EquippedVehicleKey.Set(req.VehicleKey),
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Could not equip", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(auth.ToUserView(st, r.Context(), updated))
	}
}
