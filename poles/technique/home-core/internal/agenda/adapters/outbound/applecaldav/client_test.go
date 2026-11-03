package applecaldav

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestClientDiscoversCalendarsAndReadsEvents(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		username, password, ok := request.BasicAuth()
		if !ok || username != "me@example.com" || password != "app-password" {
			http.Error(writer, "unauthorized", http.StatusUnauthorized)
			return
		}
		writer.Header().Set("Content-Type", "application/xml; charset=utf-8")
		writer.WriteHeader(http.StatusMultiStatus)
		switch {
		case request.Method == "PROPFIND" && request.URL.Path == "/":
			_, _ = writer.Write([]byte(multistatus("<d:response><d:href>/</d:href><d:propstat><d:prop><d:current-user-principal><d:href>/principals/me/</d:href></d:current-user-principal></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>")))
		case request.Method == "PROPFIND" && request.URL.Path == "/principals/me/":
			_, _ = writer.Write([]byte(multistatus("<d:response><d:href>/principals/me/</d:href><d:propstat><d:prop><c:calendar-home-set><d:href>/calendars/me/</d:href></c:calendar-home-set></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>")))
		case request.Method == "PROPFIND" && request.URL.Path == "/calendars/me/":
			body := "<d:response><d:href>/calendars/me/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>" +
				"<d:response><d:href>/calendars/me/personal/</d:href><d:propstat><d:prop><d:displayname>Personnel</d:displayname><d:resourcetype><d:collection/><c:calendar/></d:resourcetype></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>"
			_, _ = writer.Write([]byte(multistatus(body)))
		case request.Method == "REPORT" && request.URL.Path == "/calendars/me/personal/":
			body := requestBody(t, request)
			if !strings.Contains(body, "20261103T000000Z") {
				t.Fatal("calendar report does not contain the requested start")
			}
			calendarData := "BEGIN:VCALENDAR&#13;&#10;BEGIN:VEVENT&#13;&#10;UID:event-1&#13;&#10;SUMMARY:Diner&#13;&#10;DTSTART;TZID=Europe/Paris:20261103T190000&#13;&#10;DTEND;TZID=Europe/Paris:20261103T200000&#13;&#10;END:VEVENT&#13;&#10;END:VCALENDAR"
			body = "<d:response><d:href>/calendars/me/personal/event-1.ics</d:href><d:propstat><d:prop><c:calendar-data>" + calendarData + "</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>"
			_, _ = writer.Write([]byte(multistatus(body)))
		default:
			http.Error(writer, "unexpected request", http.StatusNotFound)
		}
	}))
	defer server.Close()

	client, err := NewClient(AccountConfig{ID: "personal", Username: "me@example.com", AppPassword: "app-password", Endpoint: server.URL}, server.Client())
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}
	calendars, err := client.ListCalendars(context.Background())
	if err != nil || len(calendars) != 1 || calendars[0].Name != "Personnel" {
		t.Fatalf("ListCalendars() = %#v, %v", calendars, err)
	}

	from := time.Date(2026, time.November, 3, 0, 0, 0, 0, time.UTC)
	events, err := client.ListEvents(context.Background(), calendars[0].ID, from, from.Add(24*time.Hour))
	if err != nil || len(events) != 1 || events[0].Title != "Diner" {
		t.Fatalf("ListEvents() = %#v, %v", events, err)
	}
	if events[0].StartsAt.Location().String() != "Europe/Paris" {
		t.Fatalf("event timezone = %s", events[0].StartsAt.Location())
	}
}

func multistatus(responses string) string {
	return `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">` + responses + `</d:multistatus>`
}

func requestBody(t *testing.T, request *http.Request) string {
	t.Helper()
	data, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatalf("read request body: %v", err)
	}
	return string(data)
}
