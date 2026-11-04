//go:build windows

package main

// PC-001 visible local acceptance fixture. Deliberately no TCP listener,
// remote command parser, PowerShell invocation or privileged execution.
import (
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
	"unicode/utf16"
	"unsafe"
)

const (
	wmClose            = 0x0010
	wmDestroy          = 0x0002
	wsOverlappedWindow = 0x00CF0000
	wsVisible          = 0x10000000
	wsChild            = 0x40000000
	wsBorder           = 0x00800000
	wsVScroll          = 0x00200000
	esMultiline        = 0x0004
	esAutoVScroll      = 0x0040
	wmSetText          = 0x000C
	swShow             = 5
	inputMouse         = 0
	inputKeyboard      = 1
	mouseMove          = 0x0001
	mouseLeftDown      = 0x0002
	mouseLeftUp        = 0x0004
	mouseVirtualDesk   = 0x4000
	mouseAbsolute      = 0x8000
	keyUp              = 0x0002
	keyUnicode         = 0x0004
	srccopy            = 0x00CC0020
	dibRGBColors       = 0
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	gdi32            = syscall.NewLazyDLL("gdi32.dll")
	kernel32         = syscall.NewLazyDLL("kernel32.dll")
	registerClass    = user32.NewProc("RegisterClassExW")
	createWindow     = user32.NewProc("CreateWindowExW")
	showWindow       = user32.NewProc("ShowWindow")
	updateWindow     = user32.NewProc("UpdateWindow")
	defWindow        = user32.NewProc("DefWindowProcW")
	destroyWindow    = user32.NewProc("DestroyWindow")
	getMessage       = user32.NewProc("GetMessageW")
	translateMessage = user32.NewProc("TranslateMessage")
	dispatchMessage  = user32.NewProc("DispatchMessageW")
	postQuit         = user32.NewProc("PostQuitMessage")
	getRect          = user32.NewProc("GetWindowRect")
	getTextLen       = user32.NewProc("GetWindowTextLengthW")
	getText          = user32.NewProc("GetWindowTextW")
	setForeground    = user32.NewProc("SetForegroundWindow")
	getForeground    = user32.NewProc("GetForegroundWindow")
	sendInput        = user32.NewProc("SendInput")
	getMetrics       = user32.NewProc("GetSystemMetrics")
	getKey           = user32.NewProc("GetAsyncKeyState")
	messageBox       = user32.NewProc("MessageBoxW")
	postMessage      = user32.NewProc("PostMessageW")
	getWindowDC      = user32.NewProc("GetWindowDC")
	releaseDC        = user32.NewProc("ReleaseDC")
	printWindow      = user32.NewProc("PrintWindow")
	createDC         = gdi32.NewProc("CreateCompatibleDC")
	deleteDC         = gdi32.NewProc("DeleteDC")
	createBitmap     = gdi32.NewProc("CreateCompatibleBitmap")
	selectObject     = gdi32.NewProc("SelectObject")
	deleteObject     = gdi32.NewProc("DeleteObject")
	getDIBits        = gdi32.NewProc("GetDIBits")
	moduleHandle     = kernel32.NewProc("GetModuleHandleW")
	winHandle        uintptr
	editHandle       uintptr
)

type winPoint struct{ X, Y int32 }
type rect struct{ Left, Top, Right, Bottom int32 }
type msg struct {
	Hwnd           uintptr
	Message        uint32
	WParam, LParam uintptr
	Time           uint32
	Pt             winPoint
	Private        uint32
}
type wndClass struct {
	Size, Style                                  uint32
	WndProc                                      uintptr
	ClsExtra, WndExtra                           int32
	Instance, Icon, Cursor, Background, MenuName uintptr
	ClassName                                    *uint16
	IconSm                                       uintptr
}
type winInput struct {
	Type uint32
	Pad  uint32
	Data [32]byte
}
type mouseData struct {
	Dx, Dy                 int32
	MouseData, Flags, Time uint32
	ExtraInfo              uintptr
}
type keyboardData struct {
	Vk, Scan    uint16
	Flags, Time uint32
	ExtraInfo   uintptr
}
type bitmapHeader struct {
	Size                         uint32
	Width, Height                int32
	Planes, BitCount             uint16
	Compression, SizeImage       uint32
	XPelsPerMeter, YPelsPerMeter int32
	ClrUsed, ClrImportant        uint32
}
type bitmapInfo struct {
	Header bitmapHeader
	Colors [4]byte
}
type result struct {
	SchemaVersion            string       `json:"schema_version"`
	Status                   string       `json:"status"`
	CompanyID                string       `json:"company_id"`
	EngineID                 string       `json:"engine_id"`
	Environment              string       `json:"environment"`
	Version                  string       `json:"version"`
	DeviceID                 string       `json:"device_id"`
	ConsentVisible           bool         `json:"consent_visible"`
	BrowserRemoteControlled  bool         `json:"browser_remote_controlled"`
	GatewayConnected         bool         `json:"gateway_connected"`
	MouseInputVerified       bool         `json:"mouse_input_verified"`
	KeyboardReadbackVerified bool         `json:"keyboard_readback_verified"`
	ScreenshotLocalVerified  bool         `json:"screenshot_local_verified"`
	Sandbox                  SandboxProof `json:"sandbox"`
	ScreenshotPath           string       `json:"screenshot_path,omitempty"`
	ErrorCode                string       `json:"error_code,omitempty"`
	NoProdChanges            bool         `json:"no_prod_changes"`
	NoRemoteListener         bool         `json:"no_remote_listener"`
	NoPaidAPI                bool         `json:"no_paid_api"`
	CheckedUTC               string       `json:"checked_utc"`
}

func ptr(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }
func winMsg(title, body string, flags uintptr) uintptr {
	ret, _, _ := messageBox.Call(0, uintptr(unsafe.Pointer(ptr(body))), uintptr(unsafe.Pointer(ptr(title))), flags)
	return ret
}
func failIfStopped() error {
	v, _, _ := getKey.Call(0x1b)
	if v&0x8000 != 0 {
		return errors.New("STOP_KEY_ESCAPE")
	}
	if winHandle != 0 {
		foreground, _, _ := getForeground.Call()
		if foreground != winHandle {
			return errors.New("FOCUS_LOST_ABORT")
		}
	}
	return nil
}
func sendOne(in winInput) error {
	ret, _, err := sendInput.Call(1, uintptr(unsafe.Pointer(&in)), unsafe.Sizeof(in))
	if ret != 1 {
		return fmt.Errorf("SENDINPUT_BLOCKED:%v", err)
	}
	return nil
}
func mouseEvent(flags uint32, x, y int32) error {
	var in winInput
	in.Type = inputMouse
	*(*mouseData)(unsafe.Pointer(&in.Data[0])) = mouseData{Dx: x, Dy: y, Flags: flags}
	return sendOne(in)
}
func moveAndClickOwnEdit() error {
	if err := failIfStopped(); err != nil {
		return err
	}
	foreground, _, _ := getForeground.Call()
	if foreground != winHandle {
		return errors.New("OWN_WINDOW_NOT_FOREGROUND")
	}
	var r rect
	if ok, _, _ := getRect.Call(editHandle, uintptr(unsafe.Pointer(&r))); ok == 0 {
		return errors.New("EDIT_RECT_FAILED")
	}
	x, y := (r.Left+r.Right)/2, (r.Top+r.Bottom)/2
	left, _, _ := getMetrics.Call(76)
	top, _, _ := getMetrics.Call(77)
	width, _, _ := getMetrics.Call(78)
	height, _, _ := getMetrics.Call(79)
	if width < 2 || height < 2 {
		return errors.New("INVALID_VIRTUAL_SCREEN")
	}
	dx := int32(int64(x-int32(left)) * 65535 / int64(int32(width)-1))
	dy := int32(int64(y-int32(top)) * 65535 / int64(int32(height)-1))
	if err := mouseEvent(mouseMove|mouseAbsolute|mouseVirtualDesk, dx, dy); err != nil {
		return err
	}
	if err := mouseEvent(mouseLeftDown, 0, 0); err != nil {
		return err
	}
	if err := mouseEvent(mouseLeftUp, 0, 0); err != nil {
		return err
	}
	return nil
}
func typeIntoOwnEdit(text string) error {
	for _, ch := range utf16.Encode([]rune(text)) {
		if err := failIfStopped(); err != nil {
			return err
		}
		for _, flags := range []uint32{keyUnicode, keyUnicode | keyUp} {
			var in winInput
			in.Type = inputKeyboard
			*(*keyboardData)(unsafe.Pointer(&in.Data[0])) = keyboardData{Scan: ch, Flags: flags}
			if err := sendOne(in); err != nil {
				return err
			}
		}
	}
	return nil
}
func readOwnText() (string, error) {
	n, _, _ := getTextLen.Call(editHandle)
	if n > 8192 {
		return "", errors.New("TEXT_TOO_LONG")
	}
	buf := make([]uint16, n+2)
	ret, _, _ := getText.Call(editHandle, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if ret == 0 {
		return "", errors.New("EDIT_READBACK_EMPTY")
	}
	return syscall.UTF16ToString(buf), nil
}
func captureOwnWindow(out string) error {
	if err := failIfStopped(); err != nil {
		return err
	}
	foreground, _, _ := getForeground.Call()
	if foreground != winHandle {
		return errors.New("OWN_WINDOW_NOT_FOREGROUND_SCREENSHOT_DENIED")
	}
	var r rect
	ret, _, _ := getRect.Call(winHandle, uintptr(unsafe.Pointer(&r)))
	if ret == 0 {
		return errors.New("WINDOW_RECT_FAILED")
	}
	w, h := int(r.Right-r.Left), int(r.Bottom-r.Top)
	if w <= 0 || h <= 0 || w > 2000 || h > 1500 {
		return errors.New("WINDOW_SIZE_OUT_OF_BOUNDS")
	}
	hdc, _, _ := getWindowDC.Call(winHandle)
	if hdc == 0 {
		return errors.New("WINDOW_DC_FAILED")
	}
	defer releaseDC.Call(winHandle, hdc)
	memdc, _, _ := createDC.Call(hdc)
	if memdc == 0 {
		return errors.New("MEMORY_DC_FAILED")
	}
	defer deleteDC.Call(memdc)
	bitmap, _, _ := createBitmap.Call(hdc, uintptr(w), uintptr(h))
	if bitmap == 0 {
		return errors.New("BITMAP_FAILED")
	}
	defer deleteObject.Call(bitmap)
	prior, _, _ := selectObject.Call(memdc, bitmap)
	defer selectObject.Call(memdc, prior)
	got, _, _ := printWindow.Call(winHandle, memdc, 0)
	if got == 0 {
		return errors.New("PRINT_OWN_WINDOW_FAILED")
	}
	info := bitmapInfo{Header: bitmapHeader{Size: uint32(unsafe.Sizeof(bitmapHeader{})), Width: int32(w), Height: -int32(h), Planes: 1, BitCount: 32}}
	bits := make([]byte, w*h*4)
	rows, _, _ := getDIBits.Call(memdc, bitmap, 0, uintptr(h), uintptr(unsafe.Pointer(&bits[0])), uintptr(unsafe.Pointer(&info)), dibRGBColors)
	if int(rows) != h {
		return errors.New("SCREENSHOT_READBACK_FAILED")
	}
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for i := 0; i < w*h; i++ {
		j := i * 4
		img.Pix[j] = bits[j+2]
		img.Pix[j+1] = bits[j+1]
		img.Pix[j+2] = bits[j]
		img.Pix[j+3] = 255
	}
	f, err := os.OpenFile(out, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	err = png.Encode(f, img)
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	check, err := os.Open(out)
	if err != nil {
		return err
	}
	defer check.Close()
	_, err = png.DecodeConfig(check)
	return err
}
func windowProc(hwnd uintptr, message uint32, wparam, lparam uintptr) uintptr {
	switch message {
	case wmClose:
		destroyWindow.Call(hwnd)
		return 0
	case wmDestroy:
		postQuit.Call(0)
		return 0
	}
	r, _, _ := defWindow.Call(hwnd, uintptr(message), wparam, lparam)
	return r
}
func startWindow() error {
	hinst, _, _ := moduleHandle.Call(0)
	cls := ptr("CEREBRO_PC001_PREPROD_OWN_WINDOW_V0")
	wc := wndClass{Size: uint32(unsafe.Sizeof(wndClass{})), WndProc: syscall.NewCallback(windowProc), Instance: hinst, ClassName: cls}
	if ret, _, _ := registerClass.Call(uintptr(unsafe.Pointer(&wc))); ret == 0 {
		return errors.New("REGISTER_TEST_WINDOW_FAILED")
	}
	title := ptr("CEREBRO PC-001 · PREPROD · TEST VISIBLE")
	hwnd, _, _ := createWindow.Call(0, uintptr(unsafe.Pointer(cls)), uintptr(unsafe.Pointer(title)), wsOverlappedWindow|wsVisible, 160, 120, 670, 410, 0, 0, hinst, 0)
	if hwnd == 0 {
		return errors.New("CREATE_TEST_WINDOW_FAILED")
	}
	winHandle = hwnd
	editCls := ptr("EDIT")
	empty := ptr("")
	ed, _, _ := createWindow.Call(0, uintptr(unsafe.Pointer(editCls)), uintptr(unsafe.Pointer(empty)), wsChild|wsVisible|wsBorder|wsVScroll|esMultiline|esAutoVScroll, 24, 36, 610, 290, hwnd, 0, hinst, 0)
	if ed == 0 {
		return errors.New("CREATE_TEST_EDIT_FAILED")
	}
	editHandle = ed
	showWindow.Call(hwnd, swShow)
	updateWindow.Call(hwnd)
	setForeground.Call(hwnd)
	return nil
}
func writeReport(root string, r result) string {
	r.CheckedUTC = time.Now().UTC().Format(time.RFC3339)
	raw, _ := json.MarshalIndent(r, "", "  ")
	path := filepath.Join(root, "CEREBRO_PC001_CONTROL_RESULT.json")
	_ = os.WriteFile(path, raw, 0600)
	return path
}
func windowsHome() string {
	base := os.Getenv("LOCALAPPDATA")
	if base == "" {
		base = os.TempDir()
	}
	return filepath.Join(base, "CEREBRO", "PC001", "PREPROD", "Proofs")
}
func runDemo() {
	// Explicit visible local consent: a remote invocation cannot silently trigger this test.
	if winMsg("CEREBRO PC-001 · PREPROD", "Prueba local visible y reversible. Se abrirá una ventana CEREBRO, moverá el ratón y escribirá SOLO en esa ventana. Guardará captura de esa ventana y archivos sintéticos en LocalAppData. ESC cancela. No controla otras aplicaciones ni se conecta a Internet. ¿Autorizar esta prueba?", 0x24) != 6 {
		return
	}
	base := windowsHome()
	_ = os.MkdirAll(base, 0700)
	root := filepath.Join(base, time.Now().UTC().Format("20060102T150405.000000000Z"))
	r := result{SchemaVersion: "0.1.0", Status: "PARTIAL", CompanyID: "fenix", EngineID: "PC-001", Environment: "PREPROD", Version: "pc001-control-v0.1.0", DeviceID: "LOCAL_NON_ATTESTED", ConsentVisible: true, NoProdChanges: true, NoRemoteListener: true, NoPaidAPI: true}
	proof, err := RunSandboxProof(root)
	r.Sandbox = proof
	if err != nil {
		r.ErrorCode = "SANDBOX_" + err.Error()
		path := writeReport(root, r)
		winMsg("CEREBRO · Fallo", "Falló sandbox. Informe local: "+path, 0x10)
		return
	}
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	if err = startWindow(); err != nil {
		r.ErrorCode = err.Error()
		path := writeReport(root, r)
		winMsg("CEREBRO · Fallo", "Falló interfaz. Informe: "+path, 0x10)
		return
	}
	go func() {
		time.Sleep(650 * time.Millisecond)
		err := moveAndClickOwnEdit()
		if err == nil {
			r.MouseInputVerified = true
			err = typeIntoOwnEdit("CEREBRO PC-001 CONTROL REAL PREPROD\r\nRatón y teclado enviados al cuadro de prueba visible.")
		}
		if err == nil {
			time.Sleep(450 * time.Millisecond)
			var txt string
			txt, err = readOwnText()
			if err == nil && !strings.Contains(txt, "CEREBRO PC-001 CONTROL REAL PREPROD") {
				err = errors.New("KEYBOARD_SEMANTIC_READBACK_FAILED")
			}
		}
		if err == nil {
			r.KeyboardReadbackVerified = true
			shot := filepath.Join(root, "CEREBRO_OWN_TEST_WINDOW.png")
			err = captureOwnWindow(shot)
			if err == nil {
				r.ScreenshotLocalVerified = true
				r.ScreenshotPath = shot
			}
		}
		if err != nil {
			r.ErrorCode = err.Error()
		} else {
			r.Status = "LOCAL_UI_AND_FILES_PASS_REMOTE_PENDING"
		}
		path := writeReport(root, r)
		if err == nil {
			winMsg("CEREBRO · Prueba completada", "Prueba local correcta: ratón, teclado, ventana propia, captura y archivo recuperable. NO significa que el Gateway controle Windows. Informe: "+path, 0x40)
		} else {
			winMsg("CEREBRO · Prueba parcial", "Resultado pendiente o bloqueado: "+r.ErrorCode+". Informe: "+path, 0x30)
		}
		postMessage.Call(winHandle, wmClose, 0, 0)
	}()
	var m msg
	for {
		ret, _, _ := getMessage.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
		if int32(ret) <= 0 {
			break
		}
		translateMessage.Call(uintptr(unsafe.Pointer(&m)))
		dispatchMessage.Call(uintptr(unsafe.Pointer(&m)))
	}
}
func main() { runDemo() }