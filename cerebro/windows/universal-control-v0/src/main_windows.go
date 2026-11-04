//go:build windows

package main

// CEREBRO OS Universal Control V0.1: a user-visible, fail-closed tray/monitor wrapper.
// This is NOT the AccessBoot executor. It never takes remote orders or exposes a server.
import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"
	"unsafe"
)

const (
	WM_CLOSE          = 0x0010
	WM_DESTROY        = 0x0002
	WM_LBUTTONUP      = 0x0202
	WM_RBUTTONUP      = 0x0205
	WM_NULL           = 0
	WM_APP            = 0x8000
	MsgTray           = WM_APP + 40
	MsgTick           = WM_APP + 41
	MsgPause          = WM_APP + 42
	MsgResume         = WM_APP + 43
	MsgRestart        = WM_APP + 44
	MsgStatus         = WM_APP + 45
	NIM_ADD           = 0
	NIM_MODIFY        = 1
	NIM_DELETE        = 2
	NIF_MESSAGE       = 1
	NIF_ICON          = 2
	NIF_TIP           = 4
	MF_STRING         = 0
	MF_GRAYED         = 1
	MF_SEPARATOR      = 0x800
	TPM_RIGHTBUTTON   = 2
	TPM_RETURNCMD     = 0x100
	IDI_APPLICATION   = 32512
	IDI_ERROR         = 32513
	IDI_WARNING       = 32515
	IDI_INFORMATION   = 32516
	HKEY_CURRENT_USER = 0x80000001
	KEY_QUERY_VALUE   = 0x0001
	KEY_SET_VALUE     = 0x0002
	REG_SZ            = 1
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	shell32          = syscall.NewLazyDLL("shell32.dll")
	kernel32         = syscall.NewLazyDLL("kernel32.dll")
	advapi32         = syscall.NewLazyDLL("advapi32.dll")
	crypt32          = syscall.NewLazyDLL("crypt32.dll")
	regClass         = user32.NewProc("RegisterClassExW")
	createWindow     = user32.NewProc("CreateWindowExW")
	defWindow        = user32.NewProc("DefWindowProcW")
	destroyWindow    = user32.NewProc("DestroyWindow")
	getMessage       = user32.NewProc("GetMessageW")
	translateMessage = user32.NewProc("TranslateMessage")
	dispatchMessage  = user32.NewProc("DispatchMessageW")
	postQuit         = user32.NewProc("PostQuitMessage")
	postMessage      = user32.NewProc("PostMessageW")
	findWindow       = user32.NewProc("FindWindowW")
	getCursor        = user32.NewProc("GetCursorPos")
	createMenu       = user32.NewProc("CreatePopupMenu")
	appendMenu       = user32.NewProc("AppendMenuW")
	trackMenu        = user32.NewProc("TrackPopupMenu")
	destroyMenu      = user32.NewProc("DestroyMenu")
	setFg            = user32.NewProc("SetForegroundWindow")
	loadIcon         = user32.NewProc("LoadIconW")
	msgBox           = user32.NewProc("MessageBoxW")
	notifyIcon       = shell32.NewProc("Shell_NotifyIconW")
	moduleHandle     = kernel32.NewProc("GetModuleHandleW")
	createMutex      = kernel32.NewProc("CreateMutexW")
	closeHandle      = kernel32.NewProc("CloseHandle")
	regCreate        = advapi32.NewProc("RegCreateKeyExW")
	regOpen          = advapi32.NewProc("RegOpenKeyExW")
	regQuery         = advapi32.NewProc("RegQueryValueExW")
	regSet           = advapi32.NewProc("RegSetValueExW")
	regDelete        = advapi32.NewProc("RegDeleteValueW")
	regClose         = advapi32.NewProc("RegCloseKey")
	protectProc      = crypt32.NewProc("CryptProtectData")
	unprotectProc    = crypt32.NewProc("CryptUnprotectData")
	localFree        = kernel32.NewProc("LocalFree")
)

type point struct {
	X int32
	Y int32
}
type msg struct {
	Hwnd     uintptr
	Message  uint32
	WParam   uintptr
	LParam   uintptr
	Time     uint32
	Pt       point
	LPrivate uint32
}
type wndClass struct {
	Size       uint32
	Style      uint32
	WndProc    uintptr
	ClsExtra   int32
	WndExtra   int32
	Instance   uintptr
	Icon       uintptr
	Cursor     uintptr
	Background uintptr
	MenuName   *uint16
	ClassName  *uint16
	IconSm     uintptr
}
type notifyIconData struct {
	Size            uint32
	Hwnd            uintptr
	ID              uint32
	Flags           uint32
	CallbackMessage uint32
	Icon            uintptr
	Tip             [128]uint16
	State           uint32
	StateMask       uint32
	Info            [256]uint16
	Version         uint32
	InfoTitle       [64]uint16
	InfoFlags       uint32
	GuidItem        [16]byte
	BalloonIcon     uintptr
}

const className = "CEREBROUniversalControlTrayV0_Window"
const registryPath = `Software\Microsoft\Windows\CurrentVersion\Run`

var app *application

type application struct {
	mu    sync.Mutex
	hwnd  uintptr
	root  string
	state Monitor
	mutex uintptr
	stop  chan struct{}
}

func utf(s string) *uint16             { p, _ := syscall.UTF16PtrFromString(s); return p }
func fillUTF16(dst []uint16, s string) { u, _ := syscall.UTF16FromString(s); copy(dst, u) }
func showMessage(title, message string) {
	msgBox.Call(0, uintptr(unsafe.Pointer(utf(message))), uintptr(unsafe.Pointer(utf(title))), 0x40)
}
func rootDir() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = os.TempDir()
	}
	return filepath.Join(base, "CEREBRO", "UniversalControlV0")
}
func atomicWrite(p string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(p), 0700); err != nil {
		return err
	}
	temp := p + ".tmp"
	if err := os.WriteFile(temp, data, 0600); err != nil {
		return err
	}
	return os.Rename(temp, p)
}
func logEvent(root, code string) {
	// Codes are hard-coded; never interpolate command arguments, tokens, or HTTP bodies.
	switch code {
	case "INSTALL_OK", "INSTALL_FAILED", "START", "PAUSE", "RESUME", "RESTART", "STOP", "UNINSTALL", "ROLLBACK", "PROBE", "ERROR":
	default:
		return
	}
	p := filepath.Join(root, "events.log")
	fi, err := os.Stat(p)
	if err == nil && fi.Size() > 1024*1024 {
		_ = os.Rename(p, p+".old")
	}
	f, err := os.OpenFile(p, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err == nil {
		defer f.Close()
		_, _ = fmt.Fprintf(f, "%s %s\n", time.Now().UTC().Format(time.RFC3339), code)
	}
}
func stableID(root string) string {
	p := filepath.Join(root, "device.id")
	if b, e := os.ReadFile(p); e == nil {
		s := strings.TrimSpace(string(b))
		if len(s) == 32 {
			if _, e := hex.DecodeString(s); e == nil {
				return s
			}
		}
	}
	raw := make([]byte, 16)
	if _, e := rand.Read(raw); e != nil {
		return "UNENROLLED"
	}
	s := hex.EncodeToString(raw)
	if e := atomicWrite(p, []byte(s+"\n")); e != nil {
		return "UNENROLLED"
	}
	return s
}
func keyOpen(create bool) (uintptr, error) {
	var h uintptr
	key := uintptr(unsafe.Pointer(utf(registryPath)))
	if create {
		r, _, _ := regCreate.Call(HKEY_CURRENT_USER, key, 0, 0, 0, KEY_QUERY_VALUE|KEY_SET_VALUE, 0, uintptr(unsafe.Pointer(&h)), 0)
		if r != 0 {
			return 0, fmt.Errorf("registry_create_code_%d", r)
		}
	} else {
		r, _, _ := regOpen.Call(HKEY_CURRENT_USER, key, 0, KEY_QUERY_VALUE|KEY_SET_VALUE, uintptr(unsafe.Pointer(&h)))
		if r != 0 {
			return 0, fmt.Errorf("registry_open_code_%d", r)
		}
	}
	return h, nil
}
func readRun() (string, bool, error) {
	h, err := keyOpen(false)
	if err != nil {
		return "", false, err
	}
	defer regClose.Call(h)
	name := uintptr(unsafe.Pointer(utf(RunKey)))
	var typ uint32
	size := uint32(0)
	r, _, _ := regQuery.Call(h, name, 0, uintptr(unsafe.Pointer(&typ)), 0, uintptr(unsafe.Pointer(&size)))
	if r == 2 {
		return "", false, nil
	}
	if r != 0 {
		return "", false, fmt.Errorf("registry_query_code_%d", r)
	}
	if typ != REG_SZ || size > 16384 {
		return "", false, errors.New("registry_value_type_or_size_unsupported")
	}
	b := make([]uint16, (size+1)/2)
	if len(b) == 0 {
		return "", false, nil
	}
	r, _, _ = regQuery.Call(h, name, 0, uintptr(unsafe.Pointer(&typ)), uintptr(unsafe.Pointer(&b[0])), uintptr(unsafe.Pointer(&size)))
	if r != 0 {
		return "", false, fmt.Errorf("registry_read_code_%d", r)
	}
	return syscall.UTF16ToString(b), true, nil
}
func writeRun(value string) error {
	h, err := keyOpen(true)
	if err != nil {
		return err
	}
	defer regClose.Call(h)
	u, err := syscall.UTF16FromString(value)
	if err != nil {
		return err
	}
	if len(u) > 8192 {
		return errors.New("command_too_long")
	}
	r, _, _ := regSet.Call(h, uintptr(unsafe.Pointer(utf(RunKey))), 0, REG_SZ, uintptr(unsafe.Pointer(&u[0])), uintptr(len(u)*2))
	if r != 0 {
		return fmt.Errorf("registry_write_code_%d", r)
	}
	return nil
}
func removeRun() error {
	h, err := keyOpen(false)
	if err != nil {
		return err
	}
	defer regClose.Call(h)
	r, _, _ := regDelete.Call(h, uintptr(unsafe.Pointer(utf(RunKey))))
	if r != 0 && r != 2 {
		return fmt.Errorf("registry_delete_code_%d", r)
	}
	return nil
}

type dpapiBlob struct {
	Size uint32
	Data *byte
}

func dpapiProtect(s string) (string, error) {
	data := []byte(s)
	if len(data) == 0 {
		return "", nil
	}
	src := dpapiBlob{Size: uint32(len(data)), Data: &data[0]}
	var out dpapiBlob
	r, _, e := protectProc.Call(uintptr(unsafe.Pointer(&src)), 0, 0, 0, 0, 0x01, uintptr(unsafe.Pointer(&out)))
	if r == 0 {
		return "", fmt.Errorf("DPAPI_PROTECT_FAILED:%v", e)
	}
	defer localFree.Call(uintptr(unsafe.Pointer(out.Data)))
	return hex.EncodeToString(unsafe.Slice(out.Data, int(out.Size))), nil
}
func dpapiUnprotect(encoded string) (string, error) {
	if encoded == "" {
		return "", nil
	}
	raw, err := hex.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	src := dpapiBlob{Size: uint32(len(raw)), Data: &raw[0]}
	var out dpapiBlob
	r, _, e := unprotectProc.Call(uintptr(unsafe.Pointer(&src)), 0, 0, 0, 0, 0, uintptr(unsafe.Pointer(&out)))
	if r == 0 {
		return "", fmt.Errorf("DPAPI_UNPROTECT_FAILED:%v", e)
	}
	defer localFree.Call(uintptr(unsafe.Pointer(out.Data)))
	return string(unsafe.Slice(out.Data, int(out.Size))), nil
}

type backupState struct {
	HadValue         bool   `json:"had_value"`
	PriorRunDPAPIHex string `json:"prior_run_dpapi_hex,omitempty"`
	Timestamp        string `json:"timestamp"`
	Version          string `json:"version"`
}

func doInstall() error {
	root := rootDir()
	if err := os.MkdirAll(root, 0700); err != nil {
		return err
	}
	current, had, err := readRun()
	if err != nil {
		return err
	}
	bin := filepath.Join(root, "versions", "v"+Version, "CEREBRO_ControlUniversal.exe")
	if err := os.MkdirAll(filepath.Dir(bin), 0700); err != nil {
		return err
	}
	self, err := os.Executable()
	if err != nil {
		return err
	}
	// Snapshot any existing value for OUR key only; NEVER touch legacy CEREBRO keys.
	backups := filepath.Join(root, "backups")
	if err := os.MkdirAll(backups, 0700); err != nil {
		return err
	}
	backupValue := ""
	if had {
		backupValue, err = dpapiProtect(current)
		if err != nil {
			return err
		}
	}
	b, _ := json.MarshalIndent(backupState{HadValue: had, PriorRunDPAPIHex: backupValue, Timestamp: time.Now().UTC().Format(time.RFC3339Nano), Version: Version}, "", "  ")
	// Do not replace a pre-existing rollback baseline on idempotent reruns.
	baseline := filepath.Join(backups, "pre-v0-run.json")
	if _, err := os.Stat(baseline); os.IsNotExist(err) {
		if err := atomicWrite(baseline, b); err != nil {
			return err
		}
	}
	if self != bin {
		content, err := os.ReadFile(self)
		if err != nil {
			return err
		}
		if existing, err := os.ReadFile(bin); err != nil || !sameBytes(existing, content) {
			// Never overwrite the running binary; versioned files are immutable once present.
			if _, err := os.Stat(bin); err == nil {
				return errors.New("VERSION_BINARY_EXISTS_DIFFERENT_CONTENT_FAIL_CLOSED")
			}
			if err := atomicWrite(bin, content); err != nil {
				return err
			}
		}
	}
	command := `"` + bin + `" --run`
	if had && current != command && !strings.Contains(strings.ToLower(current), strings.ToLower(root+`\versions\`)) {
		return errors.New("RUN_KEY_OCCUPIED_BY_UNRELATED_APPLICATION_FAIL_CLOSED")
	}
	if !had || current != command {
		if err := writeRun(command); err != nil {
			return err
		}
	}
	if _, err := os.Stat(filepath.Join(root, "device.id")); os.IsNotExist(err) {
		_ = stableID(root)
	}
	logEvent(root, "INSTALL_OK")
	cmd := exec.Command(bin, "--run")
	if err := cmd.Start(); err != nil {
		return err
	}
	return cmd.Process.Release()
}
func sameBytes(a, b []byte) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
func doUninstall(rollback bool) error {
	root := rootDir()
	cur, had, err := readRun()
	if err != nil {
		return err
	}
	// Do not remove or restore an owner key changed by someone else.
	if had && !(strings.Contains(cur, `\CEREBRO\UniversalControlV0\versions\`) && strings.Contains(cur, "CEREBRO_ControlUniversal.exe")) {
		return errors.New("RUN_KEY_OWNER_MISMATCH")
	}
	if rollback {
		var state backupState
		raw, err := os.ReadFile(filepath.Join(root, "backups", "pre-v0-run.json"))
		if err != nil {
			return err
		}
		if err := json.Unmarshal(raw, &state); err != nil {
			return err
		}
		if state.HadValue {
			prior, err := dpapiUnprotect(state.PriorRunDPAPIHex)
			if err != nil {
				return err
			}
			if err := writeRun(prior); err != nil {
				return err
			}
		} else {
			if err := removeRun(); err != nil {
				return err
			}
		}
		logEvent(root, "ROLLBACK")
	} else {
		if err := removeRun(); err != nil {
			return err
		}
		logEvent(root, "UNINSTALL")
	}
	if hwnd := getRunningWindow(); hwnd != 0 {
		postMessage.Call(hwnd, WM_CLOSE, 0, 0)
	}
	// Deliberately retain versioned binaries and audit/rollback data: no WinError 32 overwrite/delete.
	return nil
}
func getRunningWindow() uintptr {
	h, _, _ := findWindow.Call(uintptr(unsafe.Pointer(utf(className))), 0)
	return h
}
func executeCommand(cmd string) {
	switch cmd {
	case "--pause":
		postCmd(MsgPause)
	case "--resume":
		postCmd(MsgResume)
	case "--restart":
		postCmd(MsgRestart)
	case "--status":
		if getRunningWindow() != 0 {
			postCmd(MsgStatus)
		} else {
			showMessage("CEREBRO OS", "Monitor no iniciado. El controlador remoto no está certificado.")
		}
	case "--uninstall":
		if err := doUninstall(false); err != nil {
			showMessage("CEREBRO OS · error", err.Error())
		} else {
			showMessage("CEREBRO OS", "Autoarranque V0 desactivado. Componentes anteriores conservados. Binarios y auditoría conservados para recuperación.")
		}
	case "--rollback":
		if err := doUninstall(true); err != nil {
			showMessage("CEREBRO OS · error", err.Error())
		} else {
			showMessage("CEREBRO OS", "Registro de arranque V0 restaurado desde backup. Componentes anteriores intactos.")
		}
	default:
		if err := doInstall(); err != nil {
			logEvent(rootDir(), "INSTALL_FAILED")
			showMessage("Instalación CEREBRO OS · error", err.Error())
		} else {
			showMessage("CEREBRO OS · V0", "Instalado para este usuario y arrancado en bandeja. NO controla todavía el escritorio ni se conecta al Gateway.")
		}
	}
}
func postCmd(action uintptr) {
	if hwnd := getRunningWindow(); hwnd != 0 {
		postMessage.Call(hwnd, action, 0, 0)
	}
}
func probeAll() map[string]bool {
	results := make(map[string]bool, 4)
	tr := &http.Transport{Proxy: nil, DialContext: func(ctx context.Context, network, address string) (net.Conn, error) {
		if !LoopbackAddress(address) {
			return nil, errors.New("LOOPBACK_ONLY")
		}
		d := net.Dialer{Timeout: 500 * time.Millisecond}
		return d.DialContext(ctx, network, address)
	}}
	client := http.Client{Timeout: 900 * time.Millisecond, Transport: tr, CheckRedirect: func(r *http.Request, via []*http.Request) error { return http.ErrUseLastResponse }}
	defer tr.CloseIdleConnections()
	for _, port := range ExistingPorts {
		if ValidateReadOnlyURL("127.0.0.1", port, "/health") != nil {
			continue
		}
		req, _ := http.NewRequest("GET", "http://127.0.0.1:"+port+"/health", nil)
		resp, err := client.Do(req)
		if err == nil {
			results[port] = (resp.StatusCode == 200)
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 512))
			_ = resp.Body.Close()
		} else {
			results[port] = false
		}
	}
	return results
}
func (a *application) publish() {
	a.mu.Lock()
	s := a.state
	data, _ := json.MarshalIndent(s, "", "  ")
	a.mu.Unlock()
	_ = atomicWrite(filepath.Join(a.root, "status.json"), data)
}
func (a *application) refresh() {
	a.mu.Lock()
	paused := a.state.Paused
	a.mu.Unlock()
	if paused {
		return
	}
	ports := probeAll()
	a.mu.Lock()
	a.state.Ports = ports
	a.state.LocalStatus = LocalStatus(false, ports)
	a.state.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	a.mu.Unlock()
	a.publish()
	postMessage.Call(a.hwnd, MsgTick, 0, 0)
}
func (a *application) pause(p bool) {
	a.mu.Lock()
	a.state.Paused = p
	a.state.LocalStatus = LocalStatus(p, a.state.Ports)
	a.state.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	a.mu.Unlock()
	a.publish()
	if p {
		logEvent(a.root, "PAUSE")
	} else {
		logEvent(a.root, "RESUME")
		go a.refresh()
	}
	a.modifyIcon()
}
func (a *application) modifyIcon() {
	a.mu.Lock()
	st := a.state.LocalStatus
	a.mu.Unlock()
	icon := uintptr(IDI_WARNING)
	if st == "PAUSED" {
		icon = IDI_APPLICATION
	} else if st == "LOCAL_ALL_LISTENERS" {
		icon = IDI_INFORMATION
	} else if st == "LOCAL_OFFLINE" {
		icon = IDI_ERROR
	}
	ico, _, _ := loadIcon.Call(0, icon)
	d := notifyIconData{Size: uint32(unsafe.Sizeof(notifyIconData{})), Hwnd: a.hwnd, ID: 1, Flags: NIF_ICON | NIF_MESSAGE | NIF_TIP, CallbackMessage: MsgTray, Icon: ico}
	fillUTF16(d.Tip[:], "CEREBRO OS V0 | "+st+" | SIN GATEWAY")
	notifyIcon.Call(NIM_MODIFY, uintptr(unsafe.Pointer(&d)))
}
func (a *application) addIcon() {
	ico, _, _ := loadIcon.Call(0, IDI_APPLICATION)
	d := notifyIconData{Size: uint32(unsafe.Sizeof(notifyIconData{})), Hwnd: a.hwnd, ID: 1, Flags: NIF_MESSAGE | NIF_ICON | NIF_TIP, CallbackMessage: MsgTray, Icon: ico}
	fillUTF16(d.Tip[:], "CEREBRO OS V0 | Comprobando local | SIN GATEWAY")
	notifyIcon.Call(NIM_ADD, uintptr(unsafe.Pointer(&d)))
}
func (a *application) removeIcon() {
	d := notifyIconData{Size: uint32(unsafe.Sizeof(notifyIconData{})), Hwnd: a.hwnd, ID: 1}
	notifyIcon.Call(NIM_DELETE, uintptr(unsafe.Pointer(&d)))
}
func (a *application) showStatus() {
	a.mu.Lock()
	st := a.state
	a.mu.Unlock()
	s := fmt.Sprintf("Equipo: %s\nEntorno: %s\nEstado local: %s\nGateway conectado: NO\nControl remoto habilitado: NO\nAcceso a Trading: NO\n\n8765 Browser: %v\n8766 Device: %v\n8767 Evidence: %v\n8768 Controller: %v\n\nLos listeners son LEGADOS; el V0 solo los observa.", st.DeviceID, st.Environment, st.LocalStatus, st.Ports["8765"], st.Ports["8766"], st.Ports["8767"], st.Ports["8768"])
	showMessage("CEREBRO OS · Estado", s)
}
func appendItem(menu uintptr, id uintptr, label string) {
	appendMenu.Call(menu, MF_STRING, id, uintptr(unsafe.Pointer(utf(label))))
}
func (a *application) menu() {
	menu, _, _ := createMenu.Call()
	if menu == 0 {
		return
	}
	defer destroyMenu.Call(menu)
	a.mu.Lock()
	state := a.state.LocalStatus
	paused := a.state.Paused
	a.mu.Unlock()
	appendMenu.Call(menu, MF_GRAYED, 0, uintptr(unsafe.Pointer(utf("CEREBRO OS V0.1 · PREPROD"))))
	appendMenu.Call(menu, MF_GRAYED, 0, uintptr(unsafe.Pointer(utf("Estado local: "+state))))
	appendMenu.Call(menu, MF_SEPARATOR, 0, 0)
	if paused {
		appendItem(menu, 101, "Activar monitor local")
	} else {
		appendItem(menu, 102, "Pausar monitor local")
	}
	appendItem(menu, 103, "Reiniciar comprobación")
	appendItem(menu, 104, "Comprobar estado")
	appendMenu.Call(menu, MF_SEPARATOR, 0, 0)
	appendItem(menu, 106, "Desinstalar autoarranque V0")
	appendItem(menu, 105, "Detener y salir")
	var p point
	getCursor.Call(uintptr(unsafe.Pointer(&p)))
	setFg.Call(a.hwnd)
	sel, _, _ := trackMenu.Call(menu, TPM_RIGHTBUTTON|TPM_RETURNCMD, uintptr(p.X), uintptr(p.Y), 0, a.hwnd, 0)
	postMessage.Call(a.hwnd, WM_NULL, 0, 0)
	switch sel {
	case 101:
		a.pause(false)
	case 102:
		a.pause(true)
	case 103:
		logEvent(a.root, "RESTART")
		go a.refresh()
	case 104:
		a.showStatus()
	case 105:
		postMessage.Call(a.hwnd, WM_CLOSE, 0, 0)
	case 106:
		ans, _, _ := msgBox.Call(a.hwnd, uintptr(unsafe.Pointer(utf("¿Desinstalar únicamente CEREBRO Control V0?\n\nNo se eliminará ningún controlador anterior ni los backups."))), uintptr(unsafe.Pointer(utf("Confirmar desinstalación de V0"))), 0x24)
		if ans == 6 {
			if err := doUninstall(false); err != nil {
				showMessage("CEREBRO OS · error", err.Error())
			}
		}
	}
}
func wndProc(hwnd uintptr, message uint32, wparam, lparam uintptr) uintptr {
	if app != nil {
		switch message {
		case MsgTray:
			if lparam == WM_RBUTTONUP || lparam == WM_LBUTTONUP {
				app.menu()
			}
			return 0
		case MsgTick:
			app.modifyIcon()
			return 0
		case MsgPause:
			app.pause(true)
			return 0
		case MsgResume:
			app.pause(false)
			return 0
		case MsgRestart:
			go app.refresh()
			return 0
		case MsgStatus:
			app.showStatus()
			return 0
		case WM_CLOSE:
			app.removeIcon()
			logEvent(app.root, "STOP")
			close(app.stop)
			destroyWindow.Call(hwnd)
			return 0
		case WM_DESTROY:
			postQuit.Call(0)
			return 0
		}
	}
	r, _, _ := defWindow.Call(hwnd, uintptr(message), wparam, lparam)
	return r
}
func runTray() error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	// One instance per interactive user session. Not a new supervisor/scheduler.
	mutexName := utf("Local\\CEREBROUniversalControlTrayV0_SingleInstance")
	handle, _, err := createMutex.Call(0, 0, uintptr(unsafe.Pointer(mutexName)))
	if handle == 0 {
		return fmt.Errorf("mutex_creation: %v", err)
	}
	defer closeHandle.Call(handle)
	if err == syscall.Errno(183) {
		return nil
	}
	root := rootDir()
	if err := os.MkdirAll(root, 0700); err != nil {
		return err
	}
	app = &application{root: root, state: NewMonitor(stableID(root)), mutex: handle, stop: make(chan struct{})}
	hinst, _, _ := moduleHandle.Call(0)
	class := utf(className)
	wc := wndClass{Size: uint32(unsafe.Sizeof(wndClass{})), WndProc: syscall.NewCallback(wndProc), Instance: hinst, ClassName: class}
	r, _, _ := regClass.Call(uintptr(unsafe.Pointer(&wc)))
	if r == 0 {
		return errors.New("WINDOW_CLASS_REGISTER_FAILED")
	}
	hwnd, _, _ := createWindow.Call(0, uintptr(unsafe.Pointer(class)), uintptr(unsafe.Pointer(utf("CEREBRO Universal Tray V0"))), 0, 0, 0, 0, 0, 0, 0, hinst, 0)
	if hwnd == 0 {
		return errors.New("HIDDEN_WINDOW_CREATE_FAILED")
	}
	app.hwnd = hwnd
	app.addIcon()
	app.publish()
	logEvent(root, "START")
	go func() {
		app.refresh()
		t := time.NewTicker(20 * time.Second)
		defer t.Stop()
		for {
			select {
			case <-app.stop:
				return
			case <-t.C:
				app.refresh()
			}
		}
	}()
	var m msg
	for {
		r, _, _ := getMessage.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if int32(r) <= 0 {
			break
		}
		translateMessage.Call(uintptr(unsafe.Pointer(&m)))
		dispatchMessage.Call(uintptr(unsafe.Pointer(&m)))
	}
	return nil
}
func main() {
	args := os.Args[1:]
	if len(args) == 0 {
		executeCommand("--install")
		return
	}
	cmd := args[0]
	switch cmd {
	case "--run":
		if err := runTray(); err != nil {
			logEvent(rootDir(), "ERROR")
			showMessage("CEREBRO OS · error", err.Error())
		}
	case "--install", "--pause", "--resume", "--restart", "--status", "--uninstall", "--rollback":
		executeCommand(cmd)
	default:
		showMessage("CEREBRO OS", "Acción no admitida. Solo comandos de monitor local PREPROD.")
	}
}
