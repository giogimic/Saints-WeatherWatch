package progress

import "testing"

func TestAttemptXP(t *testing.T) {
	if got := AttemptXP(5, 5); got != 5*20+10+40 {
		t.Fatalf("perfect: got %d", got)
	}
	if got := AttemptXP(3, 5); got != 3*20+10 {
		t.Fatalf("partial: got %d", got)
	}
	if got := AttemptXP(0, 5); got != 10 {
		t.Fatalf("zero score still finish bonus: got %d", got)
	}
	if got := AttemptXP(1, 0); got != 0 {
		t.Fatalf("bad total: got %d", got)
	}
}

func TestLevelFromXP(t *testing.T) {
	cases := []struct {
		xp, level int
	}{
		{0, 1},
		{99, 1},
		{100, 2},
		{250, 3},
		{1000, 11},
	}
	for _, c := range cases {
		if got := LevelFromXP(c.xp); got != c.level {
			t.Fatalf("xp %d: got level %d want %d", c.xp, got, c.level)
		}
	}
}

func TestTitle(t *testing.T) {
	if Title(1) != "Storm Rookie" {
		t.Fatal(Title(1))
	}
	if Title(8) != "Storm Chaser" {
		t.Fatal(Title(8))
	}
}
