package main

import (
	"errors"
	"fmt"
	"net"
	"strings"
)

const Version = "0.1.0"
const Environment = "PREPROD"
const RunKey = "CEREBROUniversalControlV0"

// Monitor is a *local observer* in V0. It MUST NOT be mistaken for a remote-control executor.
type Monitor struct {
	CompanyID             string          `json:"company_id"`
	DeviceID              string          `json:"device_id"`
	EngineID              string          `json:"engine_id"`
	Environment           string          `json:"environment"`
	Version               string          `json:"version"`
	Paused                bool            `json:"paused"`
	LocalStatus           string          `json:"local_status"`
	GatewayConnected      bool            `json:"gateway_connected"`
	RemoteCommandsEnabled bool            `json:"remote_commands_enabled"`
	ProdAuthorized        bool            `json:"prod_authorized"`
	TradingAccess         bool            `json:"trading_access"`
	AdditionalCostEUR     int             `json:"additional_cost_eur"`
	Ports                 map[string]bool `json:"localhost_health_ports"`
	UpdatedAt             string          `json:"updated_at"`
}

func NewMonitor(deviceID string) Monitor {
	return Monitor{CompanyID: "UNBOUND", DeviceID: deviceID, EngineID: "RUNTIME-001", Environment: Environment, Version: Version,
		GatewayConnected: false, RemoteCommandsEnabled: false, ProdAuthorized: false, TradingAccess: false, AdditionalCostEUR: 0,
		LocalStatus: "NOT_CHECKED", Ports: map[string]bool{}}
}

func LocalStatus(paused bool, ports map[string]bool) string {
	if paused {
		return "PAUSED"
	}
	if len(ports) == 0 {
		return "LOCAL_UNKNOWN"
	}
	healthy := 0
	for _, v := range ports {
		if v {
			healthy++
		}
	}
	if healthy == 0 {
		return "LOCAL_OFFLINE"
	}
	if healthy == len(ports) {
		return "LOCAL_ALL_LISTENERS"
	}
	return "LOCAL_PARTIAL"
}

// Existing listeners are discovered, never claimed as this application's own processes.
var ExistingPorts = []string{"8765", "8766", "8767", "8768"}

func ValidateReadOnlyURL(host string, port string, route string) error {
	if host != "127.0.0.1" {
		return errors.New("LOOPBACK_ONLY")
	}
	if route != "/health" {
		return errors.New("HEALTH_ONLY")
	}
	good := false
	for _, p := range ExistingPorts {
		if p == port {
			good = true
		}
	}
	if !good {
		return errors.New("UNAPPROVED_PORT")
	}
	return nil
}
func ValidateCommandScope(company, device, env, action string) error {
	if company == "" || device == "" {
		return errors.New("DEVICE_AND_COMPANY_REQUIRED")
	}
	if env != "PREPROD" && env != "LAB" {
		return errors.New("PROD_DENIED")
	}
	switch action {
	case "health", "pause_local_monitor", "resume_local_monitor":
		return nil
	}
	return fmt.Errorf("REMOTE_EXECUTION_NOT_IMPLEMENTED:%s", strings.TrimSpace(action))
}
func LoopbackAddress(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	return err == nil && host == "127.0.0.1"
}
