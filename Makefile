INPUT := extension
OUTPUT := extension.zip

$(OUTPUT): $(INPUT)
	cd $(INPUT) && zip -r ../$(OUTPUT) .
