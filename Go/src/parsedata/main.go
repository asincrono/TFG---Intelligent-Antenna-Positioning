package main

import (
	"flag"
	"fmt"
	"time"
)

func main() {
	var outputFile = flag.String("o", "defaultValue", "Name of the output file")
	flag.StringVar(outputFile, "output", "defaultValue", "Name of the output file name")
	flag.Parse()
	t := time.Now()

	fmt.Println(t.Nanosecond())
	fmt.Println(t.Unix())

	fmt.Println("Outputfile:", *outputFile)
}
