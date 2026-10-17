# Copias de seguridad y cómo restaurarlas

## Qué copias hay

| Copia | Dónde | Frecuencia | Se guarda |
|---|---|---|---|
| Copia de la API (SQLite backup API) | Volumen Docker `api_backups` en el servidor | Cada 24 h y al arrancar | 14 días |
| Copia fuera del servidor (restic, cifrada) | Cloudflare R2, bucket `finanverso-backups` | Cada día a las 04:30 (cron) | 14 días |
| Copia antes de cada migración | Junto a la base de datos (`/data`) | Al actualizar el esquema | 14 días |

La copia de fuera la hace `deploy/scripts/offsite-backup.sh`. Si un día no se ejecuta o falla,
healthchecks.io manda un correo a moneymanager@outlook.es.

**Sin la contraseña de restic las copias de fuera no se pueden abrir.** Está en
`/root/.finanverso-backup.env` en el servidor y también debe estar guardada fuera del servidor
(gestor de contraseñas).

## Restaurar la base de datos

En el servidor, como root:

```bash
cd /opt/winjgm/javi-portfolio/deploy
set -a; source /root/.finanverso-backup.env; set +a

# 1. Ver las copias disponibles
restic snapshots --tag finanverso

# 2. Bajar la última (o una concreta: cambia "latest" por el ID)
rm -rf /tmp/restore && restic restore latest --target /tmp/restore
RESTORED="$(find /tmp/restore -name 'money-manager-*.db' | head -1)"

# 3. Comprobar que está bien
sqlite3 "$RESTORED" 'PRAGMA integrity_check;'   # debe decir: ok
sqlite3 "$RESTORED" 'SELECT count(*) FROM users;'

# 4. Parar la API, guardar la base actual por si acaso y poner la restaurada
docker compose stop api
DATA="$(docker volume inspect --format '{{.Mountpoint}}' "$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)api_db$')")"
cp -a "$DATA/money-manager.db" "/root/money-manager.before-restore.$(date +%F-%H%M).db"
rm -f "$DATA/money-manager.db-wal" "$DATA/money-manager.db-shm"
cp "$RESTORED" "$DATA/money-manager.db"
chown 1000:1000 "$DATA/money-manager.db"

# 5. Arrancar y comprobar
docker compose start api
curl -fsS https://finanverso.app/api/health
```

Si solo hay que recuperar la copia que está en el propio servidor (sin restic), el paso 2 es
copiar el fichero más reciente de `api_backups`:

```bash
ls -lt "$(docker volume inspect --format '{{.Mountpoint}}' "$(docker volume ls --format '{{.Name}}' | grep -E '(^|_)api_backups$')")"
```

## Prueba de restauración (una vez al mes)

Haz los pasos 1 a 3 (sin parar nada). Si `integrity_check` dice `ok` y el número de usuarios
tiene sentido, la copia sirve. Apunta la fecha de la prueba aquí:

- (pendiente la primera prueba)
