package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

type FriendsAPI struct {
	st *store.Store
}

func NewFriendsAPI(st *store.Store) *FriendsAPI {
	return &FriendsAPI{st: st}
}

func (a *FriendsAPI) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(auth.Middleware(a.st))
	r.Get("/", a.listFriends)
	r.Post("/", a.addFriend)
	r.Delete("/{id}", a.removeFriend)
	return r
}

type friendView struct {
	ID         string    `json:"id"`
	FriendID   string    `json:"friendId"`
	ChaserName string    `json:"chaserName"`
	CreatedAt  time.Time `json:"createdAt"`
}

func (a *FriendsAPI) listFriends(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ctx := r.Context()

	friendships, err := a.st.Client.Friendship.FindMany(
		db.Friendship.UserID.Equals(user.ID),
	).With(
		db.Friendship.Friend.Fetch(),
	).Exec(ctx)

	if err != nil {
		http.Error(w, "Failed to load friends", http.StatusInternalServerError)
		return
	}

	out := make([]friendView, 0, len(friendships))
	for _, f := range friendships {
		out = append(out, friendView{
			ID:         f.ID,
			FriendID:   f.FriendID,
			ChaserName: f.Friend().ChaserName,
			CreatedAt:  f.CreatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

type addFriendReq struct {
	ChaserName string `json:"chaserName"`
}

func (a *FriendsAPI) addFriend(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ctx := r.Context()

	var req addFriendReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.ChaserName == "" || req.ChaserName == user.ChaserName {
		http.Error(w, "Invalid chaser name", http.StatusBadRequest)
		return
	}

	friend, err := a.st.Client.User.FindUnique(
		db.User.ChaserName.Equals(req.ChaserName),
	).Exec(ctx)

	if err != nil || friend == nil {
		http.Error(w, "Chaser not found", http.StatusNotFound)
		return
	}

	// Check if already friends
	existing, _ := a.st.Client.Friendship.FindUnique(
		db.Friendship.UserIDFriendID(
			db.Friendship.UserID.Equals(user.ID),
			db.Friendship.FriendID.Equals(friend.ID),
		),
	).Exec(ctx)

	if existing != nil {
		http.Error(w, "Already friends", http.StatusConflict)
		return
	}

	// Create mutual friendships
	_, err = a.st.Client.Friendship.CreateOne(
		db.Friendship.User.Link(db.User.ID.Equals(user.ID)),
		db.Friendship.Friend.Link(db.User.ID.Equals(friend.ID)),
	).Exec(ctx)

	if err != nil {
		http.Error(w, "Failed to add friend", http.StatusInternalServerError)
		return
	}

	_, _ = a.st.Client.Friendship.CreateOne(
		db.Friendship.User.Link(db.User.ID.Equals(friend.ID)),
		db.Friendship.Friend.Link(db.User.ID.Equals(user.ID)),
	).Exec(ctx)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (a *FriendsAPI) removeFriend(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.UserFromContext(r.Context())
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	ctx := r.Context()
	friendshipID := chi.URLParam(r, "id")

	// Find the friendship to get the friendID
	f, err := a.st.Client.Friendship.FindUnique(
		db.Friendship.ID.Equals(friendshipID),
	).Exec(ctx)

	if err != nil || f == nil {
		http.Error(w, "Friendship not found", http.StatusNotFound)
		return
	}

	if f.UserID != user.ID {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	// Delete both directions
	_, _ = a.st.Client.Friendship.FindUnique(
		db.Friendship.ID.Equals(f.ID),
	).Delete().Exec(ctx)

	_, _ = a.st.Client.Friendship.FindUnique(
		db.Friendship.UserIDFriendID(
			db.Friendship.UserID.Equals(f.FriendID),
			db.Friendship.FriendID.Equals(f.UserID),
		),
	).Delete().Exec(ctx)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
