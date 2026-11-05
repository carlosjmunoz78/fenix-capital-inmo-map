package main

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// RunSandboxProof performs only fixed, reversible operations within an isolated
// caller-owned test directory. It is not a generic file-management RPC.
type SandboxProof struct {
	Status       string   `json:"status"`
	Root         string   `json:"sandbox_root"`
	Steps        []string `json:"verified_steps"`
	SourceSHA256 string   `json:"source_sha256"`
	RecoveryPath string   `json:"recovery_path"`
}

func within(root, path string) error {
	base, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	target, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	rel, err := filepath.Rel(base, target)
	if err != nil {
		return err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) || filepath.IsAbs(rel) {
		return errors.New("PATH_OUTSIDE_SANDBOX")
	}
	// Deny symlinks/reparse-point aliases at every existing path component.
	cur := base
	if fi, err := os.Lstat(cur); err == nil && fi.Mode()&os.ModeSymlink != 0 {
		return errors.New("SYMLINK_ROOT_DENIED")
	}
	for _, part := range strings.Split(rel, string(os.PathSeparator)) {
		if part == "." || part == "" {
			continue
		}
		cur = filepath.Join(cur, part)
		if fi, err := os.Lstat(cur); err == nil && fi.Mode()&os.ModeSymlink != 0 {
			return errors.New("SYMLINK_DENIED")
		}
	}
	return nil
}
func withinFile(root, rel string) (string, error) {
	if filepath.IsAbs(rel) {
		return "", errors.New("ABSOLUTE_PATH_DENIED")
	}
	target := filepath.Join(root, rel)
	if err := within(root, target); err != nil {
		return "", err
	}
	return target, nil
}
func copyFile(src, dst string) error {
	r, err := os.Open(src)
	if err != nil {
		return err
	}
	defer r.Close()
	f, err := os.OpenFile(dst, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	_, err = io.Copy(f, r)
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	return err
}
func digest(p string) (string, error) {
	data, err := os.ReadFile(p)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}
func RunSandboxProof(root string) (SandboxProof, error) {
	out := SandboxProof{Status: "NOT_STARTED", Root: root, Steps: []string{}}
	// A fresh root is mandatory: never overwrite or delete a preexisting path.
	if _, err := os.Lstat(root); err == nil {
		return out, errors.New("SANDBOX_ALREADY_EXISTS")
	} else if !os.IsNotExist(err) {
		return out, err
	}
	if err := os.MkdirAll(root, 0700); err != nil {
		return out, err
	}
	for _, name := range []string{"source.txt", "copy.txt", "moved.txt", "renamed.txt", "recovery/deleted.txt"} {
		if _, err := withinFile(root, name); err != nil {
			return out, err
		}
	}
	source, _ := withinFile(root, "source.txt")
	payload := []byte("CEREBRO PC-001 PREPROD sandbox test\nNo personal or business files were accessed.\n")
	if err := os.WriteFile(source, payload, 0600); err != nil {
		return out, err
	}
	readback, err := os.ReadFile(source)
	if err != nil || string(readback) != string(payload) {
		return out, errors.New("WRITE_READBACK_FAILED")
	}
	out.Steps = append(out.Steps, "CREATE_WRITE_READ")
	original, err := digest(source)
	if err != nil {
		return out, err
	}
	out.SourceSHA256 = original
	cp, _ := withinFile(root, "copy.txt")
	if err := copyFile(source, cp); err != nil {
		return out, err
	}
	copied, err := digest(cp)
	if err != nil || copied != original {
		return out, errors.New("COPY_READBACK_FAILED")
	}
	out.Steps = append(out.Steps, "COPY_VERIFY")
	moved, _ := withinFile(root, "moved.txt")
	if err := os.Rename(cp, moved); err != nil {
		return out, err
	}
	if _, err := os.Stat(cp); !os.IsNotExist(err) {
		return out, fmt.Errorf("MOVE_SOURCE_REMAINS:%v", err)
	}
	out.Steps = append(out.Steps, "MOVE_VERIFY")
	renamed, _ := withinFile(root, "renamed.txt")
	if err := os.Rename(moved, renamed); err != nil {
		return out, err
	}
	out.Steps = append(out.Steps, "RENAME_VERIFY")
	recoveryDir, _ := withinFile(root, "recovery")
	if err := os.Mkdir(recoveryDir, 0700); err != nil {
		return out, err
	}
	recovery, _ := withinFile(root, "recovery/deleted.txt")
	// Recoverable deletion = move to private recovery folder, not os.Remove.
	if err := os.Rename(renamed, recovery); err != nil {
		return out, err
	}
	saved, err := digest(recovery)
	if err != nil || saved != original {
		return out, errors.New("RECOVERY_READBACK_FAILED")
	}
	out.Steps = append(out.Steps, "RECOVERABLE_DELETE_VERIFY")
	out.RecoveryPath = recovery
	out.Status = "PASS"
	return out, nil
}