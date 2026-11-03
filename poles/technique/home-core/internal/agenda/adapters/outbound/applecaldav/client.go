package applecaldav

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/clementortiz/home-ai/home-core/internal/agenda/model"
)

const defaultEndpoint = "https://caldav.icloud.com/"

var ErrUnavailable = errors.New("apple calendar provider unavailable")

type Client struct {
	account    AccountConfig
	httpClient *http.Client
	endpoint   *url.URL
}

func NewClient(account AccountConfig, httpClient *http.Client) (*Client, error) {
	endpoint := account.Endpoint
	if endpoint == "" {
		endpoint = defaultEndpoint
	}
	parsedEndpoint, err := url.Parse(endpoint)
	if err != nil || parsedEndpoint.Scheme != "https" || parsedEndpoint.Host == "" {
		return nil, fmt.Errorf("invalid CalDAV endpoint")
	}
	return &Client{account: account, httpClient: httpClient, endpoint: parsedEndpoint}, nil
}

func (client *Client) ListCalendars(ctx context.Context) ([]model.Calendar, error) {
	principalResponse, err := client.propfind(ctx, client.endpoint, principalRequest, "0")
	if err != nil {
		return nil, err
	}
	principalHref, found := firstProperty(principalResponse, func(property davProperty) string {
		return property.CurrentUserPrincipal.Href
	})
	if !found {
		return nil, fmt.Errorf("%w: missing current user principal", ErrUnavailable)
	}

	principalURL, err := client.resolveHref(principalHref)
	if err != nil {
		return nil, err
	}
	homeResponse, err := client.propfind(ctx, principalURL, calendarHomeRequest, "0")
	if err != nil {
		return nil, err
	}
	homeHref, found := firstProperty(homeResponse, func(property davProperty) string {
		return property.CalendarHomeSet.Href
	})
	if !found {
		return nil, fmt.Errorf("%w: missing calendar home", ErrUnavailable)
	}

	homeURL, err := client.resolveHref(homeHref)
	if err != nil {
		return nil, err
	}
	collections, err := client.propfind(ctx, homeURL, calendarCollectionRequest, "1")
	if err != nil {
		return nil, err
	}

	calendars := make([]model.Calendar, 0)
	for _, response := range collections.Responses {
		property, found := response.okProperty()
		if !found || !strings.Contains(property.ResourceType.Inner, "calendar") {
			continue
		}
		calendarURL, err := client.resolveHref(response.Href)
		if err != nil {
			return nil, err
		}
		name := property.DisplayName
		if name == "" {
			name = "Calendrier sans nom"
		}
		calendars = append(calendars, model.Calendar{ID: calendarURL.String(), Name: name})
	}
	return calendars, nil
}

func (client *Client) ListEvents(ctx context.Context, calendarID string, from, to time.Time) ([]model.Event, error) {
	calendarURL, err := client.calendarURL(calendarID)
	if err != nil {
		return nil, err
	}
	body := strings.NewReplacer("{{FROM}}", from.UTC().Format("20060102T150405Z"), "{{TO}}", to.UTC().Format("20060102T150405Z")).Replace(eventQueryRequest)
	response, err := client.davRequest(ctx, "REPORT", calendarURL, body, "1")
	if err != nil {
		return nil, err
	}

	events := make([]model.Event, 0)
	for _, result := range response.Responses {
		property, found := result.okProperty()
		if !found || property.CalendarData == "" {
			continue
		}
		parsedEvents, err := parseICalendarEvents(property.CalendarData, calendarID)
		if err != nil {
			return nil, err
		}
		events = append(events, parsedEvents...)
	}
	return events, nil
}

func (client *Client) propfind(ctx context.Context, endpoint *url.URL, body, depth string) (davMultiStatus, error) {
	return client.davRequest(ctx, "PROPFIND", endpoint, body, depth)
}

func (client *Client) davRequest(ctx context.Context, method string, endpoint *url.URL, body, depth string) (davMultiStatus, error) {
	request, err := http.NewRequestWithContext(ctx, method, endpoint.String(), strings.NewReader(body))
	if err != nil {
		return davMultiStatus{}, fmt.Errorf("create CalDAV request: %w", err)
	}
	request.Header.Set("Content-Type", "application/xml; charset=utf-8")
	request.Header.Set("Depth", depth)
	request.SetBasicAuth(client.account.Username, client.account.AppPassword)

	response, err := client.httpClient.Do(request)
	if err != nil {
		return davMultiStatus{}, fmt.Errorf("%w: request: %v", ErrUnavailable, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusMultiStatus {
		return davMultiStatus{}, fmt.Errorf("%w: status %d", ErrUnavailable, response.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 4<<20))
	if err != nil {
		return davMultiStatus{}, fmt.Errorf("%w: read response: %v", ErrUnavailable, err)
	}
	var result davMultiStatus
	if err := xml.Unmarshal(data, &result); err != nil {
		return davMultiStatus{}, fmt.Errorf("%w: decode response: %v", ErrUnavailable, err)
	}
	return result, nil
}

func (client *Client) resolveHref(href string) (*url.URL, error) {
	reference, err := url.Parse(href)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid CalDAV href", ErrUnavailable)
	}
	resolved := client.endpoint.ResolveReference(reference)
	if resolved.Scheme != client.endpoint.Scheme || resolved.Host != client.endpoint.Host {
		return nil, fmt.Errorf("%w: CalDAV href outside configured endpoint", ErrUnavailable)
	}
	return resolved, nil
}

func (client *Client) calendarURL(calendarID string) (*url.URL, error) {
	calendarURL, err := url.Parse(calendarID)
	if err != nil || calendarURL.Scheme != client.endpoint.Scheme || calendarURL.Host != client.endpoint.Host {
		return nil, fmt.Errorf("%w: invalid calendar id", ErrUnavailable)
	}
	return calendarURL, nil
}

func firstProperty(response davMultiStatus, picker func(davProperty) string) (string, bool) {
	for _, result := range response.Responses {
		if property, found := result.okProperty(); found {
			if value := picker(property); value != "" {
				return value, true
			}
		}
	}
	return "", false
}

type davMultiStatus struct {
	Responses []davResponse `xml:"response"`
}

type davResponse struct {
	Href      string        `xml:"href"`
	PropStats []davPropStat `xml:"propstat"`
}

func (response davResponse) okProperty() (davProperty, bool) {
	for _, propStat := range response.PropStats {
		if strings.Contains(propStat.Status, " 200 ") {
			return propStat.Property, true
		}
	}
	return davProperty{}, false
}

type davPropStat struct {
	Property davProperty `xml:"prop"`
	Status   string      `xml:"status"`
}

type davProperty struct {
	CurrentUserPrincipal davHref     `xml:"current-user-principal"`
	CalendarHomeSet      davHref     `xml:"calendar-home-set"`
	DisplayName          string      `xml:"displayname"`
	ResourceType         davResource `xml:"resourcetype"`
	CalendarData         string      `xml:"calendar-data"`
}

type davHref struct {
	Href string `xml:"href"`
}

type davResource struct {
	Inner string `xml:",innerxml"`
}

const principalRequest = `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`
const calendarHomeRequest = `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`
const calendarCollectionRequest = `<?xml version="1.0" encoding="utf-8"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/></d:prop></d:propfind>`
const eventQueryRequest = `<?xml version="1.0" encoding="utf-8"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><d:getetag/><c:calendar-data/></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="{{FROM}}" end="{{TO}}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`
