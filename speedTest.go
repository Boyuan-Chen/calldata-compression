package main

import (
	"bytes"
	"compress/zlib"
	"io"
	"os"
)

func main() {
	var in bytes.Buffer
	b := []byte(`{"Name":"Wednesday","Age":6,"Parents":["Gomez","Morticia"],"test":{"prop1":1,"prop2":[1,2,3]}}`)
	w := zlib.NewWriter(&in)
	w.Write(b)
	w.Close()

	var out bytes.Buffer
	r, _ := zlib.NewReader(&in)
	io.Copy(&out, r)
	os.Stdout.Write(out.Bytes())
}
