package radar

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	iemRadarJSON = "https://mesonet.agron.iastate.edu/json/radar"
	iemWLDBase   = "https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge"
	iemRidgeNow  = "https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge/%s/%s_0.png"
	iemRidgeArch = "https://mesonet.agron.iastate.edu/archive/data/%s/GIS/ridge/%s/%s/%s_%s_%s.png"
	iemN0R       = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi"
	iemN0Q       = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi"
	iemN0RT      = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi"
	iemN0QT      = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi"
)

// DefaultFocus is the St. John Valley corridor center.
var DefaultFocus = struct{ Lat, Lon float64 }{47.05, -68.35}

type Client struct {
	UserAgent string
	HTTP      *http.Client
}

func NewClient(userAgent string) *Client {
	return &Client{
		UserAgent: userAgent,
		HTTP:      &http.Client{Timeout: 20 * time.Second},
	}
}

type Site struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Lat        float64 `json:"lat"`
	Lon        float64 `json:"lon"`
	Type       string  `json:"type"`
	DistanceKm float64 `json:"distanceKm,omitempty"`
}

type ProductDef struct {
	ID            string     `json:"id"`
	Label         string     `json:"label"`
	Kind          string     `json:"kind"` // wms | ridge
	Blurb         string     `json:"blurb"`
	WMS           string     `json:"wms,omitempty"`
	Layer         string     `json:"layer,omitempty"`
	LoopWMS       string     `json:"loopWms,omitempty"`
	LoopLayer     string     `json:"loopLayer,omitempty"`
	LoopSupported bool       `json:"loopSupported"`
	ScanRadar     string     `json:"scanRadar"`
	ScanProduct   string     `json:"scanProduct"`
	RidgeSite     string     `json:"ridgeSite,omitempty"`
	RidgeProduct  string     `json:"ridgeProduct,omitempty"`
	RidgeURL      string     `json:"ridgeUrl,omitempty"`
	Bounds        *LatLonBox `json:"bounds,omitempty"`
	Attribution   string     `json:"attribution"`
}

type LatLonBox struct {
	South float64 `json:"south"`
	West  float64 `json:"west"`
	North float64 `json:"north"`
	East  float64 `json:"east"`
}

type Scan struct {
	TS        string `json:"ts"`
	ValidAt   string `json:"validAt,omitempty"`
	AgeSec    int    `json:"ageSeconds,omitempty"`
	RidgeURL  string `json:"ridgeUrl,omitempty"`
	WMSTime   string `json:"wmsTime,omitempty"`
}

type Status struct {
	GeneratedAt string       `json:"generatedAt"`
	FocusLat    float64      `json:"focusLat"`
	FocusLon    float64      `json:"focusLon"`
	Nearest     *Site        `json:"nearest,omitempty"`
	Composite   *Site        `json:"composite,omitempty"`
	Products    []ProductDef `json:"products"`
	LatestScan  *Scan        `json:"latestScan,omitempty"`
	SourceNote  string       `json:"sourceNote"`
}

type ScansResponse struct {
	GeneratedAt string `json:"generatedAt"`
	Radar       string `json:"radar"`
	Product     string `json:"product"`
	Scans       []Scan `json:"scans"`
}

type iemAvailable struct {
	Radars []struct {
		ID   string  `json:"id"`
		Name string  `json:"name"`
		Lat  float64 `json:"lat"`
		Lon  float64 `json:"lon"`
		Type string  `json:"type"`
	} `json:"radars"`
	GeneratedAt string `json:"generated_at"`
}

type iemList struct {
	Scans []struct {
		TS string `json:"ts"`
	} `json:"scans"`
	GeneratedAt string `json:"generated_at"`
}

func (c *Client) FetchStatus(lat, lon float64) (*Status, error) {
	if lat == 0 && lon == 0 {
		lat, lon = DefaultFocus.Lat, DefaultFocus.Lon
	}
	sites, err := c.fetchAvailable(lat, lon)
	if err != nil {
		return nil, err
	}

	st := &Status{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		FocusLat:    lat,
		FocusLon:    lon,
		SourceNote:  "Radar tiles and scan times from Iowa State IEM (NEXRAD / RIDGE). Latency is scan age, not network RTT.",
		Products:    defaultProducts(),
	}

	var nearestNEXRAD *Site
	for i := range sites {
		s := sites[i]
		s.DistanceKm = haversineKm(lat, lon, s.Lat, s.Lon)
		if s.Type == "COMPOSITE" || s.ID == "USCOMP" {
			cp := s
			st.Composite = &cp
			continue
		}
		if s.Type == "NEXRAD" {
			if nearestNEXRAD == nil || s.DistanceKm < nearestNEXRAD.DistanceKm {
				cp := s
				nearestNEXRAD = &cp
			}
		}
	}
	st.Nearest = nearestNEXRAD

	// Attach RIDGE bounds + current URL for velocity product when nearest site known.
	ridgeSite := "CBW"
	if nearestNEXRAD != nil {
		ridgeSite = nearestNEXRAD.ID
	}
	bounds, _ := c.fetchWorldfileBounds(ridgeSite, "N0B")
	for i := range st.Products {
		if st.Products[i].Kind != "ridge" {
			continue
		}
		st.Products[i].RidgeSite = ridgeSite
		st.Products[i].ScanRadar = ridgeSite
		st.Products[i].RidgeURL = fmt.Sprintf(iemRidgeNow, ridgeSite, st.Products[i].RidgeProduct)
		st.Products[i].Bounds = bounds
	}

	// Prefer site super-res reflectivity age; fall back to USCOMP N0Q.
	latest, _ := c.latestScanAge(ridgeSite, "N0B")
	if latest == nil {
		latest, _ = c.latestScanAge("USCOMP", "N0Q")
	}
	st.LatestScan = latest
	return st, nil
}

func (c *Client) FetchScans(radar, product string, hours float64) (*ScansResponse, error) {
	radar = strings.ToUpper(strings.TrimSpace(radar))
	product = strings.ToUpper(strings.TrimSpace(product))
	if radar == "" {
		radar = "USCOMP"
	}
	if product == "" {
		product = "N0Q"
	}
	if hours <= 0 || hours > 6 {
		hours = 2
	}
	end := time.Now().UTC().Truncate(time.Minute)
	start := end.Add(-time.Duration(hours * float64(time.Hour)))

	q := url.Values{}
	q.Set("operation", "list")
	q.Set("radar", radar)
	q.Set("product", product)
	q.Set("start", start.Format("2006-01-02T15:04Z"))
	q.Set("end", end.Format("2006-01-02T15:04Z"))

	var payload iemList
	if err := c.getJSON(iemRadarJSON+"?"+q.Encode(), &payload); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	out := &ScansResponse{
		GeneratedAt: now.Format(time.RFC3339),
		Radar:       radar,
		Product:     product,
		Scans:       make([]Scan, 0, len(payload.Scans)),
	}
	for _, s := range payload.Scans {
		ts := s.TS
		valid, ok := parseIEMScanTS(ts)
		sc := Scan{TS: ts}
		if ok {
			sc.ValidAt = valid.Format(time.RFC3339)
			sc.AgeSec = int(now.Sub(valid).Seconds())
			sc.WMSTime = valid.UTC().Format("2006-01-02T15:04:00Z")
			if radar != "USCOMP" {
				sc.RidgeURL = ArchiveRidgeURL(radar, product, valid)
			}
		}
		out.Scans = append(out.Scans, sc)
	}
	return out, nil
}

func ArchiveRidgeURL(site, product string, t time.Time) string {
	t = t.UTC()
	day := t.Format("2006/01/02")
	stamp := t.Format("200601021504")
	return fmt.Sprintf(iemRidgeArch, day, site, product, site, product, stamp)
}

func defaultProducts() []ProductDef {
	return []ProductDef{
		{
			ID:            "n0r",
			Label:         "Reflectivity",
			Kind:          "wms",
			Blurb:         "CONUS composite base reflectivity (IEM n0r).",
			WMS:           iemN0R,
			Layer:         "nexrad-n0r-900913",
			LoopWMS:       iemN0RT,
			LoopLayer:     "nexrad-n0r-wmst",
			LoopSupported: true,
			ScanRadar:     "USCOMP",
			ScanProduct:   "N0R",
			Attribution:   "IEM NEXRAD n0r",
		},
		{
			ID:            "n0q",
			Label:         "Reflectivity HD",
			Kind:          "wms",
			Blurb:         "Higher-res CONUS composite (IEM n0q).",
			WMS:           iemN0Q,
			Layer:         "nexrad-n0q-900913",
			LoopWMS:       iemN0QT,
			LoopLayer:     "nexrad-n0q-wmst",
			LoopSupported: true,
			ScanRadar:     "USCOMP",
			ScanProduct:   "N0Q",
			Attribution:   "IEM NEXRAD n0q",
		},
		{
			ID:            "n0s",
			Label:         "Velocity (SR)",
			Kind:          "ridge",
			Blurb:         "Storm-relative velocity from nearest NEXRAD (RIDGE). Loop uses archive frames.",
			LoopSupported: true,
			ScanRadar:     "CBW",
			ScanProduct:   "N0S",
			RidgeProduct:  "N0S",
			Attribution:   "IEM RIDGE N0S",
		},
	}
}

func (c *Client) fetchAvailable(lat, lon float64) ([]Site, error) {
	q := url.Values{}
	q.Set("operation", "available")
	q.Set("lat", fmt.Sprintf("%.4f", lat))
	q.Set("lon", fmt.Sprintf("%.4f", lon))
	var payload iemAvailable
	if err := c.getJSON(iemRadarJSON+"?"+q.Encode(), &payload); err != nil {
		return nil, err
	}
	out := make([]Site, 0, len(payload.Radars))
	for _, r := range payload.Radars {
		out = append(out, Site{
			ID:   r.ID,
			Name: r.Name,
			Lat:  r.Lat,
			Lon:  r.Lon,
			Type: r.Type,
		})
	}
	return out, nil
}

func (c *Client) latestScanAge(radar, product string) (*Scan, error) {
	end := time.Now().UTC()
	start := end.Add(-45 * time.Minute)
	q := url.Values{}
	q.Set("operation", "list")
	q.Set("radar", radar)
	q.Set("product", product)
	q.Set("start", start.Format("2006-01-02T15:04Z"))
	q.Set("end", end.Format("2006-01-02T15:04Z"))
	var payload iemList
	if err := c.getJSON(iemRadarJSON+"?"+q.Encode(), &payload); err != nil {
		return nil, err
	}
	if len(payload.Scans) == 0 {
		return nil, nil
	}
	last := payload.Scans[len(payload.Scans)-1].TS
	valid, ok := parseIEMScanTS(last)
	sc := &Scan{TS: last}
	if ok {
		sc.ValidAt = valid.Format(time.RFC3339)
		sc.AgeSec = int(time.Now().UTC().Sub(valid).Seconds())
		sc.WMSTime = valid.UTC().Format("2006-01-02T15:04:00Z")
	}
	return sc, nil
}

func (c *Client) fetchWorldfileBounds(site, product string) (*LatLonBox, error) {
	u := fmt.Sprintf("%s/%s/%s_0.wld", iemWLDBase, site, product)
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	c.setHeaders(req)
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wld status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 512))
	if err != nil {
		return nil, err
	}
	return parseWorldfile(string(body), 1000, 1000)
}

func parseWorldfile(raw string, width, height int) (*LatLonBox, error) {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	if len(lines) < 6 {
		return nil, fmt.Errorf("short worldfile")
	}
	vals := make([]float64, 6)
	for i := 0; i < 6; i++ {
		v, err := strconv.ParseFloat(strings.TrimSpace(lines[i]), 64)
		if err != nil {
			return nil, err
		}
		vals[i] = v
	}
	dx, dy := vals[0], vals[3]
	ulx, uly := vals[4], vals[5]
	west := ulx
	north := uly
	east := ulx + dx*float64(width)
	south := uly + dy*float64(height)
	if south > north {
		south, north = north, south
	}
	if west > east {
		west, east = east, west
	}
	return &LatLonBox{South: south, West: west, North: north, East: east}, nil
}

func parseIEMScanTS(ts string) (time.Time, bool) {
	ts = strings.TrimSpace(ts)
	layouts := []string{
		"2006-01-02T15:04Z",
		"2006-01-02T15:04:05Z",
		time.RFC3339,
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, ts); err == nil {
			return t.UTC(), true
		}
	}
	return time.Time{}, false
}

func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	return 2 * R * math.Asin(math.Sqrt(a))
}

func (c *Client) getJSON(u string, dest any) error {
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	c.setHeaders(req)
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("iem status %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(dest)
}

func (c *Client) setHeaders(req *http.Request) {
	ua := c.UserAgent
	if ua == "" {
		ua = "SaintsWeatherWatch/1.0"
	}
	req.Header.Set("User-Agent", ua)
	req.Header.Set("Accept", "application/json, text/plain, */*")
}
