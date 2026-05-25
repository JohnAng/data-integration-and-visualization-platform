# XeLaTeX build for the MYE030 final report.
# Requires: TeX Live 2023+, xelatex, polyglossia, fontspec.
#
# Usage:
#   make           # builds main.pdf via two xelatex passes (ToC + xrefs)
#   make clean     # remove aux/log/toc files
#   make distclean # remove the final PDF too

PDF       := AM2403_projectReport.pdf
TARGET    := main.pdf
ENGINE    := xelatex
ENGINE_FLAGS := -interaction=nonstopmode -halt-on-error -file-line-error

.PHONY: all clean distclean

all: $(PDF)

$(PDF): $(TARGET)
	cp $(TARGET) ../$(PDF)

$(TARGET): main.tex preamble.tex chapters/*.tex
	$(ENGINE) $(ENGINE_FLAGS) main.tex
	$(ENGINE) $(ENGINE_FLAGS) main.tex

clean:
	rm -f main.aux main.log main.out main.toc
	rm -f chapters/*.aux

distclean: clean
	rm -f main.pdf ../$(PDF)
