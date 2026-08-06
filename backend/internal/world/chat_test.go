package world

import (
	"strings"
	"testing"
)

func TestSanitizeChat(t *testing.T) {
	if sanitizeChat("  hi\nthere  ") != "hi there" {
		t.Fatal("whitespace")
	}
	if sanitizeChat("") != "" {
		t.Fatal("empty")
	}
	long := strings.Repeat("a", 200)
	if len([]rune(sanitizeChat(long))) != MaxChatLen {
		t.Fatal("truncate")
	}
}
