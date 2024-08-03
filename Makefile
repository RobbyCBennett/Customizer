INPUT_DIR := extension
INPUT_FILES := $(shell env find $(INPUT_DIR) -type f)
OUTPUT := extension.zip

$(OUTPUT): $(INPUT_FILES)
	cd $(INPUT_DIR) && zip -r ../$(OUTPUT) .
