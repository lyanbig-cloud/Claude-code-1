#!/bin/bash
# Doble clic para abrir el panel (Mac). Deja esta ventana abierta mientras lo uses.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js. Descárgalo (versión LTS) de https://nodejs.org, instálalo y vuelve a abrir este archivo."
  read -r -p "Pulsa Enter para cerrar…"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Creé el archivo .env. Pega tu API key de Higgsfield en él, guárdalo y vuelve a abrir este archivo."
  open -e .env
  read -r -p "Pulsa Enter para cerrar…"
  exit 0
fi

node server.js --abrir
