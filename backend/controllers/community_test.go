package controllers

import "testing"

func TestSanitizeCommunityVideoURL(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"https://www.youtube.com/watch?v=dQw4w9WgXcQ", true},
		{"https://youtu.be/dQw4w9WgXcQ", true},
		{"https://vimeo.com/12345678", true},
		{"javascript:alert(1)", false},
		{"https://evil.example.com/embed", false},
		{"", false},
	}
	for _, tc := range cases {
		got := sanitizeCommunityVideoURL(tc.in)
		if (got != "") != tc.want {
			t.Errorf("sanitizeCommunityVideoURL(%q) = %q, want valid=%v", tc.in, got, tc.want)
		}
	}
}

func TestSanitizeCommunityImageURLs(t *testing.T) {
	got := sanitizeCommunityImageURLs([]string{
		"/uploads/media/test.jpg",
		"https://kavten.com/images/a.png",
		"javascript:alert(1)",
		"/uploads/media/test.jpg",
		"ftp://example.com/file.png",
	})
	if len(got) != 2 {
		t.Fatalf("expected 2 valid unique URLs, got %d: %v", len(got), got)
	}
}

func TestNormalizeCommunityCategory(t *testing.T) {
	if got := normalizeCommunityCategory("first-start"); got != "first-start" {
		t.Fatalf("expected first-start, got %s", got)
	}
	if got := normalizeCommunityCategory("unknown"); got != "build-log" {
		t.Fatalf("expected fallback build-log, got %s", got)
	}
}
