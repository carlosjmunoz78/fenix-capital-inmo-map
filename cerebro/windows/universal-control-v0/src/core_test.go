package main

import "testing"

func TestLocalHealth(t *testing.T) {
	cases := []struct {
		paused bool
		p      map[string]bool
		want   string
	}{
		{false, map[string]bool{}, "LOCAL_UNKNOWN"}, {false, map[string]bool{"8765": false, "8766": false}, "LOCAL_OFFLINE"},
		{false, map[string]bool{"8765": true, "8766": false}, "LOCAL_PARTIAL"}, {false, map[string]bool{"8765": true, "8766": true}, "LOCAL_ALL_LISTENERS"},
		{true, map[string]bool{"8765": true}, "PAUSED"}}
	for _, c := range cases {
		if got := LocalStatus(c.paused, c.p); got != c.want {
			t.Fatalf("got %s want %s", got, c.want)
		}
	}
}
func TestRemoteFailClosed(t *testing.T) {
	for _, a := range []string{"desktop.click", "keyboard.type", "browser.navigate", "install.software", "file.delete", "trading.order"} {
		if err := ValidateCommandScope("fenix", "device1", "PREPROD", a); err == nil {
			t.Fatal("allowed " + a)
		}
	}
	for _, e := range []string{"PROD", "UNKNOWN", ""} {
		if ValidateCommandScope("fenix", "device1", e, "health") == nil {
			t.Fatal("allowed " + e)
		}
	}
	if err := ValidateCommandScope("fenix", "device1", "PREPROD", "health"); err != nil {
		t.Fatal(err)
	}
}
func TestNoCredentialOrRemoteAuthority(t *testing.T) {
	m := NewMonitor("test")
	if m.GatewayConnected || m.RemoteCommandsEnabled || m.ProdAuthorized || m.TradingAccess || m.AdditionalCostEUR != 0 {
		t.Fatal("unsafe defaults")
	}
}
func TestReadOnlyLoopback(t *testing.T) {
	for _, tc := range []struct{ host, port, route string }{{"0.0.0.0", "8765", "/health"}, {"127.0.0.1", "443", "/health"}, {"127.0.0.1", "8765", "/evidence"}, {"localhost", "8765", "/health"}} {
		if ValidateReadOnlyURL(tc.host, tc.port, tc.route) == nil {
			t.Fatal("allowed", tc)
		}
	}
	if ValidateReadOnlyURL("127.0.0.1", "8768", "/health") != nil {
		t.Fatal("rejected canonical")
	}
	if LoopbackAddress("0.0.0.0:8765") {
		t.Fatal("non-loopback")
	}
}
