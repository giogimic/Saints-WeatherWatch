package auth

import "testing"

func TestValidPIN(t *testing.T) {
	if !ValidPIN("1234") {
		t.Fatal("expected 1234 valid")
	}
	if ValidPIN("12") || ValidPIN("abcd") || ValidPIN("12345") {
		t.Fatal("expected invalid PINs rejected")
	}
}

func TestHashAndCheckPIN(t *testing.T) {
	h, err := HashPIN("4821")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPIN(h, "4821") {
		t.Fatal("PIN should match")
	}
	if CheckPIN(h, "0000") {
		t.Fatal("wrong PIN should fail")
	}
}

func TestNormalizeName(t *testing.T) {
	if NormalizeName("  RadarKid ") != "radarkid" {
		t.Fatal("normalize failed")
	}
}

func TestPINLimiterLockout(t *testing.T) {
	l := NewPINLimiter()
	l.maxFails = 3
	for i := 0; i < 3; i++ {
		l.Fail("1.1.1.1", "bob")
	}
	ok, _ := l.Allowed("1.1.1.1", "bob")
	if ok {
		t.Fatal("expected lockout")
	}
	l.Success("1.1.1.1", "bob")
	ok, _ = l.Allowed("1.1.1.1", "bob")
	if !ok {
		t.Fatal("success should clear lockout")
	}
}
