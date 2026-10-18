PY ?= python

.PHONY: install audit crosswalk run run-force test lint format

install:
	$(PY) -m pip install -r pipeline/requirements.txt

audit:
	$(PY) -m pipeline.audit

# Regenerasi crosswalk berversi (hanya bila ada tahun/pemda baru; tinjau diff-nya)
crosswalk:
	$(PY) -m pipeline.crosswalk

run:
	$(PY) -m pipeline.run

run-force:
	$(PY) -m pipeline.run --force

test:
	$(PY) -m pytest

lint:
	$(PY) -m ruff check pipeline
	$(PY) -m ruff format --check pipeline

format:
	$(PY) -m ruff format pipeline
