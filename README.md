# Lokální Mapová a Navigační Aplikace (bez OSM)

Tato aplikace je jednoduchý offline plánovač tras mezi předdefinovanými body (městy/POI) bez použití OSM nebo externích mapových služeb.

## Struktura projektu

```
Windsurf-trasy/
├── app.py              # Spouštěcí soubor Flask aplikace
├── config.py           # Konfigurace (cesty, klíče, debug)
├── db.py               # Datová vrstva (práce s databází)
├── algorithms.py       # Logika výpočtu tras (Dijkstra)
├── routes.py           # Flask Blueprint s API routami
├── test_algorithms.py  # Testy pro algoritmy
├── test_db.py          # Testy pro datovou vrstvu
├── openapi.yaml        # OpenAPI/Swagger dokumentace API
├── requirements.txt    # Závislosti (Flask, pytest)
├── static/
│   ├── index.html      # Frontend (HTML)
│   ├── main.js         # Frontend (JavaScript)
│   └── map.png         # Statická mapa
├── places.db           # SQLite databáze
└── README.md           # Tento soubor
```

## Spuštění

1. Instalace závislostí:
   ```bash
   pip install -r requirements.txt
   ```
2. Inicializace databáze (pokud ještě neexistuje):
   ```bash
   python init_db.py
   ```
3. Spuštění aplikace:
   ```bash
   python app.py
   ```
4. Otevřete [http://localhost:5000](http://localhost:5000) v prohlížeči.

## Testování

Testy spustíte příkazem:
```bash
pytest
```

## Konfigurace

Všechny důležité cesty a nastavení jsou v `config.py` (např. DB_PATH, DEBUG, SECRET_KEY).

## Dokumentace API

Specifikace OpenAPI/Swagger je v souboru `openapi.yaml` a lze ji zobrazit např. pomocí [Swagger Editoru](https://editor.swagger.io/).

## Poznámky
- Mapa je pouze statický obrázek (`static/map.png`).
- Trasa se vykresluje jako čára mezi body na obrázku.
- Vyhledávání a plánování funguje pouze mezi předdefinovanými body.
- Vše je v češtině.
