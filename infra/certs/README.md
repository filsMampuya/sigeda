# Certificats preproduction SIGEDA

Le mode TLS preproduction attend les fichiers suivants dans le dossier monte par :

- `SIGEDA_CERTS_DIR`

Noms attendus :

- `fullchain.pem`
- `privkey.pem`

Exemple de cible serveur :

```txt
/opt/sigeda/certs/fullchain.pem
/opt/sigeda/certs/privkey.pem
```

Ces fichiers sont consommes par :

- [preprod-tls.conf](../docker/nginx/preprod-tls.conf)
- [docker-compose.preprod.tls.yml](../docker/docker-compose.preprod.tls.yml)

Ne pas versionner de certificats reels dans le depot.
