// GetWifiInfo project main.go
package main

import (
	"math"
	"bytes"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

const OutputFile = "./wifiData.txt"
const Header = "#Time      \t   Link\t   Level\t   Speed (kbit/s)\t   total RX (MB)\n"

const WifiInfoFile = "/proc/net/wireless"
const NetInfoFile = "/proc/net/dev"

//const WifiInfoFile = "./net_wireless.raw"
//const NetInfoFile = "./net_dev.raw"

const User = "admin"
const Pass = "admin"
const URL = "ftp://192.168.0.1/ftp/rnd_file_1GB.data"
const Device = "wlan3"

func setCommand(url string, user string, pass string) (command *exec.Cmd) {
	command = exec.Command("curl", "-s", "-o", "/dev/null",
		"--user", fmt.Sprintf("%s:%s", user, pass),
		"-w", "%{speed_download}", URL)
	return
}

func ExecCommand(command *exec.Cmd, output chan string) {
	fmt.Println(command.Args)

	if sOut, err := command.Output(); err != nil {
		output <- ""
		log.Fatal(err)
	} else {
		output <- string(sOut)
	}
}

//NetStat holds all the information related to RX or TX (/proc/net/dev)
//bytes represents te bytes transmitted
//packets represents the packets transmited
//errs represents the errors occurred in the transmission
//drop represents the number of packets droped
type NetStat struct {
	bytes      int64
	pakets     int64
	errs       int64
	drop       int64
	fifo       int64
	frame      int64
	compressed int64
	multicast  int64
}

//NetStats holds all the information available in /proc/net/dev for a particual device
type NetStats struct {
	device []byte
	timestamp time.Time
	rx     NetStat
	tx     NetStat
}

func (t *NetStats) SetDevice(device string) {
	t.device = []byte(device)
}

func (t *NetStats) Update() error {
	var info []byte
	var err error

	t.timestamp := time.Now()

	if info, err = ioutil.ReadFile(NetInfoFile); err != nil {
		return err
	}

	var line []byte
	var fields [][]byte
	var deviceName []byte // We extract the name of the device from each line ("wlan3:" -> "wlan3").

	lines := bytes.Split(info, []byte{'\n'})

	for _, line = range lines {
		fields = bytes.Fields(line) // Could be and empty line -> 0 fields.
		if len(fields) > 0 {
			deviceName = bytes.TrimSuffix(fields[0], []byte(":"))
			if bytes.Equal(t.device, deviceName) {
				// bytes, packets, errs, drop, fifo, frame, compressed, multicast
				if t.rx.bytes, err = strconv.ParseInt(string(fields[1]), 0, 64); err != nil {
					return err
				}
				if t.rx.pakets, err = strconv.ParseInt(string(fields[2]), 10, 64); err != nil {
					return err
				}
				if t.rx.errs, err = strconv.ParseInt(string(fields[3]), 10, 64); err != nil {
					return err
				}
				if t.rx.drop, err = strconv.ParseInt(string(fields[4]), 10, 64); err != nil {
					return err
				}
				if t.rx.fifo, err = strconv.ParseInt(string(fields[5]), 10, 64); err != nil {
					return err
				}
				if t.rx.frame, err = strconv.ParseInt(string(fields[6]), 10, 64); err != nil {
					return err
				}
				if t.rx.compressed, err = strconv.ParseInt(string(fields[7]), 10, 64); err != nil {
					return err
				}
				if t.rx.multicast, err = strconv.ParseInt(string(fields[8]), 10, 64); err != nil {
					return err
				}
				if t.tx.bytes, err = strconv.ParseInt(string(fields[9]), 10, 64); err != nil {
					return err
				}
				if t.tx.pakets, err = strconv.ParseInt(string(fields[10]), 10, 64); err != nil {
					return err
				}
				if t.tx.errs, err = strconv.ParseInt(string(fields[11]), 10, 64); err != nil {
					return err
				}
				if t.tx.drop, err = strconv.ParseInt(string(fields[12]), 10, 64); err != nil {
					return err
				}
				if t.tx.fifo, err = strconv.ParseInt(string(fields[13]), 10, 64); err != nil {
					return err
				}
				if t.tx.frame, err = strconv.ParseInt(string(fields[14]), 10, 64); err != nil {
					return err
				}
				if t.tx.compressed, err = strconv.ParseInt(string(fields[15]), 10, 64); err != nil {
					return err
				}
				if t.tx.multicast, err = strconv.ParseInt(string(fields[16]), 10, 64); err != nil {
					return err
				}
				break
			}
		}
	}
	return nil
}

func (ns *NetStats) PrintStats() string {
	var statsStr string

	statsStr = fmt.Sprintf("(TX) bytes: %d")

	return statsStr
}

type WifiInfo struct {
	device []byte
	link   int16
	level  int16
	noise  int16
}

func (t *WifiInfo) SetDevice(device string) {
	t.device = []byte(device)
}

func (t *WifiInfo) Update() (err error) {
	var info []byte

	if info, err = ioutil.ReadFile(WifiInfoFile); err != nil {
		log.Fatal(err)
	}

	var fields [][]byte
	var deviceName []byte
	lines := bytes.Split(info, []byte{'\n'})

	var value int64

	for _, line := range lines {
		fields = bytes.Fields(line) // Could be an empty line -> 0 fields.
		if len(fields) > 0 {
			deviceName = bytes.TrimSuffix(fields[0], []byte(":"))
			if bytes.Equal(deviceName, t.device) {
				if value, err = strconv.ParseInt(string(bytes.TrimSuffix(fields[2], []byte{'.'})), 10, 0); err != nil {
					return err
				}
				t.link = int16(value)
				if value, err = strconv.ParseInt(string(bytes.TrimSuffix(fields[3], []byte{'.'})), 10, 0); err != nil {
					return err
				}
				t.level = int16(value)
				if value, err = strconv.ParseInt(string(bytes.TrimSuffix(fields[4], []byte{'.'})), 10, 0); err != nil {
					return err
				}
				t.noise = int16(value)
				break
			}
		}
	}
	return nil
}

func WriteWifiInfo(lastTimestamp time.Time,
	firstBytesRX int64, stats *NetStats,
	wifiInfo *WifiInfo, fOut *os.File) (currTimestamp time.Time) {

	if stat, _ := fOut.Stat(); stat.Size() == 0 {
		fOut.WriteString(Header)
	}

	var speed int64

	var outputString string

	var totalBytesRX int64
	var bytesRX int64

	lastBytesRX := stats.rx.bytes

	stats.Update()
	wifiInfo.Update()

	if lastTimestamp.IsZero() {
		speed = 0
	} else {
		bytesRX = stats.rx.bytes

		totalBytesRX = bytesRX - firstBytesRX

		// Check if there was a counter reset (RX it is suposed to be "long long" -> 64bit.
		if totalBytesRX < 0 {
			totalBytesRX += math.MaxInt64
		}

		fmt.Printf("Total bytes RX: %d.\n", totalBytesRX)
		currTimestamp = time.Now()
		elapsedTime := currTimestamp.Sub(lastTimestamp).Seconds()
		fmt.Printf("Bytes RX in (%f sec) instant: %d.\n", elapsedTime, bytesRX-lastBytesRX)

		speedf := float64(bytesRX-lastBytesRX) / elapsedTime
		speed = int64(speedf * 8 / 1000)
		fmt.Printf("Speed = %d (kbit/sec).\n", speed)
	}

	currTimestamp = time.Now()

	outputString = fmt.Sprintf("%d\t    %d\t    %d\t    %d\t\t    %.3f\n",
		currTimestamp.Local().Unix(),
		wifiInfo.link, wifiInfo.level, speed, float64(totalBytesRX)/1048576.0)

	fmt.Println(outputString)
	if _, err := fOut.WriteString(outputString); err != nil {
		log.Fatal(err)
	}

	return
}

var outputFile string
var timeWait int64
var timeMax int64
var device string
var pass string
var user string
var url string
var repeat bool

func init() {
	const (
		outputFileDefault = OutputFile
		outputFileUsage   = "Output file where to store the collected data."

		timeWaitDefault = 5
		timeWaitUsage   = "Time (in seconds) to wait between wireless info checks."

		deviceDefault = Device
		deviceUsage   = "Device from which to collect data."

		passDefault = Pass
		passUsage   = "Specify password to use for server authentication."

		userDefault = User
		userUsage   = "Specify the user name and password to use for server authentication."

		urlDefault = URL
		urlUsage   = "URL to download while collecting the data (currently must be an ftp)."

		repeatDefault = false
		repeatUsage   = "Repeat the copy in a loop."

		timeDefault = 0
		timeUsage   = "For how long should we run this command."
	)

	flag.StringVar(&outputFile, "o", outputFileDefault, outputFileUsage)
	flag.StringVar(&outputFile, "output", outputFileDefault, outputFileUsage)

	flag.Int64Var(&timeWait, "rt", timeWaitDefault, timeWaitUsage)
	flag.Int64Var(&timeWait, "repeat_time", timeWaitDefault, timeWaitUsage)

	flag.StringVar(&device, "d", deviceDefault, deviceUsage)
	flag.StringVar(&device, "device", deviceDefault, deviceUsage)

	flag.StringVar(&pass, "p", passDefault, passUsage)
	flag.StringVar(&pass, "pass", passDefault, passUsage)

	flag.StringVar(&user, "u", userDefault, userUsage)
	flag.StringVar(&user, "user", userDefault, userUsage)

	flag.StringVar(&url, "url", urlDefault, urlUsage)

	flag.BoolVar(&repeat, "r", repeatDefault, repeatUsage)
	flag.BoolVar(&repeat, "repeat", repeatDefault, repeatUsage)

	flag.Int64Var(&timeMax, "t", timeDefault, timeUsage)
	flag.Int64Var(&timeMax, "time", timeDefault, timeUsage)
}

func main() {
	flag.Parse()

	initTime := time.Now()

	//Open outputFile
	if fOut, err := os.OpenFile(outputFile, os.O_CREATE|os.O_APPEND|os.O_RDWR, 0666); err == nil {
		defer fOut.Close()

		//		done := make(chan struct{}) // Cause empty struct size (apparently) matters.
		output := make(chan string) //

		var netStats NetStats
		netStats.SetDevice(device)
		netStats.Update()
		bytesRXIni := netStats.rx.bytes
		fmt.Printf("initital bytes received: %d.\n", bytesRXIni)

		var wifiInfo WifiInfo
		wifiInfo.SetDevice(device)

		timeIni := time.Now()
		timestamp := time.Now()

		command := setCommand(url, user, pass)

		for {
			go ExecCommand(command, output)
			var speedStr string
			var outputString string

			doItAgain := true
			for doItAgain {
				time.Sleep(time.Duration(timeWait) * time.Second) // check the wifi every timeWait seconds.
				select {
				case speedStr = <-output:
					timeEnd := time.Now()
					elapsedTime := timeEnd.Sub(timeIni)

					fmt.Printf("Speed = %q\n.", speedStr)

					speedStr = strings.Replace(speedStr, ",", ".", 1)

					speedF, _ := strconv.ParseFloat(speedStr, 64)
					fmt.Printf("Speed(float) = %f.\n", speedF)
					speedF = speedF * 8 / 1000
					speedI := int(speedF)
					fmt.Printf("Speed(int) = %d.\n", speedI)
					outputString = fmt.Sprintf("# Speed %d kbit/s (elapsed time: %v).\n", speedI, elapsedTime)
					fOut.WriteString(outputString)

					doItAgain = false
					//			case <-done:
					//				doItAgain = false
				default:
					if timeMax > 0 && time.Now().Sub(initTime).Seconds() > float64(timeMax) {
						command.Process.Kill()
						os.Exit(0)
					}
					timestamp = WriteWifiInfo(timestamp, bytesRXIni, &netStats, &wifiInfo, fOut)
					//time.Sleep(time.Duration(timeWait) * time.Second) // check the wifi every timeWait seconds.
				}
			}
			if !repeat {
				break
			}
		}
	}
}
