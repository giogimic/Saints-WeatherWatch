package world

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/saints-weatherwatch/backend/internal/geo"
	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/radar"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

const (
	ResearchTickEvery   = 20 * time.Second
	ResearchStationHold = 25 * time.Second
	ResearchRadiusMi    = 40.0
	ResearchCooldown    = 10 * time.Minute
	ResearchItemKey     = "research_sample"
	ResearchMaxDriftDeg = 0.08
)

// ResearchStatus is a read-only HUD hint for time-on-station study.
type ResearchStatus struct {
	Studying bool   `json:"studying"`
	AlertID  string `json:"alertId,omitempty"`
	Headline string `json:"headline,omitempty"`
	Severity string `json:"severity,omitempty"`
	HoldSec  int    `json:"holdSec,omitempty"`
	NeedSec  int    `json:"needSec,omitempty"`
	Note     string `json:"note,omitempty"`
}

// ResearchLogRow is the personal research database API shape.
type ResearchLogRow struct {
	ID        string  `json:"id"`
	AlertID   string  `json:"alertId"`
	Headline  string  `json:"headline"`
	Severity  string  `json:"severity"`
	Area      string  `json:"area"`
	ItemKey   string  `json:"itemKey"`
	Qty       int     `json:"qty"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	CreatedAt string  `json:"createdAt"`
}

func (r *Room) tickResearch() {
	if r == nil || r.nws == nil {
		return
	}
	payload := r.nws.Get()
	alerts := actionableAlerts(payload.Alerts)

	r.mu.Lock()
	clients := make([]*client, 0, len(r.clients))
	for c := range r.clients {
		clients = append(clients, c)
	}
	r.mu.Unlock()

	for _, c := range clients {
		r.evaluateResearch(c, alerts)
	}
}

func actionableAlerts(in []nws.Alert) []nws.Alert {
	out := make([]nws.Alert, 0, len(in))
	for _, a := range in {
		if strings.EqualFold(a.Status, "expired") {
			continue
		}
		if a.CentroidLat == nil && a.CentroidLon == nil && a.Geometry == nil {
			continue
		}
		out = append(out, a)
	}
	return out
}

func (r *Room) evaluateResearch(c *client, alerts []nws.Alert) {
	if c == nil || c.userID == "" || !c.welcomed {
		return
	}

	match, approx := nearestMatchingAlert(c.lat, c.lng, alerts)
	need := int(ResearchStationHold.Seconds())

	if match == nil {
		c.stationAlertID = ""
		c.stationSince = time.Time{}
		c.stationLat, c.stationLng = 0, 0
		r.sendResearch(c, ResearchStatus{
			Studying: false,
			NeedSec:  need,
			Note:     "Drive near an active alert cell to study (SIM research · real WX context).",
		})
		return
	}

	now := time.Now()
	drift := abs(c.lat-c.stationLat) + abs(c.lng-c.stationLng)
	if c.stationAlertID != match.ID || c.stationSince.IsZero() || drift > ResearchMaxDriftDeg {
		c.stationAlertID = match.ID
		c.stationSince = now
		c.stationLat = c.lat
		c.stationLng = c.lng
	}

	hold := int(now.Sub(c.stationSince).Seconds())
	if hold < 0 {
		hold = 0
	}
	status := ResearchStatus{
		Studying: true,
		AlertID:  match.ID,
		Headline: match.Headline,
		Severity: match.Severity, // display copy only — never mutates NWS
		HoldSec:  hold,
		NeedSec:  need,
		Note:     researchNote(approx),
	}

	if hold < need {
		r.sendResearch(c, status)
		return
	}

	if !c.lastResearchAt.IsZero() && now.Sub(c.lastResearchAt) < ResearchCooldown {
		status.Note = "Study cooldown — keep logging or move to another cell."
		r.sendResearch(c, status)
		return
	}

	bonus := 0
	noteBonus := ""
	if r.radar != nil {
		st, err := r.radar.Status(radar.DefaultFocus.Lat, radar.DefaultFocus.Lon)
		if err == nil && st != nil && st.LatestScan != nil && st.LatestScan.AgeSec < 300 {
			bonus = 1
			noteBonus = " · Fresh Radar Bonus!"
		}
	}

	qty := 1 + bonus
	if err := GrantStack(r.st, context.Background(), c.userID, ResearchItemKey, qty); err != nil {
		log.Printf("world.research grant failed user=%s: %v", c.userID, err)
		status.Note = "Research grant failed — try again shortly."
		r.sendResearch(c, status)
		return
	}
	r.awardPickupXP(c.userID, ResearchItemKey)
	_ = appendResearchLog(r.st, context.Background(), c, match, qty)

	c.lastResearchAt = now
	c.lastResearchAlert = match.ID
	c.stationSince = now

	status.Note = fmt.Sprintf("Sample logged · +%d research sample (SIM loot · real alert context)%s", qty, noteBonus)
	r.sendResearch(c, status)
	r.toast(c, "RESEARCH · sampled nearby alert cell")
}

func researchNote(approx bool) string {
	if approx {
		return "Studying alert centroid (approx) — SIM research, severity unchanged."
	}
	return "Studying alert geometry — SIM research, severity unchanged."
}

func nearestMatchingAlert(lat, lng float64, alerts []nws.Alert) (*nws.Alert, bool) {
	var best *nws.Alert
	bestApprox := false
	bestDist := 1e9
	for i := range alerts {
		a := &alerts[i]
		ok, approx := geo.AlertMatchesRadius(lat, lng, ResearchRadiusMi, a.CentroidLat, a.CentroidLon, a.Geometry)
		if !ok {
			continue
		}
		d := 0.0
		if a.CentroidLat != nil && a.CentroidLon != nil {
			d = geo.HaversineMiles(lat, lng, *a.CentroidLat, *a.CentroidLon)
		}
		if best == nil || d < bestDist {
			best = a
			bestApprox = approx
			bestDist = d
		}
	}
	return best, bestApprox
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
}

func (r *Room) sendResearch(c *client, st ResearchStatus) {
	if c == nil {
		return
	}
	b, err := json.Marshal(Envelope{Type: "research", Research: &st})
	if err != nil {
		return
	}
	select {
	case c.send <- b:
	default:
	}
}

func appendResearchLog(st *store.Store, ctx context.Context, c *client, a *nws.Alert, qty int) error {
	if st == nil || c == nil || a == nil {
		return nil
	}
	_, err := st.Client.ResearchLogEntry.CreateOne(
		db.ResearchLogEntry.AlertID.Set(a.ID),
		db.ResearchLogEntry.Headline.Set(truncStr(a.Headline, 240)),
		db.ResearchLogEntry.Severity.Set(a.Severity),
		db.ResearchLogEntry.Area.Set(truncStr(a.Area, 160)),
		db.ResearchLogEntry.ItemKey.Set(ResearchItemKey),
		db.ResearchLogEntry.Lat.Set(c.lat),
		db.ResearchLogEntry.Lng.Set(c.lng),
		db.ResearchLogEntry.User.Link(db.User.ID.Equals(c.userID)),
		db.ResearchLogEntry.Qty.Set(qty),
	).Exec(ctx)
	if err != nil {
		log.Printf("world.research log failed user=%s: %v", c.userID, err)
	}
	return err
}

func truncStr(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// ListResearchLog returns newest personal research rows.
func ListResearchLog(st *store.Store, ctx context.Context, userID string, limit int) []ResearchLogRow {
	out := []ResearchLogRow{}
	if st == nil || userID == "" {
		return out
	}
	if limit <= 0 || limit > 100 {
		limit = 40
	}
	rows, err := st.Client.ResearchLogEntry.FindMany(
		db.ResearchLogEntry.UserID.Equals(userID),
	).OrderBy(
		db.ResearchLogEntry.CreatedAt.Order(db.SortOrderDesc),
	).Take(limit).Exec(ctx)
	if err != nil {
		return out
	}
	for _, row := range rows {
		out = append(out, ResearchLogRow{
			ID:        row.ID,
			AlertID:   row.AlertID,
			Headline:  row.Headline,
			Severity:  row.Severity,
			Area:      row.Area,
			ItemKey:   row.ItemKey,
			Qty:       row.Qty,
			Lat:       row.Lat,
			Lng:       row.Lng,
			CreatedAt: row.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	return out
}
