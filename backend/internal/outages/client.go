package outages

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"
)

//go:embed me_counties.json
var meCountiesJSON []byte

//go:embed me_counties.geojson
var meCountiesGeoJSON []byte

const (
	odinPublicURL = "https://odin.ornl.gov/odi"
	odinStatusURL = "https://odin.ornl.gov/odi/status"
	odinMapURL    = "https://odin.ornl.gov/odi/map"
	odinCountyURL = "https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county/records"
)

// CountyOutage is one county rollup (FIPS).
type CountyOutage struct {
	FIPS      string  `json:"fips"`
	Name      string  `json:"name"`
	State     string  `json:"state"`
	MetersOut int     `json:"metersOut"`
	Utilities []string `json:"utilities,omitempty"`
	Lat       float64 `json:"lat,omitempty"`
	Lng       float64 `json:"lng,omitempty"`
	UpdatedAt string  `json:"updatedAt,omitempty"`
}

// StateOutage is a coarse ODIN /odi/map rollup.
type StateOutage struct {
	StateFIPS string `json:"stateFips"`
	State     string `json:"state"`
	MetersOut int    `json:"metersOut"`
}

// Snapshot is the API payload for impact desk.
type Snapshot struct {
	GeneratedAt       string         `json:"generatedAt"`
	Source            string         `json:"source"`
	SourceNote        string         `json:"sourceNote"`
	MaineCovered      bool           `json:"maineCovered"`
	MaineMetersOut    int            `json:"maineMetersOut"`
	MaineCountiesOut  int            `json:"maineCountiesOut"`
	NationalMetersOut int            `json:"nationalMetersOut"`
	UtilityReporters  int            `json:"utilityReporters"`
	Maine             []CountyOutage `json:"maine"`
	Nearby            []CountyOutage `json:"nearby"` // NE counties with ODIN data
	States            []StateOutage  `json:"states"`
	UtilityLinks      []UtilityLink  `json:"utilityLinks"`
	// Phase F freshness
	FetchedAt     string `json:"fetchedAt,omitempty"`
	AgeSec        int    `json:"ageSec,omitempty"`
	StaleAfterSec int    `json:"staleAfterSec,omitempty"`
	Stale         bool   `json:"stale,omitempty"`
	LastError     string `json:"lastError,omitempty"`
	PolicyNote    string `json:"policyNote,omitempty"`
}

type UtilityLink struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Blurb string `json:"blurb"`
}

type meCountyMeta struct {
	FIPS string  `json:"fips"`
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

var meMeta []meCountyMeta
var meByFIPS map[string]meCountyMeta

func init() {
	_ = json.Unmarshal(meCountiesJSON, &meMeta)
	meByFIPS = map[string]meCountyMeta{}
	for _, c := range meMeta {
		meByFIPS[c.FIPS] = c
	}
}

// MECountiesGeoJSON returns embedded FeatureCollection bytes.
func MECountiesGeoJSON() []byte { return meCountiesGeoJSON }

// Client fetches ODIN public feeds.
type Client struct {
	HTTP      *http.Client
	UserAgent string
}

func NewClient(userAgent string) *Client {
	return &Client{
		HTTP:      &http.Client{Timeout: 45 * time.Second},
		UserAgent: userAgent,
	}
}

func (c *Client) FetchSnapshot() (Snapshot, error) {
	now := time.Now().UTC()
	snap := Snapshot{
		GeneratedAt: now.Format(time.RFC3339),
		Source:      "ODIN (ORNL) public API",
		SourceNote:  "County/state outage estimates from utilities that report to ODIN. Not a substitute for your utility’s map. Maine CMP/Versant may not report to ODIN yet.",
		UtilityLinks: []UtilityLink{
			{Name: "Versant Power Live Outage Center", URL: "https://www.versantpower.com/outages-and-restoration/outage-map/", Blurb: "Northern & Eastern Maine (Aroostook, Wallagrass, Fort Kent, Bangor)"},
			{Name: "Eastern Maine Electric Co-op (EMEC)", URL: "https://www.emec.com/outages", Blurb: "Rural Aroostook & St. John Valley Co-op"},
			{Name: "Central Maine Power (CMP) Direct", URL: "https://outagemap.cmpco.com/cmp/", Blurb: "Central & Southern Maine (ArcGIS Hybrid Ingest)"},
			{Name: "Hydro-Québec Info-pannes", URL: "https://infopannes.solutions.hydroquebec.com/info-pannes", Blurb: "Québec Regional Live Outage Map"},
			{Name: "NB Power Live Outages", URL: "https://www.nbpower.com/Open/Outages.aspx", Blurb: "New Brunswick Grid Status"},
			{Name: "Nova Scotia Power Outage Center", URL: "https://outagemap.nspower.ca/", Blurb: "Nova Scotia Coastal & Inland Outages"},
			{Name: "Maritime Electric PEI", URL: "https://www.maritimeelectric.com/outages/", Blurb: "Prince Edward Island Grid Operations"},
		},
	}

	countyMap := map[string]*CountyOutage{}
	// Seed all Maine counties at zero so the desk always shows a full ME grid.
	for _, m := range meMeta {
		countyMap[m.FIPS] = &CountyOutage{
			FIPS: m.FIPS, Name: m.Name, State: "ME", Lat: m.Lat, Lng: m.Lng,
		}
	}

	if err := c.mergePublicOutages(countyMap); err != nil {
		return snap, err
	}
	_ = c.mergeOpenDataSoft(countyMap) // best-effort secondary

	states, _ := c.fetchStateMap()
	snap.States = states
	for _, s := range states {
		snap.NationalMetersOut += s.MetersOut
	}

	reporters, _ := c.fetchReporterCount()
	snap.UtilityReporters = reporters

	maine := make([]CountyOutage, 0, len(meMeta))
	nearby := make([]CountyOutage, 0)
	for fips, cty := range countyMap {
		if strings.HasPrefix(fips, "23") {
			if cty.MetersOut > 0 {
				snap.MaineMetersOut += cty.MetersOut
				snap.MaineCountiesOut++
				snap.MaineCovered = true
			}
			maine = append(maine, *cty)
			continue
		}
		if cty.MetersOut > 0 && isNearbyNE(fips) {
			nearby = append(nearby, *cty)
		}
	}
	sort.Slice(maine, func(i, j int) bool {
		if maine[i].MetersOut != maine[j].MetersOut {
			return maine[i].MetersOut > maine[j].MetersOut
		}
		return maine[i].Name < maine[j].Name
	})
	sort.Slice(nearby, func(i, j int) bool { return nearby[i].MetersOut > nearby[j].MetersOut })
	snap.Maine = maine
	snap.Nearby = nearby
	if !snap.MaineCovered {
		snap.SourceNote += " No Maine county outages in the current ODIN public feed — use utility links below for local restoration status."
	}
	return snap, nil
}

func isNearbyNE(fips string) bool {
	// NH 33, VT 50, MA 25, NY 36 (border), NB not in ODIN
	return strings.HasPrefix(fips, "33") || strings.HasPrefix(fips, "50") ||
		strings.HasPrefix(fips, "25") || strings.HasPrefix(fips, "36")
}

type odinOutageDoc struct {
	Outage []odinOutage `json:"outage"`
}

type odinOutage struct {
	CommunityDescriptor string `json:"communityDescriptor"`
	MetersAffected      int    `json:"metersAffected"`
	ReportedStartTime   string `json:"reportedStartTime"`
	Names               []struct {
		Name             string `json:"name"`
		NameType         string `json:"nameType"`
		NameTypeAuthority string `json:"nameTypeAuthority"`
	} `json:"names"`
}

func (c *Client) mergePublicOutages(dst map[string]*CountyOutage) error {
	body, err := c.get(odinPublicURL)
	if err != nil {
		return err
	}
	var doc odinOutageDoc
	if err := json.Unmarshal(body, &doc); err != nil {
		// Sometimes a bare array
		var arr []odinOutage
		if err2 := json.Unmarshal(body, &arr); err2 != nil {
			return fmt.Errorf("odin /odi parse: %w", err)
		}
		doc.Outage = arr
	}
	for _, o := range doc.Outage {
		fips := normalizeFIPS(o.CommunityDescriptor)
		if fips == "" || o.MetersAffected <= 0 {
			continue
		}
		util := ""
		for _, n := range o.Names {
			if n.NameType == "UtilityName" {
				util = n.Name
				break
			}
		}
		upsertCounty(dst, fips, o.MetersAffected, util, o.ReportedStartTime)
	}
	return nil
}

type odsResponse struct {
	Results []struct {
		CommunityDescriptor string `json:"communitydescriptor"`
		MetersAffected      int    `json:"metersaffected"`
		County              string `json:"county"`
		State               string `json:"state"`
		UtilityID           string `json:"utility_id"`
		ReportedStartTime   string `json:"reportedstarttime"`
		GeoPoint            *struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		} `json:"geo_point_2d"`
	} `json:"results"`
}

func (c *Client) mergeOpenDataSoft(dst map[string]*CountyOutage) error {
	// Prefer NE + any ME if present; limit keeps payload small.
	url := odinCountyURL + "?limit=100&where=" +
		"state%3D%22Maine%22%20OR%20state%3D%22New%20Hampshire%22%20OR%20state%3D%22Vermont%22%20OR%20state%3D%22Massachusetts%22%20OR%20state%3D%22New%20York%22"
	body, err := c.get(url)
	if err != nil {
		return err
	}
	var doc odsResponse
	if err := json.Unmarshal(body, &doc); err != nil {
		return err
	}
	for _, r := range doc.Results {
		fips := normalizeFIPS(r.CommunityDescriptor)
		if fips == "" {
			continue
		}
		upsertCounty(dst, fips, r.MetersAffected, r.UtilityID, r.ReportedStartTime)
		if ct, ok := dst[fips]; ok {
			if r.County != "" && ct.Name == "" {
				ct.Name = r.County
			}
			if r.GeoPoint != nil {
				ct.Lat, ct.Lng = r.GeoPoint.Lat, r.GeoPoint.Lon
			}
			ct.State = stateAbbrev(r.State)
		}
	}
	return nil
}

type odinMapEntry struct {
	ID        string `json:"id"`
	MetersOut int    `json:"metersOut"`
	Outages   []struct {
		State       string `json:"state"`
		MetersOut   int    `json:"metersOut"`
		UtilityName string `json:"utilityName"`
	} `json:"outages"`
}

func (c *Client) fetchStateMap() ([]StateOutage, error) {
	body, err := c.get(odinMapURL)
	if err != nil {
		return nil, err
	}
	var entries []odinMapEntry
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, err
	}
	out := make([]StateOutage, 0, len(entries))
	for _, e := range entries {
		out = append(out, StateOutage{
			StateFIPS: e.ID,
			State:     fipsToState(e.ID),
			MetersOut: e.MetersOut,
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].MetersOut > out[j].MetersOut })
	return out, nil
}

func (c *Client) fetchReporterCount() (int, error) {
	body, err := c.get(odinStatusURL)
	if err != nil {
		return 0, err
	}
	var arr []map[string]any
	if err := json.Unmarshal(body, &arr); err != nil {
		return 0, err
	}
	return len(arr), nil
}

func (c *Client) get(url string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	ua := c.UserAgent
	if ua == "" {
		ua = "SaintsWeatherWatch/1.0"
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "application/json")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("odin GET %s: %s", url, res.Status)
	}
	return body, nil
}

func upsertCounty(dst map[string]*CountyOutage, fips string, meters int, util, updated string) {
	ct, ok := dst[fips]
	if !ok {
		ct = &CountyOutage{FIPS: fips, State: fipsToState(fips[:2])}
		if m, ok := meByFIPS[fips]; ok {
			ct.Name, ct.Lat, ct.Lng = m.Name, m.Lat, m.Lng
			ct.State = "ME"
		}
		dst[fips] = ct
	}
	ct.MetersOut += meters
	if util != "" {
		found := false
		for _, u := range ct.Utilities {
			if u == util {
				found = true
				break
			}
		}
		if !found {
			ct.Utilities = append(ct.Utilities, util)
		}
	}
	if updated != "" {
		ct.UpdatedAt = updated
	}
}

func normalizeFIPS(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	// digits only
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	s = b.String()
	if len(s) == 4 {
		s = "0" + s
	}
	if len(s) != 5 {
		return ""
	}
	return s
}

func stateAbbrev(name string) string {
	switch strings.TrimSpace(strings.ToLower(name)) {
	case "maine":
		return "ME"
	case "new hampshire":
		return "NH"
	case "vermont":
		return "VT"
	case "massachusetts":
		return "MA"
	case "new york":
		return "NY"
	default:
		if len(name) == 2 {
			return strings.ToUpper(name)
		}
		return name
	}
}

func fipsToState(code string) string {
	m := map[string]string{
		"01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
		"10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
		"18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
		"25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
		"32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
		"39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
		"47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
		"55": "WI", "56": "WY",
	}
	if len(code) >= 2 {
		if s, ok := m[code[:2]]; ok {
			return s
		}
	}
	return code
}

// CountyForPoint returns ME county FIPS nearest to lat/lng (centroid distance).
func CountyForPoint(lat, lng float64) (fips, name string) {
	best := 1e9
	for _, m := range meMeta {
		dlat := m.Lat - lat
		dlng := m.Lng - lng
		d := dlat*dlat + dlng*dlng
		if d < best {
			best = d
			fips, name = m.FIPS, m.Name
		}
	}
	return
}

// FormatMeters is a tiny helper for tests / UI.
func FormatMeters(n int) string {
	return strconv.Itoa(n)
}
