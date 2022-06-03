package main

import (
	"bytes"
	"compress/zlib"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"

	"github.com/andybalholm/brotli"
)

func main() {
	type TransactionsData []string

	type SysInfo struct {
		Hostname string
		Platform string
		CPU      string
		Core     int32
		RAM      uint64
	}

	hostStat, _ := host.Info()
	cpuStat, _ := cpu.Info()
	vmStat, _ := mem.VirtualMemory()

	info := new(SysInfo)

	info.Hostname = hostStat.Hostname
	info.Platform = hostStat.Platform
	info.CPU = cpuStat[0].ModelName
	info.Core = cpuStat[0].Cores
	info.RAM = vmStat.Total / 1024 / 1024

	// System Info
	infoJSON, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		panic("Failed to marshal: " + err.Error())
	}
	fmt.Printf("%s\n", string(infoJSON))

	// Read file
	data, err := ioutil.ReadFile("../data/transactionsData.json")
	if err != nil {
		panic("Failed to load data: " + err.Error())
	}

	var transactionsData TransactionsData
	err = json.Unmarshal(data, &transactionsData)
	if err != nil {
		panic("Failed to decode json: " + err.Error())
	}

	// Loop Count
	loopCount := 5

	// Time Variables
	var totalTime time.Duration
	var avgTime time.Duration

	fmt.Println("\n-------------------------------------")

	fmt.Println("\nTotal TXs:", len(transactionsData), " | Loop: ", loopCount)

	fmt.Println("\n-------------------------------------")

	fmt.Println("\nZlib Speed Test:")

	for i := 0; i < loopCount; i++ {
		start := time.Now()

		for _, transaction := range transactionsData {
			var in bytes.Buffer
			b := []byte(transaction)
			w := zlib.NewWriter(&in)
			w.Write(b)
			w.Close()
		}

		end := time.Now()
		totalTime += end.Sub(start)
	}
	fmt.Println("\nTotal Time: ", totalTime.String(), " | Loop: ", loopCount)
	avgTime = totalTime / time.Duration(loopCount)
	fmt.Println("Average Time:", avgTime)
	fmt.Println("\n-------------------------------------")

	totalTime = time.Duration(0)
	avgTime = time.Duration(0)

	fmt.Println("\nBrotli Speed Test:")

	for i := 0; i < loopCount; i++ {
		start := time.Now()

		for _, transaction := range transactionsData {
			var in bytes.Buffer
			b := []byte(transaction)
			w := brotli.NewWriterLevel(&in, 11)
			w.Write(b)
			w.Close()
		}

		end := time.Now()
		totalTime += end.Sub(start)

		fmt.Println("Execution Duration: ", end.Sub(start), " | Loop: ", i+1, " time")
	}
	fmt.Println("\nTotal Time: ", totalTime.String(), " | Loop: ", loopCount)
	avgTime = totalTime / time.Duration(loopCount)
	fmt.Println("Average Time:", avgTime)
	fmt.Println("\n-------------------------------------")
}
