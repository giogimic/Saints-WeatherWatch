package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/saints-weatherwatch/backend/internal/progress"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

const (
	CookieName    = "ww_session"
	SessionTTL    = 30 * 24 * time.Hour
	bcryptCost    = 10
	ctxUserKey    = contextKey("wwUser")
	ctxSessionKey = contextKey("wwSession")
)

type contextKey string

type UserView struct {
	ID                 string   `json:"id"`
	ChaserName         string   `json:"chaserName"`
	Email              *string  `json:"email,omitempty"`
	EquippedVehicleKey string   `json:"equippedVehicleKey"`
	XP                 int      `json:"xp"`
	Level              int      `json:"level"`
	XPIntoLevel        int      `json:"xpIntoLevel"`
	XPForNext          int      `json:"xpForNext"`
	LevelTitle         string   `json:"levelTitle"`
	CreatedAt          string   `json:"createdAt"`
	VehicleKeys        []string `json:"vehicleKeys"`
}

func NormalizeName(name string) string {
	return strings.ToLower(strings.TrimSpace(name))
}

func HashPIN(pin string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pin), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func CheckPIN(hash, pin string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pin)) == nil
}

func ValidPIN(pin string) bool {
	if len(pin) != 4 {
		return false
	}
	for _, c := range pin {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func NewToken() (raw string, hash string, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(buf)
	sum := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(sum[:])
	return raw, hash, nil
}

func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func SetSessionCookie(w http.ResponseWriter, r *http.Request, raw string, expires time.Time) {
	secure := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    raw,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  expires,
		MaxAge:   int(time.Until(expires).Seconds()),
	})
}

func ClearSessionCookie(w http.ResponseWriter, r *http.Request) {
	secure := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func UserFromContext(ctx context.Context) (*db.UserModel, bool) {
	u, ok := ctx.Value(ctxUserKey).(*db.UserModel)
	return u, ok && u != nil
}

func WithUser(ctx context.Context, u *db.UserModel) context.Context {
	return context.WithValue(ctx, ctxUserKey, u)
}

func LoadUserFromRequest(st *store.Store, r *http.Request) (*db.UserModel, *db.SessionModel, error) {
	if st == nil {
		return nil, nil, nil
	}
	c, err := r.Cookie(CookieName)
	if err != nil || c.Value == "" {
		return nil, nil, nil
	}
	hash := HashToken(c.Value)
	sess, err := st.Client.Session.FindUnique(db.Session.TokenHash.Equals(hash)).Exec(r.Context())
	if err != nil || sess == nil {
		return nil, nil, nil
	}
	if sess.ExpiresAt.Before(time.Now().UTC()) {
		_, _ = st.Client.Session.FindUnique(db.Session.ID.Equals(sess.ID)).Delete().Exec(r.Context())
		return nil, nil, nil
	}
	user, err := st.Client.User.FindUnique(db.User.ID.Equals(sess.UserID)).Exec(r.Context())
	if err != nil || user == nil {
		return nil, nil, nil
	}
	return user, sess, nil
}

func Middleware(st *store.Store) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, _, _ := LoadUserFromRequest(st, r)
			if user != nil {
				r = r.WithContext(WithUser(r.Context(), user))
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := UserFromContext(r.Context()); !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func ToUserView(st *store.Store, ctx context.Context, u *db.UserModel) UserView {
	keys := []string{}
	if st != nil && u != nil {
		_ = progress.BackfillFromAttempts(st, ctx, u.ID)
		if refreshed, err := st.Client.User.FindUnique(db.User.ID.Equals(u.ID)).Exec(ctx); err == nil && refreshed != nil {
			u = refreshed
		}
		rows, err := st.Client.UserVehicle.FindMany(db.UserVehicle.UserID.Equals(u.ID)).Exec(ctx)
		if err == nil {
			for _, row := range rows {
				keys = append(keys, row.VehicleKey)
			}
		}
	}
	var email *string
	if v, ok := u.Email(); ok {
		email = &v
	}
	xp := u.Xp
	level := u.Level
	if level < 1 {
		level = progress.LevelFromXP(xp)
	}
	into, need := progress.XPProgress(xp)
	return UserView{
		ID:                 u.ID,
		ChaserName:         u.ChaserName,
		Email:              email,
		EquippedVehicleKey: u.EquippedVehicleKey,
		XP:                 xp,
		Level:              level,
		XPIntoLevel:        into,
		XPForNext:          need,
		LevelTitle:         progress.Title(level),
		CreatedAt:          u.CreatedAt.UTC().Format(time.RFC3339),
		VehicleKeys:        keys,
	}
}
