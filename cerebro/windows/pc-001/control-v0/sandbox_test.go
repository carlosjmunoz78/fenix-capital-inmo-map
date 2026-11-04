package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSandboxProof(t *testing.T) {
	root := filepath.Join(t.TempDir(), "run-1")
	got, err := RunSandboxProof(root)
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != "PASS" || len(got.Steps) != 5 || got.SourceSHA256 == "" {
		t.Fatalf("invalid proof: %#v", got)
	}
	if _, err := os.Stat(got.RecoveryPath); err != nil {
		t.Fatal(err)
	}
	if _, err := RunSandboxProof(root); err == nil {
		t.Fatal("existing sandbox overwritten")
	}
}
func TestSandboxCannotEscape(t *testing.T) {
	root := t.TempDir()
	for _, p := range []string{"../other", "../../windows", "/tmp/nope"} {
		if _, err := withinFile(root, p); err == nil {
			t.Fatalf("escape allowed %s", p)
		}
	}
	// A pre-existing symlink must be denied even if the final path is absent.
	dest := t.TempDir()
	if err := os.Symlink(dest, filepath.Join(root, "alias")); err == nil {
		if _, err := withinFile(root, "alias/file"); err == nil {
			t.Fatal("symlink allowed")
		}
	}
}
func TestProofDoesNotDelete(t *testing.T) {
	root := filepath.Join(t.TempDir(), "run")
	proof, err := RunSandboxProof(root)
	if err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(proof.RecoveryPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(b), "PREPROD") {
		t.Fatal("recovery corrupted")
	}
}