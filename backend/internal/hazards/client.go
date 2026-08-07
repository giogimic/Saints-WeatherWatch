package hazards

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	nwpsGaugeURL     = "https://api.water.noaa.gov/nwps/v1/gauges/%s"
	usgsQuakeURL     = "https://earthquake.usgs.gov/fdsnws/event/1/query"
	usgsWaterDataURL = "https://waterdata.usgs.gov/monitoring-location/USGS-%s/#dataTypeId=continuous-00065-0"
	usgsIVServiceURL = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=%s&parameterCd=00065,00060"
)

// Corridor NWPS AHPS & USGS Water Data gauges (St. John Valley / Aroostook first).
var corridorGauges = []nwpsGaugeRef{
	{LID: "DICM1", USGSID: "01010000", Label: "St. John River at Dickey"},
	{LID: "NINM1", USGSID: "01010070", Label: "St. John River at Nine Mile Bridge"},
	{LID: "ALLM1", USGSID: "01011000", Label: "Allagash River above Allagash"},
	{LID: "FTKM1", USGSID: "01010500", Label: "St. John River at Fort Kent"},
	{LID: "FIHM1", USGSID: "01013500", Label: "Fish River at Fort Kent"},
	{LID: "MASM1", USGSID: "01015800", Label: "Aroostook River at Masardis"},
	{LID: "WSHM1", USGSID: "01017000", Label: "Aroostook River at Washburn"},
	{LID: "LMRM1", USGSID: "01016500", Label: "Little Madawaska near Caribou"},
	{LID: "SJEB3", USGSID: "", Label: "St. John River at Edmundston"},
}

type Client struct {
	UserAgent string
	HTTP      *http.Client
}

func NewClient(userAgent string) *Client {
	return &Client{
		UserAgent: userAgent,
		HTTP:      &http.Client{Timeout: 25 * time.Second},
	}
}

func (c *Client) FetchSnapshot() (*Snapshot, error) {
	now := time.Now().UTC()
	flood, ferr := c.fetchFloodGauges()
	quakes, qerr := c.fetchQuakes(now.Add(-7 * 24 * time.Hour))

	var notes []string
	if ferr != nil {
		notes = append(notes, "flood: "+ferr.Error())
	}
	if qerr != nil {
		notes = append(notes, "quakes: "+qerr.Error())
	}
	if ferr != nil && qerr != nil {
		return nil, fmt.Errorf("hazards fetch failed: %s", strings.Join(notes, "; "))
	}

	snap := &Snapshot{
		GeneratedAt: now.Format(time.RFC3339),
		SourceNote:  "Flood stages & water data from USGS Water Data & NOAA NWPS; quakes from USGS FDSN (M≥2.5, 7d, ME corridor bbox). Fire/smoke deferred when no stable open feed.",
		Flood:       flood,
		Quakes:      quakes,
		Fire:        []Incident{},
	}
	if len(notes) > 0 {
		snap.SourceNote += " Partial: " + strings.Join(notes, "; ")
	}

	actionable := 0
	for _, g := range flood {
		if g.Severity != "" && g.Severity != "info" && g.Severity != "unknown" {
			actionable++
		}
	}
	snap.FloodActionable = actionable
	snap.FloodGaugeCount = len(flood)
	snap.QuakeCount = len(quakes)
	snap.FireCount = 0

	all := make([]Incident, 0, len(flood)+len(quakes))
	all = append(all, flood...)
	all = append(all, quakes...)
	snap.Incidents = all
	return snap, nil
}

func (c *Client) fetchFloodGauges() ([]Incident, error) {
	out := make([]Incident, 0, len(corridorGauges))
	var errs []string
	for _, ref := range corridorGauges {
		inc, err := c.fetchOneGauge(ref)
		if err != nil {
			errs = append(errs, ref.LID+": "+err.Error())
			continue
		}
		if inc != nil {
			out = append(out, *inc)
		}
	}
	if len(out) == 0 && len(errs) > 0 {
		return nil, fmt.Errorf("%s", strings.Join(errs, "; "))
	}
	return out, nil
}

type nwpsGauge struct {
	LID      string  `json:"lid"`
	USGSID   string  `json:"usgsId"`
	Name     string  `json:"name"`
	Lat      float64 `json:"latitude"`
	Lon      float64 `json:"longitude"`
	Status   struct {
		Observed *nwpsObs `json:"observed"`
	} `json:"status"`
	Flood struct {
		StageUnits string `json:"stageUnits"`
		Categories struct {
			Action   *nwpsCat `json:"action"`
			Minor    *nwpsCat `json:"minor"`
			Moderate *nwpsCat `json:"moderate"`
			Major    *nwpsCat `json:"major"`
		} `json:"categories"`
	} `json:"flood"`
}

type nwpsObs struct {
	Primary       float64 `json:"primary"`
	PrimaryUnit   string  `json:"primaryUnit"`
	Secondary     float64 `json:"secondary"`
	SecondaryUnit string  `json:"secondaryUnit"`
	FloodCategory string  `json:"floodCategory"`
	ValidTime     string  `json:"validTime"`
}

type nwpsCat struct {
	Stage float64 `json:"stage"`
	Flow  float64 `json:"flow"`
}

func (c *Client) fetchOneGauge(ref nwpsGaugeRef) (*Incident, error) {
	u := fmt.Sprintf(nwpsGaugeURL, url.PathEscape(ref.LID))
	var g nwpsGauge
	if err := c.getJSON(u, &g); err != nil || g.LID == "" {
		if ref.USGSID != "" {
			return c.fetchOneUSGSGauge(ref)
		}
		if err != nil {
			return nil, err
		}
		return nil, fmt.Errorf("empty gauge")
	}
	name := g.Name
	if ref.Label != "" {
		name = ref.Label
	}
	obs := g.Status.Observed
	stage := 0.0
	unit := "ft"
	cat := "unknown"
	observedAt := ""
	if obs != nil {
		stage = obs.Primary
		if obs.PrimaryUnit != "" {
			unit = obs.PrimaryUnit
		}
		cat = obs.FloodCategory
		observedAt = obs.ValidTime
	}
	sev := severityFromNWPS(cat, stage, g)
	usgsID := g.USGSID
	if usgsID == "" {
		usgsID = ref.USGSID
	}
	srcURL := fmt.Sprintf("https://water.noaa.gov/gauges/%s", strings.ToLower(g.LID))
	meta := map[string]any{
		"lid":           g.LID,
		"usgsId":        usgsID,
		"stage":         stage,
		"stageUnit":     unit,
		"floodCategory": cat,
	}
	if usgsID != "" {
		u := fmt.Sprintf(usgsWaterDataURL, usgsID)
		meta["usgsUrl"] = u
		srcURL = u
	}
	if obs != nil && obs.Secondary > -900 {
		meta["flow"] = obs.Secondary
		meta["flowUnit"] = obs.SecondaryUnit
	}
	if g.Flood.Categories.Action != nil && g.Flood.Categories.Action.Stage > -9000 {
		meta["actionStage"] = g.Flood.Categories.Action.Stage
	}
	if g.Flood.Categories.Minor != nil && g.Flood.Categories.Minor.Stage > -9000 {
		meta["floodStage"] = g.Flood.Categories.Minor.Stage
	}
	headline := fmt.Sprintf("%s · %.2f %s", name, stage, unit)
	if sev != "info" && sev != "unknown" {
		headline = fmt.Sprintf("%s · %s", headline, strings.ToUpper(sev))
	}
	return &Incident{
		ID:         "flood-" + strings.ToLower(g.LID),
		Kind:       "flood",
		Source:     "USGS Water Data / NOAA NWPS",
		SourceURL:  srcURL,
		Headline:   headline,
		Status:     cat,
		Severity:   sev,
		Lat:        g.Lat,
		Lon:        g.Lon,
		Area:       name,
		ObservedAt: observedAt,
		Meta:       meta,
	}, nil
}

type usgsIVResponse struct {
	Value struct {
		TimeSeries []struct {
			SourceInfo struct {
				SiteName    string `json:"siteName"`
				GeoLocation struct {
					GeogLocation struct {
						Latitude  float64 `json:"latitude"`
						Longitude float64 `json:"longitude"`
					} `json:"geogLocation"`
				} `json:"geoLocation"`
			} `json:"sourceInfo"`
			Variable struct {
				VariableName string `json:"variableName"`
			} `json:"variable"`
			Values []struct {
				Value []struct {
					Value    string `json:"value"`
					DateTime string `json:"dateTime"`
				} `json:"value"`
			} `json:"values"`
		} `json:"timeSeries"`
	} `json:"value"`
}

func (c *Client) fetchOneUSGSGauge(ref nwpsGaugeRef) (*Incident, error) {
	if ref.USGSID == "" {
		return nil, fmt.Errorf("no USGS ID for %s", ref.LID)
	}
	u := fmt.Sprintf(usgsIVServiceURL, ref.USGSID)
	var resp usgsIVResponse
	if err := c.getJSON(u, &resp); err != nil {
		return nil, err
	}
	series := resp.Value.TimeSeries
	if len(series) == 0 {
		return nil, fmt.Errorf("no USGS time series for %s", ref.USGSID)
	}

	name := ref.Label
	stage := 0.0
	flow := 0.0
	observedAt := ""
	lat := series[0].SourceInfo.GeoLocation.GeogLocation.Latitude
	lon := series[0].SourceInfo.GeoLocation.GeogLocation.Longitude

	for _, ts := range series {
		vName := strings.ToLower(ts.Variable.VariableName)
		if len(ts.Values) > 0 && len(ts.Values[0].Value) > 0 {
			valStr := ts.Values[0].Value[0].Value
			valNum, _ := strconv.ParseFloat(valStr, 64)
			dt := ts.Values[0].Value[0].DateTime
			if observedAt == "" {
				observedAt = dt
			}
			if strings.Contains(vName, "gage height") || strings.Contains(vName, "stage") {
				stage = valNum
			} else if strings.Contains(vName, "discharge") || strings.Contains(vName, "streamflow") {
				flow = valNum
			}
		}
	}

	usgsUrl := fmt.Sprintf(usgsWaterDataURL, ref.USGSID)
	headline := fmt.Sprintf("%s · %.2f ft", name, stage)

	meta := map[string]any{
		"lid":           ref.LID,
		"usgsId":        ref.USGSID,
		"usgsUrl":       usgsUrl,
		"stage":         stage,
		"stageUnit":     "ft",
		"flow":          flow,
		"flowUnit":      "cfs",
		"floodCategory": "unknown",
	}

	return &Incident{
		ID:         "flood-" + strings.ToLower(ref.LID),
		Kind:       "flood",
		Source:     "USGS Water Data",
		SourceURL:  usgsUrl,
		Headline:   headline,
		Status:     "info",
		Severity:   "info",
		Lat:        lat,
		Lon:        lon,
		Area:       name,
		ObservedAt: observedAt,
		Meta:       meta,
	}, nil
}

func severityFromNWPS(cat string, stage float64, g nwpsGauge) string {
	switch strings.ToLower(strings.TrimSpace(cat)) {
	case "major", "major_flooding":
		return "major"
	case "moderate", "moderate_flooding":
		return "moderate"
	case "minor", "minor_flooding":
		return "minor"
	case "action", "near_flood_stage", "action_stage":
		return "action"
	case "no_flooding", "not_defined", "obs_not_current", "":
		// Fall through to stage vs thresholds when category missing/noisy.
	}
	action, minor, mod, major := -1.0, -1.0, -1.0, -1.0
	if g.Flood.Categories.Action != nil {
		action = g.Flood.Categories.Action.Stage
	}
	if g.Flood.Categories.Minor != nil {
		minor = g.Flood.Categories.Minor.Stage
	}
	if g.Flood.Categories.Moderate != nil {
		mod = g.Flood.Categories.Moderate.Stage
	}
	if g.Flood.Categories.Major != nil {
		major = g.Flood.Categories.Major.Stage
	}
	if major > 0 && stage >= major {
		return "major"
	}
	if mod > 0 && stage >= mod {
		return "moderate"
	}
	if minor > 0 && stage >= minor {
		return "minor"
	}
	if action > 0 && stage >= action {
		return "action"
	}
	if cat == "not_defined" || cat == "" {
		return "unknown"
	}
	return "info"
}

type usgsQuakeFC struct {
	Features []struct {
		ID         string `json:"id"`
		Properties struct {
			Mag     float64 `json:"mag"`
			Place   string  `json:"place"`
			Time    int64   `json:"time"`
			URL     string  `json:"url"`
			Status  string  `json:"status"`
			Tsunami int     `json:"tsunami"`
			Type    string  `json:"type"`
			Title   string  `json:"title"`
		} `json:"properties"`
		Geometry struct {
			Coordinates []float64 `json:"coordinates"` // lon, lat, depth
		} `json:"geometry"`
	} `json:"features"`
}

func (c *Client) fetchQuakes(since time.Time) ([]Incident, error) {
	q := url.Values{}
	q.Set("format", "geojson")
	q.Set("starttime", since.UTC().Format("2006-01-02"))
	q.Set("minmagnitude", fmt.Sprintf("%.1f", quakeMinMag))
	q.Set("minlatitude", fmt.Sprintf("%.2f", quakeMinLat))
	q.Set("maxlatitude", fmt.Sprintf("%.2f", quakeMaxLat))
	q.Set("minlongitude", fmt.Sprintf("%.2f", quakeMinLon))
	q.Set("maxlongitude", fmt.Sprintf("%.2f", quakeMaxLon))
	q.Set("orderby", "time")

	var fc usgsQuakeFC
	if err := c.getJSON(usgsQuakeURL+"?"+q.Encode(), &fc); err != nil {
		return nil, err
	}
	out := make([]Incident, 0, len(fc.Features))
	for _, f := range fc.Features {
		if len(f.Geometry.Coordinates) < 2 {
			continue
		}
		lon := f.Geometry.Coordinates[0]
		lat := f.Geometry.Coordinates[1]
		depth := 0.0
		if len(f.Geometry.Coordinates) > 2 {
			depth = f.Geometry.Coordinates[2]
		}
		mag := f.Properties.Mag
		sev := "info"
		if mag >= 4.5 {
			sev = "major"
		} else if mag >= 3.5 {
			sev = "moderate"
		} else if mag >= 3.0 {
			sev = "minor"
		} else if mag >= 2.5 {
			sev = "action"
		}
		when := time.UnixMilli(f.Properties.Time).UTC().Format(time.RFC3339)
		place := f.Properties.Place
		if place == "" {
			place = f.Properties.Title
		}
		headline := fmt.Sprintf("M%.1f · %s", mag, place)
		out = append(out, Incident{
			ID:         "quake-" + f.ID,
			Kind:       "quake",
			Source:     "USGS Earthquake Hazards",
			SourceURL:  f.Properties.URL,
			Headline:   headline,
			Status:     f.Properties.Status,
			Severity:   sev,
			Lat:        lat,
			Lon:        lon,
			Area:       place,
			ObservedAt: when,
			Meta: map[string]any{
				"magnitude": mag,
				"depthKm":   depth,
				"tsunami":   f.Properties.Tsunami == 1,
			},
		})
	}
	return out, nil
}

func (c *Client) getJSON(u string, dest any) error {
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	ua := c.UserAgent
	if ua == "" {
		ua = "SaintsWeatherWatch/1.0"
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "application/json")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %d: %s", resp.StatusCode, truncate(string(body), 120))
	}
	return json.Unmarshal(body, dest)
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// Parse optional float from meta helpers used in tests.
func metaFloat(m map[string]any, key string) (float64, bool) {
	if m == nil {
		return 0, false
	}
	v, ok := m[key]
	if !ok {
		return 0, false
	}
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case string:
		f, err := strconv.ParseFloat(n, 64)
		return f, err == nil
	default:
		return 0, false
	}
}
